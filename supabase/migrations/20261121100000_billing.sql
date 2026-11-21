-- Korrige · planes y límites
--   Gratis   1 examen por cuenta (en total), sin tarjeta
--   Plus     5 exámenes nuevos al mes por usuario (suscripción individual, Stripe)
--   Academy  organización completa, sin límite (se activa a mano tras hablar con ventas)
-- Los límites se imponen aquí, no solo en la interfaz. Si cambian, hay que
-- cambiarlos también en src/config.ts (PLAN_LIMITS).

-- Academy es un plan de organización: solo lo cambia el servicio (no hay grant de columna)
alter table public.organizations
  add column plan text not null default 'standard' check (plan in ('standard', 'academy'));

-- Suscripción individual (Plus). La escribe únicamente el webhook de Stripe (service_role).
create table public.subscriptions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  plan text not null default 'plus' check (plan in ('plus')),
  status text not null,
  billing_interval text check (billing_interval in ('month', 'year')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Exámenes creados por usuario y mes. No se descuenta al borrar un examen:
-- así el examen gratis no se puede "recuperar" borrando y volviendo a crear.
create table public.exam_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  period date not null,
  n int not null default 0 check (n >= 0),
  primary key (user_id, period)
);

alter table public.subscriptions enable row level security;
alter table public.exam_usage enable row level security;
create policy subscriptions_select on public.subscriptions for select to authenticated using (user_id = auth.uid());
create policy exam_usage_select on public.exam_usage for select to authenticated using (user_id = auth.uid());
revoke all on public.subscriptions, public.exam_usage from anon, authenticated;
grant select on public.subscriptions, public.exam_usage to authenticated;
grant all on public.subscriptions, public.exam_usage to service_role;

-- ¿Tiene el usuario una suscripción Plus en vigor? (3 días de margen si falla un cobro)
create function public.user_has_plus(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = p_user
      and s.status in ('active', 'trialing', 'past_due')
      and (s.current_period_end is null or s.current_period_end > now() - interval '3 days')
  );
$$;

-- Plan y consumo del usuario actual, para la interfaz
create function public.my_plan() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_month date := date_trunc('month', now())::date;
  v_total int;
  v_month_n int;
  v_plus boolean;
  v_sub public.subscriptions;
begin
  if v_user is null then
    raise exception 'No autenticado' using errcode = 'insufficient_privilege';
  end if;
  select coalesce(sum(n), 0), coalesce(sum(n) filter (where period = v_month), 0)
    into v_total, v_month_n from public.exam_usage where user_id = v_user;
  v_plus := public.user_has_plus(v_user);
  select * into v_sub from public.subscriptions where user_id = v_user;
  return jsonb_build_object(
    'plan', case when v_plus then 'plus' else 'free' end,
    'used', case when v_plus then v_month_n else v_total end,
    'limit', case when v_plus then 5 else 1 end,
    'period_end', v_sub.current_period_end,
    'cancel_at_period_end', coalesce(v_sub.cancel_at_period_end, false),
    'status', v_sub.status,
    'interval', v_sub.billing_interval,
    'academy_orgs', coalesce((
      select jsonb_agg(o.id) from public.organizations o
      join public.memberships m on m.org_id = o.id and m.user_id = v_user
      where o.plan = 'academy'), '[]'::jsonb)
  );
end $$;

-- Límite de exámenes al crear uno
create function public.exams_enforce_quota() returns trigger
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

create trigger exams_quota before insert on public.exams
for each row execute function public.exams_enforce_quota();

-- Los exámenes que ya existen cuentan como usados
insert into public.exam_usage (user_id, period, n)
select e.owner_id, date_trunc('month', e.created_at)::date, count(*)
from public.exams e join public.organizations o on o.id = e.org_id
where o.plan <> 'academy'
group by 1, 2
on conflict (user_id, period) do update set n = excluded.n;

revoke execute on function public.user_has_plus(uuid), public.my_plan(), public.exams_enforce_quota() from public, anon, authenticated;
grant execute on function public.my_plan() to authenticated;
grant execute on function public.user_has_plus(uuid), public.my_plan() to service_role;
