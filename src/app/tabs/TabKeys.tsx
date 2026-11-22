import { useEffect, useMemo, useState } from 'react';
import { Field, Modal, Notice, fmtDateTime } from '../../components/ui';
import { emptyKey, keyMissing } from '../../lib/grading';
import { tr, trn } from '../../i18n/app';
import { currentKeys, saveKey, updateModelMap } from '../../lib/service';
import { KeyAnswers, ModelMap } from '../../lib/types';
import { modelLetters, optionLetters } from '../../omr/layout';
import { useExam } from '../ExamPage';

const same = (a: KeyAnswers, b: KeyAnswers, n: number) => {
  for (let q = 1; q <= n; q++) {
    const x = a[String(q)];
    const y = b[String(q)];
    if ((x?.c.join('') ?? '') !== (y?.c.join('') ?? '') || !!x?.v !== !!y?.v) return false;
  }
  return true;
};

function MapEditor({ onClose }: { onClose: () => void }) {
  const { data, db, run, busy } = useExam();
  const n = data.exam.sheet_config.nQuestions;
  const models = modelLetters(data.exam.sheet_config).filter((m) => m !== 'A');
  const [text, setText] = useState<Record<string, string>>(() =>
    Object.fromEntries(models.map((m) => [m, data.exam.model_map[m] ? Array.from({ length: n }, (_, i) => data.exam.model_map[m][String(i + 1)] ?? '').join(' ') : ''])),
  );
  const parsed = useMemo(() => {
    const map: ModelMap = {};
    const errors: string[] = [];
    for (const m of models) {
      const nums = text[m].split(/[\s,;]+/).filter(Boolean).map(Number);
      if (!nums.length) continue;
      if (nums.length !== n) errors.push(tr('Modelo {m}: hay {k} números y el examen tiene {n} preguntas.', { m, k: nums.length, n }));
      else if (new Set(nums).size !== n || nums.some((x) => !Number.isInteger(x) || x < 1 || x > n)) errors.push(tr('Modelo {m}: debe ser una permutación de 1 a {n}, sin repetir.', { m, n }));
      else map[m] = Object.fromEntries(nums.map((x, i) => [String(i + 1), x]));
    }
    return { map, errors };
  }, [text, models, n]);
  return (
    <Modal title={tr('Correspondencia entre modelos')} onClose={onClose}>
      <p className="text-sm text-slate-600">
        {tr(
          'Opcional. Sirve para que las estadísticas por pregunta se agreguen bien entre modelos. Para cada modelo, escribe —en el orden de sus preguntas— a qué pregunta del modelo A corresponde cada una. Ejemplo: si la pregunta 1 del modelo B es la 7 del A, el primer número es 7.',
        )}
      </p>
      <div className="mt-4 space-y-3">
        {models.map((m) => (
          <Field key={m} label={tr('Modelo {m} → pregunta equivalente del modelo A', { m })} hint={tr('{n} números separados por espacios, comas o saltos de línea. Vacío = mismo orden que el A.', { n })}>
            <textarea className="input h-24 font-mono text-xs" value={text[m]} onChange={(e) => setText({ ...text, [m]: e.target.value })} />
          </Field>
        ))}
      </div>
      {parsed.errors.map((e) => (
        <p key={e} className="mt-2 text-sm text-red-700">
          {e}
        </p>
      ))}
      <div className="mt-4 flex justify-end gap-3">
        <button className="btn" onClick={onClose}>
          {tr('Cancelar')}
        </button>
        <button className="btn-primary" disabled={busy || parsed.errors.length > 0} onClick={async () => (await run((d) => updateModelMap(db, d, parsed.map))) && onClose()}>
          {tr('Guardar correspondencia')}
        </button>
      </div>
    </Modal>
  );
}

