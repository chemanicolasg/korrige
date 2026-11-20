/**
 * Operaciones de la aplicación sobre la capa de datos (Db). No depende del
 * navegador: se usa igual desde la app, el script de demo y los tests.
 */
import { Excluded, Submission, hasDoubt } from '../omr/group';
import { LayoutDoc, SheetConfig, clampConfig, computeLayout } from '../omr/layout';
import { Db } from './db';
import { gradeSheet } from './grading';
import { buildReviewItems, findDuplicates, NewReviewItem } from './review';
import {
  AnswerKey,
  DEFAULT_GRADING,
  Exam,
  ExamLayoutRow,
  GradingConfig,
  KeyAnswers,
  ModelMap,
  Result,
  ReviewItem,
  Sheet,
  SheetPage,
  Student,
  Upload,
} from './types';

export interface ExamData {
  exam: Exam;
  layout: LayoutDoc;
  keys: AnswerKey[];
  students: Student[];
  uploads: Upload[];
  sheets: Sheet[];
  results: Result[];
  items: ReviewItem[];
}

export interface ExamFields {
  title: string;
  subject: string;
  group_name: string;
  session: string;
  exam_date: string | null;
}

// ---------------------------------------------------------------------------
// Utilidades puras
// ---------------------------------------------------------------------------

/** Última versión de la plantilla de cada modelo. */
export function currentKeys(keys: AnswerKey[]): Record<string, AnswerKey> {
  const out: Record<string, AnswerKey> = {};
  for (const k of keys) if (!out[k.model] || out[k.model].version < k.version) out[k.model] = k;
  return out;
}

export const isStudentSheet = (s: Sheet) => !s.is_key && !s.excluded;
export const isLegible = (s: Sheet) => s.pages.length > 0 && s.pages.every((p) => p.legible);
export const sheetModel = (exam: Exam, s: Sheet): string | null => (exam.sheet_config.nModels > 1 ? s.model : 'A');

/** Calcula las notas de todas las hojas corregibles (función pura). */
export function computeResults(exam: Exam, keys: AnswerKey[], sheets: Sheet[]): Result[] {
  const cur = currentKeys(keys);
  const cfg = { ...DEFAULT_GRADING, ...exam.grading_config };
  const out: Result[] = [];
  for (const s of sheets) {
    if (!isStudentSheet(s) || !isLegible(s)) continue;
    const model = sheetModel(exam, s);
    const key = model ? cur[model] : undefined;
    if (!key) continue;
    const g = gradeSheet(s.answers, key.answers, exam.sheet_config.nQuestions, exam.sheet_config.nOptions, cfg);
    out.push({
      sheet_id: s.id,
      exam_id: exam.id,
      key_version: key.version,
      n_correct: g.n_correct,
      n_wrong: g.n_wrong,
      n_blank: g.n_blank,
      n_void: g.n_void,
      raw: g.raw,
      grade: g.grade,
    });
  }
  return out;
}

/** Plantilla a partir de una hoja marcada con la burbuja "P". Doble marca = varias correctas. */
export function keyFromSubmission(sub: Submission, nQuestions: number): KeyAnswers {
  const key: KeyAnswers = {};
  for (let q = 1; q <= nQuestions; q++) {
    const m = sub.marks[String(q)];
    const a = sub.answers[String(q)];
    key[String(q)] = { c: m ? [...m.v] : a ? [a] : [] };
  }
  return key;
}

export function examImagePaths(sheets: Sheet[]): string[] {
  return sheets.flatMap((s) => s.pages.map((p) => p.image_path).filter((p): p is string => !!p));
}

// ---------------------------------------------------------------------------
// Auditoría
// ---------------------------------------------------------------------------
export const ACTION_LABEL: Record<string, string> = {
  organizacion_creada: 'Organización creada',
  organizacion_editada: 'Organización editada',
  valores_por_defecto: 'Valores por defecto de los exámenes cambiados',
  invitacion_enviada: 'Invitación creada',
  invitacion_aceptada: 'Invitación aceptada',
  examen_creado: 'Examen creado',
  examen_editado: 'Examen editado',
  examen_duplicado: 'Examen duplicado',
  examen_compartido: 'Examen compartido',
  examen_dejado_de_compartir: 'Se dejó de compartir',
  hoja_configurada: 'Hoja de respuestas configurada',
  hojas_descargadas: 'Hojas descargadas',
  correccion_configurada: 'Fórmula de corrección cambiada',
  plantilla_modificada: 'Plantilla de respuestas modificada',
  correspondencia_modificada: 'Correspondencia entre modelos modificada',
  alumnos_importados: 'Lista de alumnos importada',
  subida_pdf: 'PDF de hojas subido',
  subida_eliminada: 'Subida eliminada',
  correccion_manual: 'Corrección manual',
  incidencia_resuelta: 'Incidencia resuelta',
  recalculo: 'Notas recalculadas',
  exportacion: 'Exportación',
  examen_cerrado: 'Examen cerrado',
  examen_reabierto: 'Examen reabierto',
  examen_eliminado: 'Examen eliminado',
  imagenes_borradas: 'Imágenes borradas (retención)',
};

