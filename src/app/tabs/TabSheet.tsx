import { useEffect, useMemo, useState } from 'react';
import { PdfPreview } from '../../components/PdfPreview';
import { Notice } from '../../components/ui';
import { downloadBlob, fileSlug } from '../../lib/exportData';
import { markDownloaded, updateSheetConfig } from '../../lib/service';
import { SheetConfig, clampConfig, computeLayout } from '../../omr/layout';
import { SHEET_LANGS, SHEET_LANG_NAMES, SheetLang, sheetLang } from '../../omr/sheetText';
import { tr, trn } from '../../i18n/app';
import { useExam } from '../ExamPage';
import { SheetConfigForm } from '../SheetConfigForm';

export default function TabSheet() {
  const { data, db, run, readOnly, busy } = useExam();
  const locked = data.sheets.length > 0;
  const [cfg, setCfg] = useState<SheetConfig>(data.exam.sheet_config);
  // copias por idioma: por defecto, una en el idioma de la hoja
  const [byLang, setByLang] = useState<Record<SheetLang, number>>(() => ({ es: 0, ca: 0, en: 0, [sheetLang(data.exam.sheet_config.lang)]: 1 }));
  const copies = SHEET_LANGS.reduce((a, l) => a + byLang[l], 0);
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
      const { generateSheetMixPdf } = await import('../../omr/sheetPdf');
      const bytes = await generateSheetMixPdf(data.layout, byLang);
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
          <h2 className="font-semibold">{tr('Configuración de la hoja')}</h2>
          {locked ? (
            <div className="mt-3">
              <Notice>{tr('Ya hay hojas subidas, así que la hoja queda bloqueada. Si necesitas otra configuración, duplica el examen desde Resumen.')}</Notice>
            </div>
          ) : (
            <p className="mt-1 text-sm text-slate-600">{tr('El diseño se recalcula solo. Si cambias algo después de imprimir, tendrás que volver a imprimir las hojas.')}</p>
          )}
          <div className="mt-4">
            <SheetConfigForm value={cfg} onChange={setCfg} disabled={locked || readOnly} />
          </div>
          {!locked && !readOnly && (
            <div className="mt-4 flex gap-3">
              <button className="btn-primary" disabled={!dirty || busy} onClick={() => run((d) => updateSheetConfig(db, d, cfg))}>
                {tr('Guardar configuración')}
              </button>
              {dirty && (
                <button className="btn" onClick={() => setCfg(data.exam.sheet_config)}>
                  {tr('Descartar')}
                </button>
              )}
            </div>
          )}
        </section>
        <section className="card p-5">
          <h2 className="font-semibold">{tr('Descargar e imprimir')}</h2>
          <div className="mt-3">
            <Notice tone="warn">
              {trn('<b>Imprime al 100 % («tamaño real»), nunca con «ajustar a página».</b> Papel A4 blanco, una cara. No escribas sobre las marcas negras de las esquinas ni sobre el código QR.')}
            </Notice>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <fieldset>
              <legend className="label">{tr('Copias en el PDF, por idioma')}</legend>
              <div className="flex flex-wrap gap-3">
                {SHEET_LANGS.map((l) => (
                  <label key={l} className="text-xs text-slate-600">
                    {SHEET_LANG_NAMES[l]}
                    <input
                      className="input mt-1 block w-24"
                      type="number"
                      min={0}
                      max={1000}
                      data-testid={`copies-${l}`}
                      value={byLang[l]}
                      onChange={(e) => setByLang({ ...byLang, [l]: Math.max(0, Math.min(1000, Math.round(Number(e.target.value)) || 0)) })}
                    />
                  </label>
                ))}
              </div>
              <span className="mt-1 block text-xs text-slate-500">
                {tr('Pon 1 para tener una hoja que fotocopiar, o tantas como alumnos. Las hojas de distintos idiomas son del mismo examen: se escanean juntas y se corrigen igual.')}
              </span>
            </fieldset>
            <button className="btn-primary mb-5" disabled={dirty || downloading || copies < 1} onClick={download}>
              {downloading ? tr('Generando PDF…') : copies > 1 ? tr('Descargar {n} hojas en PDF', { n: copies }) : tr('Descargar hojas en PDF')}
            </button>
          </div>
          {dirty && <p className="text-xs text-amber-700">{tr('Guarda la configuración antes de descargar.')}</p>}
          <p className="mt-2 text-xs text-slate-500">
            {tr('Código del examen en el QR:')} <span className="font-mono">{data.layout.pages.map((p) => p.qr_text).join('  ·  ')}</span>
          </p>
        </section>
      </div>
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-600">{dirty ? tr('Vista previa (cambios sin guardar)') : tr('Vista previa')}</h2>
        <PdfPreview bytes={pdf} />
      </section>
    </div>
  );
}
