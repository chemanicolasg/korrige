import { useEffect, useRef, useState } from 'react';
import { Logo } from '../components/ui';
import { getDb, setDemoMode } from '../lib/db';
import { DEMO_ORG_ID, DEMO_USER } from '../lib/dbLocal';
import { seedDemo } from '../lib/demo';
import { processPdfs } from '../omr/client';

/** Entrada al modo demo: activa la capa local y, la primera vez, crea el examen de ejemplo. */
export default function Demo() {
  const [msg, setMsg] = useState('Preparando la demo…');
  const [error, setError] = useState('');
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        setDemoMode(true);
        const db = await getDb();
        await db.signIn(DEMO_USER.email, '');
        const exams = await db.select<{ id: string }>('exams', { org_id: DEMO_ORG_ID }, { order: 'created_at' });
        let id = exams[0]?.id;
        if (!id) {
          id = await seedDemo(
            db,
            DEMO_ORG_ID,
            DEMO_USER.id,
            (files, layout) => processPdfs(files.map((f) => new File([f.data as BlobPart], f.name, { type: 'application/pdf' })), layout, { onProgress: (p) => p.phase === 'hoja' && setMsg(`Leyendo hoja ${p.done} de ${p.total}…`) }).promise,
            setMsg,
          );
        }
        // recarga completa para que toda la app arranque ya en modo demo
        location.replace(`/app/examenes/${id}/resumen`);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bone-100 p-6 text-center">
      <Logo className="text-xl" />
      {error ? (
        <p className="max-w-md text-sm text-red-700">No se pudo preparar la demo: {error}</p>
      ) : (
        <>
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" aria-hidden />
          <p className="text-sm text-slate-700" role="status" data-testid="demo-status">
            {msg}
          </p>
          <p className="max-w-md text-xs text-slate-500">La demo funciona entera en tu navegador: se genera un examen de ejemplo, se «escanean» 34 hojas y se leen aquí mismo. Nada se envía a ningún servidor.</p>
        </>
      )}
    </div>
  );
}