export async function logAudit(db: Db, orgId: string, examId: string | null, action: string, details: Record<string, unknown> = {}) {
  try {
    await db.insert('audit_log', { org_id: orgId, exam_id: examId, action, details });
  } catch (e) {
    // la auditoría nunca debe impedir trabajar, pero sí dejar rastro en consola
    console.error('No se pudo registrar la actividad', action, e);
  }
}

// ---------------------------------------------------------------------------
// Exámenes
// ---------------------------------------------------------------------------
export async function loadExam(db: Db, id: string): Promise<ExamData | null> {
  const [exams, layouts, keys, students, uploads, sheets, results, items] = await Promise.all([
    db.select<Exam>('exams', { id }),
    db.select<ExamLayoutRow>('exam_layouts', { exam_id: id }),
    db.select<AnswerKey>('answer_keys', { exam_id: id }, { order: 'version' }),
    db.select<Student>('students', { exam_id: id }, { order: 'last_name' }),
    db.select<Upload>('uploads', { exam_id: id }, { order: 'created_at' }),
    db.select<Sheet>('sheets', { exam_id: id }, { order: 'seq' }),
    db.select<Result>('results', { exam_id: id }),
    db.select<ReviewItem>('review_items', { exam_id: id }, { order: 'created_at' }),
  ]);
  const exam = exams[0];
  if (!exam) return null;
  exam.grading_config = { ...DEFAULT_GRADING, ...exam.grading_config };
  const layout = layouts[0]?.layout ?? computeLayout(exam.code, exam.sheet_config);
  return { exam, layout, keys, students, uploads, sheets, results, items };
}

export async function createExam(db: Db, orgId: string, userId: string, fields: ExamFields, sheetConfig: SheetConfig, grading: GradingConfig = DEFAULT_GRADING): Promise<Exam> {
  const cfg = clampConfig(sheetConfig);
  const [exam] = await db.insert<Exam>('exams', { org_id: orgId, owner_id: userId, ...fields, sheet_config: cfg, grading_config: grading });
  await db.insert('exam_layouts', { exam_id: exam.id, layout: computeLayout(exam.code, cfg) });
  await logAudit(db, orgId, exam.id, 'examen_creado', { titulo: exam.title, codigo: exam.code, preguntas: cfg.nQuestions, opciones: cfg.nOptions, modelos: cfg.nModels });
  return exam;
}

export async function updateExamFields(db: Db, exam: Exam, fields: Partial<ExamFields>): Promise<Exam> {
  const cambios: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    const old = (exam as unknown as Record<string, unknown>)[k];
    if (old !== v) cambios[k] = { antes: old, ahora: v };
  }
  if (!Object.keys(cambios).length) return exam;
  const [row] = await db.update<Exam>('exams', { id: exam.id }, fields);
  await logAudit(db, exam.org_id, exam.id, 'examen_editado', cambios);
  return row;
}

/** Cambia la configuración de la hoja y regenera el layout (solo sin hojas subidas). */
export async function updateSheetConfig(db: Db, data: ExamData, config: SheetConfig): Promise<ExamData> {
  if (data.sheets.length) throw new Error('La hoja queda bloqueada al subir hojas: duplica el examen si necesitas otra configuración.');
  const cfg = clampConfig(config);
  const layout = computeLayout(data.exam.code, cfg);
  const [exam] = await db.update<Exam>('exams', { id: data.exam.id }, { sheet_config: cfg });
  await db.upsert('exam_layouts', { exam_id: exam.id, layout }, 'exam_id');
  await logAudit(db, exam.org_id, exam.id, 'hoja_configurada', { preguntas: cfg.nQuestions, opciones: cfg.nOptions, modelos: cfg.nModels, digitos: cfg.idDigits, etiqueta: cfg.idLabel });
  return { ...data, exam: { ...data.exam, ...exam }, layout };
}

