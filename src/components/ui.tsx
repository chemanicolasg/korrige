import { ReactNode, useEffect, useRef } from 'react';
import { bcp, tr } from '../i18n/app';
import { ExamStatus, STATUS_LABEL } from '../lib/types';

export function Spinner({ label = tr('Cargando…') }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 p-6 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" aria-hidden />
      {label}
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error: string; onRetry?: () => void }) {
  if (!error) return null;
  return (
    <div role="alert" className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <span>{error}</span>
      {onRetry && (
        <button className="btn btn-sm shrink-0" onClick={onRetry}>
          {tr('Reintentar')}
        </button>
      )}
    </div>
  );
}

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' | 'ok' }) {
  const cls = { info: 'border-brand-200 bg-brand-50 text-brand-900', warn: 'border-amber-300 bg-amber-50 text-amber-900', ok: 'border-emerald-200 bg-emerald-50 text-emerald-900' }[tone];
  return <div className={`rounded-lg border px-4 py-3 text-sm ${cls}`}>{children}</div>;
}

/** Estado vacío que explica el siguiente paso. */
export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {children && <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">{children}</p>}
      {action && <div className="mt-5 flex justify-center gap-3">{action}</div>}
    </div>
  );
}

const STATUS_CLS: Record<ExamStatus, string> = {
  borrador: 'bg-slate-100 text-slate-700',
  hojas_descargadas: 'bg-sky-100 text-sky-800',
  con_resultados: 'bg-emerald-100 text-emerald-800',
  cerrado: 'bg-slate-800 text-white',
};
export function StatusBadge({ status }: { status: ExamStatus }) {
  return <span className={`badge ${STATUS_CLS[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`card my-6 w-full ${wide ? 'max-w-6xl' : 'max-w-lg'} outline-none`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <button className="btn-ghost btn-sm" onClick={onClose} aria-label={tr('Cerrar')}>
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="card px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</div>
      {hint && <div className="text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString(bcp(), { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const fmtDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString(bcp(), { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
export const fmtNum = (n: number, decimals = 2) => n.toLocaleString(bcp(), { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** Logotipo: la «o» es una burbuja de la hoja rellenada con boli azul. */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`wordmark inline-flex items-baseline text-ink ${className}`} role="img" aria-label="Korrige">
      <span aria-hidden>k</span>
      <svg viewBox="0 0 20 20" className="mx-[0.04em] h-[0.62em] w-[0.62em] translate-y-[0.02em]" aria-hidden>
        <circle cx="10" cy="10" r="8.4" fill="#2439b0" stroke="#d6336c" strokeWidth="2.2" />
      </svg>
      <span aria-hidden>rrige</span>
    </span>
  );
}
