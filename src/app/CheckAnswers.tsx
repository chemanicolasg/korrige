import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ErrorBox, Logo, fmtDate, fmtDateTime } from '../components/ui';
import { blankPenalty, gradeSheet, penaltyPerError } from '../lib/grading';
import { cleanCode, fetchPublicKey } from '../lib/publicKey';
import { PublicKey } from '../lib/types';
import { ALL_OPTIONS, QUESTIONS_PER_COLUMN } from '../omr/layout';

type Published = Extract<PublicKey, { status: 'published' }>;

const frac = (x: number) => {
  for (const d of [2, 3, 4, 5]) if (Math.abs(x * d - 1) < 1e-9) return `1/${d}`;
  return x.toLocaleString('es-ES', { maximumFractionDigits: 3 });
};

function Key({ data }: { data: Published }) {
  const [model, setModel] = useState(data.models[0]?.model ?? 'A');
  /** Lo que marca el alumno en la calculadora, por modelo. */
  const [mine, setMine] = useState<Record<string, Record<string, string>>>({});
  const key = data.models.find((m) => m.model === model)?.answers ?? {};
  const options = [...ALL_OPTIONS.slice(0, data.n_options)];
  const answers = mine[model] ?? {};
  const calc = data.grading;
  const graded = useMemo(() => (calc ? gradeSheet(answers, key, data.n_questions, data.n_options, calc) : null), [answers, key, data.n_questions, data.n_options, calc]);
  const marked = Object.keys(answers).length;
  const columns: number[][] = [];
  for (let q = 1; q <= data.n_questions; q += QUESTIONS_PER_COLUMN) columns.push(Array.from({ length: Math.min(QUESTIONS_PER_COLUMN, data.n_questions - q + 1) }, (_, i) => q + i));

  const toggle = (q: number, o: string) =>
    setMine((m) => {
      const cur = { ...(m[model] ?? {}) };
      if (cur[String(q)] === o) delete cur[String(q)];
      else cur[String(q)] = o;
      return { ...m, [model]: cur };
    });
  const pen = calc ? penaltyPerError(calc, data.n_options) : 0;
  const blank = calc ? blankPenalty(calc) : 0;

  return (
    <div>
      {data.models.length > 1 && (
        <div className="mb-5">
          <p className="text-sm font-medium text-slate-700">¿Qué modelo de examen hiciste?</p>
          <div className="mt-2 flex flex-wrap gap-2" role="tablist" aria-label="Modelo de examen">
            {data.models.map((m) => (
              <button
                key={m.model}
                role="tab"
                aria-selected={m.model === model}
                className={`rounded-md border-[1.5px] px-4 py-2 text-sm font-semibold ${m.model === model ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
                onClick={() => setModel(m.model)}
              >
                Modelo {m.model}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">El modelo aparece en tu cuadernillo de preguntas. Cada modelo tiene las respuestas en distinto orden.</p>
        </div>
      )}

      {calc && graded && (
        <div className="mb-5 rounded-xl border border-brand-200 bg-brand-50 p-4" data-testid="calculator">
          <p className="text-sm text-slate-700">
            <b>Calcula tu nota:</b> marca en cada pregunta lo que contestaste. Lo que marques aquí no se envía ni se guarda en ningún sitio.
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Aciertos', graded.n_correct],
              ['Errores', graded.n_wrong],
              ['En blanco', graded.n_blank],
            ].map(([l, v]) => (
              <div key={l}>
                <dt className="text-xs uppercase tracking-wide text-slate-500">{l}</dt>
                <dd className="text-xl font-semibold text-ink">{marked ? v : '—'}</dd>
              </div>
            ))}
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Nota estimada</dt>
              <dd className="text-xl font-semibold text-brand-800" data-testid="calc-grade">
                {marked ? `${graded.grade.toLocaleString('es-ES', { minimumFractionDigits: calc.decimals, maximumFractionDigits: calc.decimals })} / ${calc.scale}` : '—'}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-600">
            {pen > 0 ? `Cada error resta ${frac(pen)} de acierto.` : 'Los errores no restan.'} {blank > 0 ? `Cada pregunta en blanco resta ${frac(blank)}.` : 'Las preguntas en blanco no restan.'}
            {graded.n_void > 0 && ` ${graded.n_void} ${graded.n_void === 1 ? 'pregunta anulada no cuenta' : 'preguntas anuladas no cuentan'}.`} La nota oficial es la que publique tu profesor.
            {marked > 0 && (
              <>
                {' '}
                <button className="font-medium text-brand-700 underline" onClick={() => setMine((m) => ({ ...m, [model]: {} }))}>
                  Borrar mis marcas
                </button>
              </>
            )}
          </p>
        </div>
      )}

      <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-4" data-testid="answer-key">
        {columns.map((col) => (
          <ol key={col[0]} className="space-y-1" start={col[0]}>
            {col.map((q) => {
              const e = key[String(q)];
              const voided = !!e?.v;
              const correct = e?.c ?? [];
              const chosen = answers[String(q)];
              return (
                <li key={q} className="flex items-center gap-2 text-sm">
                  <span className="w-7 shrink-0 text-right font-mono text-xs text-slate-400">{q}</span>
                  {voided ? (
                    <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">Anulada</span>
                  ) : calc ? (
                    <span className="flex gap-1">
                      {options.map((o) => {
                        const isCorrect = correct.includes(o);
                        const isMine = chosen === o;
                        const cls = isMine ? (isCorrect ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-red-600 bg-red-600 text-white') : isCorrect ? 'border-emerald-600 bg-emerald-50 font-bold text-emerald-800' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-400';
                        return (
                          <button key={o} className={`h-7 w-7 rounded-full border text-xs ${cls}`} aria-pressed={isMine} aria-label={`Pregunta ${q}: marcar ${o}${isCorrect ? ' (correcta)' : ''}`} onClick={() => toggle(q, o)}>
                            {o}
                          </button>
                        );
                      })}
                    </span>
                  ) : (
                    <span className="font-semibold text-ink">{correct.length ? correct.join(' o ') : '—'}</span>
                  )}
                </li>
              );
            })}
          </ol>
        ))}
      </div>
      {calc && <p className="mt-4 text-xs text-slate-500">En verde, la respuesta correcta de cada pregunta. Si marcas otra, aparece en rojo.</p>}
    </div>
  );
}

/** Página pública: el alumno escribe el código que le ha dado el profesor y ve las respuestas correctas. */
export default function CheckAnswers() {
  const { code: urlCode } = useParams();
  const nav = useNavigate();
  const [code, setCode] = useState(urlCode ? cleanCode(urlCode) : '');
  const [data, setData] = useState<PublicKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Comprobar respuestas — Korrige';
  }, []);

  async function load(c: string) {
    setBusy(true);
    setError('');
    try {
      setData(await fetchPublicKey(c));
    } catch (e) {
      setData(null);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (urlCode) void load(urlCode);
    else setData(null);
  }, [urlCode]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const c = cleanCode(code);
    if (c.length < 4) return setError('Escribe el código que te ha dado tu profesor.');
    if (c === (urlCode ?? '').toUpperCase()) void load(c);
    else nav(`/comprobar/${c}`);
  }

  return (
    <div className="min-h-screen bg-bone-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center px-4 py-3">
          <Link to="/" className="text-xl">
            <Logo />
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Comprobar respuestas</h1>
        <p className="mt-1 text-sm text-slate-600">Escribe el código del examen que te ha facilitado tu profesor para ver las respuestas correctas.</p>
        <form onSubmit={submit} className="mt-5 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="label">Código del examen</span>
            <input
              className="input w-56 font-mono uppercase tracking-widest"
              value={code}
              onChange={(e) => setCode(cleanCode(e.target.value))}
              maxLength={16}
              autoFocus={!urlCode}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="ABCD2345"
            />
          </label>
          <button className="btn-primary" disabled={busy}>
            {busy ? 'Buscando…' : 'Ver respuestas'}
          </button>
        </form>
        <div className="mt-4">
          <ErrorBox error={error} />
        </div>

        {data?.status === 'not_found' && (
          <div className="card mt-4 p-5 text-sm text-slate-700" data-testid="check-not-found">
            <b>No hay respuestas publicadas con ese código.</b> Revisa que lo has escrito bien. Si es correcto, puede que tu profesor aún no las haya publicado.
          </div>
        )}
        {data?.status === 'scheduled' && (
          <div className="card mt-4 p-5" data-testid="check-scheduled">
            <h2 className="text-lg font-semibold">{data.title}</h2>
            {data.subject && <p className="text-sm text-slate-600">{data.subject}</p>}
            <p className="mt-3 text-slate-700">
              Las respuestas se publicarán el <b>{fmtDateTime(data.publish_at)}</b>. Vuelve a esta página a partir de ese momento.
            </p>
          </div>
        )}
        {data?.status === 'published' && (
          <div className="card mt-4 p-5" data-testid="check-published">
            <h2 className="text-lg font-semibold">{data.title}</h2>
            <p className="text-sm text-slate-600">{[data.subject, data.session, data.exam_date ? fmtDate(data.exam_date) : ''].filter(Boolean).join(' · ')}</p>
            {data.updated_at && data.published_at && new Date(data.updated_at) > new Date(data.published_at) && (
              <p className="mt-2 rounded bg-amber-50 px-3 py-2 text-sm text-amber-900">Las respuestas se actualizaron el {fmtDateTime(data.updated_at)}. Comprueba de nuevo las tuyas.</p>
            )}
            <div className="mt-5">{data.models.length ? <Key key={data.title + data.models.length} data={data} /> : <p className="text-sm text-slate-600">Tu profesor todavía no ha introducido las respuestas correctas.</p>}</div>
          </div>
        )}
        <p className="mt-8 text-xs text-slate-400">
          Korrige corrige exámenes tipo test escaneando las hojas de respuestas.{' '}
          <Link to="/" className="underline">
            Saber más
          </Link>
        </p>
      </main>
    </div>
  );
}