export async function markDownloaded(db: Db, data: ExamData, copies: number): Promise<ExamData> {
  let exam = data.exam;
  if (exam.status === 'borrador') [exam] = await db.update<Exam>('exams', { id: exam.id }, { status: 'hojas_descargadas' });
  await logAudit(db, exam.org_id, exam.id, 'hojas_descargadas', { copias: copies });
  return { ...data, exam: { ...data.exam, ...exam } };
}

export async function duplicateExam(db: Db, data: ExamData, userId: string): Promise<Exam> {
  const { exam } = data;
  const copy = await createExam(
    db,
    exam.org_id,
    userId,
    { title: `${exam.title} (copia)`.slice(0, 160), subject: exam.subject, group_name: exam.group_name, session: exam.session, exam_date: null },
    exam.sheet_config,
    exam.grading_config,
  );
  if (Object.keys(exam.model_map ?? {}).length) await db.update('exams', { id: copy.id }, { model_map: exam.model_map });
  const keys = Object.values(currentKeys(data.keys));
  if (keys.length) {
    await db.insert(
      'answer_keys',
      keys.map((k) => ({ exam_id: copy.id, model: k.model, version: 1, answers: k.answers, source: 'manual', note: `Copiada de ${exam.code}`, created_by: userId })),
    );
  }
  await logAudit(db, exam.org_id, copy.id, 'examen_duplicado', { origen: exam.code, titulo_origen: exam.title });
  return copy;
}

export async function setExamClosed(db: Db, data: ExamData, closed: boolean): Promise<ExamData> {
  const status = closed ? 'cerrado' : data.sheets.length ? 'con_resultados' : 'borrador';
  const [exam] = await db.update<Exam>('exams', { id: data.exam.id }, { status });
  await logAudit(db, exam.org_id, exam.id, closed ? 'examen_cerrado' : 'examen_reabierto', {});
  return { ...data, exam: { ...data.exam, ...exam } };
}

/** Borrado completo (RGPD): imágenes, hojas, notas, alumnos… Solo queda el apunte de auditoría. */
export async function deleteExam(db: Db, data: ExamData): Promise<void> {
  const paths = examImagePaths(data.sheets);
  if (paths.length) await db.removeImages(paths);
  await logAudit(db, data.exam.org_id, null, 'examen_eliminado', { titulo: data.exam.title, codigo: data.exam.code, hojas: data.sheets.length, imagenes: paths.length });
  await db.remove('exams', { id: data.exam.id });
}

// ---------------------------------------------------------------------------
// Notas
// ---------------------------------------------------------------------------

/** Recalcula y guarda todas las notas. Devuelve los datos actualizados. */
export async function syncResults(db: Db, data: ExamData, motivo?: string): Promise<ExamData> {
  const results = computeResults(data.exam, data.keys, data.sheets);
  const keep = new Set(results.map((r) => r.sheet_id));
  const stale = data.results.filter((r) => !keep.has(r.sheet_id)).map((r) => r.sheet_id);
  if (results.length) await db.upsert('results', results, 'sheet_id');
  if (stale.length) await db.remove('results', { sheet_id: stale });
  if (motivo) await logAudit(db, data.exam.org_id, data.exam.id, 'recalculo', { motivo, hojas: results.length });
  return { ...data, results };
}

export async function updateGrading(db: Db, data: ExamData, grading: GradingConfig): Promise<ExamData> {
  const [exam] = await db.update<Exam>('exams', { id: data.exam.id }, { grading_config: grading });
  await logAudit(db, exam.org_id, exam.id, 'correccion_configurada', { antes: data.exam.grading_config, ahora: grading });
  return syncResults(db, { ...data, exam: { ...data.exam, ...exam, grading_config: grading } }, 'cambio de fórmula');
}

export async function updateModelMap(db: Db, data: ExamData, map: ModelMap): Promise<ExamData> {
  const [exam] = await db.update<Exam>('exams', { id: data.exam.id }, { model_map: map });
  await logAudit(db, exam.org_id, exam.id, 'correspondencia_modificada', { modelos: Object.keys(map) });
  return { ...data, exam: { ...data.exam, ...exam, model_map: map } };
}

