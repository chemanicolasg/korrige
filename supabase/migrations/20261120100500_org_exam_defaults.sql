-- Valores por defecto de la organización para los exámenes nuevos:
-- logotipo, título de la hoja, identificador (NIA, NIUB, DNI…) y fórmula de corrección.
alter table public.organizations
  add column exam_defaults jsonb not null default '{}'::jsonb
  check (octet_length(exam_defaults::text) < 400000);

-- solo los administradores pueden cambiarlos (política organizations_update)
grant update (exam_defaults) on public.organizations to authenticated;
