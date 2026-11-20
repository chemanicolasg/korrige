/**
 * Datos de demostración: un examen de ejemplo completo, creado con el mismo
 * flujo que usa un profesor (hoja → "escaneo" → lectura → incidencias → notas).
 * Lo usan el modo demo del navegador y scripts/seed-demo.ts (Supabase).
 */
import { generateFilledPdf, FilledSheet } from '../omr/demoScan';
import { ScannedPage, groupPages } from '../omr/group';
import { DEFAULT_SHEET_CONFIG, LayoutDoc, SheetConfig } from '../omr/layout';
import { Db } from './db';
import { createExam, importStudents, loadExam, saveKey, saveUpload, updateModelMap, StudentRow } from './service';
import { KeyAnswers } from './types';

export type ProcessFn = (files: { name: string; data: Uint8Array }[], layout: LayoutDoc) => Promise<ScannedPage[]>;

/** Generador pseudoaleatorio determinista (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOMBRES = ['Lucía', 'Hugo', 'Martina', 'Mateo', 'Sofía', 'Leo', 'Julia', 'Daniel', 'Paula', 'Pablo', 'Emma', 'Álvaro', 'Valeria', 'Adrián', 'Carla', 'Marc', 'Aina', 'Pol', 'Laia', 'Jan', 'Noa', 'Íker', 'Sara', 'Bruno', 'Alba', 'Enzo', 'Clara', 'Nil', 'Irene', 'Gael', 'Vera', 'Biel', 'Olivia', 'Marcos', 'Elena', 'Diego', 'Carmen', 'Javier'];
const APELLIDOS = ['García', 'Martínez', 'López', 'Sánchez', 'Pérez', 'Gómez', 'Fernández', 'Ruiz', 'Díaz', 'Moreno', 'Vila', 'Soler', 'Ferrer', 'Roca', 'Puig', 'Serra', 'Navarro', 'Torres', 'Ramos', 'Gil', 'Vidal', 'Molina', 'Castro', 'Ortega', 'Rubio', 'Marín', 'Sanz', 'Iglesias', 'Costa', 'Pons'];

export function demoStudents(n: number, random: () => number): StudentRow[] {
  const out: StudentRow[] = [];
  const used = new Set<string>();
  while (out.length < n) {
    const id = String(20240000 + Math.floor(random() * 9000) + 100);
    if (used.has(id)) continue;
    used.add(id);
    const first = NOMBRES[Math.floor(random() * NOMBRES.length)];
    const l1 = APELLIDOS[Math.floor(random() * APELLIDOS.length)];
    const l2 = APELLIDOS[Math.floor(random() * APELLIDOS.length)];
    const slug = `${first}.${l1}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    out.push({ identifier: id, last_name: `${l1} ${l2}`, first_name: first, email: `${slug}${out.length}@alumni.example`, group_name: out.length % 2 ? 'M2' : 'M1' });
  }
  return out.sort((a, b) => a.last_name.localeCompare(b.last_name, 'es'));
}

/** Hojas rellenadas al azar para un examen cualquiera (botón "PDF de ejemplo" del modo demo). */
export function randomFilledSheets(cfg: SheetConfig, n: number, seed = Date.now()): FilledSheet[] {
  const random = rng(seed);
  const letters = 'ABCDE'.slice(0, cfg.nOptions);
  const models = 'ABCD'.slice(0, Math.max(1, cfg.nModels));
  return Array.from({ length: n }, () => {
    const answers: Record<string, string> = {};
    for (let q = 1; q <= cfg.nQuestions; q++) answers[String(q)] = random() < 0.06 ? '' : letters[Math.floor(random() * letters.length)];
    let id = '';
    for (let d = 0; d < cfg.idDigits; d++) id += Math.floor(random() * 10);
    return { identifier: id, model: models[Math.floor(random() * models.length)], answers };
  });
}

const N = 40;
const OPTS = 'ABCD';
const PROBLEMATICA = 13; // la aciertan más los que peor nota sacan
const DIFICIL = 27; // casi nadie la acierta

