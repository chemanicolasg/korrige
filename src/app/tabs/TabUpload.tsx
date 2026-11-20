import { DragEvent, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorBox, Notice, fmtDateTime } from '../../components/ui';
import { DuplicatePolicy, deleteUpload, duplicatesWithExisting, saveUpload } from '../../lib/service';
import { buildReviewItems, findDuplicates } from '../../lib/review';
import { ProcessHandle, Progress, processPdfs } from '../../omr/client';
import { Excluded, Submission, groupPages } from '../../omr/group';
import { modelLetters } from '../../omr/layout';
import { useExam } from '../ExamPage';

type Stage = { s: 'idle' } | { s: 'reading'; p: Progress | null } | { s: 'summary'; submissions: Submission[]; excluded: Excluded[] } | { s: 'saving'; done: number; total: number } | { s: 'done'; n: number; incidents: number };

function Bar({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${total ? pct : 8}%` }} />
    </div>
  );
}

export default function TabUpload() {
  const { data, db, run, readOnly, userId } = useExam();
  const [stage, setStage] = useState<Stage>({ s: 'idle' });
  const [error, setError] = useState('');
  const [over, setOver] = useState(false);
  const [policy, setPolicy] = useState<DuplicatePolicy>('sustituir');
  const [keyModels, setKeyModels] = useState<Record<number, string>>({});
  const handle = useRef<ProcessHandle | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const models = modelLetters(data.exam.sheet_config);

  async function start(files: File[]) {
    const pdfs = files.filter((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
    if (!pdfs.length) return setError('Arrastra archivos PDF (el que te envía la fotocopiadora por correo).');
    setError('');
    setKeyModels({});
    setStage({ s: 'reading', p: null });
    try {
      handle.current = processPdfs(pdfs, data.layout, { onProgress: (p) => setStage({ s: 'reading', p }) });
      const pages = await handle.current.promise;
      if (!pages.length) throw new Error('El PDF no contiene páginas.');
      const { submissions, excluded } = groupPages(pages, data.layout, data.exam.code);
      setStage({ s: 'summary', submissions, excluded });
    } catch (e) {
      setError(`No se pudo leer el PDF: ${(e as Error).message}`);
      setStage({ s: 'idle' });
    }
  }
  /** Modo demo: genera un PDF con hojas rellenadas al azar y lo lee como si fuera un escaneo. */
  async function sample() {
    const [{ generateFilledPdf }, { randomFilledSheets }] = await Promise.all([import('../../omr/demoScan'), import('../../lib/demo')]);
    const pdf = await generateFilledPdf(data.layout, randomFilledSheets(data.exam.sheet_config, 12));
    await start([new File([pdf as BlobPart], 'hojas-de-ejemplo.pdf', { type: 'application/pdf' })]);
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (stage.s === 'idle' || stage.s === 'done') void start([...e.dataTransfer.files]);
  };

  const summary = useMemo(() => {
    if (stage.s !== 'summary') return null;
    const { submissions } = stage;
    const students = submissions.filter((s) => !s.isKey);
    const keys = submissions.map((s, i) => ({ s, i })).filter((x) => x.s.isKey);
    const dupExisting = duplicatesWithExisting(data, submissions);
    const dupBatch = findDuplicates(students.map((s) => s.identifier));
    const ctx = { nModels: data.exam.sheet_config.nModels, roster: new Set(data.students.map((s) => s.identifier)), duplicates: dupBatch };
    const incidents = students.reduce((a, s) => a + buildReviewItems(s, ctx).length, 0);
    return { students, keys, dupExisting, incidents, blank: students.filter((s) => s.blank).length, illegible: students.filter((s) => !s.legible).length };
  }, [stage, data]);

  async function save() {
    if (stage.s !== 'summary' || !summary) return;
    const { submissions, excluded } = stage;
    const n = summary.students.length;
    setStage({ s: 'saving', done: 0, total: 0 });
    let incidents = 0;
    const ok = await run(async (d) => {
      const next = await saveUpload(db, d, userId, { submissions, excluded, keyModels, duplicatePolicy: policy }, (done, total) => setStage({ s: 'saving', done, total }));
      incidents = next.items.filter((i) => i.status === 'pendiente').length;
      return next;
    });
    setStage(ok ? { s: 'done', n, incidents } : { s: 'idle' });
  }

  const keysWithoutModel = summary?.keys.filter((k) => !k.s.model && models.length > 1 && !keyModels[k.i]) ?? [];

  return (
    <div className="space-y-4">
      <ErrorBox error={error} />
      {readOnly && <Notice>El examen está cerrado: reábrelo para subir más hojas.</Notice>}

      {!readOnly && (stage.s === 'idle' || stage.s === 'done') && (
        <>
          {stage.s === 'done' && (
            <Notice tone="ok">
              <b>{stage.n} hojas guardadas.</b>{' '}
              {stage.incidents > 0 ? (
                <>
                  Hay {stage.incidents} incidencias por revisar.{' '}
                  <Link className="font-medium underline" to="../revision">
                    Ir a Revisión
                  </Link>
                </>
              ) : (
                <>
                  No hay incidencias pendientes.{' '}
                  <Link className="font-medium underline" to="../notas">
                    Ver notas
                  </Link>
                </>
              )}
            </Notice>
          )}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={onDrop}
            className={`rounded-xl border-2 border-dashed px-6 py-14 text-center transition ${over ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-white'}`}
          >
            <h2 className="text-base font-semibold">{data.sheets.length ? 'Sube otra tanda de hojas' : 'Aún no has subido hojas'}</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
              Escanea el taco en la fotocopiadora (escanear a correo, 300 ppp, sin grapas) y arrastra aquí el PDF que recibas. Puedes soltar varios a la vez.
            </p>
            <input ref={input} type="file" accept="application/pdf" multiple className="hidden" data-testid="upload-input" onChange={(e) => e.target.files && void start([...e.target.files])} />
            <button className="btn-primary mt-5" onClick={() => input.current?.click()}>
              Elegir PDF…
            </button>
            {db.kind === 'local' && (
              <button className="btn ml-3 mt-5" data-testid="upload-sample" onClick={() => void sample()}>
                Probar con 12 hojas de ejemplo
              </button>
            )}
            <p className="mt-4 text-xs text-slate-500">
              Las hojas se leen en tu ordenador: el PDF no se envía a ningún servidor. Solo se guarda una imagen comprimida de cada hoja para la revisión.
            </p>
          </div>
        </>
      )}

      {stage.s === 'reading' && (
        <div className="card space-y-3 p-6" aria-live="polite">
          <h2 className="font-semibold" data-testid="upload-progress">
            {stage.p?.phase === 'hoja' ? `Procesando hoja ${stage.p.done} de ${stage.p.total}…` : stage.p?.phase === 'pdf' ? `Abriendo ${stage.p.fileName ?? 'el PDF'}…` : 'Preparando el lector de hojas…'}
          </h2>
          <Bar done={stage.p?.phase === 'hoja' ? stage.p.done : 0} total={stage.p?.phase === 'hoja' ? stage.p.total : 0} />
          <p className="text-xs text-slate-500">Puedes seguir usando el ordenador; la lectura se hace en segundo plano.</p>
          <button
            className="btn btn-sm"
            onClick={() => {
              handle.current?.cancel();
              setStage({ s: 'idle' });
            }}
          >
            Cancelar
          </button>
        </div>
      )}

      {stage.s === 'summary' && summary && (
        <div className="card space-y-4 p-6" data-testid="upload-summary">
          <h2 className="text-base font-semibold">Lectura terminada: revisa el resumen antes de guardar</h2>
          <ul className="space-y-1.5 text-sm text-slate-800">
            <li>
              <b>{summary.students.length}</b> hojas de alumnos
              {summary.blank > 0 && ` (${summary.blank} en blanco)`}
              {summary.illegible > 0 && ` (${summary.illegible} ilegibles)`}.
            </li>
            <li>
              <b>{summary.incidents}</b> incidencias para revisar (dobles marcas, marcas flojas, identificadores dudosos…).
            </li>
            {summary.keys.map(({ s, i }) => (
              <li key={i} className="flex flex-wrap items-center gap-2">
                <span className="badge bg-brand-100 text-brand-800">Plantilla</span>
                Hoja con la burbuja «P» ({s.pages[0].fileName}, pág. {s.pages[0].read.pagina}):
                {s.model || models.length === 1 ? (
                  <span>
                    se guardará como plantilla del <b>modelo {s.model ?? 'A'}</b>.
                  </span>
                ) : (
                  <label className="flex items-center gap-2">
                    no tiene el modelo marcado. ¿De qué modelo es?
                    <select className="input w-auto py-1" value={keyModels[i] ?? ''} onChange={(e) => setKeyModels({ ...keyModels, [i]: e.target.value })}>
                      <option value="">Elegir…</option>
                      {models.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </label>
                )}
              </li>
            ))}
          </ul>

          {stage.excluded.length > 0 && (
            <Notice tone="warn">
              <b>{stage.excluded.length} hoja(s) no son de este examen y se excluyen:</b>
              <ul className="mt-1 list-inside list-disc">
                {stage.excluded.slice(0, 8).map((e, i) => (
                  <li key={i}>
                    {e.page.fileName}, pág. {e.page.read.pagina}: {e.reason}
                  </li>
                ))}
                {stage.excluded.length > 8 && <li>… y {stage.excluded.length - 8} más</li>}
              </ul>
            </Notice>
          )}

          {summary.dupExisting.length > 0 && (
            <fieldset className="rounded-lg border border-amber-300 bg-amber-50 p-4">
              <legend className="px-1 text-sm font-semibold text-amber-900">
                {summary.dupExisting.length} {data.exam.sheet_config.idLabel} ya tenían hoja en una subida anterior
              </legend>
              <p className="text-xs text-amber-900">
                {summary.dupExisting.slice(0, 12).join(', ')}
                {summary.dupExisting.length > 12 ? '…' : ''}
              </p>
              <div className="mt-3 space-y-1.5 text-sm">
                {(
                  [
                    ['sustituir', 'Sustituir: la hoja nueva reemplaza a la anterior (la anterior queda excluida)'],
                    ['conservar', 'Conservar ambas y decidir una a una en Revisión'],
                    ['descartar', 'Descartar las hojas nuevas repetidas'],
                  ] as const
                ).map(([v, l]) => (
                  <label key={v} className="flex items-center gap-2">
                    <input type="radio" name="dup" checked={policy === v} onChange={() => setPolicy(v)} /> {l}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button className="btn-primary" disabled={keysWithoutModel.length > 0 || summary.students.length + summary.keys.length === 0} onClick={() => void save()}>
              Guardar {summary.students.length} hojas{summary.keys.length > 0 && ` y ${summary.keys.length} plantilla(s)`}
            </button>
            <button className="btn" onClick={() => setStage({ s: 'idle' })}>
              Descartar
            </button>
            {keysWithoutModel.length > 0 && <span className="text-sm text-amber-700">Indica el modelo de la plantilla para continuar.</span>}
          </div>
        </div>
      )}

      {stage.s === 'saving' && (
        <div className="card space-y-3 p-6" aria-live="polite">
          <h2 className="font-semibold">{stage.total ? `Guardando imágenes: ${stage.done} de ${stage.total}…` : 'Guardando…'}</h2>
          <Bar done={stage.done} total={stage.total} />
          <p className="text-xs text-slate-500">No cierres esta pestaña hasta que termine.</p>
        </div>
      )}

      {data.uploads.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-600">Subidas anteriores</h2>
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  {['Fecha', 'Archivos', 'Páginas', 'Hojas', 'Excluidas', ''].map((h) => (
                    <th key={h} className="th">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.uploads.map((u) => (
                  <tr key={u.id}>
                    <td className="td whitespace-nowrap">{fmtDateTime(u.created_at)}</td>
                    <td className="td">{u.file_names.join(', ')}</td>
                    <td className="td tabular-nums">{u.n_pages}</td>
                    <td className="td tabular-nums">{u.n_sheets}</td>
                    <td className="td tabular-nums">{u.n_excluded}</td>
                    <td className="td text-right">
                      {!readOnly && (
                        <button
                          className="text-xs text-red-700 hover:underline"
                          onClick={() => confirm('¿Eliminar esta subida con todas sus hojas, imágenes y correcciones? No se puede deshacer.') && void run((d) => deleteUpload(db, d, u.id))}
                        >
                          Eliminar subida
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
