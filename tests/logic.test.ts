import { describe, expect, it } from 'vitest';
import { groupPages, ScannedPage } from '../src/omr/group';
import { DEFAULT_SHEET_CONFIG, computeLayout } from '../src/omr/layout';
import type { PageRead } from '../src/omr/reader';
import { emptyKey, gradeSheet, keyMissing, roundTo } from '../src/lib/grading';
import { buildReviewItems, findDuplicates } from '../src/lib/review';
import { examStats, itemStats } from '../src/lib/stats';
import { DEFAULT_GRADING, KeyAnswers } from '../src/lib/types';

const key = (letters: string): KeyAnswers => Object.fromEntries([...letters].map((l, i) => [String(i + 1), { c: [l] }]));
const ans = (letters: string): Record<string, string> => Object.fromEntries([...letters].map((l, i) => [String(i + 1), l === '-' ? '' : l]));

describe('corrección', () => {
  const k = key('ABCDABCDAB'); // 10 preguntas, 4 opciones

  it('sin penalización', () => {
    const g = gradeSheet(ans('ABCDABCD--'), k, 10, 4, DEFAULT_GRADING);
    expect(g).toMatchObject({ n_correct: 8, n_wrong: 0, n_blank: 2, raw: 8, grade: 8 });
  });

  it('penalización clásica: aciertos − errores/(k−1)', () => {
    const g = gradeSheet(ans('ABCDABDDBA'), k, 10, 4, { ...DEFAULT_GRADING, formula: 'classic' });
    expect(g.n_correct).toBe(7);
    expect(g.n_wrong).toBe(3);
    expect(g.raw).toBe(6); // 7 − 3/3
    expect(g.grade).toBe(6);
  });

  it('penalización personalizada, escala y redondeo', () => {
    const g = gradeSheet(ans('ABCDABDDB-'), k, 10, 4, { formula: 'custom', penalty: 0.25, scale: 100, decimals: 1, allowNegative: false });
    expect(g.raw).toBe(6.5); // 7 − 2·0,25
    expect(g.grade).toBe(65);
    expect(roundTo(1.005, 2)).toBe(1.01);
    expect(roundTo(6.666666, 2)).toBe(6.67);
  });

  it('nota mínima 0 salvo que se permitan negativas', () => {
    const todoMal = ans('BBBBBBBBBA');
    const cfg = { ...DEFAULT_GRADING, formula: 'classic' as const };
    expect(gradeSheet(todoMal, k, 10, 4, cfg).grade).toBe(0);
    expect(gradeSheet(todoMal, k, 10, 4, { ...cfg, allowNegative: true }).grade).toBeLessThan(0);
  });

  it('preguntas anuladas no puntúan para nadie; varias correctas; nula cuenta como error', () => {
    const k2: KeyAnswers = { ...k, '1': { c: ['A'], v: true }, '2': { c: ['B', 'C'] } };
    const g = gradeSheet({ ...ans('DCCDABCDAB'), '3': '*' }, k2, 10, 4, { ...DEFAULT_GRADING, formula: 'classic' });
    expect(g.outcomes['1']).toBe('anulada');
    expect(g.outcomes['2']).toBe('acierto');
    expect(g.outcomes['3']).toBe('error');
    expect(g.n_void).toBe(1);
    expect(g.n_valid).toBe(9);
    expect(g.n_correct).toBe(8);
    expect(g.grade).toBe(roundTo(((8 - 1 / 3) / 9) * 10, 2));
  });

  it('plantilla incompleta', () => {
    const k3 = emptyKey(5);
    k3['2'] = { c: ['A'] };
    k3['4'] = { c: [], v: true };
    expect(keyMissing(k3, 5)).toEqual([1, 3, 5]);
    expect(gradeSheet({ '2': 'A' }, k3, 5, 4, DEFAULT_GRADING)).toMatchObject({ n_valid: 1, n_void: 4, grade: 10 });
  });
});

describe('estadísticas', () => {
  it('media, mediana, desviación, aprobados e histograma', () => {
    const s = examStats([2, 4, 5, 7, 10], 10);
    expect(s.mean).toBeCloseTo(5.6);
    expect(s.median).toBe(5);
    expect(s.sd).toBeCloseTo(2.728, 2);
    expect(s.passRate).toBeCloseTo(0.6);
    expect(s.histogram.map((b) => b.count)).toEqual([0, 0, 1, 0, 1, 1, 0, 1, 0, 1]);
    expect(examStats([], 10).n).toBe(0);
  });

  it('dificultad, discriminación, distractores y correspondencia entre modelos', () => {
    const keys = { A: key('AB'), B: key('BA') }; // la pregunta 1 del B es la 2 del A y viceversa
    const map = { B: { '1': 2, '2': 1 } };
    const sheets = [
      { model: 'A', answers: ans('AB'), grade: 10 },
      { model: 'A', answers: ans('AB'), grade: 10 },
      { model: 'B', answers: ans('BA'), grade: 10 },
      { model: 'B', answers: ans('BC'), grade: 5 }, // falla su P2 (= P1 canónica)
      { model: 'A', answers: ans('CB'), grade: 5 }, // falla P1
      { model: 'A', answers: ans('C-'), grade: 0 },
      { model: 'A', answers: ans('CC'), grade: 0 },
      { model: 'B', answers: ans('-C'), grade: 0 },
    ];
    const [q1, q2] = itemStats(sheets, keys, map, 2, ['A', 'B', 'C']);
    expect(q1.n).toBe(8);
    expect(q1.p).toBeCloseTo(3 / 8);
    expect(q1.d).toBeCloseTo(1); // 27 % superior acierta todo, inferior nada
    expect(q1.freq).toMatchObject({ A: 3, C: 5 });
    expect(q1.flags).toContain('distractor_dominante');
    expect(q2.p).toBeCloseTo(5 / 8);
    expect(q2.freq['']).toBe(2);
  });

  it('marca las preguntas con discriminación negativa o que casi nadie acierta', () => {
    const keys = { A: key('AA') };
    const sheets = Array.from({ length: 10 }, (_, i) => ({
      model: 'A',
      // P1: solo la aciertan los 3 peores; P2: no la acierta nadie
      answers: ans(i >= 7 ? 'AB' : 'BB'),
      grade: 10 - i,
    }));
    const [q1, q2] = itemStats(sheets, keys, {}, 2, ['A', 'B']);
    expect(q1.d).toBeLessThan(0);
    expect(q1.flags).toContain('discriminacion_negativa');
    expect(q2.flags).toContain('muy_dificil');
  });
});

