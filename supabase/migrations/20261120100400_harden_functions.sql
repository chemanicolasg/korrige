-- Korrige · endurecimiento de funciones.
-- Supabase concede EXECUTE a anon/authenticated sobre las funciones nuevas
-- (privilegios por defecto), así que no basta con revocar a PUBLIC: se retira
-- todo y se concede solo lo que la API necesita. Sin esto, cualquier usuario
-- autenticado podría llamar por RPC a funciones internas como mark_images_purged().
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.is_org_member(uuid), public.is_org_admin(uuid), public.shares_org_with(uuid),
  public.can_access_exam(uuid), public.can_edit_exam(uuid), public.is_exam_owner_or_admin(uuid),
  public.sheet_path_exam(text), public.can_read_sheet_path(text), public.can_write_sheet_path(text), public.can_delete_sheet_path(text),
  public.create_organization(text), public.accept_invitations(), public.share_exam(uuid, text), public.org_usage(uuid)
  to authenticated;
grant execute on all functions in schema public to service_role;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter function public.touch_updated_at() set search_path = public;
