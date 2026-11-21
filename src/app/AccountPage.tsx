import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ErrorBox, Field, Notice, fmtDate } from '../components/ui';
import { SALES_EMAIL } from '../config';
import { useAuth } from './AuthContext';
import { LangSelect } from './LangSelect';
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
  const { db, user, profile, orgs, memberships, org, plan, unlimited, refresh, setOrgId } = useAuth();
  const demo = db.kind === 'local';

  const [name, setName] = useState(profile?.full_name ?? '');
  const [nameBusy, setNameBusy] = useState(false);
  const [nameMsg, setNameMsg] = useState('');
  const [nameErr, setNameErr] = useState('');

  /** null = formulario cerrado */
  const [newOrg, setNewOrg] = useState<string | null>(null);
  const [orgBusy, setOrgBusy] = useState(false);
  const [orgErr, setOrgErr] = useState('');

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

  async function createOrg(e: FormEvent) {
    e.preventDefault();
    setOrgBusy(true);
    setOrgErr('');
    try {
      const id = await db.rpc<string>('create_organization', { p_name: (newOrg ?? '').trim() });
      await refresh();
      setOrgId(id);
      setNewOrg(null);
    } catch (err) {
      setOrgErr((err as Error).message);
    } finally {
      setOrgBusy(false);
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

      <section className="card p-6" data-testid="account-orgs">
        <h2 className="text-base font-semibold">Organizaciones</h2>
        <p className="mt-1 text-sm text-slate-600">Si trabajas en más de un centro, puedes tener una organización para cada uno y cambiar de una a otra cuando quieras.</p>
        {orgs.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">Todavía no perteneces a ninguna organización.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {orgs.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <span className="font-medium">{o.name}</span>
                <span className="badge bg-slate-100 text-slate-600">{ROLE[memberships.find((m) => m.org_id === o.id)?.role ?? ''] ?? 'Miembro'}</span>
                {plan?.academy_orgs.includes(o.id) && <span className="badge bg-brand-50 text-brand-800">Academy</span>}
                <span className="ml-auto">
                  {o.id === org?.id ? (
                    <span className="text-xs text-slate-500">Activa ahora</span>
                  ) : (
                    <button className="btn btn-sm" onClick={() => setOrgId(o.id)}>
                      Cambiar a esta
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        {newOrg === null ? (
          <button className="btn mt-4" onClick={() => setNewOrg('')}>
            Crear otra organización
          </button>
        ) : (
          <form onSubmit={createOrg} className="mt-4 space-y-3">
            <Field label="Nombre de la nueva organización" hint="Serás su administrador y podrás invitar a otros profesores. Para unirte a una que ya existe, pide a su administrador que te invite con este email.">
              <input className="input" value={newOrg} onChange={(e) => setNewOrg(e.target.value)} minLength={2} maxLength={120} required autoFocus />
            </Field>
            <ErrorBox error={orgErr} />
            <div className="flex gap-3">
              <button className="btn-primary" disabled={orgBusy}>
                {orgBusy ? 'Creando…' : 'Crear organización'}
              </button>
              <button type="button" className="btn" onClick={() => setNewOrg(null)}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="card p-6">
        <h2 className="text-base font-semibold">Idioma</h2>
        <p className="mt-1 text-sm text-slate-600">Idioma de la aplicación en este navegador. El idioma de las hojas de respuestas se elige en cada examen.</p>
        <div className="mt-3">
          <LangSelect />
        </div>
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