/** Guarda una versión nueva de la plantilla de un modelo y recalcula todas las notas. */
export async function saveKey(db: Db, data: ExamData, userId: string, model: string, answers: KeyAnswers, source: 'manual' | 'escaneo' = 'manual', note = ''): Promise<ExamData> {
  const prev = currentKeys(data.keys)[model];
  const version = (prev?.version ?? 0) + 1;
  const cambios: Record<string, unknown> = {};
  for (const q of Object.keys(answers)) {
    const a = answers[q];
    const b = prev?.answers[q];
    if (!b || a.c.join('') !== b.c.join('') || !!a.v !== !!b.v) cambios[q] = { antes: b ? `${b.c.join('')}${b.v ? ' (anulada)' : ''}` : '', ahora: `${a.c.join('')}${a.v ? ' (anulada)' : ''}` };
  }
  const [key] = await db.insert<AnswerKey>('answer_keys', { exam_id: data.exam.id, model, version, answers, source, note, created_by: userId });
  await logAudit(db, data.exam.org_id, data.exam.id, 'plantilla_modificada', {
    modelo: model,
    version,
    origen: source,
    n_cambios: Object.keys(cambios).length,
    cambios: prev ? cambios : undefined,
  });
  return syncResults(db, { ...data, keys: [...data.keys, key] }, `plantilla del modelo ${model} v${version}`);
}

// ---------------------------------------------------------------------------
// Subida de hojas
// ---------------------------------------------------------------------------
export type DuplicatePolicy = 'sustituir' | 'conservar' | 'descartar';

export interface UploadPlan {
  submissions: Submission[];
  excluded: Excluded[];
  /** Modelo elegido a mano para las plantillas cuyo modelo no se leyó (índice de submission → modelo). */
  keyModels?: Record<number, string>;
  duplicatePolicy: DuplicatePolicy;
}

/** Identificadores de la tanda nueva que ya existen en hojas guardadas. */
export function duplicatesWithExisting(data: ExamData, submissions: Submission[]): string[] {
  const existing = new Set(data.sheets.filter(isStudentSheet).map((s) => s.identifier));
  return [...new Set(submissions.filter((s) => !s.isKey && !hasDoubt(s.identifier) && existing.has(s.identifier)).map((s) => s.identifier))];
}

async function pool<T>(items: T[], size: number, fn: (item: T, i: number) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        await fn(items[i], i);
      }
    }),
  );
}

