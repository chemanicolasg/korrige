-- Bienvenida y tutorial de inicio
--   welcomed_at   cuándo se envió el correo de bienvenida (lo escribe la función «welcome»)
--   onboarded_at  cuándo vio (o cerró) el tutorial de inicio (lo escribe el propio usuario)
alter table public.profiles
  add column welcomed_at timestamptz,
  add column onboarded_at timestamptz;

grant update (onboarded_at) on public.profiles to authenticated;

-- A las cuentas que ya existían no se les envía la bienvenida con retraso
update public.profiles set welcomed_at = now() where welcomed_at is null;
