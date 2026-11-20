/** Estadísticas del examen y análisis de ítems (funciones puras). */
import { outcomeOf } from './grading';
import { INVALID, KeyAnswers, ModelMap } from './types';

export interface ExamStats {
  n: number;
  mean: number;
  median: number;
  sd: number;
  min: number;
  max: number;
  passRate: number;
  /** 10 tramos iguales entre 0 y la nota máxima. */
  histogram: { from: number; to: number; count: number }[];
}

export function examStats(grades: number[], scale: number, passMark = scale / 2): ExamStats {
  const n = grades.length;
  const bins = Array.from({ length: 10 }, (_, i) => ({ from: (scale / 10) * i, to: (scale / 10) * (i + 1), count: 0 }));
  if (!n) return { n: 0, mean: 0, median: 0, sd: 0, min: 0, max: 0, passRate: 0, histogram: bins };
  const sorted = [...grades].sort((a, b) => a - b);
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  const sd = Math.sqrt(sorted.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  for (const g of sorted) {
    const i = Math.min(9, Math.max(0, Math.floor((g / scale) * 10)));
    bins[i].count++;
  }
  return { n, mean, median, sd, min: sorted[0], max: sorted[n - 1], passRate: sorted.filter((g) => g >= passMark).length / n, histogram: bins };
}

export type ItemFlag = 'discriminacion_negativa' | 'muy_dificil' | 'distractor_dominante';

export const FLAG_LABEL: Record<ItemFlag, string> = {
  discriminacion_negativa: 'Discriminación negativa: la aciertan más quienes peor nota sacan',
  muy_dificil: 'Casi nadie la acierta',
  distractor_dominante: 'Una opción incorrecta se elige más que la correcta',
};

export interface ItemStats {
  /** Nº de pregunta canónico (el del modelo A si hay correspondencia). */
  q: number;
  n: number;
  /** Índice de dificultad: proporción de aciertos (0–1). */
  p: number | null;
  /** Índice de discriminación: p(27 % superior) − p(27 % inferior). */
  d: number | null;
  /** Frecuencia de cada opción, en blanco ('') y nulas ('*'). */
  freq: Record<string, number>;
  correct: string[];
  voided: boolean;
  flags: ItemFlag[];
}

export interface GradedSheet {
  model: string;
  answers: Record<string, string>;
  grade: number;
}

/** Pregunta canónica de la pregunta q de un modelo. */
export function canonicalQuestion(map: ModelMap, model: string, q: number): number {
  return map[model]?.[String(q)] ?? q;
}

export function itemStats(sheets: GradedSheet[], keys: Record<string, KeyAnswers>, modelMap: ModelMap, nQuestions: number, options: string[]): ItemStats[] {
  const ranked = [...sheets].sort((a, b) => b.grade - a.grade);
  const n = ranked.length;
  const k = Math.max(1, Math.ceil(n * 0.27));
  const upper = new Set(ranked.slice(0, k));
  const lower = new Set(ranked.slice(n - k));
  const useGroups = n >= 4;

  const items = new Map<number, ItemStats & { up: number; upOk: number; lo: number; loOk: number; ok: number }>();
  const get = (q: number) => {
    let it = items.get(q);
    if (!it) {
      const freq: Record<string, number> = { '': 0, [INVALID]: 0 };
      for (const o of options) freq[o] = 0;
      it = { q, n: 0, p: null, d: null, freq, correct: [], voided: false, flags: [], up: 0, upOk: 0, lo: 0, loOk: 0, ok: 0 };
      items.set(q, it);
    }
    return it;
  };
  for (let q = 1; q <= nQuestions; q++) get(q);

  // La clave "de referencia" de cada pregunta canónica es la del primer modelo que la define
  for (const model of Object.keys(keys).sort()) {
    for (let q = 1; q <= nQuestions; q++) {
      const it = get(canonicalQuestion(modelMap, model, q));
      const e = keys[model]?.[String(q)];
      if (e?.v) it.voided = true;
      if (e && !it.correct.length) it.correct = [...e.c];
    }
  }

  for (const s of ranked) {
    const key = keys[s.model];
    if (!key) continue;
    for (let q = 1; q <= nQuestions; q++) {
      const it = get(canonicalQuestion(modelMap, s.model, q));
      const ans = s.answers[String(q)] ?? '';
      const o = outcomeOf(ans, key[String(q)]);
      if (o === 'anulada' || o === 'sin_clave') continue;
      it.n++;
      it.freq[ans] = (it.freq[ans] ?? 0) + 1;
      const ok = o === 'acierto';
      if (ok) it.ok++;
      if (upper.has(s)) {
        it.up++;
        if (ok) it.upOk++;
      }
      if (lower.has(s)) {
        it.lo++;
        if (ok) it.loOk++;
      }
    }
  }

  return [...items.values()]
    .sort((a, b) => a.q - b.q)
    .map(({ up, upOk, lo, loOk, ok, ...it }) => {
      if (it.n > 0 && !it.voided) {
        it.p = ok / it.n;
        if (useGroups && up && lo) it.d = upOk / up - loOk / lo;
        if (it.d != null && it.d < 0) it.flags.push('discriminacion_negativa');
        if (it.p < 0.2) it.flags.push('muy_dificil');
        const bestWrong = Math.max(0, ...options.filter((o) => !it.correct.includes(o)).map((o) => it.freq[o] ?? 0));
        const bestRight = Math.max(0, ...it.correct.map((o) => it.freq[o] ?? 0));
        if (it.correct.length && bestWrong > bestRight) it.flags.push('distractor_dominante');
      }
      return it;
    });
}

// ---------------------------------------------------------------------------
// Interpretación en lenguaje llano (para que los KPIs se entiendan sin manual)
// ---------------------------------------------------------------------------
export type Level = 'bien' | 'neutro' | 'aviso' | 'mal';

/** Dificultad según el % de acierto. */
export function difficultyLabel(p: number | null): { text: string; level: Level } | null {
  if (p == null) return null;
  if (p >= 0.8) return { text: 'Fácil', level: 'neutro' };
  if (p >= 0.5) return { text: 'Media', level: 'bien' };
  if (p >= 0.2) return { text: 'Difícil', level: 'aviso' };
  return { text: 'Muy difícil', level: 'mal' };
}

/** Discriminación: cuánto distingue la pregunta a quien sabe de quien no. */
export function discriminationLabel(d: number | null): { text: string; level: Level } | null {
  if (d == null) return null;
  if (d < 0) return { text: 'Negativa', level: 'mal' };
  if (d < 0.2) return { text: 'Baja', level: 'aviso' };
  if (d < 0.3) return { text: 'Aceptable', level: 'neutro' };
  return { text: 'Buena', level: 'bien' };
}

export interface QualitySummary {
  /** Preguntas que puntúan (ni anuladas ni sin datos). */
  scored: number;
  voided: number;
  easy: number;
  medium: number;
  hard: number;
  goodDiscrimination: number;
  lowDiscrimination: number;
  negativeDiscrimination: number;
  flagged: number;
  /** % de acierto medio de todas las preguntas. */
  meanDifficulty: number | null;
}

export function qualitySummary(items: ItemStats[]): QualitySummary {
  const scored = items.filter((i) => !i.voided && i.p != null);
  const ps = scored.map((i) => i.p!);
  return {
    scored: scored.length,
    voided: items.filter((i) => i.voided).length,
    easy: ps.filter((p) => p >= 0.8).length,
    medium: ps.filter((p) => p >= 0.5 && p < 0.8).length,
    hard: ps.filter((p) => p < 0.5).length,
    goodDiscrimination: scored.filter((i) => i.d != null && i.d >= 0.2).length,
    lowDiscrimination: scored.filter((i) => i.d != null && i.d >= 0 && i.d < 0.2).length,
    negativeDiscrimination: scored.filter((i) => i.d != null && i.d < 0).length,
    flagged: items.filter((i) => i.flags.length).length,
    meanDifficulty: ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : null,
  };
}
