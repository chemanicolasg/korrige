import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Empty, Stat, fmtNum } from '../../components/ui';
import { FLAG_LABEL, ItemStats, examStats, itemStats } from '../../lib/stats';
import { currentKeys, isStudentSheet, sheetModel } from '../../lib/service';
import { INVALID } from '../../lib/types';
import { optionLetters } from '../../omr/layout';
import { useExam } from '../ExamPage';

const BAR = '#2546e0'; // serie única: un solo tono
const BAR_FAIL = '#94a3b8';

/** Histograma de notas: 10 tramos; los suspensos en gris neutro, los aprobados en el tono de marca. */
function Histogram({ bins, scale, pass }: { bins: { from: number; to: number; count: number }[]; scale: number; pass: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...bins.map((b) => b.count));
  const W = 560;
  const H = 220;
  const pad = { l: 34, r: 8, t: 18, b: 30 };
  const bw = (W - pad.l - pad.r) / bins.length;
  const y = (c: number) => pad.t + (H - pad.t - pad.b) * (1 - c / max);
  const ticks = [...new Set([0, Math.ceil(max / 2), max])];
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Histograma de notas">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth={1} />
            <text x={pad.l - 6} y={y(t) + 3.5} textAnchor="end" fontSize={11} fill="#64748b">
              {t}
            </text>
          </g>
        ))}
        {bins.map((b, i) => {
          const h = H - pad.b - y(b.count);
          const x = pad.l + i * bw + 1;
          const w = bw - 2;
          const r = Math.min(4, h);
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {/* zona de hover más grande que la barra */}
              <rect x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent" />
              {b.count > 0 && (
                <path
                  d={`M${x},${H - pad.b} V${y(b.count) + r} q0,${-r} ${r},${-r} H${x + w - r} q${r},0 ${r},${r} V${H - pad.b} Z`}
                  fill={b.from >= pass ? BAR : BAR_FAIL}
                  opacity={hover === null || hover === i ? 1 : 0.55}
                >
                  <title>{`De ${fmtNum(b.from, 1)} a ${fmtNum(b.to, 1)}: ${b.count} alumno(s)`}</title>
                </path>
              )}
              {(hover === i || (hover === null && b.count === max)) && b.count > 0 && (
                <text x={x + w / 2} y={y(b.count) - 5} textAnchor="middle" fontSize={11} fontWeight={600} fill="#0f172a">
                  {b.count}
                </text>
              )}
            </g>
          );
        })}
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="#94a3b8" strokeWidth={1} />
        {bins.map((b, i) => (
          <text key={i} x={pad.l + i * bw} y={H - pad.b + 14} textAnchor="middle" fontSize={11} fill="#64748b">
            {fmtNum(b.from, scale % 10 ? 1 : 0)}
          </text>
        ))}
        <text x={W - pad.r} y={H - pad.b + 14} textAnchor="end" fontSize={11} fill="#64748b">
          {fmtNum(scale, 0)}
        </text>
        <text x={pad.l} y={H - 4} fontSize={11} fill="#64748b">
          Nota
        </text>
        <text x={4} y={11} fontSize={11} fill="#64748b">
          Alumnos
        </text>
      </svg>
      <figcaption className="mt-1 flex gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: BAR }} /> Aprobados (≥ {fmtNum(pass, 1)})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: BAR_FAIL }} /> Suspensos
        </span>
      </figcaption>
    </figure>
  );
}

