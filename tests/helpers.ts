import fs from 'node:fs';
import path from 'node:path';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — build "legacy" para Node
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createRequire } from 'node:module';
import { Gray } from '../src/omr/reader';
import { renderPageGray } from '../src/omr/render';

export const ROOT = path.resolve(__dirname, '..');
export const REF = path.join(ROOT, 'referencia');
const WASM = path.join(ROOT, 'node_modules/pdfjs-dist/wasm/');

/** OpenCV.js en Node (CommonJS; en el navegador se carga con src/omr/cvLoader.ts). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadCv(): Promise<any> {
  const require = createRequire(import.meta.url);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cv: any = require('@techstark/opencv-js');
  if (cv instanceof Promise) cv = await cv;
  else if (!cv.Mat) await new Promise<void>((r) => (cv.onRuntimeInitialized = () => r()));
  return { cv }.cv;
}

/** Renderiza todas las páginas de un PDF a gris (150 ppp) en Node. */
export async function renderPdf(data: Uint8Array): Promise<Gray[]> {
  const task = getDocument({ data: new Uint8Array(data), wasmUrl: WASM, verbosity: 0 });
  const doc = await task.promise;
  const out: Gray[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    out.push(await renderPageGray(page, (w, h) => (doc as any).canvasFactory.create(w, h)));
    page.cleanup();
  }
  await task.destroy();
  return out;
}

export function readFile(p: string): Uint8Array {
  return new Uint8Array(fs.readFileSync(p));
}

/** Rellena (pinta de oscuro) una burbuja en una imagen a 150 ppp sin girar. */
export function paintBubble(g: Gray, xMm: number, yMm: number, pageH = 297, rMm = 1.9, value = 40) {
  const s = g.width / 210;
  const cx = xMm * s;
  const cy = (pageH - yMm) * (g.height / pageH);
  const r = rMm * s;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) g.data[y * g.width + x] = value;
    }
  }
}

/** Gira la imagen `deg` grados alrededor del centro (fondo blanco). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rotateGray(cv: any, g: Gray, deg: number): Gray {
  const src = cv.matFromArray(g.height, g.width, cv.CV_8UC1, g.data);
  const dst = new cv.Mat();
  const M = cv.getRotationMatrix2D(new cv.Point(g.width / 2, g.height / 2), deg, 1);
  cv.warpAffine(src, dst, M, new cv.Size(g.width, g.height), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255, 255));
  const out = { data: new Uint8Array(dst.data), width: g.width, height: g.height };
  src.delete();
  dst.delete();
  M.delete();
  return out;
}
