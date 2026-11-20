import { FormEvent, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ErrorBox, Field, Logo, Notice } from '../components/ui';
import { setDemoMode } from '../lib/db';
import { SUPABASE_CONFIGURED } from '../config';
import { useAuth } from './AuthContext';

function Onboarding() {
  const { db, user, refresh } = useAuth();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await db.rpc('create_organization', { p_name: name.trim() });
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-2xl font-semibold">Te damos la bienvenida a Korrige</h1>
      <p className="mt-2 text-sm text-slate-600">
        Tu cuenta ({user?.email}) todavía no pertenece a ninguna organización. Si tu facultad o academia ya usa Korrige, pide a su administrador que te invite con
        este mismo email y vuelve a entrar. Si eres la primera persona, crea la organización: serás su administrador y podrás invitar al resto de profesores.
      </p>
      <form onSubmit={submit} className="card mt-6 space-y-4 p-6">
        <Field label="Nombre de la organización" hint="Por ejemplo: «Facultad de Medicina» o «Academia Atenea».">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={120} required autoFocus />
        </Field>
        <ErrorBox error={error} />
        <div className="flex gap-3">
          <button className="btn-primary" disabled={busy}>
            {busy ? 'Creando…' : 'Crear organización'}
          </button>
          <button type="button" className="btn" onClick={() => void refresh()}>
            Ya me han invitado: comprobar
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AppShell() {
  const { db, user, profile, orgs, org, role, setOrgId } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to={`/acceso?volver=${encodeURIComponent(loc.pathname)}`} replace />;

  const nav = ({ isActive }: { isActive: boolean }) => `rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100'}`;
  return (
    <div className="min-h-screen bg-bone-100">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Saltar al contenido
      </a>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
          <Link to="/app" className="text-lg">
            <Logo />
          </Link>
          {org && (
            <nav className="flex items-center gap-1" aria-label="Principal">
              <NavLink to="/app" end className={nav}>
                Exámenes
              </NavLink>
              <NavLink to="/app/organizacion" className={nav}>
                Organización
              </NavLink>
              <NavLink to="/app/guia" className={nav}>
                Guía de impresión y escaneo
              </NavLink>
            </nav>
          )}
          <div className="ml-auto flex items-center gap-3 text-sm">
            {orgs.length > 1 && (
              <select className="input w-auto py-1.5" aria-label="Organización activa" value={org?.id} onChange={(e) => setOrgId(e.target.value)}>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            )}
            {orgs.length === 1 && <span className="hidden text-slate-500 sm:inline">{org?.name}</span>}
            <span className="hidden text-slate-700 md:inline" title={user.email}>
              {profile?.full_name || user.email}
              {role === 'admin' && <span className="badge ml-2 bg-slate-100 text-slate-600">admin</span>}
            </span>
            <button
              className="btn btn-sm"
              onClick={async () => {
                await db.signOut();
                if (db.kind === 'local' && SUPABASE_CONFIGURED) {
                  setDemoMode(false);
                  location.href = '/';
                }
              }}
            >
              Salir
            </button>
          </div>
        </div>
      </header>
      {db.kind === 'local' && (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto max-w-7xl px-4 py-2 text-sm text-amber-900">
            <b>Modo demo.</b> Todo se guarda únicamente en este navegador; no hay servidor ni cuentas reales.{' '}
            <button
              className="font-semibold underline underline-offset-2"
              onClick={async () => {
                if (!confirm('¿Reiniciar la demo? Se borrará lo que hayas hecho en ella y se volverá a crear el examen de ejemplo.')) return;
                const { resetLocalDemo } = await import('../lib/dbLocal');
                await resetLocalDemo();
                location.href = '/demo';
              }}
            >
              Reiniciar demo
            </button>
          </div>
        </div>
      )}
      <main id="contenido" className="mx-auto max-w-7xl px-4 py-6">
        {org ? <Outlet /> : <Onboarding />}
      </main>
      <footer className="mx-auto max-w-7xl px-4 pb-8 pt-4 text-xs text-slate-400">
        <Notice>
          <span className="text-xs">
            Recuerda: las hojas se imprimen al <b>100 % («tamaño real»)</b>, nunca con «ajustar a página». ·{' '}
            <Link className="underline" to="/app/guia">
              Guía de impresión y escaneo
            </Link>
          </span>
        </Notice>
      </footer>
    </div>
  );
}
