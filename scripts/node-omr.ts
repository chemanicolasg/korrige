/**
 * Lector OMR en Node (tests y script de demo): mismo motor que el navegador,
 * con pdf.js "legacy" y @napi-rs/canvas en lugar del Web Worker.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-ignore — build "legacy" para Node
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { ScannedPage } from '../src/omr/group';
import type { LayoutDoc } from '../src/omr/layout';
import { Gray, readPage, warpCanonical } from '../src/omr/reader';
import { grayToRgba, renderPageGray } from '../src/omr/render';

const require = createRequire(import.meta.url);
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WASM = path.join(ROOT, 'node_modules/pdfjs-dist/wasm/');

/** OpenCV.js en Node (CommonJS; en el navegador se carga con src/omr/cvLoader.ts). */
export async function loadCv(): Promise<any> {
  let cv: any = require('@techstark/opencv-js');
  if (cv instanceof Promise) cv = await cv;
  else if (!cv.Mat) await new Promise<void>((r) => (cv.onRuntimeInitialized = () => r()));
  return { cv }.cv;
}

/** Renderiza todas las páginas de un PDF a gris (150 ppp). */
export async function renderPdf(data: Uint8Array): Promise<Gray[]> {
  const task = getDocument({ data: new Uint8Array(data), wasmUrl: WASM, verbosity: 0 });
  const doc = await task.promise;
  const out: Gray[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    out.push(await renderPageGray(page, (w, h) => (doc as any).canvasFactory.create(w, h)));
    page.cleanup();
  }
  await task.destroy();
  return out;
}

function toJpeg(g: Gray, quality = 0.6): Blob {
  const { createCanvas, ImageData } = require('@napi-rs/canvas');
  const canvas = createCanvas(g.width, g.height);
  canvas.getContext('2d').putImageData(new ImageData(grayToRgba(g), g.width, g.height), 0, 0);
  return new Blob([canvas.toBuffer('image/jpeg', Math.round(quality * 100))], { type: 'image/jpeg' });
}

/** Equivalente en Node de processPdfs() del navegador. */
export async function processPdfsNode(files: { name: string; data: Uint8Array }[], layout: LayoutDoc, opts: { images?: boolean } = {}): Promise<ScannedPage[]> {
  const cv = await loadCv();
  const out: ScannedPage[] = [];
  const nHoja = layout.pages.length;
  for (let fi = 0; fi < files.length; fi++) {
    const grays = await renderPdf(files[fi].data);
    let lastHoja = nHoja;
    grays.forEach((g, i) => {
      const r = readPage(cv, g, layout, { pagina: i + 1, fallbackHojaPagina: lastHoja < nHoja ? lastHoja + 1 : 1 });
      lastHoja = r.result.hoja_pagina;
      const image = opts.images && r.result.markers ? toJpeg(warpCanonical(cv, r.gray, r.result.markers, r.layout)) : undefined;
      out.push({ read: r.result, fileIndex: fi, fileName: files[fi].name, image });
    });
  }
  return out;
}
