import { FormEvent, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SALES_EMAIL, SALES_ENDPOINT } from '../config';
import type { Dict } from '../i18n/es';

const THROTTLE_KEY = 'korrige-lead-ts';

/** Formulario "Hablar con ventas": honeypot + tiempo mínimo + límite de envíos (cliente y servidor). */
export function SalesForm({ t, locale }: { t: Dict['sales']; locale: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'ok'>('idle');
  const [error, setError] = useState<{ msg: string; mail?: boolean } | null>(null);
  const shownAt = useRef(Date.now());

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const v = (k: string) => String(fd.get(k) ?? '').trim();
    setError(null);
    if (!v('name') || !v('email') || !v('institution') || !fd.get('privacy')) return setError({ msg: t.errors.required });
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v('email'))) return setError({ msg: t.errors.email });
    // límite en el cliente: 3 envíos por hora desde este navegador
    let recent: number[] = [];
    try {
      recent = (JSON.parse(localStorage.getItem(THROTTLE_KEY) ?? '[]') as number[]).filter((ts) => Date.now() - ts < 3600_000);
    } catch {
      /* sin almacenamiento */
    }
    if (recent.length >= 3) return setError({ msg: t.errors.rate, mail: true });
    if (!SALES_ENDPOINT) return setError({ msg: t.errors.generic, mail: true });

    setState('sending');
    try {
      const res = await fetch(SALES_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: v('name'),
          email: v('email'),
          institution: v('institution'),
          job_title: v('job_title'),
          n_teachers: v('n_teachers'),
          phone: v('phone'),
          message: v('message'),
          privacy_accepted: true,
          locale,
          website: v('website'),
          elapsed_ms: Date.now() - shownAt.current,
        }),
      });
      if (res.status === 429) throw new Error('rate');
      if (res.status === 422) throw new Error((await res.json()).error === 'email' ? 'email' : 'required');
      if (!res.ok) throw new Error('generic');
      try {
        localStorage.setItem(THROTTLE_KEY, JSON.stringify([...recent, Date.now()]));
      } catch {
        /* nada */
      }
      setState('ok');
    } catch (err) {
      const code = (err as Error).message;
      setState('idle');
      if (code === 'email') setError({ msg: t.errors.email });
      else if (code === 'required') setError({ msg: t.errors.required });
      else setError({ msg: code === 'rate' ? t.errors.rate : t.errors.generic, mail: true });
    }
  }

  if (state === 'ok') {
    return (
      <div className="flex h-full min-h-72 flex-col items-center justify-center bg-white p-8 text-center" role="status" data-testid="sales-ok">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700" aria-hidden>
          ✓
        </span>
        <h3 className="mt-4 text-xl font-semibold text-slate-900">{t.okTitle}</h3>
        <p className="mt-2 text-slate-600">{t.okText}</p>
      </div>
    );
  }
  const field = 'mt-1 block w-full rounded-md border border-bone-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200';
  const label = 'block text-sm font-medium text-slate-700';
  return (
    <form onSubmit={submit} noValidate className="bg-white p-5 sm:p-7" data-testid="sales-form">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          {t.name} *
          <input name="name" className={field} autoComplete="name" maxLength={120} required />
        </label>
        <label className={label}>
          {t.email} *
          <input name="email" type="email" className={field} autoComplete="email" maxLength={200} required />
        </label>
        <label className={label}>
          {t.institution} *
          <input name="institution" className={field} autoComplete="organization" maxLength={160} required />
        </label>
        <label className={label}>
          {t.role}
          <input name="job_title" className={field} autoComplete="organization-title" maxLength={120} />
        </label>
        <label className={label}>
          {t.teachers}
          <select name="n_teachers" className={field} defaultValue="">
            <option value="">—</option>
            {t.teachersOptions.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
        <label className={label}>
          {t.phone}
          <input name="phone" type="tel" className={field} autoComplete="tel" maxLength={40} />
        </label>
        <label className={`${label} sm:col-span-2`}>
          {t.message}
          <textarea name="message" rows={4} className={field} maxLength={4000} placeholder={t.messagePlaceholder} />
        </label>
        {/* Honeypot: invisible para personas y lectores de pantalla */}
        <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
          <label>
            No rellenar
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <label className="flex items-start gap-2 text-sm text-slate-600 sm:col-span-2">
          <input name="privacy" type="checkbox" className="mt-0.5" required />
          <span>
            {t.privacy}{' '}
            <Link to="/legal/privacidad" className="text-brand-700 underline">
              {t.privacyLink}
            </Link>
            . *
          </span>
        </label>
      </div>
      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error.msg}{' '}
          {error.mail && (
            <a className="font-medium underline" href={`mailto:${SALES_EMAIL}`}>
              {SALES_EMAIL}
            </a>
          )}
        </p>
      )}
      <button
        className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-brand-700 px-7 py-3 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60 sm:w-auto"
        disabled={state === 'sending'}
      >
        {state === 'sending' ? t.sending : t.submit}
      </button>
    </form>
  );
}
