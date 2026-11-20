import { FormEvent, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { ErrorBox, Field, Logo, Notice } from '../components/ui';
import { useAuth } from './AuthContext';

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

  if (user && mode !== 'nueva') return <Navigate to="/app" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    try {
      if (mode === 'entrar') await db.signIn(email.trim(), password);
      if (mode === 'crear') {
        if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
        const confirm = await db.signUp(email.trim(), password, name.trim());
        if (confirm) setInfo('Te hemos enviado un email para confirmar tu cuenta. Ábrelo y pulsa el enlace para entrar.');
      }
      if (mode === 'enlace') {
        await db.signInMagic(email.trim());
        setInfo('Si existe una cuenta con ese email, recibirás un enlace para entrar sin contraseña.');
      }
      if (mode === 'recuperar') {
        await db.resetPassword(email.trim());
        setInfo('Si existe una cuenta con ese email, recibirás un enlace para elegir una contraseña nueva.');
      }
      if (mode === 'nueva') {
        if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
        await db.updatePassword(password);
        setMode('entrar');
        setInfo('Contraseña cambiada.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const titles: Record<Mode, string> = {
    entrar: 'Accede a tu cuenta',
    crear: 'Crea tu cuenta',
    enlace: 'Entrar con un enlace por email',
    recuperar: 'Recuperar contraseña',
    nueva: 'Elige una contraseña nueva',
  };
  const needsPassword = mode === 'entrar' || mode === 'crear' || mode === 'nueva';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <Link to="/" className="mb-6 text-xl">
        <Logo />
      </Link>
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
        <h1 className="text-lg font-semibold">{titles[mode]}</h1>
        {db.kind === 'local' && <Notice>Modo demo: pulsa «Entrar» con cualquier email. Los datos se guardan solo en este navegador.</Notice>}
        {mode === 'crear' && (
          <Field label="Nombre y apellidos">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
          </Field>
        )}
        {mode !== 'nueva' && (
          <Field label="Email">
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required autoFocus />
          </Field>
        )}
        {needsPassword && (
          <Field label={mode === 'nueva' ? 'Contraseña nueva' : 'Contraseña'} hint={mode !== 'entrar' ? 'Mínimo 8 caracteres.' : undefined}>
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
          {busy ? 'Un momento…' : { entrar: 'Entrar', crear: 'Crear cuenta', enlace: 'Enviarme el enlace', recuperar: 'Enviar email', nueva: 'Guardar contraseña' }[mode]}
        </button>
        <div className="flex flex-col gap-1.5 text-sm">
          {mode !== 'entrar' && (
            <button type="button" className="text-left text-brand-700 hover:underline" onClick={() => setMode('entrar')}>
              Ya tengo cuenta: entrar con contraseña
            </button>
          )}
          {mode === 'entrar' && (
            <>
              <button type="button" className="text-left text-brand-700 hover:underline" onClick={() => setMode('enlace')}>
                Entrar sin contraseña (enlace por email)
              </button>
              <button type="button" className="text-left text-brand-700 hover:underline" onClick={() => setMode('recuperar')}>
                He olvidado mi contraseña
              </button>
              <button type="button" className="text-left text-brand-700 hover:underline" onClick={() => setMode('crear')}>
                No tengo cuenta: crear una
              </button>
            </>
          )}
        </div>
      </form>
      <p className="mt-6 max-w-sm text-center text-xs text-slate-500">
        ¿Tu facultad o academia aún no usa Korrige?{' '}
        <Link to="/#ventas" className="text-brand-700 hover:underline">
          Habla con ventas
        </Link>
        .
      </p>
    </div>
  );
}
