import { Field } from '../components/ui';
import { bcp, tr } from '../i18n/app';
import { blankPenalty, penaltyPerError } from '../lib/grading';
import { Formula, GradingConfig } from '../lib/types';

const fmt = (n: number) => n.toLocaleString(bcp(), { maximumFractionDigits: 3 });

/** Campos de la fórmula de corrección: qué restan los errores y los blancos, escala y redondeo. */
export function GradingFields({ value, onChange, disabled, nOptions }: { value: GradingConfig; onChange: (g: GradingConfig) => void; disabled?: boolean; nOptions?: number }) {
  const g = value;
  const k = nOptions ?? 4;
  const pen = penaltyPerError(g, k);
  const blank = blankPenalty(g);
  const blankMode = blank > 0 ? 'resta' : 'no';
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr('Si falla una pregunta…')}>
          <select className="input" disabled={disabled} value={g.formula} onChange={(e) => onChange({ ...g, formula: e.target.value as Formula })}>
            <option value="none">{tr('No resta (solo cuentan los aciertos)')}</option>
            <option value="classic">{tr('Resta 1/(k−1): penalización clásica')}</option>
            <option value="custom">{tr('Resta una cantidad fija')}</option>
          </select>
        </Field>
        {g.formula === 'custom' ? (
          <Field label={tr('Puntos que resta cada error')} hint={tr('Por ejemplo 0,25 = cada 4 errores restan un acierto.')}>
            <input className="input" type="number" step="0.01" min={0} max={5} disabled={disabled} value={g.penalty} onChange={(e) => onChange({ ...g, penalty: Math.max(0, Number(e.target.value)) })} />
          </Field>
        ) : (
          <p className="self-end pb-2 text-sm text-slate-600">
            {g.formula === 'classic'
              ? nOptions
                ? tr('Con {k} opciones, cada error resta 1/{d} de acierto.', { k, d: k - 1 })
                : tr('Cada error resta 1/(nº de opciones − 1): 1/3 con 4 opciones.')
              : tr('Los errores no restan.')}
          </p>
        )}
        <Field label={tr('Si la deja en blanco…')}>
          <select className="input" disabled={disabled} value={blankMode} onChange={(e) => onChange({ ...g, blankPenalty: e.target.value === 'resta' ? g.blankPenalty || 0.1 : 0 })}>
            <option value="no">{tr('No resta (lo habitual)')}</option>
            <option value="resta">{tr('Resta una cantidad fija')}</option>
          </select>
        </Field>
        {blankMode === 'resta' ? (
          <Field label={tr('Puntos que resta cada pregunta en blanco')} hint={tr('Poco habitual: úsalo solo si lo exige la normativa de la asignatura.')}>
            <input className="input" type="number" step="0.01" min={0} max={5} disabled={disabled} value={g.blankPenalty ?? 0} onChange={(e) => onChange({ ...g, blankPenalty: Math.max(0, Number(e.target.value)) })} />
          </Field>
        ) : (
          <p className="self-end pb-2 text-sm text-slate-600">{tr('Las preguntas en blanco ni suman ni restan.')}</p>
        )}
        <Field label={tr('Nota máxima')}>
          <input className="input" type="number" min={1} max={1000} step="0.5" disabled={disabled} value={g.scale} onChange={(e) => onChange({ ...g, scale: Number(e.target.value) || 10 })} />
        </Field>
        <Field label={tr('Decimales')}>
          <select className="input" disabled={disabled} value={g.decimals} onChange={(e) => onChange({ ...g, decimals: Number(e.target.value) })}>
            {[0, 1, 2, 3].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" disabled={disabled} checked={g.allowNegative} onChange={(e) => onChange({ ...g, allowNegative: e.target.checked })} />
          {tr('Permitir notas negativas (por defecto la nota mínima es 0)')}
        </label>
      </div>
      <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600" data-testid="grading-formula">
        {tr('Nota = (aciertos − {pen} × errores − {blank} × en blanco) ÷ preguntas válidas × {scale}. Las preguntas anuladas no cuentan para nadie.', { pen: fmt(pen), blank: fmt(blank), scale: fmt(g.scale) })}
      </p>
    </div>
  );
}
