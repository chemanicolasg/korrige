import { useEffect, useRef, useState } from 'react';
import { Logo } from '../components/ui';
import { tr } from '../i18n/app';
import { getDb, setDemoMode } from '../lib/db';
import { DEMO_ORG_ID, DEMO_USER, demoReadyExam, markDemoReady, resetLocalDemo } from '../lib/dbLocal';
import { seedDemo } from '../lib/demo';
import { processPdfs } from '../omr/client';

/** Entrada al modo demo: activa la capa local y, la primera vez, crea el examen de ejemplo. */
export default function Demo() {
  const [msg, setMsg] = useState(tr('Preparando la demo…'));
  const [error, setError] = useState('');
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const run = async () => {
      setDemoMode(true);
      // una demo que no llegó a completarse (pestaña cerrada o recargada a medias) se descarta y se rehace
      let id = demoReadyExam();
      if (!id) await resetLocalDemo();
      const db = await getDb();
      await db.signIn(DEMO_USER.email, '');
      if (id && !(await db.select<{ id: string }>('exams', { id })).length) {
        // el examen de ejemplo se borró: se abre la lista de exámenes de la demo
        location.replace('/app');
        return;
      }
      if (!id) {
        id = await seedDemo(
          db,
          DEMO_ORG_ID,
          DEMO_USER.id,
          (files, layout) => processPdfs(files.map((f) => new File([f.data as BlobPart], f.name, { type: 'application/pdf' })), layout, { onProgress: (p) => p.phase === 'hoja' && setMsg(tr('Leyendo hoja {done} de {total}…', { done: p.done, total: p.total })) }).promise,
          setMsg,
        );
        markDemoReady(id);
      }
      // recarga completa para que toda la app arranque ya en modo demo
      location.replace(`/app/examenes/${id}/resumen`);
    };
    // si la demo está abierta en dos pestañas, solo una la prepara; la otra espera y entra
    const locked = navigator.locks ? navigator.locks.request('korrige-demo', run) : run();
    locked.catch((e) => setError((e as Error).message));
  }, []);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bone-100 p-6 text-center">
      <Logo className="text-xl" />
      {error ? (
        <>
          <p className="max-w-md text-sm text-red-700">{tr('No se pudo preparar la demo: {error}', { error })}</p>
          <p className="max-w-md text-xs text-slate-500">{tr('La demo necesita un navegador reciente (Chrome, Edge o Firefox actualizados, o Safari 17.4 o posterior).')}</p>
          <button className="btn" onClick={() => location.reload()}>
            {tr('Reintentar')}
          </button>
        </>
      ) : (
        <>
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" aria-hidden />
          <p className="text-sm text-slate-700" role="status" data-testid="demo-status">
            {msg}
          </p>
          <p className="max-w-md text-xs text-slate-500">{tr('La demo funciona entera en tu navegador: se genera un examen de ejemplo, se «escanean» 34 hojas y se leen aquí mismo. Nada se envía a ningún servidor.')}</p>
        </>
      )}
    </div>
  );
}
