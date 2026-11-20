-- Korrige · seguridad a nivel de fila (RLS) en TODAS las tablas.
-- Regla general: ningún dato de una organización es accesible desde otra.
--  · admin de la organización: ve todos los exámenes de su organización
--  · profesor: solo los suyos y los que le compartan (coautor)
--  · examen cerrado: solo lectura

-- ---------------------------------------------------------------------------
-- Funciones auxiliares (security definer para evitar recursión entre políticas)
-- ---------------------------------------------------------------------------
create function public.is_org_member(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships m where m.org_id = p_org and m.user_id = auth.uid());
$$;

create function public.is_org_admin(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships m where m.org_id = p_org and m.user_id = auth.uid() and m.role = 'admin');
$$;

create function public.shares_org_with(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships a
    join public.memberships b on b.org_id = a.org_id
    where a.user_id = auth.uid() and b.user_id = p_user
  );
$$;

create function public.can_access_exam(p_exam uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.exams e
    join public.memberships m on m.org_id = e.org_id and m.user_id = auth.uid()
    where e.id = p_exam
      and (
        m.role = 'admin'
        or e.owner_id = auth.uid()
        or exists (select 1 from public.exam_collaborators c where c.exam_id = e.id and c.user_id = auth.uid())
      )
  );
$$;

create function public.can_edit_exam(p_exam uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.can_access_exam(p_exam)
     and exists (select 1 from public.exams e where e.id = p_exam and e.status <> 'cerrado');
$$;

create function public.is_exam_owner_or_admin(p_exam uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.exams e
    join public.memberships m on m.org_id = e.org_id and m.user_id = auth.uid()
    where e.id = p_exam and (m.role = 'admin' or e.owner_id = auth.uid())
  );
$$;

revoke all on function public.is_org_member(uuid), public.is_org_admin(uuid), public.shares_org_with(uuid),
  public.can_access_exam(uuid), public.can_edit_exam(uuid), public.is_exam_owner_or_admin(uuid) from public;
grant execute on function public.is_org_member(uuid), public.is_org_admin(uuid), public.shares_org_with(uuid),
  public.can_access_exam(uuid), public.can_edit_exam(uuid), public.is_exam_owner_or_admin(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Privilegios: la API pública (anon) no toca ninguna tabla.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on
  public.organizations, public.profiles, public.memberships, public.invitations,
  public.exams, public.exam_layouts, public.exam_collaborators, public.answer_keys, public.students,
  public.uploads, public.sheets, public.results, public.review_items
  to authenticated;
grant select, insert on public.audit_log to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.exams enable row level security;
alter table public.exam_layouts enable row level security;
alter table public.exam_collaborators enable row level security;
alter table public.answer_keys enable row level security;
alter table public.students enable row level security;
alter table public.uploads enable row level security;
alter table public.sheets enable row level security;
alter table public.results enable row level security;
alter table public.review_items enable row level security;
alter table public.audit_log enable row level security;
alter table public.sales_leads enable row level security; -- sin políticas: solo service_role (Edge Function)

-- ---------------------------------------------------------------------------
-- Organizaciones y personas
-- ---------------------------------------------------------------------------
create policy organizations_select on public.organizations for select to authenticated
  using (public.is_org_member(id));
create policy organizations_update on public.organizations for update to authenticated
  using (public.is_org_admin(id)) with check (public.is_org_admin(id));
-- alta: solo con la función create_organization(); baja: no disponible desde la API

create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_org_with(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy memberships_select on public.memberships for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(org_id));
create policy memberships_update on public.memberships for update to authenticated
  using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));
create policy memberships_delete on public.memberships for delete to authenticated
  using (public.is_org_admin(org_id) or user_id = auth.uid());
-- alta: solo con create_organization() / accept_invitations()

create policy invitations_select on public.invitations for select to authenticated
  using (public.is_org_admin(org_id) or email = lower(coalesce(auth.jwt() ->> 'email', '')));
create policy invitations_insert on public.invitations for insert to authenticated
  with check (public.is_org_admin(org_id) and invited_by = auth.uid());
create policy invitations_delete on public.invitations for delete to authenticated
  using (public.is_org_admin(org_id));

-- ---------------------------------------------------------------------------
-- Exámenes
-- ---------------------------------------------------------------------------
create policy exams_select on public.exams for select to authenticated
  using (
    public.is_org_member(org_id)
    and (owner_id = auth.uid() or public.is_org_admin(org_id) or public.can_access_exam(id))
  );
create policy exams_insert on public.exams for insert to authenticated
  with check (owner_id = auth.uid() and public.is_org_member(org_id));
create policy exams_update on public.exams for update to authenticated
  using (public.can_access_exam(id))
  with check (public.is_org_member(org_id));
create policy exams_delete on public.exams for delete to authenticated
  using (public.is_exam_owner_or_admin(id));

create policy exam_layouts_select on public.exam_layouts for select to authenticated using (public.can_access_exam(exam_id));
create policy exam_layouts_insert on public.exam_layouts for insert to authenticated with check (public.can_edit_exam(exam_id));
create policy exam_layouts_update on public.exam_layouts for update to authenticated
  using (public.can_edit_exam(exam_id)) with check (public.can_edit_exam(exam_id));

create policy exam_collaborators_select on public.exam_collaborators for select to authenticated using (public.can_access_exam(exam_id));
create policy exam_collaborators_delete on public.exam_collaborators for delete to authenticated
  using (public.is_exam_owner_or_admin(exam_id) or user_id = auth.uid());
-- alta: solo con share_exam()

-- Plantillas: versionadas e inmutables (sin update ni delete)
create policy answer_keys_select on public.answer_keys for select to authenticated using (public.can_access_exam(exam_id));
create policy answer_keys_insert on public.answer_keys for insert to authenticated
  with check (public.can_edit_exam(exam_id) and created_by = auth.uid());

-- Datos del examen: lectura si tienes acceso; escritura si además no está cerrado
do $$
declare
  t text;
begin
  foreach t in array array['students', 'uploads', 'sheets', 'results', 'review_items'] loop
    execute format('create policy %1$s_select on public.%1$s for select to authenticated using (public.can_access_exam(exam_id))', t);
    execute format('create policy %1$s_insert on public.%1$s for insert to authenticated with check (public.can_edit_exam(exam_id))', t);
    execute format('create policy %1$s_update on public.%1$s for update to authenticated using (public.can_edit_exam(exam_id)) with check (public.can_edit_exam(exam_id))', t);
    execute format('create policy %1$s_delete on public.%1$s for delete to authenticated using (public.can_edit_exam(exam_id))', t);
  end loop;
end $$;

-- Auditoría: solo lectura e inserción (nunca update/delete)
create policy audit_log_select on public.audit_log for select to authenticated
  using (public.is_org_admin(org_id) or (exam_id is not null and public.can_access_exam(exam_id)) or (exam_id is null and user_id = auth.uid()));
create policy audit_log_insert on public.audit_log for insert to authenticated
  with check (public.is_org_member(org_id) and (exam_id is null or public.can_access_exam(exam_id)));
