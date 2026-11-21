import { FormEvent, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ErrorBox, Field, Logo, Notice } from '../components/ui';
import { tr, trn } from '../i18n/app';
import { useAuth } from './AuthContext';
import { Tutorial } from './Tutorial';
import { UserMenu } from './UserMenu';

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
      <h1 className="text-2xl font-semibold">{tr('Te damos la bienvenida a Korrige')}</h1>
      <p className="mt-2 text-sm text-slate-600">
        {tr(
          'Tu cuenta ({email}) todavía no pertenece a ninguna organización. Si tu facultad o academia ya usa Korrige, pide a su administrador que te invite con este mismo email y vuelve a entrar. Si eres la primera persona, crea la organización: serás su administrador y podrás invitar al resto de profesores.',
          { email: user?.email ?? '' },
        )}
      </p>
      <form onSubmit={submit} className="card mt-6 space-y-4 p-6">
        <Field label={tr('Nombre de la organización')} hint={tr('Por ejemplo: «Facultad de Medicina» o «Academia Atenea».')}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={120} required autoFocus />
        </Field>
        <ErrorBox error={error} />
        <div className="flex gap-3">
          <button className="btn-primary" disabled={busy}>
            {busy ? tr('Creando…') : tr('Crear organización')}
          </button>
          <button type="button" className="btn" onClick={() => void refresh()}>
            {tr('Ya me han invitado: comprobar')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AppShell() {
  const { db, user, profile, orgs, org, setOrgId, canCreateExam, markOnboarded } = useAuth();
  const [showTutorial, setShowTutorial] = useState(false);
  const loc = useLocation();
  if (!user) return <Navigate to={`/acceso?volver=${encodeURIComponent(loc.pathname)}`} replace />;

  // primera visita: tutorial de inicio. En la demo no se muestra (salvo que se fuerce para las pruebas)
  const forced = typeof localStorage !== 'undefined' && localStorage.getItem('korrige-tutorial') === '1';
  const firstVisit = !!org && !!profile && !profile.onboarded_at && (db.kind === 'supabase' || forced);
  const closeTutorial = () => {
    setShowTutorial(false);
    if (firstVisit) markOnboarded();
  };

  const nav = ({ isActive }: { isActive: boolean }) => `rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100'}`;
  return (
    <div className="min-h-screen bg-bone-100">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        {tr('Saltar al contenido')}
      </a>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
          <Link to="/app" className="text-lg">
            <Logo />
          </Link>
          {org && (
            <nav className="flex items-center gap-1" aria-label={tr('Principal')}>
              <NavLink to="/app" end className={nav}>
                {tr('Exámenes')}
              </NavLink>
              <NavLink to="/app/organizacion" className={nav}>
                {tr('Organización')}
              </NavLink>
              <NavLink to="/app/plan" className={nav}>
                {tr('Plan')}
              </NavLink>
              <NavLink to="/app/guia" className={nav}>
                {tr('Guía de impresión y escaneo')}
              </NavLink>
            </nav>
          )}
          <div className="ml-auto flex items-center gap-3 text-sm">
            {orgs.length > 1 && (
              <select className="input w-auto py-1.5" aria-label={tr('Organización activa')} value={org?.id} onChange={(e) => setOrgId(e.target.value)}>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            )}
            {orgs.length === 1 && <span className="hidden text-slate-500 lg:inline">{org?.name}</span>}
            <UserMenu onTutorial={() => setShowTutorial(true)} />
          </div>
        </div>
      </header>
      {db.kind === 'local' && (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto max-w-7xl px-4 py-2 text-sm text-amber-900">
            {trn('<b>Modo demo.</b> Todo se guarda únicamente en este navegador; no hay servidor ni cuentas reales.')}{' '}
            <button
              className="font-semibold underline underline-offset-2"
              onClick={async () => {
                if (!confirm(tr('¿Reiniciar la demo? Se borrará lo que hayas hecho en ella y se volverá a crear el examen de ejemplo.'))) return;
                const { resetLocalDemo } = await import('../lib/dbLocal');
                await resetLocalDemo();
                location.href = '/demo';
              }}
            >
              {tr('Reiniciar demo')}
            </button>
          </div>
        </div>
      )}
      <main id="contenido" className="mx-auto max-w-7xl px-4 py-6">
        {org || loc.pathname.startsWith('/app/cuenta') ? <Outlet /> : <Onboarding />}
      </main>
      {(showTutorial || firstVisit) && <Tutorial canCreateExam={canCreateExam} onClose={closeTutorial} />}
      <footer className="mx-auto max-w-7xl px-4 pb-8 pt-4 text-xs text-slate-400">
        <Notice>
          <span className="text-xs">
            <button className="font-medium underline" onClick={() => setShowTutorial(true)}>
              {tr('Ver el tutorial')}
            </button>{' '}
            {trn('· Recuerda: las hojas se imprimen al <b>100 % («tamaño real»)</b>, nunca con «ajustar a página». ·')}{' '}
            <Link className="underline" to="/app/guia">
              {tr('Guía de impresión y escaneo')}
            </Link>
          </span>
        </Notice>
      </footer>
    </div>
  );
}
