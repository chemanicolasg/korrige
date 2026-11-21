import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SUPABASE_CONFIGURED } from '../config';
import { tr } from '../i18n/app';
import { Db, setDemoMode } from '../lib/db';
import { useAuth } from './AuthContext';
import { LangSelect } from './LangSelect';

export async function signOutEverywhere(db: Db) {
  await db.signOut();
  if (db.kind === 'local' && SUPABASE_CONFIGURED) {
    setDemoMode(false);
    location.href = '/';
  }
}

function initials(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] ?? email).slice(0, 2).toUpperCase();
}

/** Menú de usuario de la cabecera: nombre, plan, accesos a la cuenta y cerrar sesión. */
export function UserMenu({ onTutorial }: { onTutorial: () => void }) {
  const { db, user, profile, org, role, plan, unlimited } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', click);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', click);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  if (!user) return null;
  const name = profile?.full_name || user.email;
  const planLabel = unlimited ? 'Korrige Academy' : plan ? (plan.plan === 'plus' ? 'Korrige Plus' : tr('Plan gratis')) : '';
  const usage = unlimited
    ? tr('Exámenes sin límite')
    : plan
      ? plan.plan === 'plus'
        ? tr('{used} de {limit} exámenes este mes', { used: plan.used, limit: plan.limit })
        : tr('{used} de {limit} exámenes', { used: plan.used, limit: plan.limit })
      : '';
  const item = 'block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100';
  const close = () => setOpen(false);

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-sm hover:bg-slate-50"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={tr('Menú de usuario')}
        data-testid="user-menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-xs font-semibold text-white" aria-hidden>
          {initials(profile?.full_name ?? '', user.email)}
        </span>
        <span className="hidden max-w-[11rem] truncate text-slate-700 md:inline">{name}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden className="text-slate-400">
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-lg" data-testid="user-menu-panel">
          <div className="px-3 pb-3 pt-2">
            <p className="truncate font-semibold text-slate-900">{name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
            {org && (
              <p className="mt-2 truncate text-xs text-slate-600">
                {org.name}
                {role === 'admin' && <span className="badge ml-2 bg-slate-100 text-slate-600">admin</span>}
              </p>
            )}
            {planLabel && (
              <div className="mt-3 rounded-lg bg-brand-50 px-3 py-2">
                <p className="text-sm font-semibold text-brand-800">{planLabel}</p>
                <p className="text-xs text-slate-600">{usage}</p>
              </div>
            )}
          </div>
          <div className="border-t border-slate-100 pt-2">
            <Link role="menuitem" to="/app/cuenta" className={item} onClick={close}>
              {tr('Mi cuenta')}
            </Link>
            {org && (
              <Link role="menuitem" to="/app/plan" className={item} onClick={close}>
                {tr('Plan y facturación')}
              </Link>
            )}
            <Link role="menuitem" to="/app/cuenta#contrasena" className={item} onClick={close}>
              {tr('Cambiar contraseña')}
            </Link>
            {org && (
              <button
                role="menuitem"
                className={item}
                onClick={() => {
                  close();
                  onTutorial();
                }}
              >
                {tr('Ver el tutorial')}
              </button>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-100 px-3 pb-1 pt-3 text-sm text-slate-700">
            <span>{tr('Idioma')}</span>
            <LangSelect />
          </div>
          <div className="mt-2 border-t border-slate-100 pt-2">
            <button role="menuitem" className={`${item} text-red-700 hover:bg-red-50`} onClick={() => void signOutEverywhere(db)}>
              {tr('Cerrar sesión')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
