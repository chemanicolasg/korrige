-- Tests de RLS de Korrige. Se ejecutan dentro de una transacción que se revierte.
-- Cada bloque inicia sesión como un usuario distinto (rol `authenticated` + JWT).
\set ON_ERROR_STOP 1
begin;

create schema tests;
grant usage on schema tests to anon, authenticated;

create function tests.login(p_user uuid) returns void language plpgsql as $$
declare v_email text;
begin
  perform set_config('role', current_setting('tests.super'), true);
  select email into v_email from auth.users where id = p_user;
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated', 'email', v_email)::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create function tests.anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end $$;
create function tests.su() returns void language plpgsql as $$
begin
  perform set_config('role', current_setting('tests.super'), true);
  perform set_config('request.jwt.claims', '', true);
end $$;
create function tests.eq(got bigint, want bigint, msg text) returns void language plpgsql as $$
begin
  if got is distinct from want then
    raise exception 'FALLO: % (obtenido %, esperado %)', msg, got, want;
  end if;
  raise notice 'ok  %', msg;
end $$;
create function tests.n(q text) returns bigint language plpgsql as $$
declare c bigint;
begin
  execute 'select count(*) from (' || q || ') t' into c;
  return c;
end $$;
create function tests.affected(q text) returns bigint language plpgsql as $$
declare c bigint;
begin
  execute q;
  get diagnostics c = row_count;
  return c;
end $$;
create function tests.throws(q text, msg text) returns void language plpgsql as $$
begin
  begin
    execute q;
  exception when others then
    raise notice 'ok  % → %', msg, sqlerrm;
    return;
  end;
  raise exception 'FALLO: debería haber sido rechazado: %', msg;
end $$;

select set_config('tests.super', current_user, true);

-- ---------------------------------------------------------------------------
-- Datos: dos organizaciones que no deben verse entre sí
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'ana@a.test'),     -- admin de A
  ('a0000000-0000-0000-0000-000000000002', 'pablo@a.test'),   -- profesor de A (propietario del examen)
  ('a0000000-0000-0000-0000-000000000003', 'paula@a.test'),   -- profesora de A (sin relación con el examen)
  ('b0000000-0000-0000-0000-000000000001', 'berta@b.test'),   -- admin de B
  ('b0000000-0000-0000-0000-000000000002', 'bruno@b.test'),   -- profesor de B
  ('c0000000-0000-0000-0000-000000000001', 'carla@c.test');   -- sin organización
insert into auth.users (id, email, email_confirmed_at) values
  ('c0000000-0000-0000-0000-000000000002', 'sinverificar@a.test', null);
select tests.eq((select count(*) from public.profiles), 7, 'el trigger crea un perfil por usuario');

insert into public.organizations (id, name) values
  ('0a000000-0000-0000-0000-000000000000', 'Facultad A'),
  ('0b000000-0000-0000-0000-000000000000', 'Academia B');
