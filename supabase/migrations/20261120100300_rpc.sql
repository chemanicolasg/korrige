-- Korrige · funciones RPC (operaciones que no se pueden expresar solo con RLS)

-- Email verificado del usuario actual (para aceptar invitaciones con seguridad)
create function public.current_verified_email() returns text
language sql stable security definer set search_path = public as $$
  select lower(u.email) from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null;
$$;

-- Crea una organización y hace administrador a quien la crea
create function public.create_organization(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
begin
  if auth.uid() is null then
    raise exception 'No autenticado' using errcode = 'insufficient_privilege';
  end if;
  if (select count(*) from public.memberships where user_id = auth.uid() and role = 'admin') >= 5 then
    raise exception 'Has alcanzado el máximo de organizaciones que puedes administrar' using errcode = 'check_violation';
  end if;
  insert into public.organizations (name, created_by) values (trim(p_name), auth.uid()) returning id into v_org;
  insert into public.memberships (org_id, user_id, role) values (v_org, auth.uid(), 'admin');
  insert into public.audit_log (org_id, user_id, action, details)
  values (v_org, auth.uid(), 'organizacion_creada', jsonb_build_object('nombre', trim(p_name)));
  return v_org;
end $$;

-- Acepta las invitaciones pendientes para el email (verificado) del usuario
create function public.accept_invitations() returns int
language plpgsql security definer set search_path = public as $$
declare
  v_email text := public.current_verified_email();
  v_inv record;
  v_n int := 0;
begin
  if v_email is null then
    return 0;
  end if;
  for v_inv in select * from public.invitations where email = v_email and accepted_at is null loop
    insert into public.memberships (org_id, user_id, role)
    values (v_inv.org_id, auth.uid(), v_inv.role)
    on conflict (org_id, user_id) do nothing;
    update public.invitations set accepted_at = now() where id = v_inv.id;
    insert into public.audit_log (org_id, user_id, action, details)
    values (v_inv.org_id, auth.uid(), 'invitacion_aceptada', jsonb_build_object('email', v_email, 'rol', v_inv.role));
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

-- Comparte un examen con otro profesor de la misma organización (coautor)
create function public.share_exam(p_exam uuid, p_email text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_user uuid;
begin
  if not public.is_exam_owner_or_admin(p_exam) then
    raise exception 'Solo el propietario del examen o un administrador pueden compartirlo' using errcode = 'insufficient_privilege';
  end if;
  select org_id into v_org from public.exams where id = p_exam;
  select p.id into v_user
  from public.profiles p join public.memberships m on m.user_id = p.id and m.org_id = v_org
  where lower(p.email) = lower(trim(p_email));
  if v_user is null then
    raise exception 'No hay ningún profesor con ese email en tu organización' using errcode = 'no_data_found';
  end if;
  insert into public.exam_collaborators (exam_id, user_id, added_by)
  values (p_exam, v_user, auth.uid())
  on conflict do nothing;
  insert into public.audit_log (org_id, exam_id, user_id, action, details)
  values (v_org, p_exam, auth.uid(), 'examen_compartido', jsonb_build_object('email', lower(trim(p_email))));
  return v_user;
end $$;

-- Uso de la organización (solo administradores)
create function public.org_usage(p_org uuid)
returns table (user_id uuid, email text, full_name text, role public.org_role, n_exams bigint, n_sheets bigint, last_activity timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_org_admin(p_org) then
    raise exception 'Solo administradores' using errcode = 'insufficient_privilege';
  end if;
  return query
    select m.user_id, p.email, p.full_name, m.role,
      (select count(*) from public.exams e where e.org_id = p_org and e.owner_id = m.user_id),
      (select count(*) from public.sheets s join public.exams e on e.id = s.exam_id where e.org_id = p_org and e.owner_id = m.user_id),
      (select max(a.created_at) from public.audit_log a where a.org_id = p_org and a.user_id = m.user_id)
    from public.memberships m join public.profiles p on p.id = m.user_id
    where m.org_id = p_org
    order by m.role, p.email;
end $$;

-- Exámenes cerrados cuyas imágenes han superado la retención de su organización
-- (lo usa la Edge Function retention-purge con service_role)
create function public.exams_due_for_purge()
returns table (exam_id uuid, org_id uuid)
language sql stable security definer set search_path = public as $$
  select e.id, e.org_id
  from public.exams e join public.organizations o on o.id = e.org_id
  where e.status = 'cerrado'
    and e.images_purged_at is null
    and o.retention_months is not null
    and e.closed_at < now() - make_interval(months => o.retention_months);
$$;

-- Marca las imágenes de un examen como borradas (tras eliminarlas de Storage)
create function public.mark_images_purged(p_exam uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.sheets s
  set pages = (
    select coalesce(jsonb_agg(pg - 'image_path'), '[]'::jsonb) from jsonb_array_elements(s.pages) pg
  )
  where s.exam_id = p_exam;
  update public.exams set images_purged_at = now() where id = p_exam;
  insert into public.audit_log (org_id, exam_id, action, details)
  select e.org_id, e.id, 'imagenes_borradas', jsonb_build_object('motivo', 'retención')
  from public.exams e where e.id = p_exam;
end $$;

revoke all on function public.current_verified_email(), public.create_organization(text), public.accept_invitations(),
  public.share_exam(uuid, text), public.org_usage(uuid), public.exams_due_for_purge(), public.mark_images_purged(uuid) from public;
grant execute on function public.create_organization(text), public.accept_invitations(), public.share_exam(uuid, text), public.org_usage(uuid) to authenticated;
grant execute on function public.exams_due_for_purge(), public.mark_images_purged(uuid), public.current_verified_email() to service_role;

-- ---------------------------------------------------------------------------
-- Endurecimiento final: privilegios mínimos por columna y por función
-- ---------------------------------------------------------------------------
revoke update on public.profiles, public.memberships, public.organizations, public.invitations, public.answer_keys from authenticated;
grant update (full_name) on public.profiles to authenticated;
grant update (role) on public.memberships to authenticated;
grant update (name, retention_months) on public.organizations to authenticated;
revoke insert on public.organizations, public.memberships, public.exam_collaborators, public.profiles from authenticated;
revoke delete on public.organizations, public.profiles, public.answer_keys from authenticated;

-- Las funciones internas (triggers, utilidades) no se exponen por la API
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.is_org_member(uuid), public.is_org_admin(uuid), public.shares_org_with(uuid),
  public.can_access_exam(uuid), public.can_edit_exam(uuid), public.is_exam_owner_or_admin(uuid),
  public.sheet_path_exam(text), public.can_read_sheet_path(text), public.can_write_sheet_path(text), public.can_delete_sheet_path(text),
  public.create_organization(text), public.accept_invitations(), public.share_exam(uuid, text), public.org_usage(uuid)
  to authenticated;
grant execute on all functions in schema public to service_role;
