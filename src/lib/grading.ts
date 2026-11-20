/** Corrección: funciones puras (se recalcula al instante en el navegador). */
import { GradingConfig, INVALID, KeyAnswers } from './types';

export type QuestionOutcome = 'acierto' | 'error' | 'blanco' | 'anulada' | 'sin_clave';

export interface Graded {
  n_correct: number;
  n_wrong: number;
  n_blank: number;
  n_void: number;
  /** Preguntas que puntúan (ni anuladas ni sin clave). */
  n_valid: number;
  raw: number;
  grade: number;
  outcomes: Record<string, QuestionOutcome>;
}

/** Redondeo aritmético (0,5 hacia arriba) evitando errores de coma flotante. */
export function roundTo(x: number, decimals: number): number {
  const f = 10 ** decimals;
  const r = Math.round((Math.abs(x) + Number.EPSILON) * f) / f;
  return x < 0 ? -r : r;
}

/** Penalización por error según la fórmula. k = nº de opciones. */
export function penaltyPerError(cfg: GradingConfig, nOptions: number): number {
  if (cfg.formula === 'classic') return 1 / (nOptions - 1);
  if (cfg.formula === 'custom') return Math.max(0, cfg.penalty);
  return 0;
}

export function outcomeOf(answer: string | undefined, entry: KeyAnswers[string] | undefined): QuestionOutcome {
  if (entry?.v) return 'anulada';
  if (!entry || !entry.c.length) return 'sin_clave';
  if (!answer) return 'blanco';
  if (answer === INVALID) return 'error';
  return entry.c.includes(answer) ? 'acierto' : 'error';
}

/**
 * Corrige una hoja. En blanco = 0. Las preguntas anuladas (o sin respuesta
 * correcta definida) no puntúan para nadie y no cuentan en el total.
 */
export function gradeSheet(answers: Record<string, string>, key: KeyAnswers, nQuestions: number, nOptions: number, cfg: GradingConfig): Graded {
  const g: Graded = { n_correct: 0, n_wrong: 0, n_blank: 0, n_void: 0, n_valid: 0, raw: 0, grade: 0, outcomes: {} };
  for (let q = 1; q <= nQuestions; q++) {
    const o = outcomeOf(answers[String(q)], key[String(q)]);
    g.outcomes[String(q)] = o;
    if (o === 'anulada' || o === 'sin_clave') g.n_void++;
    else {
      g.n_valid++;
      if (o === 'acierto') g.n_correct++;
      else if (o === 'error') g.n_wrong++;
      else g.n_blank++;
    }
  }
  const raw = g.n_correct - penaltyPerError(cfg, nOptions) * g.n_wrong;
  let grade = g.n_valid ? (raw / g.n_valid) * cfg.scale : 0;
  if (!cfg.allowNegative) grade = Math.max(0, grade);
  g.raw = roundTo(raw, 4);
  g.grade = roundTo(grade, cfg.decimals);
  return g;
}

/** Plantilla vacía para n preguntas. */
export function emptyKey(nQuestions: number): KeyAnswers {
  const k: KeyAnswers = {};
  for (let q = 1; q <= nQuestions; q++) k[String(q)] = { c: [] };
  return k;
}

export function keyIsComplete(key: KeyAnswers, nQuestions: number): boolean {
  for (let q = 1; q <= nQuestions; q++) {
    const e = key[String(q)];
    if (!e || (!e.v && !e.c.length)) return false;
  }
  return true;
}

export function keyMissing(key: KeyAnswers | undefined, nQuestions: number): number[] {
  const out: number[] = [];
  for (let q = 1; q <= nQuestions; q++) {
    const e = key?.[String(q)];
    if (!e || (!e.v && !e.c.length)) out.push(q);
  }
  return out;
}
