import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ErrorBox, Notice, fmtDate } from '../components/ui';
import { BILLING_ENABLED, PLAN, SALES_EMAIL } from '../config';
import { getDict } from '../i18n';
import { appLocale, tr, trn } from '../i18n/app';
import { PricingCards, eur } from '../landing/Pricing';
import { useSession } from './AuthContext';

const ERRORS: Record<string, string> = {
  billing_not_configured: tr('El pago con tarjeta todavía no está activado. Escríbenos a ventas@korrige.es y te damos de alta.'),
  already_subscribed: tr('Ya tienes Korrige Plus activo.'),
  no_subscription: tr('No hay ninguna suscripción que gestionar.'),
  stripe_error: tr('No se ha podido conectar con la pasarela de pago. Inténtalo de nuevo en unos minutos.'),
};

/** Plan del usuario: consumo, cambio a Korrige Plus (Stripe Checkout) y gestión de la suscripción. */
export default function PlanPage() {
  const { db, plan, unlimited, org, refresh, user } = useSession();
  const [params] = useSearchParams();
  const [interval, setInterval_] = useState<'month' | 'year'>('month');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const t = getDict(appLocale()).pricing;
  const paid = params.get('pago');

  // tras pagar, Stripe avisa por webhook: se refresca el plan unos segundos después
  useEffect(() => {
    if (paid !== 'ok') return;
    const timers = [1500, 5000, 12000].map((ms) => setTimeout(() => void refresh(), ms));
    return () => timers.forEach(clearTimeout);
  }, [paid]); // eslint-disable-line react-hooks/exhaustive-deps

  async function go(fn: 'create-checkout' | 'billing-portal') {
    setBusy(true);
    setError('');
    try {
      const { url } = await db.invoke<{ url: string }>(fn, { interval });
      location.href = url;
    } catch (e) {
      const code = (e as Error).message;
      setError(ERRORS[code] ?? tr('No se ha podido abrir el pago: {code}', { code }));
      setBusy(false);
    }
  }

  const current = unlimited ? 'academy' : (plan?.plan ?? 'free');
  const isPlus = plan?.plan === 'plus';
  const btn = 'inline-flex w-full items-center justify-center rounded-md px-5 py-3 text-sm font-semibold transition disabled:opacity-50';
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{tr('Tu plan')}</h1>
        <p className="mt-1 text-sm text-slate-600" data-testid="plan-status">
          {unlimited ? (
            <>{trn('{org} tiene <b>Korrige Academy</b>: puedes crear exámenes sin límite en esta organización.', { org: <b>{org.name}</b> })}</>
          ) : isPlus ? (
            <>
              {trn('Tienes <b>Korrige Plus</b>: has creado {used} de {limit} exámenes este mes.', { used: plan!.used, limit: plan!.limit })}
              {plan!.period_end &&
                ' ' + (plan!.cancel_at_period_end ? tr('La suscripción termina el {date}.', { date: fmtDate(plan!.period_end) }) : tr('Se renueva el {date}.', { date: fmtDate(plan!.period_end) }))}
            </>
          ) : (
            <>{trn('Estás en el plan <b>Gratis</b>: has usado {used} de {total} examen gratuito.', { used: plan?.used ?? 0, total: PLAN.freeExams })}</>
          )}
        </p>
      </div>

      {params.get('limite') && !unlimited && (
        <Notice tone="warn">
          {isPlus
            ? tr('Has creado los {n} exámenes de este mes incluidos en Korrige Plus. El contador se reinicia el día 1. Si necesitas más, Korrige Academy no tiene límite.', { n: PLAN.plusExamsPerMonth })
            : tr('Ya has usado tu examen gratuito. Tus datos siguen ahí: con Korrige Plus puedes crear 5 exámenes nuevos cada mes.')}
        </Notice>
      )}
      {paid === 'ok' && <Notice tone="ok">{isPlus ? tr('¡Gracias! Korrige Plus ya está activo.') : tr('Pago recibido. Estamos activando tu plan; tarda unos segundos…')}</Notice>}
      {paid === 'cancelado' && <Notice>{tr('No se ha realizado ningún cargo. Puedes intentarlo cuando quieras.')}</Notice>}
      {plan?.status === 'past_due' && <Notice tone="warn">{tr('No hemos podido cobrar la última cuota. Actualiza tu tarjeta en «Gestionar suscripción» para no perder Korrige Plus.')}</Notice>}
      <ErrorBox error={error} />

      <PricingCards
        t={t}
        current={current}
        actions={{
          free: <p className="text-sm text-slate-500">{current === 'free' ? tr('Es tu plan actual.') : tr('Incluido en tu cuenta.')}</p>,
          plus: isPlus ? (
            <button className={`${btn} border-[1.5px] border-ink text-ink hover:bg-ink hover:text-white`} disabled={busy} onClick={() => void go('billing-portal')}>
              {tr('Gestionar suscripción')}
            </button>
          ) : db.kind === 'local' ? (
            <p className="text-sm text-slate-500">{tr('El pago no está disponible en el modo demo.')}</p>
          ) : !BILLING_ENABLED ? (
            <div>
              <a
                className={`${btn} bg-brand-700 text-white hover:bg-brand-800`}
                href={`mailto:${SALES_EMAIL}?subject=${encodeURIComponent('Quiero Korrige Plus')}&body=${encodeURIComponent(`Hola, quiero activar Korrige Plus en mi cuenta (${user.email}).`)}`}
              >
                {tr('Pedir Korrige Plus')}
              </a>
              <p className="mt-2 text-xs text-slate-500">{tr('El pago con tarjeta estará disponible en breve. Mientras tanto, escríbenos y te lo activamos.')}</p>
            </div>
          ) : (
            <div>
              <div className="mb-3 flex rounded-md border border-bone-300 p-0.5 text-sm" role="radiogroup" aria-label={tr('Periodicidad del pago')}>
                {(
                  [
                    ['month', tr('Mensual · {price}', { price: eur(PLAN.plusMonthly) })],
                    ['year', tr('Anual · {price}', { price: eur(PLAN.plusYearly) })],
                  ] as const
                ).map(([v, l]) => (
                  <button key={v} role="radio" aria-checked={interval === v} className={`flex-1 rounded px-2 py-1.5 ${interval === v ? 'bg-brand-700 font-semibold text-white' : 'text-slate-700'}`} onClick={() => setInterval_(v)}>
                    {l}
                  </button>
                ))}
              </div>
              <button className={`${btn} bg-brand-700 text-white hover:bg-brand-800`} disabled={busy} onClick={() => void go('create-checkout')}>
                {busy ? tr('Abriendo el pago…') : tr('Pasar a Korrige Plus')}
              </button>
              <p className="mt-2 text-xs text-slate-500">{tr('Pago seguro con tarjeta. Puedes cancelar cuando quieras y conservas el plan hasta el final del periodo pagado.')}</p>
            </div>
          ),
          academy: (
            <a href="/#ventas" className={`${btn} border-[1.5px] border-ink text-ink hover:bg-ink hover:text-white`}>
              {tr('Hablar con ventas')}
            </a>
          ),
        }}
      />
      <p className="text-sm text-slate-500">
        {t.vat} {tr('Los exámenes que ya has creado no se borran al cambiar de plan.')}{' '}
        <Link className="underline" to="/app">
          {tr('Volver a mis exámenes')}
        </Link>
      </p>
    </div>
  );
}