/** Crea el examen de ejemplo con resultados. Devuelve su id. */
export async function seedDemo(db: Db, orgId: string, userId: string, process: ProcessFn, onProgress?: (msg: string) => void): Promise<string> {
  const random = rng(20261120);
  onProgress?.('Creando el examen de ejemplo…');
  const cfg: SheetConfig = { ...DEFAULT_SHEET_CONFIG, nQuestions: N, nOptions: 4, nModels: 2, idDigits: 8, title: 'Facultad de Demostración', subtitle: 'Anatomía I  ·  Parcial 1  ·  Enero' };
  const exam = await createExam(db, orgId, userId, { title: 'Anatomía I · Parcial 1 (ejemplo)', subject: 'Anatomía I', group_name: 'M1 y M2', session: 'Enero', exam_date: new Date().toISOString().slice(0, 10) }, cfg, {
    formula: 'classic',
    penalty: 0.25,
    scale: 10,
    decimals: 2,
    allowNegative: false,
  });
  let data = (await loadExam(db, exam.id))!;

  // Plantilla del modelo A (en pantalla); el modelo B es el A con las preguntas en otro orden
  const keyA: KeyAnswers = {};
  for (let q = 1; q <= N; q++) keyA[String(q)] = { c: [OPTS[Math.floor(random() * 4)]] };
  const perm = Array.from({ length: N }, (_, i) => i + 1);
  for (let i = N - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  data = await saveKey(db, data, userId, 'A', keyA);
  data = await updateModelMap(db, data, { B: Object.fromEntries(perm.map((a, i) => [String(i + 1), a])) });

  const students = demoStudents(34, random);
  data = await importStudents(db, data, userId, students, true);

  // Respuestas simuladas según la "habilidad" de cada alumno y la dificultad de cada pregunta
  onProgress?.('Generando las hojas de los alumnos…');
  const difficulty = Array.from({ length: N + 1 }, () => 0.35 + random() * 0.55);
  const answerFor = (canon: number, ability: number): string => {
    const right = keyA[String(canon)].c[0];
    const wrong = OPTS.replace(right, '');
    let p = Math.min(0.97, Math.max(0.05, difficulty[canon] + (ability - 0.5) * 0.9));
    if (canon === PROBLEMATICA) p = 0.75 - ability * 0.6;
    if (canon === DIFICIL) p = 0.1;
    const r = random();
    if (r < p) return right;
    if (r > 0.93) return '';
    return canon === PROBLEMATICA || canon === DIFICIL ? wrong[0] : wrong[Math.floor(random() * 3)];
  };
  const sheets: FilledSheet[] = [];
  // hoja-plantilla del modelo B (burbuja «P»): se detecta sola al subir el PDF
  sheets.push({ identifier: '', model: 'B', isKey: true, answers: Object.fromEntries(perm.map((a, i) => [String(i + 1), keyA[String(a)].c[0]])) });
  const present = students.slice(0, 32); // 2 alumnos no se presentan
  present.forEach((st, idx) => {
    const ability = 0.15 + random() * 0.8;
    const model = idx % 2 ? 'B' : 'A';
    const answers: Record<string, string> = {};
    for (let q = 1; q <= N; q++) answers[String(q)] = answerFor(model === 'A' ? q : perm[q - 1], ability);
    const sheet: FilledSheet = { identifier: st.identifier, model, answers };
    if (idx === 3) sheet.answers['8'] = 'AC'; // doble marca
    if (idx === 7) {
      sheet.weak = { '15': sheet.answers['15'] || 'B' }; // marca floja
      sheet.answers['15'] = '';
    }
    if (idx === 11) sheet.identifier = `${st.identifier.slice(0, 5)}?${st.identifier.slice(6)}`; // dígito sin marcar
    if (idx === 14) sheet.upsideDown = true; // hoja al revés
    if (idx === 19) sheet.model = ''; // modelo sin marcar
    if (idx === 23) sheet.identifier = String(Number(st.identifier) + 1); // se equivoca al marcar: no está en la lista
    if (idx === 28) {
      sheet.weak = { '31': 'D' }; // borrón junto a una marca clara
    }
    sheets.push(sheet);
  });
  sheets.push({ identifier: '', model: '', answers: {} }); // hoja en blanco que se coló en el taco

  const pdf = await generateFilledPdf(data.layout, sheets);
  onProgress?.('Leyendo las hojas (como si las hubieras escaneado)…');
  const pages = await process([{ name: 'escaneo-anatomia-m1-m2.pdf', data: pdf }], data.layout);
  const { submissions, excluded } = groupPages(pages, data.layout, exam.code);
  onProgress?.('Guardando resultados…');
  await saveUpload(db, data, userId, { submissions, excluded, duplicatePolicy: 'conservar' });
  return exam.id;
}
