-- Carpetas personales de exámenes
--   Cada profesor organiza sus exámenes en carpetas propias (por curso, asignatura…).
--   Son privadas: no cambian el examen ni lo que ven sus compañeros, y pueden mezclar
--   exámenes de varias organizaciones. Un examen está, como mucho, en una carpeta por usuario.
create table public.exam_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);
create unique index exam_folders_user_name_idx on public.exam_folders (user_id, lower(btrim(name)));

create table public.exam_folder_items (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  exam_id uuid not null references public.exams (id) on delete cascade,
  folder_id uuid not null references public.exam_folders (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, exam_id)
);
create index exam_folder_items_folder_idx on public.exam_folder_items (folder_id);
create index exam_folder_items_exam_idx on public.exam_folder_items (exam_id);

-- Máximo de carpetas por usuario (evita abusos)
create function public.exam_folders_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.exam_folders where user_id = new.user_id) >= 100 then
    raise exception 'Has alcanzado el máximo de 100 carpetas' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger exam_folders_limit before insert on public.exam_folders for each row execute function public.exam_folders_limit();
revoke execute on function public.exam_folders_limit() from public, anon, authenticated;

alter table public.exam_folders enable row level security;
alter table public.exam_folder_items enable row level security;

create policy exam_folders_own on public.exam_folders for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy exam_folder_items_select on public.exam_folder_items for select to authenticated
  using (user_id = auth.uid());
create policy exam_folder_items_delete on public.exam_folder_items for delete to authenticated
  using (user_id = auth.uid());
-- solo se guardan exámenes a los que se tiene acceso, y en carpetas propias
create policy exam_folder_items_insert on public.exam_folder_items for insert to authenticated
  with check (user_id = auth.uid() and public.can_access_exam(exam_id)
    and exists (select 1 from public.exam_folders f where f.id = folder_id and f.user_id = auth.uid()));
create policy exam_folder_items_update on public.exam_folder_items for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.can_access_exam(exam_id)
    and exists (select 1 from public.exam_folders f where f.id = folder_id and f.user_id = auth.uid()));

revoke all on public.exam_folders, public.exam_folder_items from anon, authenticated;
grant select, insert, delete on public.exam_folders, public.exam_folder_items to authenticated;
grant update (name) on public.exam_folders to authenticated;
grant update (folder_id) on public.exam_folder_items to authenticated;
grant all on public.exam_folders, public.exam_folder_items to service_role;
