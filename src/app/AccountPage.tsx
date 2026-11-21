import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ErrorBox, Field, Notice, fmtDate } from '../components/ui';
import { SALES_EMAIL } from '../config';
import { useAuth } from './AuthContext';
import { signOutEverywhere } from './UserMenu';

const ROLE: Record<string, string> = { admin: 'Administrador', teacher: 'Profesor' };

/** Nombre del plan que se aplica al usuario en la organización activa. */
export function planName(unlimited: boolean, plan: { plan: string } | null): string {
  if (unlimited) return 'Korrige Academy';
  if (!plan) return '—';
  return plan.plan === 'plus' ? 'Korrige Plus' : 'Gratis';
}

/** Mi cuenta: datos personales, plan, contraseña y sesión. */
export default function AccountPage() {
  const { db, user, profile, orgs, memberships, org, plan, unlimited, refresh } = useAuth();
  const demo = db.kind === 'local';

  const [name, setName] = useState(profile?.full_name ?? '');
  const [nameBusy, setNameBusy] = useState(false);
  const [nameMsg, setNameMsg] = useState('');
  const [nameErr, setNameErr] = useState('');

  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');

  // el menú enlaza a #contrasena: se baja hasta esa sección
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
  }, [hash]);

  if (!user) return null;

  async function saveName(e: FormEvent) {
    e.preventDefault();
    setNameBusy(true);
    setNameErr('');
    setNameMsg('');
    try {
      await db.update('profiles', { id: user!.id }, { full_name: name.trim() });
      await refresh();
      setNameMsg('Nombre guardado.');
    } catch (err) {
      setNameErr((err as Error).message);
    } finally {
      setNameBusy(false);
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    setPwErr('');
    setPwMsg('');
    if (pw.length < 8) return setPwErr('La contraseña debe tener al menos 8 caracteres.');
    if (pw !== pw2) return setPwErr('Las dos contraseñas no coinciden.');
    setPwBusy(true);
    try {
      await db.updatePassword(pw);
      setPw('');
      setPw2('');
      setPwMsg('Contraseña cambiada. La próxima vez entra con la nueva.');
    } catch (err) {
      setPwErr((err as Error).message);
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6" data-testid="account-page">
      <h1 className="text-2xl font-semibold">Mi cuenta</h1>

      <section className="card p-6">
        <h2 className="text-base font-semibold">Datos personales</h2>
        <form onSubmit={saveName} className="mt-4 space-y-4">
          <Field label="Nombre y apellidos" hint="Así te verán tus compañeros en los exámenes compartidos y en el registro de cambios.">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
          </Field>
          <Field label="Email" hint={`Es tu identificador de acceso. Para cambiarlo, escríbenos a ${SALES_EMAIL}.`}>
            <input className="input bg-slate-50 text-slate-500" value={user.email} readOnly />
          </Field>
          <ErrorBox error={nameErr} />
          <div className="flex items-center gap-3">
            <button className="btn-primary" disabled={nameBusy || name.trim() === (profile?.full_name ?? '')}>
              {nameBusy ? 'Guardando…' : 'Guardar'}
            </button>
            {nameMsg && <span className="text-sm text-emerald-700">{nameMsg}</span>}
          </div>
        </form>
      </section>

      <section className="card p-6">
        <h2 className="text-base font-semibold">Plan</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Plan actual</dt>
            <dd className="mt-1 text-lg font-semibold" data-testid="account-plan">
              {planName(unlimited, plan)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Exámenes</dt>
            <dd className="mt-1 text-lg font-semibold">
              {unlimited ? 'Sin límite' : plan ? `${plan.used} de ${plan.limit}${plan.plan === 'plus' ? ' este mes' : ''}` : '—'}
            </dd>
          </div>
          {!unlimited && plan?.plan === 'plus' && plan.period_end && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">{plan.cancel_at_period_end ? 'Termina el' : 'Se renueva el'}</dt>
              <dd className="mt-1 text-lg font-semibold">{fmtDate(plan.period_end)}</dd>
            </div>
          )}
        </dl>
        {unlimited && org && <p className="mt-3 text-sm text-slate-600">Incluido por tu organización, {org.name}.</p>}
        {org && (
          <Link to="/app/plan" className="btn mt-4">
            {unlimited ? 'Ver los planes' : plan?.plan === 'plus' ? 'Gestionar suscripción y facturas' : 'Cambiar de plan'}
          </Link>
        )}
      </section>

      <section className="card p-6">
        <h2 className="text-base font-semibold">Organizaciones</h2>
        {orgs.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">Todavía no perteneces a ninguna organización.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {orgs.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="font-medium">{o.name}</span>
                <span className="badge bg-slate-100 text-slate-600">{ROLE[memberships.find((m) => m.org_id === o.id)?.role ?? ''] ?? 'Miembro'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card scroll-mt-6 p-6" id="contrasena">
        <h2 className="text-base font-semibold">Contraseña</h2>
        {demo ? (
          <div className="mt-3">
            <Notice>En el modo demo no hay cuentas reales, así que no hay contraseña que cambiar.</Notice>
          </div>
        ) : (
          <form onSubmit={savePassword} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nueva contraseña" hint="Mínimo 8 caracteres.">
                <input className="input" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={8} required />
              </Field>
              <Field label="Repite la nueva contraseña">
                <input className="input" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} minLength={8} required />
              </Field>
            </div>
            <ErrorBox error={pwErr} />
            <div className="flex items-center gap-3">
              <button className="btn-primary" disabled={pwBusy}>
                {pwBusy ? 'Cambiando…' : 'Cambiar contraseña'}
              </button>
              {pwMsg && <span className="text-sm text-emerald-700">{pwMsg}</span>}
            </div>
          </form>
        )}
      </section>

      <section className="card p-6">
        <h2 className="text-base font-semibold">Sesión</h2>
        <p className="mt-2 text-sm text-slate-600">Si has usado un ordenador compartido, cierra la sesión al terminar.</p>
        <button className="btn mt-4" onClick={() => void signOutEverywhere(db)}>
          Cerrar sesión
        </button>
        <p className="mt-4 text-xs text-slate-500">
          ¿Quieres darte de baja y borrar tu cuenta? Escríbenos a{' '}
          <a className="underline" href={`mailto:${SALES_EMAIL}?subject=${encodeURIComponent('Baja de mi cuenta')}`}>
            {SALES_EMAIL}
          </a>{' '}
          desde este mismo email.
        </p>
      </section>
    </div>
  );
}
