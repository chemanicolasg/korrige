import { useEffect, useMemo, useState } from 'react';
import { PdfPreview } from '../../components/PdfPreview';
import { Field, Notice } from '../../components/ui';
import { downloadBlob, fileSlug } from '../../lib/exportData';
import { markDownloaded, updateSheetConfig } from '../../lib/service';
import { SheetConfig, clampConfig, computeLayout } from '../../omr/layout';
import { useExam } from '../ExamPage';
import { SheetConfigForm } from '../SheetConfigForm';

export default function TabSheet() {
  const { data, db, run, readOnly, busy } = useExam();
  const locked = data.sheets.length > 0;
  const [cfg, setCfg] = useState<SheetConfig>(data.exam.sheet_config);
  const [copies, setCopies] = useState(1);
  const [pdf, setPdf] = useState<Uint8Array | null>(null);
  const [downloading, setDownloading] = useState(false);
  useEffect(() => setCfg(data.exam.sheet_config), [data.exam.sheet_config]);

  const dirty = JSON.stringify(clampConfig(cfg)) !== JSON.stringify(clampConfig(data.exam.sheet_config));
  // vista previa con la configuración que hay en pantalla (aunque aún no esté guardada)
  const previewLayout = useMemo(() => (dirty ? computeLayout(data.exam.code, cfg) : data.layout), [dirty, cfg, data.exam.code, data.layout]);
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      const { generateSheetPdf } = await import('../../omr/sheetPdf');
      const bytes = await generateSheetPdf(previewLayout);
      if (alive) setPdf(bytes);
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [previewLayout]);

  async function download() {
    setDownloading(true);
    try {
      const { generateSheetCopiesPdf } = await import('../../omr/sheetPdf');
      const bytes = await generateSheetCopiesPdf(data.layout, copies);
      downloadBlob(bytes as BlobPart, `hoja-${fileSlug(data.exam.title)}-${data.exam.code}${copies > 1 ? `-x${copies}` : ''}.pdf`, 'application/pdf');
      if (!readOnly) await run((d) => markDownloaded(db, d, copies));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <section className="card p-5">
          <h2 className="font-semibold">Configuración de la hoja</h2>
          {locked ? (
            <div className="mt-3">
              <Notice>Ya hay hojas subidas, así que la hoja queda bloqueada. Si necesitas otra configuración, duplica el examen desde Resumen.</Notice>
            </div>
          ) : (
            <p className="mt-1 text-sm text-slate-600">El diseño se recalcula solo. Si cambias algo después de imprimir, tendrás que volver a imprimir las hojas.</p>
          )}
          <div className="mt-4">
            <SheetConfigForm value={cfg} onChange={setCfg} disabled={locked || readOnly} />
          </div>
          {!locked && !readOnly && (
            <div className="mt-4 flex gap-3">
              <button className="btn-primary" disabled={!dirty || busy} onClick={() => run((d) => updateSheetConfig(db, d, cfg))}>
                Guardar configuración
              </button>
              {dirty && (
                <button className="btn" onClick={() => setCfg(data.exam.sheet_config)}>
                  Descartar
                </button>
              )}
            </div>
          )}
        </section>
        <section className="card p-5">
          <h2 className="font-semibold">Descargar e imprimir</h2>
          <div className="mt-3">
            <Notice tone="warn">
              <b>Imprime al 100 % («tamaño real»), nunca con «ajustar a página».</b> Papel A4 blanco, una cara. No escribas sobre las marcas negras de las esquinas ni
              sobre el código QR.
            </Notice>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <Field label="Copias en el PDF" hint="1 = una hoja para fotocopiar; o tantas como alumnos.">
              <input className="input w-28" type="number" min={1} max={1000} value={copies} onChange={(e) => setCopies(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))} />
            </Field>
            <button className="btn-primary mb-5" disabled={dirty || downloading} onClick={download}>
              {downloading ? 'Generando PDF…' : 'Descargar hojas en PDF'}
            </button>
          </div>
          {dirty && <p className="text-xs text-amber-700">Guarda la configuración antes de descargar.</p>}
          <p className="mt-2 text-xs text-slate-500">
            Código del examen en el QR: <span className="font-mono">{data.layout.pages.map((p) => p.qr_text).join('  ·  ')}</span>
          </p>
        </section>
      </div>
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-600">Vista previa{dirty && ' (cambios sin guardar)'}</h2>
        <PdfPreview bytes={pdf} />
      </section>
    </div>
  );
}
