-- Endurecimiento tras la revisión de seguridad
--   1. Un coautor podía ponerse como propietario de un examen (update de owner_id).
--   2. Dos altas simultáneas de examen podían saltarse el límite del plan.
--   3. El código del examen y la fecha de alta los fija el servidor, no el cliente.
--   4. Invitaciones: tope de pendientes por organización y registro de correos enviados.

-- 1 y 3 · Examen: propietario, código y fecha de alta
create or replace function public.exams_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- desde la API el código siempre lo genera el servidor (solo el servicio puede fijarlo)
  if auth.uid() is not null or new.code is null or new.code = '' then
    new.code := public.gen_exam_code();
  end if;
  if auth.uid() is not null then
    new.created_at := now();
    new.closed_at := null;
    new.images_purged_at := null;
  end if;
  return new;
end $$;

create or replace function public.exams_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.org_id <> old.org_id or new.code <> old.code then
    raise exception 'org_id y code no se pueden cambiar' using errcode = 'check_violation';
  end if;
  new.created_at := old.created_at;
  -- el propietario solo lo cambia un administrador, y siempre a alguien de la organización
  if new.owner_id <> old.owner_id then
    if auth.uid() is not null and not public.is_org_admin(old.org_id) then
      raise exception 'Solo un administrador puede cambiar el propietario del examen' using errcode = 'insufficient_privilege';
    end if;
    if not exists (select 1 from public.memberships m where m.org_id = old.org_id and m.user_id = new.owner_id) then
      raise exception 'El nuevo propietario debe pertenecer a la organización' using errcode = 'check_violation';
    end if;
  end if;
  if new.sheet_config is distinct from old.sheet_config
     and exists (select 1 from public.sheets s where s.exam_id = old.id) then
    raise exception 'La hoja de respuestas queda bloqueada al subir hojas: crea un examen nuevo' using errcode = 'check_violation';
  end if;
  if old.status = 'cerrado' and new.status = 'cerrado' then
    -- solo se permite que el servicio de retención marque el borrado de imágenes
    if (to_jsonb(new) - 'images_purged_at' - 'updated_at') is distinct from (to_jsonb(old) - 'images_purged_at' - 'updated_at') then
      raise exception 'El examen está cerrado: reábrelo para modificarlo' using errcode = 'check_violation';
    end if;
  end if;
  if new.status = 'cerrado' and old.status <> 'cerrado' then
    new.closed_at := now();
  elsif new.status <> 'cerrado' and old.status = 'cerrado' then
    new.closed_at := null;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- 2 · Límite del plan: las altas de un mismo usuario se procesan de una en una
create or replace function public.exams_enforce_quota() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_month date := date_trunc('month', now())::date;
  v_total int;
  v_month_n int;
begin
  -- el servicio (scripts, soporte) no tiene límite
  if auth.uid() is null then
    return new;
  end if;
  -- organizaciones Academy: sin límite y sin consumir cuota personal
  if exists (select 1 from public.organizations o where o.id = new.org_id and o.plan = 'academy') then
    return new;
  end if;
  -- sin este bloqueo, dos peticiones a la vez leerían el mismo consumo y pasarían las dos
  perform pg_advisory_xact_lock(hashtextextended('korrige.exam_quota:' || new.owner_id::text, 0));
  select coalesce(sum(n), 0), coalesce(sum(n) filter (where period = v_month), 0)
    into v_total, v_month_n from public.exam_usage where user_id = new.owner_id;
  if public.user_has_plus(new.owner_id) then
    if v_month_n >= 5 then
      raise exception 'LIMITE_PLUS: has creado los 5 exámenes de este mes incluidos en Korrige Plus' using errcode = 'P0001';
    end if;
  elsif v_total >= 1 then
    raise exception 'LIMITE_GRATIS: ya has usado tu examen gratuito. Pasa a Korrige Plus para crear más' using errcode = 'P0001';
  end if;
  insert into public.exam_usage (user_id, period, n) values (new.owner_id, v_month, 1)
  on conflict (user_id, period) do update set n = public.exam_usage.n + 1;
  return new;
end $$;

-- 4 · Invitaciones: tope de pendientes y registro de correos enviados
-- El registro lo escribe solo la función «send-invite» (service_role) para limitar los envíos;
-- va aparte de la invitación para que borrarla y volver a crearla no reinicie la cuenta.
create table public.invitation_sends (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  sent_by uuid references public.profiles (id) on delete set null,
  sent_at timestamptz not null default now()
);
create index invitation_sends_org_idx on public.invitation_sends (org_id, sent_at);
alter table public.invitation_sends enable row level security; -- sin políticas: solo service_role
revoke all on public.invitation_sends from anon, authenticated;
grant all on public.invitation_sends to service_role;

create function public.invitations_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    new.accepted_at := null;
    new.created_at := now();
  end if;
  if (select count(*) from public.invitations i where i.org_id = new.org_id and i.accepted_at is null) >= 200 then
    raise exception 'Hay demasiadas invitaciones pendientes en esta organización' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger invitations_before_insert before insert on public.invitations
for each row execute function public.invitations_before_insert();

revoke execute on function public.exams_before_insert(), public.exams_before_update(), public.exams_enforce_quota(), public.invitations_before_insert()
  from public, anon, authenticated;