export default function TabKeys() {
  const { data, db, run, readOnly, busy, userId } = useExam();
  const cfg = data.exam.sheet_config;
  const n = cfg.nQuestions;
  const models = modelLetters(cfg);
  const options = optionLetters(cfg);
  // solo los exámenes antiguos conservan en su layout la burbuja «P» de hoja-plantilla
  const hasKeyBubble = data.layout.pages.some((p) => p.plantilla);
  const cur = currentKeys(data.keys);
  const [model, setModel] = useState(models[0]);
  const saved = cur[model]?.answers ?? emptyKey(n);
  const [draft, setDraft] = useState<KeyAnswers>(saved);
  const [showMap, setShowMap] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  // al cambiar de modelo o guardarse una versión nueva, el borrador parte de lo guardado
  useEffect(() => setDraft({ ...emptyKey(n), ...(cur[model]?.answers ?? {}) }), [model, cur[model]?.version, n]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = !same(draft, { ...emptyKey(n), ...saved }, n);
  const missing = keyMissing(draft, n);
  const voided = Object.values(draft).filter((e) => e.v).length;
  const history = data.keys.filter((k) => k.model === model).sort((a, b) => b.version - a.version);

  const toggle = (q: number, o: string) => {
    if (readOnly) return;
    const e = draft[String(q)] ?? { c: [] };
    const c = e.c.includes(o) ? e.c.filter((x) => x !== o) : [...e.c, o].sort();
    setDraft({ ...draft, [String(q)]: { ...e, c } });
  };
  const toggleVoid = (q: number) => {
    if (readOnly) return;
    const e = draft[String(q)] ?? { c: [] };
    setDraft({ ...draft, [String(q)]: { ...e, v: !e.v } });
  };

  const cols = Math.ceil(n / 25);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {models.length > 1 && (
          <div className="flex rounded-lg border border-slate-300 bg-white p-0.5" role="tablist" aria-label={tr('Modelo')}>
            {models.map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={m === model}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${m === model ? 'bg-brand-700 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                onClick={() => (!dirty || confirm(tr('Hay cambios sin guardar en este modelo. ¿Descartarlos?'))) && setModel(m)}
              >
                {tr('Modelo {m}', { m })}
                {!cur[m] && <span className="ml-1 text-amber-300">●</span>}
              </button>
            ))}
          </div>
        )}
        <span className="text-sm text-slate-600">
          {cur[model]
            ? tr('Versión {v} · {origen} · {fecha}', { v: cur[model].version, origen: cur[model].source === 'escaneo' ? tr('detectada en el PDF') : tr('editada en pantalla'), fecha: fmtDateTime(cur[model].created_at) })
            : tr('Sin plantilla todavía')}
        </span>
        <div className="ml-auto flex gap-2">
          {history.length > 0 && (
            <button className="btn btn-sm" onClick={() => setShowHistory(true)}>
              {tr('Historial ({n})', { n: history.length })}
            </button>
          )}
          {models.length > 1 && (
            <button className="btn btn-sm" onClick={() => setShowMap(true)}>
              {tr('Correspondencia entre modelos')}
              {Object.keys(data.exam.model_map).length ? ' ✓' : ''}
            </button>
          )}
        </div>
      </div>

      <Notice>
        {/* La vía de la hoja-plantilla solo existe en exámenes antiguos, cuya hoja lleva la burbuja «P» (DECISIONES 39). */}
        {hasKeyBubble
          ? trn(
              'Haz clic en la respuesta correcta de cada pregunta (puedes marcar varias si aceptas más de una) o marca «Anular» para que no puntúe para nadie. Otra forma: rellena una hoja con las respuestas correctas, marca la burbuja <b>«P»</b> (y su modelo) y escanéala con las demás: se detecta sola.',
            )
          : tr('Haz clic en la respuesta correcta de cada pregunta (puedes marcar varias si aceptas más de una) o marca «Anular» para que no puntúe para nadie.')}
      </Notice>

      <div className="card p-4">
        <div className="grid gap-x-8 gap-y-0.5" style={{ gridTemplateColumns: `repeat(${Math.min(cols, 4)}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }, (_, c) => (
            <div key={c} className="min-w-0">
              {Array.from({ length: Math.min(25, n - c * 25) }, (_, r) => {
                const q = c * 25 + r + 1;
                const e = draft[String(q)] ?? { c: [] };
                const empty = !e.v && !e.c.length;
                return (
                  <div key={q} className={`flex items-center gap-1.5 rounded px-1 py-0.5 ${e.v ? 'bg-slate-100' : empty ? 'bg-amber-50' : ''}`} role="group" aria-label={tr('Pregunta {q}', { q })}>
                    <span className="w-7 text-right text-xs font-semibold tabular-nums text-slate-600">{q}</span>
                    {options.map((o) => (
                      <button
                        key={o}
                        type="button"
                        disabled={readOnly || e.v}
                        aria-pressed={e.c.includes(o)}
                        aria-label={tr('Pregunta {q}, opción {o}', { q, o })}
                        onClick={() => toggle(q, o)}
                        className={`h-6 w-6 rounded-full border text-[11px] font-semibold transition ${
                          e.c.includes(o) ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-300 bg-white text-slate-500 hover:border-brand-400'
                        } ${e.v ? 'opacity-40' : ''}`}
                      >
                        {o}
                      </button>
                    ))}
                    <label className="ml-1 flex cursor-pointer items-center gap-1 text-[11px] text-slate-500" title={tr('Anular: no puntúa para nadie')}>
                      <input type="checkbox" className="h-3 w-3" disabled={readOnly} checked={!!e.v} onChange={() => toggleVoid(q)} aria-label={tr('Anular pregunta {q}', { q })} />
                      <span className="hidden xl:inline">{tr('Anular')}</span>
                    </label>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {!readOnly && (
          <>
            <button className="btn-primary" disabled={!dirty || busy} onClick={() => run((d) => saveKey(db, d, userId, model, draft))}>
              {cur[model] ? tr('Guardar versión {v} y recalcular notas', { v: cur[model].version + 1 }) : tr('Guardar plantilla')}
            </button>
            {dirty && (
              <button className="btn" onClick={() => setDraft({ ...emptyKey(n), ...saved })}>
                {tr('Descartar cambios')}
              </button>
            )}
          </>
        )}
        <span className="text-sm text-slate-600">
          {missing.length > 0 ? (
            <span className="text-amber-700">
              {tr('Faltan {n} preguntas por definir ({lista}): no puntuarán hasta que las completes.', { n: missing.length, lista: missing.slice(0, 12).join(', ') + (missing.length > 12 ? '…' : '') })}
            </span>
          ) : (
            tr('Plantilla completa.')
          )}
          {voided > 0 && ` ${tr('{n} anulada(s).', { n: voided })}`}
        </span>
      </div>

      {showMap && <MapEditor onClose={() => setShowMap(false)} />}
      {showHistory && (
        <Modal title={tr('Historial de la plantilla · modelo {m}', { m: model })} onClose={() => setShowHistory(false)}>
          <p className="mb-3 text-sm text-slate-600">{tr('Cada cambio crea una versión nueva y recalcula todas las notas. Las versiones anteriores se conservan.')}</p>
          <ul className="divide-y divide-slate-100 text-sm">
            {history.map((k) => (
              <li key={k.id} className="flex items-center justify-between gap-3 py-2">
                <span>
                  <b>v{k.version}</b> · {fmtDateTime(k.created_at)} · {k.source === 'escaneo' ? tr('escaneo') : tr('manual')}
                  {k.note && <span className="block text-xs text-slate-500">{k.note}</span>}
                </span>
                {!readOnly && k.version !== cur[model]?.version && (
                  <button
                    className="btn btn-sm"
                    onClick={() => {
                      setDraft({ ...emptyKey(n), ...k.answers });
                      setShowHistory(false);
                    }}
                  >
                    {tr('Recuperar')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </div>
  );
}
