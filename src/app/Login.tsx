import { FormEvent, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { ErrorBox, Field, Logo, Notice } from '../components/ui';
import { tr } from '../i18n/app';
import { useAuth } from './AuthContext';
import { LangSelect } from './LangSelect';

type Mode = 'entrar' | 'crear' | 'enlace' | 'recuperar' | 'nueva';

/**
 * Acceso con email + contraseña o enlace mágico. Para añadir SSO de Google o
 * Microsoft basta con activar el proveedor en Supabase Auth y añadir aquí un
 * botón que llame a signInWithOAuth (ver README).
 */
export default function Login() {
  const { db, user } = useAuth();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<Mode>((params.get('modo') as Mode) || 'entrar');
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // quien llega desde «Empezar con Plus» va directo a la página del plan tras entrar
  if (user && mode !== 'nueva') return <Navigate to={params.get('plan') === 'plus' ? '/app/plan' : '/app'} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    try {
      if (mode === 'entrar') await db.signIn(email.trim(), password);
      if (mode === 'crear') {
        if (password.length < 8) throw new Error(tr('La contraseña debe tener al menos 8 caracteres.'));
        const confirm = await db.signUp(email.trim(), password, name.trim());
        if (confirm) setInfo(tr('Te hemos enviado un email para confirmar tu cuenta. Ábrelo y pulsa el enlace para entrar.'));
      }
      if (mode === 'enlace') {
        await db.signInMagic(email.trim());
        setInfo(tr('Si existe una cuenta con ese email, recibirás un enlace para entrar sin contraseña.'));
      }
      if (mode === 'recuperar') {
        await db.resetPassword(email.trim());
        setInfo(tr('Si existe una cuenta con ese email, recibirás un enlace para elegir una contraseña nueva.'));
      }
      if (mode === 'nueva') {
        if (password.length < 8) throw new Error(tr('La contraseña debe tener al menos 8 caracteres.'));
        await db.updatePassword(password);
        setMode('entrar');
        setInfo(tr('Contraseña cambiada.'));
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const titles: Record<Mode, string> = {
    entrar: tr('Accede a tu cuenta'),
    crear: tr('Crea tu cuenta'),
    enlace: tr('Entrar con un enlace por email'),
    recuperar: tr('Recuperar contraseña'),
    nueva: tr('Elige una contraseña nueva'),
  };
  const needsPassword = mode === 'entrar' || mode === 'crear' || mode === 'nueva';

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-bone-100 px-4 py-10">
      <Link to="/" className="mb-6 text-xl">
        <Logo />
      </Link>
      <LangSelect className="absolute right-4 top-4" />
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
        <h1 className="text-lg font-semibold">{titles[mode]}</h1>
        {db.kind === 'local' && <Notice>{tr('Modo demo: pulsa «Entrar» con cualquier email. Los datos se guardan solo en este navegador.')}</Notice>}
        {mode === 'crear' && (
          <Field label={tr('Nombre y apellidos')}>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
          </Field>
        )}
        {mode !== 'nueva' && (
          <Field label={tr('Email')}>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required autoFocus />
          </Field>
        )}
        {needsPassword && (
          <Field label={mode === 'nueva' ? tr('Contraseña nueva') : tr('Contraseña')} hint={mode !== 'entrar' ? tr('Mínimo 8 caracteres.') : undefined}>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'}
              required={db.kind !== 'local'}
            />
          </Field>
        )}
        <ErrorBox error={error} />
        {info && <Notice tone="ok">{info}</Notice>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? tr('Un momento…') : { entrar: tr('Entrar'), crear: tr('Crear cuenta'), enlace: tr('Enviarme el enlace'), recuperar: tr('Enviar email'), nueva: tr('Guardar contraseña') }[mode]}
        </button>
        <div className="flex flex-col gap-1.5 text-sm">
          {mode !== 'entrar' && (
            <button type="button" className="text-left text-brand-700 hover:underline" onClick={() => setMode('entrar')}>
              {tr('Ya tengo cuenta: entrar con contraseña')}
            </button>
          )}
          {mode === 'entrar' && (
            <>
              <button type="button" className="text-left text-brand-700 hover:underline" onClick={() => setMode('enlace')}>
                {tr('Entrar sin contraseña (enlace por email)')}
              </button>
              <button type="button" className="text-left text-brand-700 hover:underline" onClick={() => setMode('recuperar')}>
                {tr('He olvidado mi contraseña')}
              </button>
              <button type="button" className="text-left text-brand-700 hover:underline" onClick={() => setMode('crear')}>
                {tr('No tengo cuenta: crear una')}
              </button>
            </>
          )}
        </div>
      </form>
      <p className="mt-6 max-w-sm text-center text-xs text-slate-500">
        {tr('¿Tu facultad o academia aún no usa Korrige?')}{' '}
        <Link to="/#ventas" className="text-brand-700 hover:underline">
          {tr('Habla con ventas')}
        </Link>
        .
      </p>
    </div>
  );
}
