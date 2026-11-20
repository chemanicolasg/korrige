import { useMemo, useState } from 'react';
import { SheetOverlay } from '../components/SheetOverlay';
import { processPdfs, Progress } from '../omr/client';
import type { ScannedPage } from '../omr/group';
import { DEFAULT_SHEET_CONFIG, LayoutDoc, PageLayout, computeLayout, wrapReferenceLayout } from '../omr/layout';

/**
 * Página de desarrollo: sube un PDF escaneado y muestra la lectura y los overlays.
 * Por defecto usa el layout de referencia (100 preguntas, A–E, 4 modelos, NIA de 8).
 */
export default function DevOmr() {
  const [layout, setLayout] = useState<LayoutDoc>(() => computeLayout('PRUEBA-01', { ...DEFAULT_SHEET_CONFIG, nModels: 4 }));
  const [pages, setPages] = useState<(ScannedPage & { url?: string })[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState('');
  const [ms, setMs] = useState(0);
  const [sel, setSel] = useState(0);

  async function onPdf(files: FileList | null) {
    if (!files?.length) return;
    setError('');
    setPages([]);
    const t0 = performance.now();
    try {
      const out = await processPdfs([...files], layout, { onProgress: setProgress }).promise;
      setPages(out.map((p) => ({ ...p, url: p.image ? URL.createObjectURL(p.image) : undefined })));
      setMs(Math.round(performance.now() - t0));
      setSel(0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProgress(null);
    }
  }

  async function onLayout(files: FileList | null) {
    if (!files?.length) return;
    try {
      const json = JSON.parse(await files[0].text());
      setLayout(json.pages ? (json as LayoutDoc) : wrapReferenceLayout(json as PageLayout));
    } catch {
      setError('El layout no es un JSON válido');
    }
  }

  const json = useMemo(() => JSON.stringify(pages.map((p) => p.read)), [pages]);
  const cur = pages[sel];

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold">/dev/omr — banco de pruebas del lector</h1>
      <p className="mt-1 text-sm text-slate-600">
        Layout activo: <b>{layout.exam_id}</b> · {layout.config.nQuestions} preguntas · {layout.pages.length} pág. El PDF se procesa en este navegador (Web
        Worker); no se envía a ningún servidor.
      </p>
      <div className="mt-4 flex flex-wrap gap-4">
        <label className="card block p-4">
          <span className="label">PDF escaneado</span>
          <input data-testid="pdf-input" type="file" accept="application/pdf" multiple onChange={(e) => onPdf(e.target.files)} />
        </label>
        <label className="card block p-4">
          <span className="label">Layout JSON (opcional)</span>
          <input data-testid="layout-input" type="file" accept="application/json" onChange={(e) => onLayout(e.target.files)} />
        </label>
      </div>
      {progress && (
        <p className="mt-4 text-sm" data-testid="progress">
          {progress.phase === 'hoja' ? `Procesando hoja ${progress.done} de ${progress.total}…` : 'Cargando el motor de lectura…'}
        </p>
      )}
      {error && <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {pages.length > 0 && (
        <>
          <p className="mt-4 text-sm text-slate-600" data-testid="summary">
            {pages.length} hojas en {ms} ms ({Math.round(ms / pages.length)} ms/hoja)
          </p>
          <table className="mt-2 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b">
                {['Pág.', 'QR', 'ID', 'Modelo', 'Plantilla', 'Marcadas', 'Revisar', 'Incidencias'].map((h) => (
                  <th key={h} className="th">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pages.map((p, i) => (
                <tr key={i} className={`cursor-pointer border-b ${i === sel ? 'bg-brand-50' : ''}`} onClick={() => setSel(i)}>
                  <td className="td">{p.read.pagina}</td>
                  <td className="td font-mono text-xs">{p.read.qr ?? '—'}</td>
                  <td className="td font-mono">{p.read.nia ?? '—'}</td>
                  <td className="td">{p.read.modelo ?? '—'}</td>
                  <td className="td">{p.read.es_plantilla ? 'sí' : ''}</td>
                  <td className="td">{Object.values(p.read.respuestas ?? {}).filter(Boolean).length}</td>
                  <td className="td">{Object.entries(p.read.revisar ?? {}).map(([q, v]) => `${q} ${v}`).join('; ')}</td>
                  <td className="td">{p.read.incidencias.join('; ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {cur && (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <SheetOverlay
                className="w-full rounded border"
                imageUrl={cur.url}
                layout={layout.pages[(cur.read.hoja_pagina ?? 1) - 1]}
                data={{ scores: cur.read.scores, idScores: cur.read.nia_scores, modelScores: cur.read.modelo_scores, keyScore: cur.read.plantilla_score }}
              />
              <pre className="max-h-[80vh] overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-100">{JSON.stringify(cur.read, null, 1)}</pre>
            </div>
          )}
          <script type="application/json" id="omr-json" dangerouslySetInnerHTML={{ __html: json.replace(/</g, '\\u003c') }} />
        </>
      )}
    </div>
  );
}
