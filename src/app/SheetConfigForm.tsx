import { Field } from '../components/ui';
import { SheetConfig, pageCount } from '../omr/layout';

/** Formulario de configuración de la hoja de respuestas. */
export function SheetConfigForm({ value, onChange, disabled }: { value: SheetConfig; onChange: (c: SheetConfig) => void; disabled?: boolean }) {
  const set = <K extends keyof SheetConfig>(k: K, v: SheetConfig[K]) => onChange({ ...value, [k]: v });
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
        <Field label="Identificador" hint="NIA, DNI, expediente…">
          <input className="input" disabled={disabled} maxLength={12} value={value.idLabel} onChange={(e) => set('idLabel', e.target.value)} />
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
  );
}
