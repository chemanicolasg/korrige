-- Korrige · Storage: imágenes JPEG de las hojas enderezadas.
-- Ruta: <org_id>/<exam_id>/<upload_id>/<n>.jpg  → las políticas validan org y examen.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sheets', 'sheets', false, 3145728, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- ¿La ruta pertenece a un examen (y a su organización) al que el usuario tiene acceso?
create function public.sheet_path_exam(p_name text) returns uuid
language sql stable security definer set search_path = public as $$
  select e.id from public.exams e
  where e.id::text = split_part(p_name, '/', 2) and e.org_id::text = split_part(p_name, '/', 1);
$$;

create function public.can_read_sheet_path(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.can_access_exam(public.sheet_path_exam(p_name)), false);
$$;

create function public.can_write_sheet_path(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.can_edit_exam(public.sheet_path_exam(p_name)), false);
$$;

-- Borrar: mientras el examen esté abierto, o siempre el propietario/admin (borrado completo RGPD)
create function public.can_delete_sheet_path(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.can_edit_exam(public.sheet_path_exam(p_name)) or public.is_exam_owner_or_admin(public.sheet_path_exam(p_name)), false);
$$;

revoke all on function public.sheet_path_exam(text), public.can_read_sheet_path(text), public.can_write_sheet_path(text), public.can_delete_sheet_path(text) from public;
grant execute on function public.sheet_path_exam(text), public.can_read_sheet_path(text), public.can_write_sheet_path(text), public.can_delete_sheet_path(text) to authenticated, service_role;

create policy korrige_sheets_select on storage.objects for select to authenticated
  using (bucket_id = 'sheets' and public.can_read_sheet_path(name));
create policy korrige_sheets_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'sheets' and public.can_write_sheet_path(name));
create policy korrige_sheets_update on storage.objects for update to authenticated
  using (bucket_id = 'sheets' and public.can_write_sheet_path(name))
  with check (bucket_id = 'sheets' and public.can_write_sheet_path(name));
create policy korrige_sheets_delete on storage.objects for delete to authenticated
  using (bucket_id = 'sheets' and public.can_delete_sheet_path(name));