export async function saveUpload(
  db: Db,
  data: ExamData,
  userId: string,
  plan: UploadPlan,
  onProgress?: (done: number, total: number) => void,
): Promise<ExamData> {
  const { exam } = data;
  const nModels = exam.sheet_config.nModels;
  const dupExisting = new Set(duplicatesWithExisting(data, plan.submissions));
  let subs = plan.submissions.map((s, i) => ({ s, i }));
  if (plan.duplicatePolicy === 'descartar') subs = subs.filter(({ s }) => s.isKey || !dupExisting.has(s.identifier));

  const fileNames = [...new Set([...plan.submissions.flatMap((s) => s.pages.map((p) => p.fileName)), ...plan.excluded.map((e) => e.page.fileName)])];
  const nPages = plan.submissions.reduce((a, s) => a + s.pages.length, 0) + plan.excluded.length;
  const [upload] = await db.insert<Upload>('uploads', {
    exam_id: exam.id,
    file_names: fileNames,
    n_pages: nPages,
    n_sheets: subs.length,
    n_excluded: plan.excluded.length,
    uploaded_by: userId,
  });

  // 1) imágenes a Storage: <org>/<examen>/<subida>/<seq>-<página>.jpg
  let seq = Math.max(0, ...data.sheets.map((s) => s.seq));
  const rows = subs.map(({ s, i }) => {
    seq++;
    const pages: (SheetPage & { blob?: Blob })[] = s.pages.map((p) => ({
      hoja_pagina: p.read.hoja_pagina,
      archivo: p.fileName,
      pdf_pagina: p.read.pagina,
      image_path: p.image ? `${exam.org_id}/${exam.id}/${upload.id}/${seq}-${p.read.hoja_pagina}.jpg` : null,
      girada: p.read.girada,
      legible: p.read.legible,
      qr: p.read.qr ?? null,
      incidencias: p.read.incidencias,
      blob: p.image,
    }));
    const model = s.isKey ? (s.model ?? plan.keyModels?.[i] ?? (nModels === 1 ? 'A' : null)) : nModels === 1 ? 'A' : s.model;
    return { sub: s, seq, pages, model };
  });
  const images = rows.flatMap((r) => r.pages.filter((p) => p.blob && p.image_path).map((p) => ({ path: p.image_path!, blob: p.blob! })));
  let done = 0;
  onProgress?.(0, images.length);
  await pool(images, 4, async (img) => {
    await db.uploadImage(img.path, img.blob);
    onProgress?.(++done, images.length);
  });

  // 2) hojas
  const inserted = await db.insert<Sheet>(
    'sheets',
    rows.map((r) => ({
      exam_id: exam.id,
      upload_id: upload.id,
      seq: r.seq,
      pages: r.pages.map(({ blob: _b, ...p }) => p),
      identifier_read: r.sub.identifier,
      identifier: r.sub.identifier,
      model_read: r.sub.model,
      model: r.model,
      is_key: r.sub.isKey,
      answers_read: r.sub.answers,
      answers: r.sub.answers,
      marks: r.sub.marks,
      scores: r.sub.scores,
      id_scores: r.sub.idScores,
      model_scores: r.sub.modelScores,
      incidents: r.sub.incidents,
      excluded: false,
      excluded_reason: null,
    })),
  );
  const bySeq = new Map(inserted.map((s) => [s.seq, s]));

  // 3) duplicados con tandas anteriores
  let oldSheets = data.sheets;
  let oldItems = data.items;
  if (plan.duplicatePolicy === 'sustituir' && dupExisting.size) {
    const replaced = data.sheets.filter((s) => isStudentSheet(s) && dupExisting.has(s.identifier));
    const ids = replaced.map((s) => s.id);
    const patch = { excluded: true, excluded_reason: 'Sustituida por una subida posterior' };
    await db.update('sheets', { id: ids }, patch);
    const resolution = { status: 'resuelta', resolution: { tipo: 'auto', motivo: 'hoja sustituida' }, resolved_by: userId, resolved_at: new Date().toISOString() };
    await db.update('review_items', { sheet_id: ids, status: 'pendiente' }, resolution);
    oldSheets = data.sheets.map((s) => (ids.includes(s.id) ? { ...s, ...patch } : s));
    oldItems = data.items.map((it) => (ids.includes(it.sheet_id) && it.status === 'pendiente' ? ({ ...it, ...resolution } as ReviewItem) : it));
  }

  // 4) cola de revisión
  const allSheets = [...oldSheets, ...inserted];
  const duplicates = findDuplicates(allSheets.filter(isStudentSheet).map((s) => s.identifier));
  const ctx = { nModels, roster: new Set(data.students.map((s) => s.identifier)), duplicates };
  const newItems: (NewReviewItem & { exam_id: string; sheet_id: string })[] = [];
  for (const r of rows) {
    const sheet = bySeq.get(r.seq)!;
    for (const it of buildReviewItems({ ...r.sub, model: r.model }, ctx)) newItems.push({ ...it, exam_id: exam.id, sheet_id: sheet.id });
  }
  // las hojas antiguas que ahora están duplicadas también van a revisión
  for (const s of oldSheets) {
    if (isStudentSheet(s) && duplicates.has(s.identifier) && !oldItems.some((it) => it.sheet_id === s.id && it.kind === 'id_duplicado' && it.status === 'pendiente')) {
      newItems.push({ kind: 'id_duplicado', question: null, detail: { leido: s.identifier }, exam_id: exam.id, sheet_id: s.id });
    }
  }
  const items = newItems.length ? await db.insert<ReviewItem>('review_items', newItems) : [];

  // 5) plantillas detectadas (burbuja "P")
  let next: ExamData = { ...data, uploads: [...data.uploads, upload], sheets: allSheets, items: [...oldItems, ...items] };
  const keyRows = rows.filter((r) => r.sub.isKey && r.model && r.sub.legible);
  for (const r of keyRows) {
    const answers = keyFromSubmission(r.sub, exam.sheet_config.nQuestions);
    const [key] = await db.insert<AnswerKey>('answer_keys', {
      exam_id: exam.id,
      model: r.model,
      version: (currentKeys(next.keys)[r.model!]?.version ?? 0) + 1,
      answers,
      source: 'escaneo',
      note: `Detectada en ${r.pages[0]?.archivo ?? 'el PDF'} (pág. ${r.pages[0]?.pdf_pagina ?? '?'})`,
      created_by: userId,
    });
    next = { ...next, keys: [...next.keys, key] };
    await logAudit(db, exam.org_id, exam.id, 'plantilla_modificada', { modelo: r.model, version: key.version, origen: 'escaneo' });
  }

  // 6) estado, auditoría y notas
  if (exam.status === 'borrador' || exam.status === 'hojas_descargadas') {
    const [e] = await db.update<Exam>('exams', { id: exam.id }, { status: 'con_resultados' });
    next = { ...next, exam: { ...next.exam, ...e } };
  }
  await logAudit(db, exam.org_id, exam.id, 'subida_pdf', {
    archivos: fileNames,
    paginas: nPages,
    hojas: rows.filter((r) => !r.sub.isKey).length,
    plantillas: keyRows.map((r) => r.model),
    excluidas: plan.excluded.map((e) => `${e.page.fileName} pág. ${e.page.read.pagina}: ${e.reason}`),
    incidencias: items.length,
    duplicados: dupExisting.size ? { identificadores: [...dupExisting], decision: plan.duplicatePolicy } : undefined,
  });
  return syncResults(db, next, 'subida de hojas');
}

