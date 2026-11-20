-- Korrige · esquema base
-- Multi-organización: todo cuelga de organizations; los datos de un examen
-- (hojas, notas, alumnos…) llevan org_id y exam_id para las políticas RLS.

create extension if not exists pgcrypto;

create type public.org_role as enum ('admin', 'profesor');
create type public.exam_status as enum ('borrador', 'hojas_descargadas', 'con_resultados', 'cerrado');

-- ---------------------------------------------------------------------------
-- Organizaciones, perfiles y pertenencia
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  -- RGPD: meses que se conservan las imágenes de las hojas tras cerrar un examen (null = no borrar)
  retention_months int check (retention_months is null or retention_months between 1 and 120),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  created_at timestamptz not null default now()
);
create index profiles_email_idx on public.profiles (lower(email));

create table public.memberships (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.org_role not null default 'profesor',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  email text not null check (email = lower(email) and email like '%_@_%'),
  role public.org_role not null default 'profesor',
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (org_id, email)
);

-- ---------------------------------------------------------------------------
-- Exámenes
-- ---------------------------------------------------------------------------
create table public.exams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete restrict,
  -- código corto que va en el QR de la hoja: UICOMR|<code>|v1 (si llega vacío lo genera un trigger)
  code text not null default '' unique check (code ~ '^[A-Z0-9-]{4,16}$'),
  title text not null check (char_length(title) between 1 and 160),
  subject text not null default '',
  group_name text not null default '',
  session text not null default '',
  exam_date date,
  status public.exam_status not null default 'borrador',
  sheet_config jsonb not null,
  grading_config jsonb not null default '{"formula":"none","penalty":0,"scale":10,"decimals":2,"allowNegative":false}'::jsonb,
  -- correspondencia opcional entre modelos: {"B": {"7": 1, ...}} (pregunta del modelo → pregunta del A)
  model_map jsonb not null default '{}'::jsonb,
  closed_at timestamptz,
  images_purged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index exams_org_idx on public.exams (org_id, created_at desc);
create index exams_owner_idx on public.exams (owner_id);