const read = (over: Partial<PageRead>): PageRead => ({
  pagina: 1,
  incidencias: [],
  legible: true,
  girada: false,
  hoja_pagina: 1,
  qr: 'UICOMR|EX1|v1',
  nia: '11111111',
  modelo: 'A',
  modelo_estado: 'ok',
  modelo_valor: 'A',
  es_plantilla: false,
  respuestas: { '1': 'A' },
  revisar: {},
  scores: { '1': [0.9, 0, 0, 0, 0] },
  en_blanco_total: false,
  ...over,
});
const pg = (over: Partial<PageRead>): ScannedPage => ({ read: read(over), fileIndex: 0, fileName: 'a.pdf' });

describe('agrupación de páginas en entregas', () => {
  it('excluye hojas de otro examen y conserva las de QR ilegible', () => {
    const doc = computeLayout('EX1', { ...DEFAULT_SHEET_CONFIG, nQuestions: 20 });
    const { submissions, excluded } = groupPages([pg({}), pg({ qr: 'UICOMR|OTRO|v1' }), pg({ qr: null, incidencias: ['QR no leído'] }), pg({ qr: 'https://x.es' })], doc, 'EX1');
    expect(submissions).toHaveLength(2);
    expect(excluded.map((e) => e.reason)).toEqual(['Hoja de otro examen (OTRO)', 'Código QR desconocido (https://x.es)']);
    expect(submissions[1].qrRead).toBe(false);
  });

  it('empareja las 2 páginas de cada alumno por orden y por QR, y avisa si falta alguna', () => {
    const doc = computeLayout('EX1', { ...DEFAULT_SHEET_CONFIG, nQuestions: 150 });
    const p1 = (nia: string) => pg({ qr: 'UICOMR|EX1|v1|p1', hoja_pagina: 1, nia, respuestas: { '1': 'A' } });
    const p2 = (nia: string) => pg({ qr: 'UICOMR|EX1|v1|p2', hoja_pagina: 2, nia, respuestas: { '101': 'B' } });
    const { submissions } = groupPages([p1('11111111'), p2('11111111'), p1('22222222'), p1('33333333'), p2('????????'), p2('22222222'), p2('44444444')], doc, 'EX1');
    expect(submissions.map((s) => [s.identifier, s.pages.length, s.missingPages])).toEqual([
      ['11111111', 2, []],
      ['22222222', 2, []], // su página 2 llegó descolocada: se empareja por identificador
      ['33333333', 2, []], // página 2 sin identificador: por orden
      ['44444444', 1, [1]],
    ]);
    expect(submissions[0].answers).toMatchObject({ '1': 'A', '101': 'B' });
    expect(submissions[3].incidents).toContain('Falta la página 1 de la hoja');
    expect(Object.keys(submissions[3].answers)).toHaveLength(101);
  });
});

describe('cola de revisión', () => {
  const base = { legible: true, blank: false, isKey: false, qrRead: true, missingPages: [], identifier: '11111111', model: 'A' as string | null, marks: {}, modelValue: 'A', modelState: 'ok' as const };
  const ctx = { nModels: 4, roster: new Set<string>(), duplicates: new Set<string>() };

  it('una hoja limpia no genera incidencias', () => {
    expect(buildReviewItems(base, ctx)).toEqual([]);
  });

  it('genera cada tipo de incidencia', () => {
    const items = buildReviewItems(
      { ...base, qrRead: false, identifier: '1234567?', model: null, modelValue: '', marks: { '7': { e: 'doble', v: 'AB' }, '3': { e: 'floja', v: 'C' } }, missingPages: [2] },
      ctx,
    );
    expect(items.map((i) => [i.kind, i.question])).toEqual([
      ['qr', null],
      ['pagina_faltante', null],
      ['id_dudoso', null],
      ['modelo', null],
      ['floja', 3],
      ['doble', 7],
    ]);
    expect(buildReviewItems({ ...base, blank: true, identifier: '????????', model: null }, ctx).map((i) => i.kind)).toEqual(['en_blanco']);
    expect(buildReviewItems({ ...base, legible: false }, ctx).map((i) => i.kind)).toEqual(['ilegible']);
    expect(buildReviewItems({ ...base, isKey: true, identifier: '????????' }, ctx)).toEqual([]);
  });

  it('identificador duplicado o que no está en la lista', () => {
    const c = { nModels: 1, roster: new Set(['22222222']), duplicates: findDuplicates(['11111111', '11111111', '2222222?', '2222222?']) };
    expect([...c.duplicates]).toEqual(['11111111']);
    expect(buildReviewItems({ ...base, model: null }, c).map((i) => i.kind)).toEqual(['id_duplicado', 'id_no_en_lista']);
  });
});
