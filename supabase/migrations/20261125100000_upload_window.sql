-- Plazo de subida de hojas
--   Un examen admite hojas escaneadas durante 30 días desde su primera subida. Después sigue
--   disponible para consultar, revisar, corregir la plantilla y exportar, pero no admite más hojas.
--   Evita reutilizar un mismo examen (el gratuito o los de Korrige Plus) para corregir todos los del curso.
--   Las organizaciones Academy no tienen plazo. Si cambia, cambiar también PLAN.uploadWindowDays en src/config.ts.
alter table public.exams add column first_upload_at timestamptz;

create or replace function public.exams_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_free constant text[] := array['images_purged_at', 'updated_at', 'answers_published', 'answers_publish_at', 'answers_code', 'answers_calculator', 'first_upload_at'];
begin
  if new.org_id <> old.org_id or new.code <> old.code then
    raise exception 'org_id y code no se pueden cambiar' using errcode = 'check_violation';
  end if;
  new.created_at := old.created_at;
  -- la fecha de la primera subida se anota una vez y no se puede borrar ni mover desde la API
  if auth.uid() is not null then
    if old.first_upload_at is not null then
      new.first_upload_at := old.first_upload_at;
    elsif new.first_upload_at is not null then
      new.first_upload_at := now();
    end if;
  end if;
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
    if (to_jsonb(new) - v_free) is distinct from (to_jsonb(old) - v_free) then
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

-- Los exámenes que ya tenían hojas: el plazo cuenta desde su primera subida
update public.exams e
set first_upload_at = (select min(u.created_at) from public.uploads u where u.exam_id = e.id)
where exists (select 1 from public.uploads u where u.exam_id = e.id);

-- Al subir hojas: anota la primera subida y rechaza las que lleguen fuera de plazo
create function public.enforce_upload_window() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_first timestamptz;
  v_plan text;
begin
  -- el servicio (scripts, soporte) no tiene plazo
  if auth.uid() is null then
    return new;
  end if;
  select x.first_upload_at, o.plan into v_first, v_plan
  from public.exams x join public.organizations o on o.id = x.org_id
  where x.id = new.exam_id;
  if not found then
    return new;
  end if;
  if v_first is null then
    update public.exams set first_upload_at = now() where id = new.exam_id;
  elsif v_plan <> 'academy' and now() > v_first + interval '30 days' then
    raise exception 'PLAZO_SUBIDA: el plazo de 30 días para subir hojas a este examen ha terminado. Crea un examen nuevo para seguir corrigiendo' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger uploads_window before insert on public.uploads
for each row execute function public.enforce_upload_window();
create trigger sheets_window before insert on public.sheets
for each row execute function public.enforce_upload_window();

revoke execute on function public.exams_before_update(), public.enforce_upload_window() from public, anon, authenticated;