/** Elimina una subida completa (sus hojas, imágenes, notas e incidencias). */
export async function deleteUpload(db: Db, data: ExamData, uploadId: string): Promise<ExamData> {
  const gone = data.sheets.filter((s) => s.upload_id === uploadId);
  const ids = new Set(gone.map((s) => s.id));
  const paths = examImagePaths(gone);
  if (paths.length) await db.removeImages(paths);
  await db.remove('uploads', { id: uploadId });
  await logAudit(db, data.exam.org_id, data.exam.id, 'subida_eliminada', { hojas: gone.length, archivos: data.uploads.find((u) => u.id === uploadId)?.file_names });
  const next = {
    ...data,
    uploads: data.uploads.filter((u) => u.id !== uploadId),
    sheets: data.sheets.filter((s) => !ids.has(s.id)),
    items: data.items.filter((it) => !ids.has(it.sheet_id)),
    results: data.results.filter((r) => !ids.has(r.sheet_id)),
  };
  return syncDuplicateItems(db, await syncResults(db, next, 'subida eliminada'), '');
}

// ---------------------------------------------------------------------------
// Correcciones manuales y revisión
// ---------------------------------------------------------------------------
export interface SheetPatch {
  /** pregunta → letra, '' (en blanco) o '*' (nula) */
  answers?: Record<string, string>;
  identifier?: string;
  model?: string | null;
  excluded?: boolean;
  excluded_reason?: string | null;
}

const resolvedPatch = (userId: string, resolution: Record<string, unknown>) => ({
  status: 'resuelta' as const,
  resolution,
  resolved_by: userId,
  resolved_at: new Date().toISOString(),
});

/** Mantiene coherentes las incidencias de identificador duplicado tras un cambio. */
async function syncDuplicateItems(db: Db, data: ExamData, userId: string): Promise<ExamData> {
  const students = data.sheets.filter(isStudentSheet);
  const dups = findDuplicates(students.map((s) => s.identifier));
  let items = data.items;
  const stale = items.filter((it) => {
    if (it.kind !== 'id_duplicado' || it.status !== 'pendiente') return false;
    const sheet = data.sheets.find((s) => s.id === it.sheet_id);
    return !sheet || !isStudentSheet(sheet) || !dups.has(sheet.identifier);
  });
  if (stale.length) {
    const patch = resolvedPatch(userId, { tipo: 'auto', motivo: 'ya no está duplicado' });
    await db.update('review_items', { id: stale.map((s) => s.id) }, userId ? patch : { ...patch, resolved_by: null });
    items = items.map((it) => (stale.includes(it) ? { ...it, ...patch } : it));
  }
  const missing = students.filter((s) => dups.has(s.identifier) && !items.some((it) => it.sheet_id === s.id && it.kind === 'id_duplicado' && it.status === 'pendiente'));
  // solo se crean incidencias nuevas para hojas que no hayan aceptado ya ese duplicado
  const fresh = missing.filter((s) => !items.some((it) => it.sheet_id === s.id && it.kind === 'id_duplicado' && it.detail.leido === s.identifier));
  if (fresh.length) {
    const created = await db.insert<ReviewItem>(
      'review_items',
      fresh.map((s) => ({ exam_id: data.exam.id, sheet_id: s.id, kind: 'id_duplicado', question: null, detail: { leido: s.identifier } })),
    );
    items = [...items, ...created];
  }
  return { ...data, items };
}

