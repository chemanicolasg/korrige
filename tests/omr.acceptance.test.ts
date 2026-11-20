/**
 * Test de aceptación del motor OMR (apartado 2 del encargo).
 * Compara la lectura en TypeScript del escaneo real de la Xerox con el JSON
 * que produce referencia/lector.py (referencia/salida_referencia.json).
 */
import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { PageLayout, wrapReferenceLayout } from '../src/omr/layout';
import { Gray, INC_AL_REVES, PageRead, readPage } from '../src/omr/reader';
import { REF, loadCv, readFile, renderPdf, rotateGray } from './helpers';

const refLayout: PageLayout = JSON.parse(fs.readFileSync(path.join(REF, 'hoja_respuestas_prueba_layout.json'), 'utf8'));
const refOut: PageRead[] = JSON.parse(fs.readFileSync(path.join(REF, 'salida_referencia.json'), 'utf8'));
const doc = wrapReferenceLayout(refLayout);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cv: any;
let pages: Gray[];
let reads: PageRead[];

beforeAll(async () => {
  cv = await loadCv();
  pages = await renderPdf(readFile(path.join(REF, 'escaneo_prueba_xerox.pdf')));
  reads = pages.map((g, i) => readPage(cv, g, doc, { pagina: i + 1 }).result);
});

const marcadas = (r: PageRead) => Object.values(r.respuestas!).filter(Boolean).length;
const blancas = (r: PageRead, hasta = 30) =>
  Object.entries(r.respuestas!)
    .filter(([q, v]) => Number(q) <= hasta && v === '')
    .map(([q]) => Number(q));

describe('aceptación: escaneo real de la Xerox', () => {
  it('lee las 4 páginas', () => {
    expect(pages).toHaveLength(4);
  });

  it('tabla de aceptación', () => {
    const QR = 'UICOMR|PRUEBA-01|v1';
    expect(reads.map((r) => r.qr)).toEqual([QR, QR, QR, QR]);
    expect(reads.map((r) => r.nia)).toEqual(['12456790', '23578900', '35678900', '????????']);
    expect(reads.map((r) => r.modelo)).toEqual(['A', 'B', 'C', null]);
    expect(reads.map(marcadas)).toEqual([29, 27, 14, 0]);
    expect(blancas(reads[0])).toEqual([24]);
    expect(blancas(reads[1])).toEqual([2, 18, 26]);
    expect(blancas(reads[2])).toEqual([1, 5, 8, 10, 13, 15, 16, 17, 19, 20, 21, 22, 23, 24, 25, 26]);
    expect(reads[3].en_blanco_total).toBe(true);
    expect(reads.slice(0, 3).every((r) => r.en_blanco_total === false)).toBe(true);
  });

  it('respuestas de la página 1 (preguntas 1–30)', () => {
    const esperado = '1B 2C 3D 4E 5B 6B 7C 8D 9C 10B 11D 12B 13C 14E 15A 16B 17C 18D 19E 20E 21E 22E 23D 24– 25E 26C 27D 28D 29C 30C';
    const leido = Array.from({ length: 30 }, (_, i) => `${i + 1}${reads[0].respuestas![String(i + 1)] || '–'}`).join(' ');
    expect(leido).toBe(esperado);
  });

  it('coincide con el JSON completo de lector.py', () => {
    reads.forEach((r, i) => {
      const ref = refOut[i];
      expect(r.pagina).toBe(ref.pagina);
      expect(r.qr).toBe(ref.qr);
      expect(r.nia).toBe(ref.nia);
      expect(r.modelo).toBe(ref.modelo);
      expect(r.es_plantilla).toBe(ref.es_plantilla);
      expect(r.respuestas).toEqual(ref.respuestas);
      expect(r.revisar).toEqual(ref.revisar);
      expect(r.incidencias).toEqual(ref.incidencias);
      expect(r.en_blanco_total).toBe(ref.en_blanco_total);
      // Scores brutos: el rasterizador (pdf.js) no es el de la referencia (poppler),
      // así que se admite una pequeña tolerancia; las decisiones deben ser idénticas.
      let maxDiff = 0;
      for (const [q, sc] of Object.entries(ref.scores!)) {
        sc.forEach((s, j) => (maxDiff = Math.max(maxDiff, Math.abs(s - r.scores![q][j]))));
      }
      expect(maxDiff).toBeLessThanOrEqual(0.12);
    });
  });

  it('separación clara entre burbujas vacías y marcadas', () => {
    for (const r of reads) {
      for (const sc of Object.values(r.scores!)) for (const s of sc) expect(s < 0.2 || s > 0.4).toBe(true);
    }
  });

  it('página 1 girada 180° e inclinada 2°: mismas respuestas + incidencia', () => {
    const girada = rotateGray(cv, pages[0], 182);
    const r = readPage(cv, girada, doc, { pagina: 1 }).result;
    expect(r.incidencias).toContain(INC_AL_REVES);
    expect(r.girada).toBe(true);
    expect(r.qr).toBe('UICOMR|PRUEBA-01|v1');
    expect(r.nia).toBe('12456790');
    expect(r.modelo).toBe('A');
    expect(r.respuestas).toEqual(reads[0].respuestas);
    expect(r.revisar).toEqual({});
  });

  it('una página sin marcas de esquina se declara ilegible', () => {
    const blanca: Gray = { data: new Uint8Array(1241 * 1754).fill(255), width: 1241, height: 1754 };
    const r = readPage(cv, blanca, doc, { pagina: 9 }).result;
    expect(r.legible).toBe(false);
    expect(r.incidencias).toEqual(['No se encuentran las 4 marcas de esquina']);
  });
});
