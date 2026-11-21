import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ErrorBox, Logo } from '../components/ui';
import { ENABLED_LOCALES, LOCALE_NAMES, LOCALE_PATH, Locale, detectLocale, saveLocale } from '../i18n';
import { blankPenalty, gradeSheet, penaltyPerError } from '../lib/grading';
import { cleanCode, fetchPublicKey } from '../lib/publicKey';
import { PublicKey } from '../lib/types';
import { ALL_OPTIONS, QUESTIONS_PER_COLUMN } from '../omr/layout';

type Published = Extract<PublicKey, { status: 'published' }>;

const STR = {
  es: {
    title: 'Comprobar respuestas',
    intro: 'Escribe el código del examen que te ha facilitado tu profesor para ver las respuestas correctas.',
    code: 'Código del examen',
    see: 'Ver respuestas',
    searching: 'Buscando…',
    needCode: 'Escribe el código que te ha dado tu profesor.',
    notFound: 'No hay respuestas publicadas con ese código.',
    notFoundHelp: 'Revisa que lo has escrito bien. Si es correcto, puede que tu profesor aún no las haya publicado.',
    scheduled: (d: string) => ['Las respuestas se publicarán el ', d, '. Vuelve a esta página a partir de ese momento.'],
    updated: (d: string) => `Las respuestas se actualizaron el ${d}. Comprueba de nuevo las tuyas.`,
    noKey: 'Tu profesor todavía no ha introducido las respuestas correctas.',
    whichModel: '¿Qué modelo de examen hiciste?',
    model: 'Modelo',
    modelHelp: 'El modelo aparece en tu cuadernillo de preguntas. Cada modelo tiene las respuestas en distinto orden.',
    calc: 'Calcula tu nota:',
    calcHelp: 'marca en cada pregunta lo que contestaste. Lo que marques aquí no se envía ni se guarda en ningún sitio.',
    right: 'Aciertos',
    wrong: 'Errores',
    blank: 'En blanco',
    grade: 'Nota estimada',
    penalty: (f: string) => `Cada error resta ${f} de acierto.`,
    noPenalty: 'Los errores no restan.',
    blankPenalty: (f: string) => `Cada pregunta en blanco resta ${f}.`,
    noBlankPenalty: 'Las preguntas en blanco no restan.',
    voided: (n: number) => (n === 1 ? '1 pregunta anulada no cuenta.' : `${n} preguntas anuladas no cuentan.`),
    official: 'La nota oficial es la que publique tu profesor.',
    clear: 'Borrar mis marcas',
    void: 'Anulada',
    or: ' o ',
    legend: 'En verde, la respuesta correcta de cada pregunta. Si marcas otra, aparece en rojo.',
    mark: (q: number, o: string, ok: boolean) => `Pregunta ${q}: marcar ${o}${ok ? ' (correcta)' : ''}`,
    about: 'Korrige corrige exámenes tipo test escaneando las hojas de respuestas.',
    more: 'Saber más',
    language: 'Idioma',
    error: 'No se ha podido consultar. Inténtalo de nuevo en unos minutos.',
  },
  ca: {
    title: 'Comprovar respostes',
    intro: 'Escriu el codi de l’examen que t’ha facilitat el professor per veure les respostes correctes.',
    code: 'Codi de l’examen',
    see: 'Veure respostes',
    searching: 'Cercant…',
    needCode: 'Escriu el codi que t’ha donat el professor.',
    notFound: 'No hi ha respostes publicades amb aquest codi.',
    notFoundHelp: 'Revisa que l’has escrit bé. Si és correcte, pot ser que el professor encara no les hagi publicat.',
    scheduled: (d: string) => ['Les respostes es publicaran el ', d, '. Torna a aquesta pàgina a partir d’aquell moment.'],
    updated: (d: string) => `Les respostes es van actualitzar el ${d}. Torna a comprovar les teves.`,
    noKey: 'El professor encara no ha introduït les respostes correctes.',
    whichModel: 'Quin model d’examen vas fer?',
    model: 'Model',
    modelHelp: 'El model apareix al teu quadernet de preguntes. Cada model té les respostes en un ordre diferent.',
    calc: 'Calcula la teva nota:',
    calcHelp: 'marca a cada pregunta el que vas contestar. El que marquis aquí no s’envia ni es desa enlloc.',
    right: 'Encerts',
    wrong: 'Errors',
    blank: 'En blanc',
    grade: 'Nota estimada',
    penalty: (f: string) => `Cada error resta ${f} d’encert.`,
    noPenalty: 'Els errors no resten.',
    blankPenalty: (f: string) => `Cada pregunta en blanc resta ${f}.`,
    noBlankPenalty: 'Les preguntes en blanc no resten.',
    voided: (n: number) => (n === 1 ? '1 pregunta anul·lada no compta.' : `${n} preguntes anul·lades no compten.`),
    official: 'La nota oficial és la que publiqui el professor.',
    clear: 'Esborrar les meves marques',
    void: 'Anul·lada',
    or: ' o ',
    legend: 'En verd, la resposta correcta de cada pregunta. Si en marques una altra, apareix en vermell.',
    mark: (q: number, o: string, ok: boolean) => `Pregunta ${q}: marcar ${o}${ok ? ' (correcta)' : ''}`,
    about: 'Korrige corregeix exàmens tipus test escanejant els fulls de respostes.',
    more: 'Més informació',
    language: 'Idioma',
    error: 'No s’ha pogut consultar. Torna-ho a provar d’aquí a uns minuts.',
  },
  en: {
    title: 'Check your answers',
    intro: 'Enter the exam code your teacher gave you to see the correct answers.',
    code: 'Exam code',
    see: 'Show answers',
    searching: 'Searching…',
    needCode: 'Enter the code your teacher gave you.',
    notFound: 'No answers have been published with that code.',
    notFoundHelp: 'Check that you typed it correctly. If you did, your teacher may not have published them yet.',
    scheduled: (d: string) => ['The answers will be published on ', d, '. Come back to this page from then on.'],
    updated: (d: string) => `The answers were updated on ${d}. Check yours again.`,
    noKey: 'Your teacher has not entered the correct answers yet.',
    whichModel: 'Which exam version did you take?',
    model: 'Version',
    modelHelp: 'The version is printed on your question booklet. Each version has the answers in a different order.',
    calc: 'Estimate your grade:',
    calcHelp: 'mark what you answered for each question. Nothing you mark here is sent or stored anywhere.',
    right: 'Correct',
    wrong: 'Wrong',
    blank: 'Blank',
    grade: 'Estimated grade',
    penalty: (f: string) => `Each wrong answer deducts ${f} of a correct one.`,
    noPenalty: 'Wrong answers are not penalised.',
    blankPenalty: (f: string) => `Each blank question deducts ${f}.`,
    noBlankPenalty: 'Blank questions are not penalised.',
    voided: (n: number) => (n === 1 ? '1 voided question does not count.' : `${n} voided questions do not count.`),
    official: 'Your official grade is the one your teacher publishes.',
    clear: 'Clear my marks',
    void: 'Voided',
    or: ' or ',
    legend: 'The correct answer to each question is shown in green. If you mark a different one, it appears in red.',
    mark: (q: number, o: string, ok: boolean) => `Question ${q}: mark ${o}${ok ? ' (correct)' : ''}`,
    about: 'Korrige grades multiple-choice exams by scanning the answer sheets.',
    more: 'Learn more',
    language: 'Language',
    error: 'The answers could not be loaded. Try again in a few minutes.',
  },
};
type Str = (typeof STR)['es'];
const BCP: Record<Locale, string> = { es: 'es-ES', ca: 'ca-ES', en: 'en-GB' };
const when = (iso: string, l: Locale) => new Date(iso).toLocaleString(BCP[l], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const day = (iso: string, l: Locale) => new Date(iso).toLocaleDateString(BCP[l], { day: 'numeric', month: 'short', year: 'numeric' });

const frac = (x: number, l: Locale) => {
  for (const d of [2, 3, 4, 5]) if (Math.abs(x * d - 1) < 1e-9) return `1/${d}`;
  return x.toLocaleString(BCP[l], { maximumFractionDigits: 3 });
};

function Key({ data, t, locale }: { data: Published; t: Str; locale: Locale }) {
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
          <p className="text-sm font-medium text-slate-700">{t.whichModel}</p>
          <div className="mt-2 flex flex-wrap gap-2" role="tablist" aria-label={t.whichModel}>
            {data.models.map((m) => (
              <button
                key={m.model}
                role="tab"
                aria-selected={m.model === model}
                className={`rounded-md border-[1.5px] px-4 py-2 text-sm font-semibold ${m.model === model ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
                onClick={() => setModel(m.model)}
              >
                {t.model} {m.model}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">{t.modelHelp}</p>
        </div>
      )}

      {calc && graded && (
        <div className="mb-5 rounded-xl border border-brand-200 bg-brand-50 p-4" data-testid="calculator">
          <p className="text-sm text-slate-700">
            <b>{t.calc}</b> {t.calcHelp}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [t.right, graded.n_correct],
              [t.wrong, graded.n_wrong],
              [t.blank, graded.n_blank],
            ].map(([l, v]) => (
              <div key={l}>
                <dt className="text-xs uppercase tracking-wide text-slate-500">{l}</dt>
                <dd className="text-xl font-semibold text-ink">{marked ? v : '—'}</dd>
              </div>
            ))}
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">{t.grade}</dt>
              <dd className="text-xl font-semibold text-brand-800" data-testid="calc-grade">
                {marked ? `${graded.grade.toLocaleString(BCP[locale], { minimumFractionDigits: calc.decimals, maximumFractionDigits: calc.decimals })} / ${calc.scale}` : '—'}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-600">
            {pen > 0 ? t.penalty(frac(pen, locale)) : t.noPenalty} {blank > 0 ? t.blankPenalty(frac(blank, locale)) : t.noBlankPenalty}
            {graded.n_void > 0 && ` ${t.voided(graded.n_void)}`} {t.official}
            {marked > 0 && (
              <>
                {' '}
                <button className="font-medium text-brand-700 underline" onClick={() => setMine((m) => ({ ...m, [model]: {} }))}>
                  {t.clear}
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
                    <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">{t.void}</span>
                  ) : calc ? (
                    <span className="flex gap-1">
                      {options.map((o) => {
                        const isCorrect = correct.includes(o);
                        const isMine = chosen === o;
                        const cls = isMine ? (isCorrect ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-red-600 bg-red-600 text-white') : isCorrect ? 'border-emerald-600 bg-emerald-50 font-bold text-emerald-800' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-400';
                        return (
                          <button key={o} className={`h-7 w-7 rounded-full border text-xs ${cls}`} aria-pressed={isMine} aria-label={t.mark(q, o, isCorrect)} onClick={() => toggle(q, o)}>
                            {o}
                          </button>
                        );
                      })}
                    </span>
                  ) : (
                    <span className="font-semibold text-ink">{correct.length ? correct.join(t.or) : '—'}</span>
                  )}
                </li>
              );
            })}
          </ol>
        ))}
      </div>
      {calc && <p className="mt-4 text-xs text-slate-500">{t.legend}</p>}
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
  const [locale, setLocale] = useState<Locale>(detectLocale);
  const t = STR[locale];

  useEffect(() => {
    document.title = `${t.title} — Korrige`;
    document.documentElement.lang = locale;
  }, [locale, t.title]);

  async function load(c: string) {
    setBusy(true);
    setError('');
    try {
      setData(await fetchPublicKey(c));
    } catch (e) {
      setData(null);
      console.error(e);
      setError(t.error);
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
    if (c.length < 4) return setError(t.needCode);
    if (c === (urlCode ?? '').toUpperCase()) void load(c);
    else nav(`/comprobar/${c}`);
  }

  return (
    <div className="min-h-screen bg-bone-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center px-4 py-3">
          <a href={LOCALE_PATH[locale]} className="text-xl">
            <Logo />
          </a>
          <select
            aria-label={t.language}
            className="ml-auto rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
            value={locale}
            onChange={(e) => {
              const l = e.target.value as Locale;
              saveLocale(l);
              setLocale(l);
            }}
          >
            {ENABLED_LOCALES.map((l) => (
              <option key={l} value={l}>
                {LOCALE_NAMES[l]}
              </option>
            ))}
          </select>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold">{t.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{t.intro}</p>
        <form onSubmit={submit} className="mt-5 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="label">{t.code}</span>
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
            {busy ? t.searching : t.see}
          </button>
        </form>
        <div className="mt-4">
          <ErrorBox error={error} />
        </div>

        {data?.status === 'not_found' && (
          <div className="card mt-4 p-5 text-sm text-slate-700" data-testid="check-not-found">
            <b>{t.notFound}</b> {t.notFoundHelp}
          </div>
        )}
        {data?.status === 'scheduled' && (
          <div className="card mt-4 p-5" data-testid="check-scheduled">
            <h2 className="text-lg font-semibold">{data.title}</h2>
            {data.subject && <p className="text-sm text-slate-600">{data.subject}</p>}
            <p className="mt-3 text-slate-700">
              {t.scheduled(when(data.publish_at, locale))[0]}
              <b>{t.scheduled(when(data.publish_at, locale))[1]}</b>
              {t.scheduled(when(data.publish_at, locale))[2]}
            </p>
          </div>
        )}
        {data?.status === 'published' && (
          <div className="card mt-4 p-5" data-testid="check-published">
            <h2 className="text-lg font-semibold">{data.title}</h2>
            <p className="text-sm text-slate-600">{[data.subject, data.session, data.exam_date ? day(data.exam_date, locale) : ''].filter(Boolean).join(' · ')}</p>
            {data.updated_at && data.published_at && new Date(data.updated_at) > new Date(data.published_at) && (
              <p className="mt-2 rounded bg-amber-50 px-3 py-2 text-sm text-amber-900">{t.updated(when(data.updated_at, locale))}</p>
            )}
            <div className="mt-5">{data.models.length ? <Key key={data.title + data.models.length} data={data} t={t} locale={locale} /> : <p className="text-sm text-slate-600">{t.noKey}</p>}</div>
          </div>
        )}
        <p className="mt-8 text-xs text-slate-400">
          {t.about}{' '}
          <a href={LOCALE_PATH[locale]} className="underline">
            {t.more}
          </a>
        </p>
      </main>
    </div>
  );
}