/** Aplica una corrección manual a una hoja, la registra y recalcula su nota. */
export async function correctSheet(db: Db, data: ExamData, userId: string, sheetId: string, patch: SheetPatch, motivo = 'corrección manual'): Promise<ExamData> {
  const sheet = data.sheets.find((s) => s.id === sheetId);
  if (!sheet) throw new Error('Hoja no encontrada');
  const cambios: { campo: string; pregunta?: number; antes: unknown; ahora: unknown }[] = [];
  const dbPatch: Record<string, unknown> = {};
  if (patch.answers) {
    const answers = { ...sheet.answers };
    for (const [q, v] of Object.entries(patch.answers)) {
      if ((answers[q] ?? '') !== v) cambios.push({ campo: 'respuesta', pregunta: Number(q), antes: answers[q] ?? '', ahora: v });
      answers[q] = v;
    }
    dbPatch.answers = answers;
  }
  if (patch.identifier !== undefined && patch.identifier !== sheet.identifier) {
    cambios.push({ campo: 'identificador', antes: sheet.identifier, ahora: patch.identifier });
    dbPatch.identifier = patch.identifier;
  }
  if (patch.model !== undefined && patch.model !== sheet.model) {
    cambios.push({ campo: 'modelo', antes: sheet.model, ahora: patch.model });
    dbPatch.model = patch.model;
  }
  if (patch.excluded !== undefined && patch.excluded !== sheet.excluded) {
    cambios.push({ campo: 'excluida', antes: sheet.excluded, ahora: patch.excluded });
    dbPatch.excluded = patch.excluded;
    dbPatch.excluded_reason = patch.excluded ? (patch.excluded_reason ?? motivo) : null;
  }
  if (!cambios.length) return data;
  await db.update('sheets', { id: sheetId }, dbPatch);
  await logAudit(db, data.exam.org_id, data.exam.id, 'correccion_manual', { hoja: sheet.seq, identificador: sheet.identifier, motivo, cambios });
  let next: ExamData = { ...data, sheets: data.sheets.map((s) => (s.id === sheetId ? ({ ...s, ...dbPatch } as Sheet) : s)) };
  if (dbPatch.excluded === true) {
    // una hoja excluida no deja incidencias pendientes
    const pending = next.items.filter((it) => it.sheet_id === sheetId && it.status === 'pendiente');
    if (pending.length) {
      const p = resolvedPatch(userId, { tipo: 'excluir' });
      await db.update('review_items', { id: pending.map((x) => x.id) }, p);
      next = { ...next, items: next.items.map((it) => (pending.includes(it) ? { ...it, ...p } : it)) };
    }
  }
  if ('identifier' in dbPatch || 'excluded' in dbPatch) next = await syncDuplicateItems(db, next, userId);
  return syncResults(db, next);
}

export type Resolution =
  | { type: 'respuesta'; value: string }
  | { type: 'identificador'; value: string }
  | { type: 'modelo'; value: string }
  | { type: 'aceptar' }
  | { type: 'excluir' };

