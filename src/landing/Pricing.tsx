import { ReactNode } from 'react';
import { PLAN } from '../config';
import type { Dict } from '../i18n/es';

export const eur = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }) + ' €';

/**
 * Las tres tarjetas de planes. La usan la landing y la página «Plan» de la app;
 * cada una pasa sus propios botones (enlaces en la landing, acciones en la app).
 */
export function PricingCards({ t, actions, current }: { t: Dict['pricing']; actions: { free: ReactNode; plus: ReactNode; academy: ReactNode }; current?: 'free' | 'plus' | 'academy' }) {
  const plans = [
    { id: 'free' as const, p: t.free, price: eur(0), suffix: '', sub: '' },
    { id: 'plus' as const, p: t.plus, price: eur(PLAN.plusMonthly), suffix: t.perMonth, sub: t.yearly.replace('{price}', eur(PLAN.plusYearly)) },
    { id: 'academy' as const, p: t.academy, price: t.custom, suffix: '', sub: '' },
  ];
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {plans.map(({ id, p, price, suffix, sub }) => {
        const featured = id === 'plus';
        return (
          <section key={id} aria-label={p.name} className={`relative flex flex-col bg-white p-7 ${featured ? 'sheet-shadow border-[1.5px] border-ink' : 'border border-bone-300'}`}>
            {featured && 'badge' in p && <span className="label-mono absolute -top-3 left-6 bg-brand-700 px-2.5 py-1 text-white">{p.badge}</span>}
            {current === id && <span className="label-mono absolute -top-3 right-6 bg-ink px-2.5 py-1 text-white">Tu plan</span>}
            <h3 className="display text-2xl text-ink">{p.name}</h3>
            <p className="mt-1 text-sm text-slate-600">{p.tagline}</p>
            <p className="mt-5 flex items-baseline gap-1.5">
              <span className="display text-[2.6rem] leading-none text-ink">{price}</span>
              {suffix && <span className="text-slate-600">{suffix}</span>}
            </p>
            <p className="mt-1 h-5 text-sm text-slate-500">{sub}</p>
            <ul className="mt-5 flex-1 space-y-2.5 border-t border-bone-300 pt-5 text-sm text-slate-700">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2.5">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-700" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-7">{actions[id]}</div>
          </section>
        );
      })}
    </div>
  );
}
