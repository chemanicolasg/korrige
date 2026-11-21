import { useRef, useState } from 'react';
import { Field } from '../components/ui';
import { fileToLogo } from '../lib/logoImage';
import { SheetConfig, defaultFields, pageCount } from '../omr/layout';
import { SHEET_LANGS, SHEET_LANG_NAMES, SheetLang, sheetLang } from '../omr/sheetText';

/** Nombres habituales del identificador del alumno según el centro. */
export const ID_LABELS = ['NIA', 'NIUB', 'NIU', 'NIUBA', 'DNI', 'NIE', 'Expediente', 'Matrícula', 'Código'];

/** Formulario de configuración de la hoja de respuestas. */
export function SheetConfigForm({ value, onChange, disabled }: { value: SheetConfig; onChange: (c: SheetConfig) => void; disabled?: boolean }) {
  const set = <K extends keyof SheetConfig>(k: K, v: SheetConfig[K]) => onChange({ ...value, [k]: v });
  const file = useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState('');
  const fields = value.fields ?? defaultFields(value.lang);
  async function onLogo(f: File | undefined) {
    if (!f) return;
    setLogoError('');
    try {
      set('logo', await fileToLogo(f));
    } catch (e) {
      setLogoError((e as Error).message);
    } finally {
      if (file.current) file.current.value = '';
    }
  }
  const num = (k: 'nQuestions' | 'idDigits', min: number, max: number) => (
    <input
      className="input"
      type="number"
      min={min}
      max={max}
      disabled={disabled}
      value={value[k]}
      onChange={(e) => set(k, Number(e.target.value))}
      onBlur={(e) => set(k, Math.min(max, Math.max(min, Math.round(Number(e.target.value)) || min)))}
    />
  );
  return (
    <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nº de preguntas" hint={`Entre 10 y 200. ${pageCount(value.nQuestions) > 1 ? 'Más de 100: la hoja tendrá 2 páginas.' : 'Hasta 100 caben en una página.'}`}>
        {num('nQuestions', 10, 200)}
      </Field>
      <Field label="Opciones por pregunta">
        <select className="input" disabled={disabled} value={value.nOptions} onChange={(e) => set('nOptions', Number(e.target.value))}>
          <option value={3}>3 (A–C)</option>
          <option value={4}>4 (A–D)</option>
          <option value={5}>5 (A–E)</option>
        </select>
      </Field>
      <Field label="Modelos de examen" hint="Versiones del examen con las preguntas en distinto orden.">
        <select className="input" disabled={disabled} value={value.nModels} onChange={(e) => set('nModels', Number(e.target.value))}>
          <option value={1}>1 (sin modelos)</option>
          <option value={2}>2 (A y B)</option>
          <option value={3}>3 (A, B y C)</option>
          <option value={4}>4 (A, B, C y D)</option>
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Identificador" hint="El de tu centro: NIA, NIUB, NIU, DNI…">
          <input className="input" list="korrige-id-labels" disabled={disabled} maxLength={12} value={value.idLabel} onChange={(e) => set('idLabel', e.target.value)} />
          <datalist id="korrige-id-labels">
            {ID_LABELS.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </Field>
        <Field label="Nº de dígitos" hint="Entre 6 y 10.">
          {num('idDigits', 6, 10)}
        </Field>
      </div>
      <Field label="Título de la hoja" hint="Primera línea de la cabecera (institución).">
        <input className="input" disabled={disabled} maxLength={60} value={value.title} onChange={(e) => set('title', e.target.value)} />
      </Field>
      <Field label="Subtítulo" hint="Asignatura, convocatoria…">
        <input className="input" disabled={disabled} maxLength={80} value={value.subtitle} onChange={(e) => set('subtitle', e.target.value)} />
      </Field>
    </div>

    <fieldset className="border-t border-slate-200 pt-5">
      <legend className="pr-3 text-sm font-semibold text-slate-800">Personalización</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className="label">Logotipo en la cabecera</span>
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-32 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-1.5">
              {value.logo ? <img src={value.logo} alt="Logotipo de la hoja" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-slate-400">Sin logotipo</span>}
            </div>
            {!disabled && (
              <div className="flex flex-col items-start gap-1.5">
                <input ref={file} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" data-testid="logo-input" onChange={(e) => void onLogo(e.target.files?.[0])} />
                <button type="button" className="btn btn-sm" onClick={() => file.current?.click()}>
                  {value.logo ? 'Cambiar logotipo' : 'Subir logotipo'}
                </button>
                {value.logo && (
                  <button type="button" className="text-xs text-red-700 hover:underline" onClick={() => onChange({ ...value, logo: undefined })}>
                    Quitar
                  </button>
                )}
              </div>
            )}
          </div>
          <span className="mt-1 block text-xs text-slate-500">PNG, JPG o SVG. Se imprime arriba a la izquierda, junto al título. Mejor en negro o colores oscuros sobre fondo claro.</span>
          {logoError && <span className="mt-1 block text-xs text-red-700">{logoError}</span>}
        </div>
        <Field label="Idioma de la hoja" hint="Idioma de los textos impresos: instrucciones, cabecera y campos. No afecta a la corrección.">
          <select
            className="input"
            disabled={disabled}
            value={sheetLang(value.lang)}
            onChange={(e) => {
              const lang = e.target.value as SheetLang;
              // los campos manuscritos pasan a los del idioma nuevo, salvo que el profesor los haya escrito a mano
              const { fields: _f, lang: _l, ...rest } = value;
              const custom = value.fields && !SHEET_LANGS.some((l) => defaultFields(l).every((x, i) => x === value.fields?.[i]));
              onChange({ ...rest, ...(lang !== 'es' ? { lang } : {}), ...(custom ? { fields: value.fields } : {}) });
            }}
          >
            {SHEET_LANGS.map((l) => (
              <option key={l} value={l}>
                {SHEET_LANG_NAMES[l]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nota junto a «Respuestas»" hint="Opcional. Por ejemplo: «Duración: 90 min · Cada error resta 1/3».">
          <input className="input" disabled={disabled} maxLength={90} value={value.note ?? ''} onChange={(e) => set('note', e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <span className="label">Campos que el alumno rellena a mano</span>
          <div className="grid gap-3 sm:grid-cols-3">
            {fields.map((f, i) => (
              <input
                key={i}
                className="input"
                aria-label={`Campo manuscrito ${i + 1}`}
                disabled={disabled}
                maxLength={22}
                value={f}
                onChange={(e) => set('fields', fields.map((x, j) => (j === i ? e.target.value : x)))}
              />
            ))}
          </div>
          <span className="mt-1 block text-xs text-slate-500">Son las tres líneas de la cabecera. La zona de burbujas, las marcas de esquina y el QR no se pueden cambiar: de ellas depende la lectura.</span>
        </div>
      </div>
    </fieldset>
    </div>
  );
}