/** Resuelve una incidencia de la cola de revisión. */
export async function resolveItem(db: Db, data: ExamData, userId: string, itemId: string, res: Resolution): Promise<ExamData> {
  const item = data.items.find((it) => it.id === itemId);
  if (!item) throw new Error('Incidencia no encontrada');
  const sheet = data.sheets.find((s) => s.id === item.sheet_id);
  if (!sheet) throw new Error('Hoja no encontrada');
  let next = data;
  const motivo = `revisión: ${item.kind}`;
  let related: string[] = [item.id];

  if (res.type === 'respuesta') {
    if (item.question == null) throw new Error('Esta incidencia no es de una pregunta');
    next = await correctSheet(db, next, userId, sheet.id, { answers: { [String(item.question)]: res.value } }, motivo);
  } else if (res.type === 'identificador') {
    const value = res.value.trim();
    if (!/^\d+$/.test(value)) throw new Error('El identificador solo puede contener dígitos');
    next = await correctSheet(db, next, userId, sheet.id, { identifier: value }, motivo);
    // corregir el identificador resuelve todas las incidencias de identificador de la hoja
    related = next.items
      .filter((it) => it.sheet_id === sheet.id && it.status === 'pendiente' && (it.id === item.id || (['id_dudoso', 'id_no_en_lista'].includes(it.kind) && it.detail.leido !== value)))
      .map((it) => it.id);
    const roster = new Set(next.students.map((s) => s.identifier));
    if (roster.size && !roster.has(value) && !next.items.some((it) => it.sheet_id === sheet.id && it.kind === 'id_no_en_lista' && it.detail.leido === value)) {
      const created = await db.insert<ReviewItem>('review_items', { exam_id: data.exam.id, sheet_id: sheet.id, kind: 'id_no_en_lista', question: null, detail: { leido: value } });
      next = { ...next, items: [...next.items, ...created] };
    }
  } else if (res.type === 'modelo') {
    next = await correctSheet(db, next, userId, sheet.id, { model: res.value }, motivo);
  } else if (res.type === 'excluir') {
    next = await correctSheet(db, next, userId, sheet.id, { excluded: true, excluded_reason: `Excluida en revisión (${item.kind})` }, motivo);
    related = [];
  } else {
    await logAudit(db, data.exam.org_id, data.exam.id, 'incidencia_resuelta', { hoja: sheet.seq, identificador: sheet.identifier, tipo: item.kind, pregunta: item.question, decision: 'aceptar la lectura' });
  }

  const pending = next.items.filter((it) => related.includes(it.id) && it.status === 'pendiente');
  if (pending.length) {
    const p = resolvedPatch(userId, { tipo: res.type, valor: 'value' in res ? res.value : undefined });
    await db.update('review_items', { id: pending.map((x) => x.id) }, p);
    next = { ...next, items: next.items.map((it) => (pending.some((x) => x.id === it.id) ? { ...it, ...p } : it)) };
  }
  // si el identificador corregido coincide con el de otra hoja, vuelve a la cola como duplicado
  if (res.type === 'identificador') next = await syncDuplicateItems(db, next, userId);
  return next;
}

// ---------------------------------------------------------------------------
// Alumnos
// ---------------------------------------------------------------------------
export type StudentRow = Pick<Student, 'identifier' | 'last_name' | 'first_name' | 'email' | 'group_name'>;

export async function importStudents(db: Db, data: ExamData, userId: string, rows: StudentRow[], replace: boolean): Promise<ExamData> {
  const clean = new Map<string, StudentRow>();
  for (const r of rows) if (r.identifier) clean.set(r.identifier, r);
  if (replace && data.students.length) await db.remove('students', { exam_id: data.exam.id });
  if (clean.size) await db.upsert('students', [...clean.values()].map((r) => ({ ...r, exam_id: data.exam.id })), 'exam_id,identifier');
  const students = await db.select<Student>('students', { exam_id: data.exam.id }, { order: 'last_name' });
  await logAudit(db, data.exam.org_id, data.exam.id, 'alumnos_importados', { alumnos: clean.size, modo: replace ? 'sustituir' : 'añadir', total: students.length });
  return syncRosterItems(db, { ...data, students }, userId);
}

/** Crea o resuelve las incidencias "identificador que no está en la lista" según la lista actual. */
export async function syncRosterItems(db: Db, data: ExamData, userId: string): Promise<ExamData> {
  const roster = new Set(data.students.map((s) => s.identifier));
  let items = data.items;
  const pending = items.filter((it) => it.kind === 'id_no_en_lista' && it.status === 'pendiente');
  const solved = pending.filter((it) => {
    const sheet = data.sheets.find((s) => s.id === it.sheet_id);
    return !roster.size || !sheet || roster.has(sheet.identifier);
  });
  if (solved.length) {
    const p = resolvedPatch(userId, { tipo: 'auto', motivo: 'ya está en la lista' });
    await db.update('review_items', { id: solved.map((s) => s.id) }, p);
    items = items.map((it) => (solved.includes(it) ? { ...it, ...p } : it));
  }
  if (roster.size) {
    const fresh = data.sheets.filter(
      (s) => isStudentSheet(s) && isLegible(s) && !hasDoubt(s.identifier) && !roster.has(s.identifier) && !items.some((it) => it.sheet_id === s.id && it.kind === 'id_no_en_lista' && it.detail.leido === s.identifier),
    );
    if (fresh.length) {
      const created = await db.insert<ReviewItem>(
        'review_items',
        fresh.map((s) => ({ exam_id: data.exam.id, sheet_id: s.id, kind: 'id_no_en_lista', question: null, detail: { leido: s.identifier } })),
      );
      items = [...items, ...created];
    }
  }
  return { ...data, items };
}
