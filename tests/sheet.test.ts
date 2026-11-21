/**
 * Generador de hoja: el layout calculado coincide con el de referencia y la
 * hoja generada con pdf-lib se lee correctamente con el lector (ida y vuelta).
 */
import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_FIELDS, DEFAULT_SHEET_CONFIG, PageLayout, computeLayout, parseQr } from '../src/omr/layout';
import { readPage } from '../src/omr/reader';
import { generateSheetCopiesPdf, generateSheetPdf } from '../src/omr/sheetPdf';
import { REF, loadCv, paintBubble, renderPdf, rotateGray } from './helpers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cv: any;
beforeAll(async () => {
  cv = await loadCv();
});

describe('layout', () => {
  it('reproduce exactamente el layout de referencia (100 preguntas, A–E, 4 modelos, NIA de 8)', () => {
    const ref: PageLayout = JSON.parse(fs.readFileSync(path.join(REF, 'hoja_respuestas_prueba_layout.json'), 'utf8'));
    const lay = computeLayout('PRUEBA-01', { ...DEFAULT_SHEET_CONFIG, nModels: 4 }, { keyBubble: true }).pages[0];
    for (const k of ['exam_id', 'page_mm', 'markers', 'nia', 'modelo', 'plantilla', 'preguntas', 'radius_mm', 'opciones', 'qr'] as const) {
      // la referencia arrastra ruido de coma flotante (24.200000000000017): se compara a 1e-6
      expect(JSON.parse(JSON.stringify(ref[k], (_, v) => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v))), k).toEqual(lay[k]);
    }
    expect(lay.qr_text).toBe('UICOMR|PRUEBA-01|v1');
  });

  it('configurable: opciones, modelos, dígitos y 2 páginas', () => {
    const doc = computeLayout('ABC123', { ...DEFAULT_SHEET_CONFIG, nQuestions: 130, nOptions: 4, nModels: 2, idDigits: 10, idLabel: 'DNI' });
    expect(doc.pages).toHaveLength(2);
    expect(Object.keys(doc.pages[0].preguntas)).toHaveLength(100);
    expect(Object.keys(doc.pages[1].preguntas)).toEqual(Array.from({ length: 30 }, (_, i) => String(101 + i)));
    expect(doc.pages[0].opciones).toBe('ABCD');
    expect(Object.keys(doc.pages[0].modelo)).toEqual(['A', 'B']);
    expect(doc.pages[0].nia).toHaveLength(10);
    expect(doc.pages[1].qr_text).toBe('UICOMR|ABC123|v1|p2');
    expect(parseQr(doc.pages[1].qr_text)).toEqual({ prefix: 'UICOMR', code: 'ABC123', version: 'v1', page: 2 });
    // nada se sale de la zona útil ni pisa el bloque de modelo
    const maxNiaX = Math.max(...doc.pages[0].nia.map((c) => c[0][0]));
    expect(maxNiaX + 2.6).toBeLessThan(doc.pages[0].modelo.A[0] - 2.1);
    const one = computeLayout('X', { ...DEFAULT_SHEET_CONFIG, nQuestions: 10, nModels: 1 });
    expect(one.pages).toHaveLength(1);
    expect(one.pages[0].modelo).toEqual({});
    expect(parseQr('otra cosa')).toBeNull();
  });

  it('respeta los límites (10–200 preguntas, 3–5 opciones, 1–4 modelos, 6–10 dígitos)', () => {
    const doc = computeLayout('X', { ...DEFAULT_SHEET_CONFIG, nQuestions: 999, nOptions: 9, nModels: 0, idDigits: 2 });
    expect(doc.config).toMatchObject({ nQuestions: 200, nOptions: 5, nModels: 1, idDigits: 6 });
  });
});

