-- Publicación de las respuestas correctas para los alumnos (korrige.es/comprobar)
--   El profesor decide si se publican, desde cuándo, con qué código y si se ofrece
--   la calculadora de nota. La página pública solo recibe la plantilla: ningún dato de alumnos.
alter table public.exams
  add column answers_published boolean not null default false,
  add column answers_publish_at timestamptz,
  -- código elegido por el profesor; si es null vale el código del examen
  add column answers_code text check (answers_code ~ '^[A-Z0-9]{5,16}$'),
  add column answers_calculator boolean not null default false;
create unique index exams_answers_code_idx on public.exams (answers_code) where answers_code is not null;

-- El código elegido no puede coincidir con el código de otro examen
create function public.exams_answers_code_check() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.answers_code is not null then
    if new.answers_code = new.code then
      new.answers_code := null;
    elsif exists (select 1 from public.exams x where x.id <> new.id and x.code = new.answers_code) then
      raise exception 'Ese código ya está en uso: elige otro' using errcode = 'unique_violation';
    end if;
  end if;
  return new;
end $$;
create trigger exams_answers_code_check before insert or update of answers_code on public.exams
for each row execute function public.exams_answers_code_check();

-- Un examen cerrado sigue siendo de solo lectura, salvo publicar o retirar las respuestas
create or replace function public.exams_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_free constant text[] := array['images_purged_at', 'updated_at', 'answers_published', 'answers_publish_at', 'answers_code', 'answers_calculator'];
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

-- Lo único que se puede leer sin sesión: la plantilla de un examen publicado y ya en fecha.
-- Un examen sin publicar responde igual que un código inexistente.
create function public.public_answer_key(p_code text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9-]', '', 'g'));
  e public.exams;
  v_models jsonb;
  v_updated timestamptz;
begin
  if char_length(v_code) < 4 or char_length(v_code) > 16 then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into e from public.exams x
  where x.answers_published and (x.answers_code = v_code or (x.answers_code is null and x.code = v_code))
  limit 1;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if e.answers_publish_at is not null and e.answers_publish_at > now() then
    return jsonb_build_object('status', 'scheduled', 'title', e.title, 'subject', e.subject, 'publish_at', e.answers_publish_at);
  end if;
  select jsonb_agg(jsonb_build_object('model', k.model, 'answers', k.answers) order by k.model), max(k.created_at)
    into v_models, v_updated
  from (select distinct on (model) model, answers, created_at from public.answer_keys where exam_id = e.id order by model, version desc) k;
  return jsonb_build_object(
    'status', 'published',
    'title', e.title,
    'subject', e.subject,
    'session', e.session,
    'exam_date', e.exam_date,
    'n_questions', (e.sheet_config ->> 'nQuestions')::int,
    'n_options', (e.sheet_config ->> 'nOptions')::int,
    'models', coalesce(v_models, '[]'::jsonb),
    'published_at', e.answers_publish_at,
    'updated_at', v_updated,
    'grading', case when e.answers_calculator then e.grading_config else null end
  );
end $$;

revoke execute on function public.exams_answers_code_check(), public.exams_before_update(), public.public_answer_key(text) from public, anon, authenticated;
grant execute on function public.public_answer_key(text) to anon, authenticated, service_role;