create table public.exam_layouts (
  exam_id uuid primary key references public.exams (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  layout jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.exam_collaborators (
  exam_id uuid not null references public.exams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  added_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (exam_id, user_id)
);
create index exam_collaborators_user_idx on public.exam_collaborators (user_id);

-- Plantillas de respuestas: una por modelo, versionadas e inmutables.
-- answers: {"1": {"c": ["A"], "v": false}, ...}  (c = correctas, v = anulada)
create table public.answer_keys (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  model text not null check (model in ('A', 'B', 'C', 'D')),
  version int not null check (version >= 1),
  answers jsonb not null,
  source text not null default 'manual' check (source in ('manual', 'escaneo')),
  note text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (exam_id, model, version)
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  identifier text not null check (char_length(identifier) between 1 and 20),
  last_name text not null default '',
  first_name text not null default '',
  email text not null default '',
  group_name text not null default '',
  created_at timestamptz not null default now(),
  unique (exam_id, identifier)
);

-- ---------------------------------------------------------------------------
-- Subidas, hojas, resultados y revisión
-- ---------------------------------------------------------------------------
create table public.uploads (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  file_names text[] not null default '{}',
  n_pages int not null default 0,
  n_sheets int not null default 0,
  n_excluded int not null default 0,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index uploads_exam_idx on public.uploads (exam_id);

-- Una fila por entrega (hoja de un alumno; 1 o 2 páginas escaneadas).
create table public.sheets (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  upload_id uuid not null references public.uploads (id) on delete cascade,
  seq int not null,
  -- [{hoja_pagina, archivo, pdf_pagina, image_path, girada, legible, qr, incidencias}]
  pages jsonb not null default '[]'::jsonb,
  identifier_read text not null default '',
  identifier text not null default '',
  model_read text,
  model text,
  is_key boolean not null default false,
  answers_read jsonb not null default '{}'::jsonb,
  -- respuesta vigente por pregunta: letra, '' (en blanco) o '*' (nula: cuenta como error)
  answers jsonb not null default '{}'::jsonb,
  -- marcas dudosas detectadas: {"7": {"e": "doble", "v": "AB"}}
  marks jsonb not null default '{}'::jsonb,
  -- scores brutos de relleno de cada burbuja
  scores jsonb not null default '{}'::jsonb,
  id_scores jsonb not null default '[]'::jsonb,
  model_scores jsonb not null default '[]'::jsonb,
  incidents jsonb not null default '[]'::jsonb,
  excluded boolean not null default false,
  excluded_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sheets_exam_idx on public.sheets (exam_id, seq);
create index sheets_identifier_idx on public.sheets (exam_id, identifier);

create table public.results (
  sheet_id uuid primary key references public.sheets (id) on delete cascade,
  exam_id uuid not null references public.exams (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  key_version int not null,
  n_correct int not null,
  n_wrong int not null,
  n_blank int not null,
  n_void int not null default 0,
  raw numeric not null,
  grade numeric not null,
  computed_at timestamptz not null default now()
);
create index results_exam_idx on public.results (exam_id);

create table public.review_items (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  sheet_id uuid not null references public.sheets (id) on delete cascade,
  kind text not null check (kind in ('doble', 'floja', 'id_dudoso', 'modelo', 'qr', 'id_no_en_lista', 'en_blanco', 'id_duplicado', 'pagina_faltante', 'ilegible')),
  question int,
  detail jsonb not null default '{}'::jsonb,
  status text not null default 'pendiente' check (status in ('pendiente', 'resuelta')),
  resolution jsonb,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index review_items_exam_idx on public.review_items (exam_id, status);
create index review_items_sheet_idx on public.review_items (sheet_id);

-- ---------------------------------------------------------------------------
-- Auditoría (solo inserción) y leads de ventas
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations (id) on delete cascade,
  exam_id uuid references public.exams (id) on delete set null,
  user_id uuid references public.profiles (id) on delete set null,
  user_email text not null default '',
  action text not null check (char_length(action) between 1 and 60),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_exam_idx on public.audit_log (exam_id, created_at desc);
create index audit_log_org_idx on public.audit_log (org_id, created_at desc);

create table public.sales_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  institution text not null,
  job_title text not null default '',
  n_teachers text not null default '',
  phone text not null default '',
  message text not null default '',
  privacy_accepted boolean not null default false,
  locale text not null default 'es',
  ip_hash text,
  user_agent text,
  email_sent boolean not null default false,
  created_at timestamptz not null default now()
);
create index sales_leads_ip_idx on public.sales_leads (ip_hash, created_at desc);
create index sales_leads_email_idx on public.sales_leads (lower(email), created_at desc);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Perfil automático al registrarse
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create function public.handle_user_email_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end $$;

create trigger on_auth_user_email_changed after update of email on auth.users
for each row when (old.email is distinct from new.email) execute function public.handle_user_email_change();

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger exam_layouts_touch before update on public.exam_layouts for each row execute function public.touch_updated_at();
create trigger sheets_touch before update on public.sheets for each row execute function public.touch_updated_at();

-- Código corto de examen (sin caracteres ambiguos) para el QR
create function public.gen_exam_code() returns text
language plpgsql volatile set search_path = public as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i int;
begin
  loop
    candidate := '';
    for i in 1..8 loop
      candidate := candidate || substr(alphabet, 1 + (get_byte(gen_random_bytes(1), 0) % 32), 1);
    end loop;
    exit when not exists (select 1 from public.exams where code = candidate);
  end loop;
  return candidate;
end $$;

create function public.exams_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.code is null or new.code = '' then
    new.code := public.gen_exam_code();
  end if;
  return new;
end $$;

create trigger exams_before_insert before insert on public.exams
for each row execute function public.exams_before_insert();

-- Reglas de negocio del examen:
--  · org_id, code y created_at son inmutables
--  · con hojas subidas, la configuración de la hoja queda bloqueada
--  · un examen cerrado es de solo lectura (salvo reabrirlo)
create function public.exams_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.org_id <> old.org_id or new.code <> old.code then
    raise exception 'org_id y code no se pueden cambiar' using errcode = 'check_violation';
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

create trigger exams_before_update before update on public.exams
for each row execute function public.exams_before_update();

-- El layout se bloquea en cuanto hay hojas subidas
create function public.exam_layouts_lock() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.exams e where e.id = old.exam_id)
     and exists (select 1 from public.sheets s where s.exam_id = old.exam_id) then
    raise exception 'El layout queda bloqueado al subir hojas: crea un examen nuevo' using errcode = 'check_violation';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end $$;

create trigger exam_layouts_lock before update or delete on public.exam_layouts
for each row execute function public.exam_layouts_lock();

-- org_id de las tablas hijas: siempre el del examen (el cliente no puede falsearlo)
create function public.set_org_from_exam() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.exams where id = new.exam_id;
  if v_org is null then
    raise exception 'Examen inexistente' using errcode = 'foreign_key_violation';
  end if;
  new.org_id := v_org;
  return new;
end $$;

create trigger exam_layouts_org before insert on public.exam_layouts for each row execute function public.set_org_from_exam();
create trigger answer_keys_org before insert on public.answer_keys for each row execute function public.set_org_from_exam();
create trigger students_org before insert on public.students for each row execute function public.set_org_from_exam();
create trigger uploads_org before insert on public.uploads for each row execute function public.set_org_from_exam();
create trigger sheets_org before insert on public.sheets for each row execute function public.set_org_from_exam();
create trigger results_org before insert on public.results for each row execute function public.set_org_from_exam();
create trigger review_items_org before insert on public.review_items for each row execute function public.set_org_from_exam();

-- Auditoría: el autor es siempre el usuario autenticado
create function public.audit_log_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    new.user_id := auth.uid();
  end if;
  if new.user_id is not null then
    new.user_email := coalesce((select email from public.profiles where id = new.user_id), '');
  end if;
  if new.exam_id is not null then
    new.org_id := coalesce((select org_id from public.exams where id = new.exam_id), new.org_id);
  end if;
  new.created_at := now();
  return new;
end $$;

create trigger audit_log_before_insert before insert on public.audit_log
for each row execute function public.audit_log_before_insert();

-- Una organización no puede quedarse sin administradores
create function public.memberships_keep_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'admin'
     and (tg_op = 'DELETE' or new.role <> 'admin')
     and exists (select 1 from public.organizations o where o.id = old.org_id)
     and not exists (
       select 1 from public.memberships m
       where m.org_id = old.org_id and m.role = 'admin' and m.user_id <> old.user_id
     ) then
    raise exception 'La organización debe tener al menos un administrador' using errcode = 'check_violation';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end $$;

create trigger memberships_keep_admin before update or delete on public.memberships
for each row execute function public.memberships_keep_admin();