/** Frecuencia de cada opción de una pregunta: la correcta en el tono de marca, los distractores en gris. */
function OptionBars({ it, options }: { it: ItemStats; options: string[] }) {
  const cats = [...options, ''];
  return (
    <div className="flex items-end gap-1" aria-label="Frecuencia de cada opción">
      {cats.map((o) => {
        const c = (it.freq[o] ?? 0) + (o === '' ? (it.freq[INVALID] ?? 0) : 0);
        const pct = it.n ? c / it.n : 0;
        const ok = it.correct.includes(o);
        return (
          <div key={o || 'blanco'} className="flex w-9 flex-col items-center" title={`${o || 'En blanco / nula'}: ${c} (${Math.round(pct * 100)} %)${ok ? ' · correcta' : ''}`}>
            <span className="text-[10px] tabular-nums text-slate-600">{Math.round(pct * 100)}%</span>
            <div className="flex h-8 w-full items-end rounded-sm bg-slate-100">
              <div className="w-full rounded-t-sm" style={{ height: `${Math.max(pct * 100, c ? 4 : 0)}%`, background: ok ? BAR : BAR_FAIL }} />
            </div>
            <span className={`text-[11px] ${ok ? 'font-bold text-slate-900' : 'text-slate-500'}`}>
              {o || '—'}
              {ok && <span aria-label="correcta">✓</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function TabStats() {
  const { data } = useExam();
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const cfg = data.exam.sheet_config;
  const g = data.exam.grading_config;
  const options = optionLetters(cfg);

  const { stats, items } = useMemo(() => {
    const results = new Map(data.results.map((r) => [r.sheet_id, r]));
    const graded = data.sheets
      .filter((s) => isStudentSheet(s) && results.has(s.id))
      .map((s) => ({ model: sheetModel(data.exam, s)!, answers: s.answers, grade: results.get(s.id)!.grade }));
    const keys = Object.fromEntries(Object.entries(currentKeys(data.keys)).map(([m, k]) => [m, k.answers]));
    return { stats: examStats(graded.map((x) => x.grade), g.scale), items: itemStats(graded, keys, data.exam.model_map, cfg.nQuestions, options) };
  }, [data, cfg.nQuestions, g.scale]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!stats.n) {
    return (
      <Empty
        title="Aún no hay estadísticas"
        action={
          <Link className="btn-primary" to="../subir">
            Subir hojas
          </Link>
        }
      >
        Cuando haya hojas corregidas verás aquí la distribución de notas y el análisis de cada pregunta (dificultad, discriminación y distractores).
      </Empty>
    );
  }
  const flagged = items.filter((i) => i.flags.length);
  const shown = onlyFlagged ? flagged : items;
  const mapped = Object.keys(data.exam.model_map).length > 0;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Presentados" value={stats.n} />
        <Stat label="Media" value={fmtNum(stats.mean)} hint={`sobre ${fmtNum(g.scale, 0)}`} />
        <Stat label="Mediana" value={fmtNum(stats.median)} hint={`mín. ${fmtNum(stats.min)} · máx. ${fmtNum(stats.max)}`} />
        <Stat label="Desviación típica" value={fmtNum(stats.sd)} />
        <Stat label="Aprobados" value={`${Math.round(stats.passRate * 100)} %`} hint={`nota ≥ ${fmtNum(g.scale / 2, 1)}`} />
      </div>
      <section className="card p-5">
        <h2 className="mb-3 font-semibold">Distribución de notas</h2>
        <div className="max-w-2xl">
          <Histogram bins={stats.histogram} scale={g.scale} pass={g.scale / 2} />
        </div>
      </section>
      <section className="card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-semibold">Análisis por pregunta</h2>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} /> Solo las problemáticas ({flagged.length})
          </label>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Dificultad = % de alumnos que la aciertan. Discriminación = % de acierto del 27 % con mejor nota menos el del 27 % con peor nota (cuanto más alta, mejor
          distingue; negativa es mala señal).{' '}
          {cfg.nModels > 1 && (mapped ? 'Las preguntas se agregan entre modelos con la correspondencia definida (numeración del modelo A).' : 'Sin correspondencia entre modelos definida: se agrega por número de pregunta.')}
        </p>
        {flagged.length > 0 && (
          <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            ⚠ {flagged.length} pregunta(s) candidatas a revisar o anular: {flagged.map((f) => f.q).join(', ')}. Puedes anularlas en{' '}
            <Link className="font-medium underline" to="../plantillas">
              Plantillas
            </Link>
            .
          </p>
        )}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full" data-testid="items-table">
            <thead className="border-b border-slate-200">
              <tr>
                <th className="th">Pregunta</th>
                <th className="th">Correcta</th>
                <th className="th text-right">Dificultad (% acierto)</th>
                <th className="th text-right">Discriminación</th>
                <th className="th">Opciones elegidas</th>
                <th className="th">Avisos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((it) => (
                <tr key={it.q} className={it.flags.length ? 'bg-amber-50/60' : ''}>
                  <td className="td font-semibold tabular-nums">{it.q}</td>
                  <td className="td">{it.voided ? <span className="badge bg-slate-200 text-slate-600">Anulada</span> : it.correct.join(', ') || '—'}</td>
                  <td className="td text-right tabular-nums">{it.p == null ? '—' : `${Math.round(it.p * 100)} %`}</td>
                  <td className={`td text-right tabular-nums ${it.d != null && it.d < 0 ? 'font-semibold text-red-700' : ''}`}>{it.d == null ? '—' : fmtNum(it.d)}</td>
                  <td className="td">{!it.voided && it.n > 0 && <OptionBars it={it} options={options} />}</td>
                  <td className="td text-xs text-amber-900">
                    {it.flags.map((f) => (
                      <div key={f}>⚠ {FLAG_LABEL[f]}</div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