describe('hoja generada → lector (ida y vuelta)', () => {
  it('hoja de 100 preguntas: en blanco, y con marcas sintéticas girada 180°', async () => {
    const doc = computeLayout('K7F3Q9XZ', { ...DEFAULT_SHEET_CONFIG, nModels: 4, title: 'Facultad de Medicina', subtitle: 'Anatomía I · Enero' });
    const pdf = await generateSheetPdf(doc);
    const [g] = await renderPdf(pdf);
    const blank = readPage(cv, g, doc, { pagina: 1 }).result;
    expect(blank.qr).toBe('UICOMR|K7F3Q9XZ|v1');
    expect(blank.en_blanco_total).toBe(true);
    expect(blank.girada).toBe(false);
    expect(Math.max(...Object.values(blank.scores!).flat())).toBeLessThan(0.2);

    const lay = doc.pages[0];
    const nia = '20241234';
    [...nia].forEach((d, col) => paintBubble(g, ...lay.nia[col][Number(d)]));
    paintBubble(g, ...lay.modelo.C);
    const answers: Record<string, string> = {};
    for (let q = 1; q <= 100; q++) {
      if (q % 7 === 0) continue; // en blanco
      const o = 'ABCDE'[q % 5];
      answers[String(q)] = o;
      paintBubble(g, ...lay.preguntas[String(q)][o]);
    }
    paintBubble(g, ...lay.preguntas['7'].A);
    paintBubble(g, ...lay.preguntas['7'].B); // doble marca
    paintBubble(g, ...lay.preguntas['14'].D, 297, 0.85); // marca floja (≈ 30 % de relleno)

    for (const img of [g, rotateGray(cv, g, 181.5)]) {
      const r = readPage(cv, img, doc, { pagina: 1 }).result;
      expect(r.nia).toBe(nia);
      expect(r.modelo).toBe('C');
      expect(r.es_plantilla).toBe(false);
      for (let q = 1; q <= 100; q++) expect(r.respuestas![String(q)], `pregunta ${q}`).toBe(answers[String(q)] ?? '');
      expect(r.revisar).toEqual({ '7': 'doble: AB', '14': 'floja: D' });
    }
  });

  it('las hojas nuevas no llevan la burbuja de plantilla (se introduce en la plataforma)', async () => {
    const doc = computeLayout('SINPLANT', { ...DEFAULT_SHEET_CONFIG, nQuestions: 40, nOptions: 4, nModels: 2 });
    expect(doc.pages[0].plantilla).toBeNull();
    const pages = await renderPdf(await generateSheetPdf(doc));
    // donde iba la burbuja «P» ya no hay nada impreso que el lector pueda tomar por una marca
    const r = readPage(cv, pages[0], doc, { pagina: 1 }).result;
    expect(r.es_plantilla).toBe(false);
    expect(r.qr).toBe('UICOMR|SINPLANT|v1');
  });

  it('la hoja en catalán o en inglés se lee igual: solo cambian los textos impresos', async () => {
    for (const lang of ['ca', 'en'] as const) {
      const doc = computeLayout(`IDIOMA${lang.toUpperCase()}`, { ...DEFAULT_SHEET_CONFIG, nQuestions: 60, nOptions: 4, nModels: 2, lang });
      expect(doc.config.lang).toBe(lang);
      // misma geometría que en castellano
      const es = computeLayout(`IDIOMA${lang.toUpperCase()}`, { ...DEFAULT_SHEET_CONFIG, nQuestions: 60, nOptions: 4, nModels: 2 });
      expect(doc.pages[0].preguntas).toEqual(es.pages[0].preguntas);
      expect(doc.pages[0].nia).toEqual(es.pages[0].nia);
      const pages = await renderPdf(await generateSheetPdf(doc));
      paintBubble(pages[0], ...doc.pages[0].preguntas['7'].C);
      paintBubble(pages[0], ...doc.pages[0].modelo.B);
      const r = readPage(cv, pages[0], doc, { pagina: 1 }).result;
      expect(r.modelo).toBe('B');
      expect(r.respuestas!['7']).toBe('C');
      // ningún texto traducido cae sobre una burbuja: el resto de preguntas sigue en blanco
      expect(Object.entries(r.respuestas!).filter(([q, v]) => q !== '7' && v !== '').length).toBe(0);
      expect(r.nia).toBe('????????');
    }
  });

  it('hoja de 2 páginas con 3 opciones y un solo modelo; plantilla marcada', async () => {
    const doc = computeLayout('DOSPAG01', { ...DEFAULT_SHEET_CONFIG, nQuestions: 150, nOptions: 3, nModels: 1, idDigits: 6 }, { keyBubble: true }); // hoja antigua, con burbuja «P»
    const pages = await renderPdf(await generateSheetPdf(doc));
    expect(pages).toHaveLength(2);
    paintBubble(pages[1], ...doc.pages[1].preguntas['150'].C);
    paintBubble(pages[1], ...doc.pages[1].plantilla!);
    const r1 = readPage(cv, pages[0], doc, { pagina: 1 }).result;
    const r2 = readPage(cv, pages[1], doc, { pagina: 2 }).result;
    expect(r1.qr).toBe('UICOMR|DOSPAG01|v1|p1');
    expect(r1.hoja_pagina).toBe(1);
    expect(r1.modelo).toBe('A');
    expect(Object.keys(r1.respuestas!)).toHaveLength(100);
    expect(r2.qr).toBe('UICOMR|DOSPAG01|v1|p2');
    expect(r2.hoja_pagina).toBe(2);
    expect(Object.keys(r2.respuestas!)).toHaveLength(50);
    expect(r2.respuestas!['150']).toBe('C');
    expect(r2.es_plantilla).toBe(true);
    expect(r2.nia).toBe('??????');
  });

  it('hoja personalizada (logotipo oscuro, campos y nota): la lectura no cambia, tampoco girada', async () => {
    // el peor logotipo posible para el lector: un cuadrado negro macizo, parecido a una marca de esquina
    const { createCanvas } = await import('@napi-rs/canvas');
    const c = createCanvas(200, 200);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 200, 200);
    const logo = `data:image/png;base64,${c.toBuffer('image/png').toString('base64')}`;
    const doc = computeLayout('LOGO0001', { ...DEFAULT_SHEET_CONFIG, nQuestions: 60, nOptions: 4, nModels: 2, logo, fields: ['Nombre', 'Grupo', 'DNI'], note: 'Duración: 90 min · Cada error resta 1/3', title: 'Facultad de Ciencias de la Salud y de la Vida' });
    expect(doc.config.logo).toBe(logo);
    expect(doc.config.fields).toEqual(['Nombre', 'Grupo', 'DNI']);
    // la geometría de lectura es idéntica a la de la hoja sin personalizar
    const plain = computeLayout('LOGO0001', { ...DEFAULT_SHEET_CONFIG, nQuestions: 60, nOptions: 4, nModels: 2 });
    expect(doc.pages[0].preguntas).toEqual(plain.pages[0].preguntas);
    expect(doc.pages[0].markers).toEqual(plain.pages[0].markers);

    const [g] = await renderPdf(await generateSheetPdf(doc));
    const lay = doc.pages[0];
    [...'87654321'].forEach((d, col) => paintBubble(g, ...lay.nia[col][Number(d)]));
    paintBubble(g, ...lay.modelo.B);
    for (let q = 1; q <= 60; q++) paintBubble(g, ...lay.preguntas[String(q)]['ABCD'[q % 4]]);
    for (const img of [g, rotateGray(cv, g, 181)]) {
      const r = readPage(cv, img, doc, { pagina: 1 }).result;
      expect(r.qr).toBe('UICOMR|LOGO0001|v1');
      expect(r.nia).toBe('87654321');
      expect(r.modelo).toBe('B');
      expect(r.revisar).toEqual({});
      for (let q = 1; q <= 60; q++) expect(r.respuestas![String(q)], `pregunta ${q}`).toBe('ABCD'[q % 4]);
    }
    // datos no válidos se descartan sin romper la hoja
    expect(computeLayout('X', { ...DEFAULT_SHEET_CONFIG, logo: 'javascript:alert(1)', fields: DEFAULT_FIELDS, note: '  ' }).config).not.toHaveProperty('logo');
    expect(computeLayout('X', { ...DEFAULT_SHEET_CONFIG, fields: DEFAULT_FIELDS }).config).not.toHaveProperty('fields');
  });

  it('N copias en un solo PDF', async () => {
    const doc = computeLayout('COPIAS01', { ...DEFAULT_SHEET_CONFIG, nQuestions: 20 });
    const pdf = await generateSheetCopiesPdf(doc, 3);
    const pages = await renderPdf(pdf);
    expect(pages).toHaveLength(3);
    expect(readPage(cv, pages[2], doc, { pagina: 3 }).result.qr).toBe('UICOMR|COPIAS01|v1');
  });
});
