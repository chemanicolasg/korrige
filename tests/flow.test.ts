/**
 * Test de integración del flujo completo del profesor, sin navegador:
 * crear examen → plantilla → lista → "escanear" (PDF generado) → leer → guardar →
 * revisar incidencias → recalcular → segunda tanda con duplicados → cerrar → borrar.
 * Usa la capa de datos local (la misma interfaz que Supabase).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { Db } from '../src/lib/db';
import { createLocalDb, DEMO_ORG_ID, DEMO_USER } from '../src/lib/dbLocal';
import { exportRows, toMoodleCsv } from '../src/lib/exportData';
import {
  ExamData,
  correctSheet,
  createExam,
  currentKeys,
  deleteExam,
  duplicateExam,
  duplicatesWithExisting,
  importStudents,
  isStudentSheet,
  loadExam,
  resolveItem,
  saveKey,
  saveUpload,
  setExamClosed,
  updateGrading,
  updateSheetConfig,
} from '../src/lib/service';
import { AuditEntry, KeyAnswers } from '../src/lib/types';
import { generateFilledPdf } from '../src/omr/demoScan';
import { groupPages } from '../src/omr/group';
import { DEFAULT_SHEET_CONFIG, computeLayout } from '../src/omr/layout';
import { processPdfsNode } from './helpers';

const N = 40;
const uid = DEMO_USER.id;
const letters = 'ABCD';
const keyA: KeyAnswers = Object.fromEntries(Array.from({ length: N }, (_, i) => [String(i + 1), { c: [letters[i % 4]] }]));
const keyBLetters = Array.from({ length: N }, (_, i) => letters[(i + 1) % 4]);
const allRight = (m: 'A' | 'B') => Object.fromEntries(Array.from({ length: N }, (_, i) => [String(i + 1), m === 'A' ? letters[i % 4] : keyBLetters[i]]));

let db: Db;
let data: ExamData;
const reload = async () => (data = (await loadExam(db, data.exam.id))!);
const item = (kind: string, id?: string) => data.items.find((it) => it.kind === kind && it.status === 'pendiente' && (!id || data.sheets.find((s) => s.id === it.sheet_id)?.identifier === id))!;
const gradeOf = (id: string) => data.results.find((r) => r.sheet_id === data.sheets.find((s) => s.identifier === id && isStudentSheet(s))?.id)?.grade;

beforeAll(async () => {
  db = createLocalDb({ persist: false });
});

describe('flujo completo del profesor', () => {
  it('crea el examen, ajusta la hoja y guarda la plantilla del modelo A', async () => {
    const exam = await createExam(
      db,
      DEMO_ORG_ID,
      uid,
      { title: 'Fisiología', subject: 'Fisiología I', group_name: 'M1', session: 'Enero', exam_date: '2026-11-20' },
      { ...DEFAULT_SHEET_CONFIG, nQuestions: 50, nOptions: 4, nModels: 2 },
    );
    expect(exam.code).toMatch(/^[A-Z2-9]{8}$/);
    data = (await loadExam(db, exam.id))!;
    data = await updateSheetConfig(db, data, { ...data.exam.sheet_config, nQuestions: N });
    expect(Object.keys(data.layout.pages[0].preguntas)).toHaveLength(N);
    data = await saveKey(db, data, uid, 'A', keyA);
    expect(currentKeys(data.keys).A.version).toBe(1);
    data = await importStudents(
      db,
      data,
      uid,
      ['10000001', '10000002', '10000003', '10000004', '10000005', '10000009'].map((identifier, i) => ({ identifier, last_name: `Apellido${i}`, first_name: 'Nombre', email: `a${i}@uni.es`, group_name: 'M1' })),
      true,
    );
    expect(data.students).toHaveLength(6);
  });

  it('lee el PDF escaneado, excluye hojas ajenas y guarda todo con sus incidencias', async () => {
    const pdf = await generateFilledPdf(data.layout, [
      { identifier: '', model: 'B', answers: Object.fromEntries(keyBLetters.map((l, i) => [String(i + 1), i === 9 ? 'CD' : l])), isKey: true }, // plantilla B (P10 con 2 correctas)
      { identifier: '10000001', model: 'A', answers: allRight('A') }, // 10
      { identifier: '10000002', model: 'B', answers: { ...allRight('B'), '1': 'A', '2': '' }, upsideDown: true }, // 1 error, 1 blanco, al revés
      { identifier: '10000003', model: 'A', answers: { ...allRight('A'), '3': 'AB' } }, // doble marca
      { identifier: '10000004', model: 'A', answers: { ...allRight('A'), '5': '' }, weak: { '5': 'A' } }, // marca floja
      { identifier: '1000000?', model: 'A', answers: allRight('A') }, // identificador incompleto
      { identifier: '77777777', model: 'A', answers: allRight('A') }, // no está en la lista
      { identifier: '10000009', model: '', answers: allRight('A') }, // sin modelo
      { identifier: '', model: '', answers: {} }, // hoja en blanco
    ]);
    const other = await generateFilledPdf(computeLayout('OTROEXAM', data.exam.sheet_config), [{ identifier: '10000001', model: 'A', answers: {} }]);
    const pages = await processPdfsNode(
      [
        { name: 'grupo-m1.pdf', data: pdf },
        { name: 'otro.pdf', data: other },
      ],
      data.layout,
      { images: true },
    );
    expect(pages).toHaveLength(10);
    const { submissions, excluded } = groupPages(pages, data.layout, data.exam.code);
    expect(excluded.map((e) => e.reason)).toEqual(['Hoja de otro examen (OTROEXAM)']);
    expect(submissions).toHaveLength(9);
    expect(submissions[0].isKey).toBe(true);
    expect(submissions[2].incidents).toContain('Hoja escaneada al revés (corregido)');

    data = await saveUpload(db, data, uid, { submissions, excluded, duplicatePolicy: 'conservar' });
    await reload();
    expect(data.exam.status).toBe('con_resultados');
    expect(data.sheets).toHaveLength(9);
    expect(data.sheets.every((s) => s.pages[0].image_path?.startsWith(`${data.exam.org_id}/${data.exam.id}/`))).toBe(true);
    expect(await db.imageUrl(data.sheets[1].pages[0].image_path!)).toBeTruthy();

    // plantilla B detectada en el PDF (burbuja P), con dos respuestas válidas en la 10
    const kb = currentKeys(data.keys).B;
    expect(kb.source).toBe('escaneo');
    expect(kb.answers['10'].c).toEqual(['C', 'D']);
    expect(kb.answers['1'].c).toEqual([keyBLetters[0]]);

    expect(data.items.map((i) => `${i.kind}${i.question ? ':' + i.question : ''}`).sort()).toEqual(['doble:3', 'en_blanco', 'floja:5', 'id_dudoso', 'id_no_en_lista', 'modelo']);
    expect(gradeOf('10000001')).toBe(10);
    expect(gradeOf('10000002')).toBe(9.5); // 38/40
    expect(gradeOf('10000003')).toBe(9.75); // la doble marca cuenta como en blanco hasta revisarla
    expect(gradeOf('10000009')).toBeUndefined(); // sin modelo no se puede corregir
  });

  it('revisión: cada corrección recalcula la nota y queda registrada', async () => {
    data = await resolveItem(db, data, uid, item('doble').id, { type: 'respuesta', value: 'C' }); // P3 del A es C
    expect(gradeOf('10000003')).toBe(10);
    data = await resolveItem(db, data, uid, item('floja').id, { type: 'respuesta', value: '*' }); // nula: cuenta como error
    expect(gradeOf('10000004')).toBe(9.75);
    data = await resolveItem(db, data, uid, item('id_dudoso').id, { type: 'identificador', value: '10000005' });
    expect(gradeOf('10000005')).toBe(10);
    data = await resolveItem(db, data, uid, item('modelo').id, { type: 'modelo', value: 'A' });
    expect(gradeOf('10000009')).toBe(10);
    data = await resolveItem(db, data, uid, item('en_blanco').id, { type: 'excluir' });
    data = await resolveItem(db, data, uid, item('id_no_en_lista').id, { type: 'aceptar' });
    expect(data.items.filter((i) => i.status === 'pendiente')).toHaveLength(0);
    expect(data.sheets.filter((s) => s.excluded)).toHaveLength(1);
    expect(data.results).toHaveLength(7);

    await reload(); // lo guardado coincide con lo calculado en memoria
    expect(data.results).toHaveLength(7);
    const log = await db.select<AuditEntry>('audit_log', { exam_id: data.exam.id, action: 'correccion_manual' });
    expect(log).toHaveLength(5);
    expect(log[0]).toMatchObject({ user_email: DEMO_USER.email, details: { cambios: [{ campo: 'respuesta', pregunta: 3, antes: '', ahora: 'C' }] } });
  });

  it('cambiar la fórmula o la plantilla recalcula todas las notas al instante', async () => {
    data = await updateGrading(db, data, { ...data.exam.grading_config, formula: 'classic' });
    expect(gradeOf('10000002')).toBe(9.42); // (38 − 1/3) / 40 · 10
    expect(gradeOf('10000004')).toBe(9.67); // (39 − 1/3) / 40 · 10
    // se anula la pregunta 5 del modelo A: deja de contar el error de 10000004
    data = await saveKey(db, data, uid, 'A', { ...keyA, '5': { c: ['A'], v: true } });
    expect(currentKeys(data.keys).A.version).toBe(2);
    expect(gradeOf('10000004')).toBe(10);
    expect(data.results.find((r) => r.sheet_id === data.sheets.find((s) => s.identifier === '10000004')!.id)).toMatchObject({ key_version: 2, n_void: 1 });
    const audit = await db.select<AuditEntry>('audit_log', { exam_id: data.exam.id });
    const actions = audit.map((a) => a.action);
    for (const a of ['examen_creado', 'hoja_configurada', 'plantilla_modificada', 'alumnos_importados', 'subida_pdf', 'correccion_manual', 'recalculo', 'correccion_configurada']) {
      expect(actions).toContain(a);
    }
  });

  it('segunda tanda: detecta identificadores duplicados y aplica la decisión del profesor', async () => {
    const pdf = await generateFilledPdf(data.layout, [
      { identifier: '10000001', model: 'A', answers: { ...allRight('A'), '1': 'B' } }, // repetido
      { identifier: '10000002', model: 'A', answers: allRight('A') }, // repetido
    ]);
    const { submissions, excluded } = groupPages(await processPdfsNode([{ name: 'grupo-m2.pdf', data: pdf }], data.layout), data.layout, data.exam.code);
    expect(duplicatesWithExisting(data, submissions).sort()).toEqual(['10000001', '10000002']);
    const before = data;
    // "conservar ambas" → van a revisión las cuatro hojas
    data = await saveUpload(db, before, uid, { submissions, excluded, duplicatePolicy: 'conservar' });
    expect(data.items.filter((i) => i.kind === 'id_duplicado' && i.status === 'pendiente')).toHaveLength(4);
    // corregir el identificador de una hoja deshace su duplicado
    const dup = data.sheets.filter((s) => s.identifier === '10000002' && isStudentSheet(s))[1];
    data = await correctSheet(db, data, uid, dup.id, { identifier: '10000006' });
    expect(data.items.filter((i) => i.kind === 'id_duplicado' && i.status === 'pendiente')).toHaveLength(2);
    // excluir una de las dos hojas restantes resuelve el otro duplicado
    data = await resolveItem(db, data, uid, item('id_duplicado').id, { type: 'excluir' });
    expect(data.items.filter((i) => i.status === 'pendiente')).toHaveLength(0);
    expect(data.sheets.filter((s) => s.identifier === '10000001' && isStudentSheet(s))).toHaveLength(1);
  });

  it('exporta notas (Excel y CSV de Moodle)', () => {
    const rows = exportRows(data);
    expect(rows).toHaveLength(data.results.length);
    const first = rows.find((r) => r.identifier === '10000003')!;
    expect(first).toMatchObject({ last_name: 'Apellido2', model: 'A', n_correct: 39, grade: 10 });
    const csv = toMoodleCsv(data);
    const lines = csv.trim().split('\r\n');
    expect(lines[0]).toBe('﻿"Número de ID","Dirección de correo","Apellido(s)","Nombre","Fisiología"');
    expect(lines).toContain('"10000003","a2@uni.es","Apellido2","Nombre",10');
  });

  it('examen cerrado: solo lectura hasta reabrirlo; duplicar y borrar', async () => {
    data = await setExamClosed(db, data, true);
    expect(data.exam.status).toBe('cerrado');
    await expect(correctSheet(db, data, uid, data.sheets[1].id, { answers: { '1': 'D' } })).rejects.toThrow(/cerrado/);
    await expect(saveKey(db, data, uid, 'A', keyA)).rejects.toThrow(/cerrado/);
    data = await setExamClosed(db, data, false);
    expect(data.exam.status).toBe('con_resultados');
    await expect(updateSheetConfig(db, data, { ...data.exam.sheet_config, nQuestions: 20 })).rejects.toThrow(/bloqueada/);

    const copy = await duplicateExam(db, data, uid);
    const copyData = (await loadExam(db, copy.id))!;
    expect(copyData.exam.code).not.toBe(data.exam.code);
    expect(copyData.sheets).toHaveLength(0);
    expect(Object.keys(currentKeys(copyData.keys))).toEqual(['A', 'B']);
    expect(copyData.layout.pages[0].qr_text).toBe(`UICOMR|${copy.code}|v1`);

    const img = data.sheets[1].pages[0].image_path!;
    await deleteExam(db, data);
    expect(await loadExam(db, data.exam.id)).toBeNull();
    expect(await db.select('sheets', { exam_id: data.exam.id })).toHaveLength(0);
    expect(await db.imageUrl(img)).toBeNull();
    const audit = await db.select<AuditEntry>('audit_log', { action: 'examen_eliminado' });
    expect(audit).toHaveLength(1);
  });
});