insert into public.memberships (org_id, user_id, role) values
  ('0a000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'admin'),
  ('0a000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000002', 'profesor'),
  ('0a000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000003', 'profesor'),
  ('0b000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000001', 'admin'),
  ('0b000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000002', 'profesor');

-- Pablo crea su examen con todo el material
select tests.login('a0000000-0000-0000-0000-000000000002');
insert into public.exams (id, org_id, owner_id, title, sheet_config)
values ('e1000000-0000-0000-0000-000000000000', '0a000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000002', 'Anatomía I', '{"nQuestions":100}');
select tests.eq(tests.n($$select 1 from public.exams where id = 'e1000000-0000-0000-0000-000000000000' and code ~ '^[A-Z2-9]{8}$'$$), 1, 'el examen recibe un código corto para el QR');
insert into public.exam_layouts (exam_id, org_id, layout) values ('e1000000-0000-0000-0000-000000000000', '0b000000-0000-0000-0000-000000000000', '{"version":1}');
select tests.eq(tests.n($$select 1 from public.exam_layouts where org_id = '0a000000-0000-0000-0000-000000000000'$$), 1, 'org_id de las tablas hijas se toma del examen (no se puede falsear)');
insert into public.answer_keys (exam_id, org_id, model, version, answers, created_by)
values ('e1000000-0000-0000-0000-000000000000', '0a000000-0000-0000-0000-000000000000', 'A', 1, '{}', 'a0000000-0000-0000-0000-000000000002');
insert into public.students (exam_id, org_id, identifier, last_name) values ('e1000000-0000-0000-0000-000000000000', '0a000000-0000-0000-0000-000000000000', '12456790', 'García');
insert into public.uploads (id, exam_id, org_id, n_pages) values ('f1000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000000', '0a000000-0000-0000-0000-000000000000', 1);
insert into public.sheets (id, exam_id, org_id, upload_id, seq, identifier)
values ('51000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000000', '0a000000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000000', 1, '12456790');
insert into public.results (sheet_id, exam_id, org_id, key_version, n_correct, n_wrong, n_blank, raw, grade)
values ('51000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000000', '0a000000-0000-0000-0000-000000000000', 1, 29, 0, 71, 29, 2.9);
insert into public.review_items (exam_id, org_id, sheet_id, kind, question)
values ('e1000000-0000-0000-0000-000000000000', '0a000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000000', 'doble', 7);
insert into public.audit_log (org_id, exam_id, user_id, action)
values ('0a000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000002', 'examen_creado');
select tests.eq(tests.n($$select 1 from public.audit_log where action = 'examen_creado' and user_email = 'pablo@a.test'$$), 1, 'auditoría: el autor es siempre el usuario autenticado');
insert into storage.objects (bucket_id, name) values ('sheets', '0a000000-0000-0000-0000-000000000000/e1000000-0000-0000-0000-000000000000/f1000000-0000-0000-0000-000000000000/1.jpg');

-- Bruno crea el suyo en la organización B
select tests.login('b0000000-0000-0000-0000-000000000002');
insert into public.exams (id, org_id, owner_id, title, sheet_config)
values ('e2000000-0000-0000-0000-000000000000', '0b000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000002', 'Examen B', '{}');

-- ---------------------------------------------------------------------------
-- 1. anon no ve nada
-- ---------------------------------------------------------------------------
select tests.anon();
select tests.throws('select * from public.exams', 'anon no puede leer exams');
select tests.throws('select * from public.sheets', 'anon no puede leer sheets');
select tests.throws('select * from public.sales_leads', 'anon no puede leer sales_leads');
select tests.throws($$insert into public.sales_leads (name, email, institution) values ('x', 'x@x.es', 'x')$$, 'anon no puede insertar leads directamente');
select tests.throws($$select public.create_organization('X')$$, 'anon no puede crear organizaciones');
select tests.eq(tests.n('select 1 from storage.objects'), 0, 'anon no ve objetos de Storage');

-- ---------------------------------------------------------------------------
-- 2. Aislamiento entre organizaciones (Bruno, org B, frente al examen de A)
-- ---------------------------------------------------------------------------
select tests.login('b0000000-0000-0000-0000-000000000002');
select tests.eq(tests.n('select 1 from public.exams'), 1, 'Bruno solo ve su examen');
select tests.eq(tests.n('select 1 from public.organizations'), 1, 'Bruno solo ve su organización');
select tests.eq(tests.n($$select 1 from public.profiles where email like '%@a.test'$$), 0, 'Bruno no ve perfiles de la organización A');
select tests.eq(tests.n($$select 1 from public.memberships where org_id = '0a000000-0000-0000-0000-000000000000'$$), 0, 'Bruno no ve miembros de A');
select tests.eq(tests.n('select 1 from public.exam_layouts'), 0, 'Bruno no ve layouts de A');
select tests.eq(tests.n('select 1 from public.answer_keys'), 0, 'Bruno no ve plantillas de A');
select tests.eq(tests.n('select 1 from public.students'), 0, 'Bruno no ve alumnos de A');
select tests.eq(tests.n('select 1 from public.uploads'), 0, 'Bruno no ve subidas de A');
select tests.eq(tests.n('select 1 from public.sheets'), 0, 'Bruno no ve hojas de A');
select tests.eq(tests.n('select 1 from public.results'), 0, 'Bruno no ve notas de A');
select tests.eq(tests.n('select 1 from public.review_items'), 0, 'Bruno no ve incidencias de A');
select tests.eq(tests.n('select 1 from public.audit_log'), 0, 'Bruno no ve la auditoría de A');
select tests.eq(tests.n('select 1 from storage.objects'), 0, 'Bruno no ve imágenes de A');
select tests.eq(tests.affected($$update public.exams set title = 'hack' where id = 'e1000000-0000-0000-0000-000000000000'$$), 0, 'Bruno no puede editar el examen de A');
select tests.eq(tests.affected($$delete from public.exams where id = 'e1000000-0000-0000-0000-000000000000'$$), 0, 'Bruno no puede borrar el examen de A');
select tests.eq(tests.affected($$update public.sheets set identifier = '0'$$), 0, 'Bruno no puede editar hojas de A');
select tests.eq(tests.affected($$delete from public.results$$), 0, 'Bruno no puede borrar notas de A');
select tests.throws($$insert into public.students (exam_id, org_id, identifier) values ('e1000000-0000-0000-0000-000000000000', '0b000000-0000-0000-0000-000000000000', '1')$$, 'Bruno no puede insertar alumnos en el examen de A');
select tests.throws($$insert into public.sheets (exam_id, org_id, upload_id, seq) values ('e1000000-0000-0000-0000-000000000000', '0b000000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000000', 9)$$, 'Bruno no puede insertar hojas en el examen de A');
select tests.throws($$insert into public.answer_keys (exam_id, org_id, model, version, answers, created_by) values ('e1000000-0000-0000-0000-000000000000', '0a000000-0000-0000-0000-000000000000', 'A', 2, '{}', 'b0000000-0000-0000-0000-000000000002')$$, 'Bruno no puede crear plantillas en el examen de A');
select tests.throws($$insert into public.audit_log (org_id, exam_id, action) values ('0a000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000000', 'x')$$, 'Bruno no puede escribir en la auditoría de A');
select tests.throws($$insert into public.exams (org_id, owner_id, title, sheet_config) values ('0a000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000002', 'intruso', '{}')$$, 'Bruno no puede crear exámenes en la organización A');
select tests.throws($$insert into public.exams (org_id, owner_id, title, sheet_config) values ('0b000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000001', 'a nombre de otro', '{}')$$, 'no se pueden crear exámenes a nombre de otra persona');
select tests.throws($$insert into storage.objects (bucket_id, name) values ('sheets', '0a000000-0000-0000-0000-000000000000/e1000000-0000-0000-0000-000000000000/x/9.jpg')$$, 'Bruno no puede subir imágenes al examen de A');
select tests.throws($$insert into storage.objects (bucket_id, name) values ('sheets', '0b000000-0000-0000-0000-000000000000/e1000000-0000-0000-0000-000000000000/x/9.jpg')$$, 'la ruta de Storage debe casar organización y examen');
select tests.eq(tests.affected($$delete from storage.objects$$), 0, 'Bruno no puede borrar imágenes de A');
select tests.throws($$select public.share_exam('e1000000-0000-0000-0000-000000000000', 'bruno@b.test')$$, 'Bruno no puede compartirse el examen de A');
select tests.throws($$select * from public.org_usage('0a000000-0000-0000-0000-000000000000')$$, 'Bruno no puede ver el uso de A');
select tests.throws($$insert into public.memberships (org_id, user_id, role) values ('0a000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000002', 'admin')$$, 'nadie puede darse de alta en otra organización');
select tests.throws($$insert into public.invitations (org_id, email, invited_by) values ('0a000000-0000-0000-0000-000000000000', 'bruno@b.test', 'b0000000-0000-0000-0000-000000000002')$$, 'Bruno no puede invitar en A');
select tests.throws('select * from public.sales_leads', 'un profesor no ve los leads de ventas');
select tests.throws($$select public.mark_images_purged('e1000000-0000-0000-0000-000000000000')$$, 'las funciones internas no se pueden llamar por RPC (purga de imágenes)');
select tests.throws($$select * from public.exams_due_for_purge()$$, 'las funciones internas no se pueden llamar por RPC (retención)');
select tests.throws($$select public.gen_exam_code()$$, 'las funciones internas no se pueden llamar por RPC (utilidades)');

-- ---------------------------------------------------------------------------
-- 3. Dentro de la organización: profesor ≠ propietario
-- ---------------------------------------------------------------------------
select tests.login('a0000000-0000-0000-0000-000000000003'); -- Paula
select tests.eq(tests.n('select 1 from public.exams'), 0, 'Paula (misma org) no ve el examen de Pablo si no se lo comparten');
select tests.eq(tests.n('select 1 from public.sheets'), 0, 'Paula no ve las hojas de Pablo');
select tests.eq(tests.n('select 1 from storage.objects'), 0, 'Paula no ve las imágenes de Pablo');
select tests.eq(tests.n($$select 1 from public.profiles where email = 'pablo@a.test'$$), 1, 'Paula sí ve el perfil de sus compañeros');
select tests.eq(tests.affected($$update public.memberships set role = 'admin' where user_id = auth.uid()$$), 0, 'un profesor no puede hacerse administrador');
select tests.throws($$select public.share_exam('e1000000-0000-0000-0000-000000000000', 'paula@a.test')$$, 'Paula no puede compartirse el examen');
select tests.eq(tests.affected($$update public.organizations set name = 'x'$$), 0, 'un profesor no puede renombrar la organización');
select tests.eq(tests.affected($$update public.organizations set exam_defaults = '{"idLabel":"X"}'$$), 0, 'un profesor no puede cambiar los valores por defecto de la organización');

select tests.login('a0000000-0000-0000-0000-000000000002'); -- Pablo comparte
select tests.throws($$select public.share_exam('e1000000-0000-0000-0000-000000000000', 'bruno@b.test')$$, 'no se puede compartir con alguien de otra organización');
select public.share_exam('e1000000-0000-0000-0000-000000000000', 'paula@a.test');

select tests.login('a0000000-0000-0000-0000-000000000003'); -- Paula, ya coautora
select tests.eq(tests.n('select 1 from public.exams'), 1, 'Paula ve el examen compartido');
select tests.eq(tests.affected($$update public.sheets set identifier = '12456791'$$), 1, 'la coautora puede corregir hojas');
select tests.eq(tests.n('select 1 from storage.objects'), 1, 'la coautora ve las imágenes');
select tests.eq(tests.affected($$delete from public.exams where id = 'e1000000-0000-0000-0000-000000000000'$$), 0, 'la coautora no puede borrar el examen');

select tests.login('a0000000-0000-0000-0000-000000000001'); -- Ana, admin
select tests.eq(tests.n('select 1 from public.exams'), 1, 'la admin ve todos los exámenes de su organización');
select tests.eq(tests.n('select 1 from public.exams where org_id <> ''0a000000-0000-0000-0000-000000000000'''), 0, 'la admin no ve exámenes de otras organizaciones');
select tests.eq(tests.n($$select 1 from public.org_usage('0a000000-0000-0000-0000-000000000000')$$), 3, 'la admin ve el uso de su organización');
select tests.eq(tests.affected($$update public.organizations set retention_months = 12 where id = '0a000000-0000-0000-0000-000000000000'$$), 1, 'la admin configura la retención');
select tests.eq(tests.affected($$update public.organizations set exam_defaults = '{"idLabel":"NIUB","idDigits":8}' where id = '0a000000-0000-0000-0000-000000000000'$$), 1, 'la admin configura los valores por defecto de los exámenes');
select tests.eq(tests.affected($$update public.organizations set retention_months = 1 where id = '0b000000-0000-0000-0000-000000000000'$$), 0, 'la admin no toca otra organización');
select tests.throws($$update public.memberships set role = 'profesor' where user_id = auth.uid()$$, 'la organización no puede quedarse sin administradores');
insert into public.invitations (org_id, email, invited_by) values
  ('0a000000-0000-0000-0000-000000000000', 'carla@c.test', 'a0000000-0000-0000-0000-000000000001'),
  ('0a000000-0000-0000-0000-000000000000', 'sinverificar@a.test', 'a0000000-0000-0000-0000-000000000001');

-- Revisión de seguridad: propietario, código y fecha del examen
select tests.login('a0000000-0000-0000-0000-000000000003'); -- Paula, coautora (no propietaria)
select tests.throws($$update public.exams set owner_id = auth.uid() where id = 'e1000000-0000-0000-0000-000000000000'$$, 'una coautora no puede quedarse con el examen');
select tests.throws($$update public.exams set code = 'AAAAAAAA' where id = 'e1000000-0000-0000-0000-000000000000'$$, 'el código del examen no se cambia');
update public.exams set created_at = '2000-01-01' where id = 'e1000000-0000-0000-0000-000000000000';
select tests.eq(tests.n($$select 1 from public.exams where id = 'e1000000-0000-0000-0000-000000000000' and created_at > now() - interval '1 day'$$), 1, 'la fecha de alta no se puede falsear');
select tests.login('a0000000-0000-0000-0000-000000000001'); -- Ana, admin
select tests.throws($$update public.exams set owner_id = 'b0000000-0000-0000-0000-000000000002' where id = 'e1000000-0000-0000-0000-000000000000'$$, 'ni la admin puede dar el examen a alguien de fuera');
select tests.eq(tests.affected($$update public.exams set owner_id = 'a0000000-0000-0000-0000-000000000003' where id = 'e1000000-0000-0000-0000-000000000000'$$), 1, 'la admin sí puede reasignar el examen dentro de la organización');
select tests.eq(tests.affected($$update public.exams set owner_id = 'a0000000-0000-0000-0000-000000000002' where id = 'e1000000-0000-0000-0000-000000000000'$$), 1, 'y devolverlo a Pablo');
-- Invitaciones: el registro de correos enviados es solo del servicio
select tests.throws($$insert into public.invitation_sends (org_id, email) values ('0a000000-0000-0000-0000-000000000000', 'x@uni-a.test')$$, 'el registro de envíos no se puede escribir desde la API');
select tests.throws($$select 1 from public.invitation_sends$$, 'ni leer');
insert into public.invitations (org_id, email, invited_by, accepted_at) values ('0a000000-0000-0000-0000-000000000000', 'falsa@uni-a.test', auth.uid(), now());
select tests.eq(tests.n($$select 1 from public.invitations where email = 'falsa@uni-a.test' and accepted_at is null$$), 1, 'una invitación no nace aceptada aunque el cliente lo envíe');
delete from public.invitations where email = 'falsa@uni-a.test';

-- Plazo de subida: 30 días desde la primera subida (salvo organizaciones Academy)
select tests.login('a0000000-0000-0000-0000-000000000002'); -- Pablo
select tests.eq(tests.n($$select 1 from public.exams where id = 'e1000000-0000-0000-0000-000000000000' and first_upload_at is not null$$), 1, 'al subir hojas se anota la fecha de la primera subida');
update public.exams set first_upload_at = null where id = 'e1000000-0000-0000-0000-000000000000';
update public.exams set first_upload_at = now() + interval '10 years' where id = 'e1000000-0000-0000-0000-000000000000';
select tests.eq(tests.n($$select 1 from public.exams where id = 'e1000000-0000-0000-0000-000000000000' and first_upload_at <= now()$$), 1, 'la fecha de la primera subida no se puede borrar ni mover');
select tests.su();
update public.exams set first_upload_at = now() - interval '31 days' where id = 'e1000000-0000-0000-0000-000000000000';
select tests.login('a0000000-0000-0000-0000-000000000002');
select tests.throws($$insert into public.uploads (exam_id, org_id, n_pages) values ('e1000000-0000-0000-0000-000000000000', '0a000000-0000-0000-0000-000000000000', 1)$$, 'fuera de plazo no se suben más hojas');
select tests.throws($$insert into public.sheets (exam_id, org_id, upload_id, seq, identifier) values ('e1000000-0000-0000-0000-000000000000', '0a000000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000000', 99, '1')$$, 'ni se añaden hojas sueltas a una subida antigua');
select tests.eq(tests.affected($$update public.sheets set identifier = identifier where exam_id = 'e1000000-0000-0000-0000-000000000000'$$), 1, 'fuera de plazo se pueden seguir revisando las hojas que ya había');
select tests.su();
update public.organizations set plan = 'academy' where id = '0a000000-0000-0000-0000-000000000000';
select tests.login('a0000000-0000-0000-0000-000000000002');
select tests.eq(tests.affected($$insert into public.uploads (id, exam_id, org_id, n_pages) values ('f1000000-0000-0000-0000-00000000aca1', 'e1000000-0000-0000-0000-000000000000', '0a000000-0000-0000-0000-000000000000', 1)$$), 1, 'las organizaciones Academy no tienen plazo');
select tests.su();
delete from public.uploads where id = 'f1000000-0000-0000-0000-00000000aca1';
update public.organizations set plan = 'standard' where id = '0a000000-0000-0000-0000-000000000000';
update public.exams set first_upload_at = now() where id = 'e1000000-0000-0000-0000-000000000000';

-- ---------------------------------------------------------------------------
-- 3a. Publicación de respuestas para los alumnos (sin sesión)
-- ---------------------------------------------------------------------------
select tests.anon();
select tests.eq(tests.n($$select 1 where public.public_answer_key((select 'X')) ->> 'status' = 'not_found'$$), 1, 'código inexistente: no encontrado');
select tests.su();
select set_config('tests.code', (select code from public.exams where id = 'e1000000-0000-0000-0000-000000000000'), false);
select tests.anon();
select tests.eq(tests.n($$select 1 where public.public_answer_key(current_setting('tests.code')) ->> 'status' = 'not_found'$$), 1, 'un examen sin publicar responde como si no existiera');
select tests.login('a0000000-0000-0000-0000-000000000002'); -- Pablo publica para mañana
update public.exams set answers_published = true, answers_publish_at = now() + interval '1 day' where id = 'e1000000-0000-0000-0000-000000000000';
select tests.anon();
select tests.eq(tests.n($$select 1 where public.public_answer_key(current_setting('tests.code')) ->> 'status' = 'scheduled'$$), 1, 'publicación programada: se anuncia la fecha');
select tests.eq(tests.n($$select 1 where public.public_answer_key(current_setting('tests.code')) ? 'models'$$), 0, 'antes de la hora no se entrega la plantilla');
select tests.login('a0000000-0000-0000-0000-000000000002');
update public.exams set answers_publish_at = now() - interval '1 minute', answers_code = 'ANATOMIA26' where id = 'e1000000-0000-0000-0000-000000000000';
select tests.anon();
select tests.eq(tests.n($$select 1 where public.public_answer_key(current_setting('tests.code')) ->> 'status' = 'not_found'$$), 1, 'con código propio, el código del examen deja de valer');
select tests.eq(tests.n($$select 1 where public.public_answer_key(' anatomia26 ') ->> 'status' = 'published'$$), 1, 'a la hora, el código elegido entrega la plantilla (sin distinguir mayúsculas)');
select tests.eq(tests.n($$select 1 where jsonb_array_length(public.public_answer_key('ANATOMIA26') -> 'models') = 1$$), 1, 'una plantilla por modelo');
select tests.eq(tests.n($$select 1 where public.public_answer_key('ANATOMIA26') -> 'grading' = 'null'::jsonb$$), 1, 'sin calculadora no se entrega la fórmula');
select tests.eq(tests.n($$select 1 where public.public_answer_key('ANATOMIA26')::text ~ '12456790|García'$$), 0, 'nunca salen datos de alumnos');
select tests.throws('select * from public.exams', 'anon sigue sin poder leer exams');
select tests.login('b0000000-0000-0000-0000-000000000002'); -- Bruno, otra organización
select tests.throws($$update public.exams set answers_code = 'ANATOMIA26' where id = 'e2000000-0000-0000-0000-000000000000'$$, 'dos exámenes no comparten código de publicación');
select tests.throws($$update public.exams set answers_code = current_setting('tests.code') where id = 'e2000000-0000-0000-0000-000000000000'$$, 'ni se puede usar el código de otro examen');
select tests.throws($$update public.exams set answers_code = 'abc' where id = 'e2000000-0000-0000-0000-000000000000'$$, 'el código elegido tiene un formato mínimo');
select tests.login('a0000000-0000-0000-0000-000000000002');
update public.exams set answers_published = false, answers_code = null, answers_calculator = true where id = 'e1000000-0000-0000-0000-000000000000';
select tests.anon();
select tests.eq(tests.n($$select 1 where public.public_answer_key('ANATOMIA26') ->> 'status' = 'not_found'$$), 1, 'al retirar la publicación deja de verse');

-- ---------------------------------------------------------------------------
-- 3b. Carpetas personales de exámenes y varias organizaciones por profesor
-- ---------------------------------------------------------------------------
select tests.login('a0000000-0000-0000-0000-000000000002'); -- Pablo
insert into public.exam_folders (id, name) values ('fa000000-0000-0000-0000-000000000001', 'Curso 2026-27');
select tests.eq(tests.n($$select 1 from public.exam_folders where user_id = auth.uid()$$), 1, 'la carpeta se crea a nombre de quien la crea');
select tests.throws($$insert into public.exam_folders (name) values ('  curso 2026-27 ')$$, 'no hay dos carpetas con el mismo nombre');
select tests.throws($$insert into public.exam_folders (user_id, name) values ('a0000000-0000-0000-0000-000000000003', 'ajena')$$, 'no se crean carpetas a nombre de otro');
insert into public.exam_folder_items (exam_id, folder_id) values ('e1000000-0000-0000-0000-000000000000', 'fa000000-0000-0000-0000-000000000001');
select tests.eq(tests.n('select 1 from public.exam_folder_items'), 1, 'Pablo guarda su examen en la carpeta');
select tests.throws($$insert into public.exam_folder_items (exam_id, folder_id) values ('e2000000-0000-0000-0000-000000000000', 'fa000000-0000-0000-0000-000000000001')$$, 'no se guarda en carpetas un examen de otra organización');

select tests.login('b0000000-0000-0000-0000-000000000002'); -- Bruno, otra organización
select tests.eq(tests.n('select 1 from public.exam_folders'), 0, 'las carpetas de otro profesor no se ven');
select tests.eq(tests.n('select 1 from public.exam_folder_items'), 0, 'ni lo que tiene guardado en ellas');
select tests.eq(tests.affected($$update public.exam_folders set name = 'hackeada'$$), 0, 'ni se pueden renombrar');
select tests.eq(tests.affected($$delete from public.exam_folders$$), 0, 'ni borrar');
insert into public.exam_folders (id, name) values ('fb000000-0000-0000-0000-000000000001', 'Mis exámenes');
select tests.throws($$insert into public.exam_folder_items (exam_id, folder_id) values ('e2000000-0000-0000-0000-000000000000', 'fa000000-0000-0000-0000-000000000001')$$, 'no se guarda nada en la carpeta de otro');
insert into public.exam_folder_items (exam_id, folder_id) values ('e2000000-0000-0000-0000-000000000000', 'fb000000-0000-0000-0000-000000000001');
select tests.throws($$update public.exam_folder_items set folder_id = 'fa000000-0000-0000-0000-000000000001'$$, 'ni se mueve un examen a la carpeta de otro');
insert into public.exam_folders (id, name) values ('fb000000-0000-0000-0000-000000000002', 'Otra');
select tests.eq(tests.affected($$insert into public.exam_folder_items (user_id, exam_id, folder_id) values (auth.uid(), 'e2000000-0000-0000-0000-000000000000', 'fb000000-0000-0000-0000-000000000002') on conflict (user_id, exam_id) do update set user_id = excluded.user_id, exam_id = excluded.exam_id, folder_id = excluded.folder_id$$), 1, 'mover un examen de carpeta (upsert, como hace la app)');
select tests.eq(tests.n($$select 1 from public.exam_folder_items where folder_id = 'fb000000-0000-0000-0000-000000000002'$$), 1, 'el examen queda en la carpeta nueva');
select tests.throws($$update public.exam_folder_items set user_id = 'a0000000-0000-0000-0000-000000000002'$$, 'no se puede pasar lo guardado a nombre de otro');
select tests.eq(tests.affected($$delete from public.exam_folders where id = 'fb000000-0000-0000-0000-000000000002'$$), 1, 'se borra la carpeta de destino');
insert into public.exam_folder_items (exam_id, folder_id) values ('e2000000-0000-0000-0000-000000000000', 'fb000000-0000-0000-0000-000000000001');
select tests.eq(tests.affected($$delete from public.exam_folders where id = 'fb000000-0000-0000-0000-000000000001'$$), 1, 'Bruno borra su carpeta');
select tests.eq(tests.n('select 1 from public.exam_folder_items'), 0, 'al borrar la carpeta se vacía, y el examen sigue existiendo');
select tests.eq(tests.n($$select 1 from public.exams where id = 'e2000000-0000-0000-0000-000000000000'$$), 1, 'el examen no se borra con la carpeta');

-- Un profesor puede pertenecer a más de una organización
select public.create_organization('Academia de Bruno');
select tests.eq(tests.n($$select 1 from public.memberships where user_id = auth.uid()$$), 2, 'Bruno pertenece a dos organizaciones');
select tests.eq(tests.n('select 1 from public.organizations'), 2, 'y ve las dos (y solo esas)');
select tests.eq(tests.n($$select 1 from public.exams where org_id = '0a000000-0000-0000-0000-000000000000'$$), 0, 'sigue sin ver la organización A');

-- ---------------------------------------------------------------------------
-- 4. Invitaciones
-- ---------------------------------------------------------------------------
select tests.login('c0000000-0000-0000-0000-000000000001'); -- Carla
select tests.eq(tests.n('select 1 from public.exams'), 0, 'sin organización no se ve nada');
select tests.eq(tests.n('select 1 from public.invitations'), 1, 'la invitada ve solo su invitación');
select tests.eq(public.accept_invitations()::bigint, 1, 'Carla acepta su invitación');
select tests.eq(tests.n('select 1 from public.organizations'), 1, 'tras aceptar, Carla ve la organización');
select tests.login('c0000000-0000-0000-0000-000000000002');
select tests.eq(public.accept_invitations()::bigint, 0, 'un email sin verificar no puede aceptar invitaciones');
select tests.login('b0000000-0000-0000-0000-000000000002');
select tests.eq(public.accept_invitations()::bigint, 0, 'no se aceptan invitaciones de otros');

-- ---------------------------------------------------------------------------
-- 5. Reglas del examen: layout bloqueado, auditoría inmutable, examen cerrado
-- ---------------------------------------------------------------------------
select tests.login('a0000000-0000-0000-0000-000000000002'); -- Pablo
select tests.throws($$update public.exam_layouts set layout = '{"version":2}'$$, 'con hojas subidas el layout queda bloqueado');
select tests.throws($$update public.exams set sheet_config = '{"nQuestions":50}' where id = 'e1000000-0000-0000-0000-000000000000'$$, 'con hojas subidas la configuración de la hoja queda bloqueada');
select tests.throws($$update public.exams set org_id = '0b000000-0000-0000-0000-000000000000' where id = 'e1000000-0000-0000-0000-000000000000'$$, 'un examen no se puede mover de organización');
select tests.throws($$update public.audit_log set action = 'x'$$, 'la auditoría no se puede modificar');
select tests.throws($$delete from public.audit_log$$, 'la auditoría no se puede borrar');
select tests.throws($$update public.answer_keys set answers = '{"1":{"c":["B"]}}'$$, 'las versiones de plantilla son inmutables');
select tests.throws($$delete from public.answer_keys$$, 'las versiones de plantilla no se borran');
select tests.throws($$update public.profiles set email = 'otro@x.es' where id = auth.uid()$$, 'el email del perfil no se edita a mano');

select tests.eq(tests.affected($$update public.exams set status = 'cerrado' where id = 'e1000000-0000-0000-0000-000000000000'$$), 1, 'Pablo cierra el examen');
select tests.eq(tests.n($$select 1 from public.exams where closed_at is not null$$), 1, 'closed_at se rellena al cerrar');
select tests.eq(tests.affected($$update public.sheets set identifier = '0'$$), 0, 'examen cerrado: no se editan hojas');
select tests.eq(tests.affected($$delete from public.results$$), 0, 'examen cerrado: no se borran notas');
select tests.eq(tests.affected($$update public.review_items set status = 'resuelta'$$), 0, 'examen cerrado: no se resuelven incidencias');
select tests.throws($$insert into public.students (exam_id, org_id, identifier) values ('e1000000-0000-0000-0000-000000000000', '0a000000-0000-0000-0000-000000000000', '2')$$, 'examen cerrado: no se añaden alumnos');
select tests.throws($$insert into public.answer_keys (exam_id, org_id, model, version, answers, created_by) values ('e1000000-0000-0000-0000-000000000000', '0a000000-0000-0000-0000-000000000000', 'A', 2, '{}', auth.uid())$$, 'examen cerrado: no se cambian plantillas');
select tests.throws($$update public.exams set title = 'cambio' where id = 'e1000000-0000-0000-0000-000000000000'$$, 'examen cerrado: no se edita la ficha');
select tests.throws($$insert into storage.objects (bucket_id, name) values ('sheets', '0a000000-0000-0000-0000-000000000000/e1000000-0000-0000-0000-000000000000/x/2.jpg')$$, 'examen cerrado: no se suben imágenes');
select tests.eq(tests.n('select 1 from public.sheets'), 1, 'examen cerrado: se sigue pudiendo leer');
-- Con el examen cerrado se pueden publicar las respuestas (es lo habitual), pero nada más
select tests.eq(tests.affected($$update public.exams set answers_published = true, answers_publish_at = now() where id = 'e1000000-0000-0000-0000-000000000000'$$), 1, 'examen cerrado: se pueden publicar las respuestas');
select tests.throws($$update public.exams set answers_published = false, title = 'otro' where id = 'e1000000-0000-0000-0000-000000000000'$$, 'examen cerrado: no se cuela otro cambio junto a la publicación');
select tests.eq(tests.affected($$update public.exams set answers_published = false where id = 'e1000000-0000-0000-0000-000000000000'$$), 1, 'examen cerrado: se puede retirar la publicación');
select tests.eq(tests.affected($$update public.exams set status = 'con_resultados' where id = 'e1000000-0000-0000-0000-000000000000'$$), 1, 'Pablo reabre el examen');
select tests.eq(tests.affected($$update public.sheets set identifier = '12456790'$$), 1, 'reabierto: vuelve a ser editable');

-- Retención (service_role): marca las imágenes como borradas sin tocar las notas
select tests.su();
update public.exams set status = 'cerrado' where id = 'e1000000-0000-0000-0000-000000000000';
alter table public.exams disable trigger exams_before_update; -- solo para simular el paso del tiempo
update public.exams set closed_at = now() - interval '13 months' where id = 'e1000000-0000-0000-0000-000000000000';
alter table public.exams enable trigger exams_before_update;
select tests.eq((select count(*) from public.exams_due_for_purge()), 1, 'retención: el examen cerrado hace 13 meses (límite 12) está pendiente de purga');
select public.mark_images_purged('e1000000-0000-0000-0000-000000000000');
select tests.eq((select count(*) from public.exams_due_for_purge()), 0, 'retención: tras la purga ya no está pendiente');
select tests.eq((select count(*) from public.results), 1, 'retención: las notas se conservan');

-- Borrado completo de un examen (RGPD): cascada a todo salvo la auditoría
select tests.login('a0000000-0000-0000-0000-000000000002');
select tests.eq(tests.affected($$delete from storage.objects$$), 1, 'el propietario borra las imágenes aunque el examen esté cerrado');
select tests.eq(tests.affected($$delete from public.exams where id = 'e1000000-0000-0000-0000-000000000000'$$), 1, 'el propietario borra el examen');
select tests.su();
select tests.eq((select count(*) from public.sheets) + (select count(*) from public.results) + (select count(*) from public.students)
  + (select count(*) from public.review_items) + (select count(*) from public.answer_keys) + (select count(*) from public.exam_layouts), 0, 'el borrado elimina hojas, notas, alumnos, incidencias, plantillas y layout');
select tests.eq((select count(*) from public.audit_log where org_id = '0a000000-0000-0000-0000-000000000000' and exam_id is null), (select count(*) from public.audit_log where org_id = '0a000000-0000-0000-0000-000000000000'), 'la auditoría se conserva (sin referencia al examen)');

-- ---------------------------------------------------------------------------
-- 6. Planes y límites de exámenes
-- ---------------------------------------------------------------------------
-- Bruno (plan gratis) ya creó su examen: no puede crear un segundo, ni borrando el primero
select tests.login('b0000000-0000-0000-0000-000000000002');
select tests.eq((public.my_plan() ->> 'used')::bigint, 1, 'plan gratis: el examen creado cuenta como usado');
select tests.throws($$insert into public.exams (org_id, owner_id, title, sheet_config) values ('0b000000-0000-0000-0000-000000000000', auth.uid(), 'segundo', '{}')$$, 'plan gratis: no se puede crear un segundo examen');
select tests.eq(tests.affected($$delete from public.exams where id = 'e2000000-0000-0000-0000-000000000000'$$), 1, 'Bruno borra su examen gratuito');
select tests.throws($$insert into public.exams (org_id, owner_id, title, sheet_config) values ('0b000000-0000-0000-0000-000000000000', auth.uid(), 'otro', '{}')$$, 'plan gratis: borrar el examen no devuelve el examen gratuito');
select tests.throws($$insert into public.subscriptions (user_id, status) values (auth.uid(), 'active')$$, 'nadie puede darse de alta en Plus a mano');
select tests.throws($$update public.exam_usage set n = 0$$, 'nadie puede poner a cero su consumo');
select tests.eq(tests.affected($$update public.organizations set name = name where id = '0b000000-0000-0000-0000-000000000000'$$), 0, 'un profesor no toca la organización donde no es administrador');
select tests.login('b0000000-0000-0000-0000-000000000001'); -- Berta, admin de B
select tests.throws($$update public.organizations set plan = 'academy' where id = '0b000000-0000-0000-0000-000000000000'$$, 'ni siquiera la admin puede ponerse el plan Academy');

-- Con Korrige Plus (lo activa el webhook de Stripe): 5 exámenes al mes
select tests.su();
insert into public.subscriptions (user_id, status, current_period_end) values ('b0000000-0000-0000-0000-000000000002', 'active', now() + interval '20 days');
update public.exam_usage set period = (date_trunc('month', now()) - interval '1 month')::date where user_id = 'b0000000-0000-0000-0000-000000000002';
select tests.login('b0000000-0000-0000-0000-000000000002');
select tests.eq((select count(*) from public.subscriptions), 1, 'Bruno ve su suscripción (y solo la suya)');
insert into public.exams (org_id, owner_id, title, sheet_config) select '0b000000-0000-0000-0000-000000000000', auth.uid(), 'plus ' || g, '{}' from generate_series(1, 5) g;
select tests.eq((public.my_plan() ->> 'used')::bigint, 5, 'Plus: los 5 exámenes del mes están usados (el del mes pasado no cuenta)');
select tests.eq(tests.n($$select 1 where public.my_plan() ->> 'plan' = 'plus'$$), 1, 'my_plan() informa del plan Plus');
select tests.throws($$insert into public.exams (org_id, owner_id, title, sheet_config) values ('0b000000-0000-0000-0000-000000000000', auth.uid(), 'sexto', '{}')$$, 'Plus: el sexto examen del mes se rechaza');

-- Suscripción caducada: vuelve al plan gratis
select tests.su();
update public.subscriptions set status = 'canceled', current_period_end = now() - interval '10 days';
select tests.login('b0000000-0000-0000-0000-000000000002');
select tests.eq(tests.n($$select 1 where public.my_plan() ->> 'plan' = 'free'$$), 1, 'suscripción cancelada: vuelve al plan gratis');
select tests.throws($$insert into public.exams (org_id, owner_id, title, sheet_config) values ('0b000000-0000-0000-0000-000000000000', auth.uid(), 'tras cancelar', '{}')$$, 'sin Plus y con el gratuito gastado no se crean exámenes');

-- Organización Academy: sin límite para sus profesores y sin gastar su cuota personal
select tests.su();
update public.organizations set plan = 'academy' where id = '0b000000-0000-0000-0000-000000000000';
select tests.login('b0000000-0000-0000-0000-000000000002');
insert into public.exams (org_id, owner_id, title, sheet_config) select '0b000000-0000-0000-0000-000000000000', auth.uid(), 'academy ' || g, '{}' from generate_series(1, 8) g;
select tests.eq(tests.n('select 1 from public.exams'), 13, 'Academy: exámenes sin límite');
select tests.eq((select sum(n) from public.exam_usage)::bigint, 6, 'Academy: no consume la cuota personal');

-- Todas las tablas públicas tienen RLS activado
select tests.eq((select count(*) from pg_tables where schemaname = 'public' and not rowsecurity), 0, 'RLS activado en todas las tablas de public');

rollback;

