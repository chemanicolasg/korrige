/**
 * Web Worker de lectura: pdf.js (render a 150 ppp) + OpenCV.js + jsQR.
 * Todo el procesado ocurre en el ordenador del profesor; al hilo principal
 * solo llegan los resultados y un JPEG enderezado de cada hoja.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as pdfjs from 'pdfjs-dist';
import * as pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs';
import type { LayoutDoc } from './layout';
import { CANON_PX_MM, Gray, PageRead, loadCv, readPage, warpCanonical } from './reader';
import { grayToRgba, renderPageGray } from './render';

export interface ProcessRequest {
  type: 'process';
  id: number;
  files: { name: string; data: ArrayBuffer }[];
  layout: LayoutDoc;
  /** Calidad JPEG (0–1) de la imagen enderezada; 0 = no generar imágenes. */
  jpegQuality: number;
}
export interface CancelRequest {
  type: 'cancel';
  id: number;
}
export type WorkerOut =
  | { src: 'korrige-omr'; type: 'progress'; id: number; phase: 'motor' | 'pdf' | 'hoja'; done: number; total: number; fileName?: string }
  | { src: 'korrige-omr'; type: 'page'; id: number; fileIndex: number; fileName: string; read: PageRead; jpeg: ArrayBuffer | null; done: number; total: number }
  | { src: 'korrige-omr'; type: 'done'; id: number; total: number }
  | { src: 'korrige-omr'; type: 'error'; id: number; message: string };

// pdf.js dentro de un worker: se usa su manejador en este mismo hilo (sin worker anidado)
(globalThis as any).pdfjsWorker = pdfjsWorker;

class OffscreenCanvasFactory {
  constructor(_opts?: unknown) {}
  create(width: number, height: number) {
    const canvas = new OffscreenCanvas(width, height);
    return { canvas, context: canvas.getContext('2d', { willReadFrequently: true }) };
  }
  getNoAlphaContext(canvas: OffscreenCanvas) {
    return canvas.getContext('2d', { alpha: false, willReadFrequently: true });
  }
  reset(cc: any, width: number, height: number) {
    cc.canvas.width = width;
    cc.canvas.height = height;
  }
  destroy(cc: any) {
    cc.canvas.width = 0;
    cc.canvas.height = 0;
    cc.canvas = null;
    cc.context = null;
  }
}

/** Los escaneos son imágenes: no hacen falta filtros SVG (que requieren DOM). */
class NoFilterFactory {
  constructor(_opts?: unknown) {}
  addFilter() {
    return 'none';
  }
  addHCMFilter() {
    return 'none';
  }
  addAlphaFilter() {
    return 'none';
  }
  addLuminosityFilter() {
    return 'none';
  }
  addHighlightHCMFilter() {
    return 'none';
  }
  destroy() {}
}

const cancelled = new Set<number>();
const post = (msg: WorkerOut, transfer: Transferable[] = []) => (self as any).postMessage(msg, transfer);
// decodificadores wasm de pdf.js (JBIG2, JPEG 2000…): vite.config.ts los copia a /pdfjs-wasm/
const wasmUrl = new URL('/pdfjs-wasm/', self.location.origin).href;

async function toJpeg(g: Gray, quality: number): Promise<ArrayBuffer> {
  const canvas = new OffscreenCanvas(g.width, g.height);
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(new ImageData(grayToRgba(g) as any, g.width, g.height), 0, 0);
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
  return blob.arrayBuffer();
}

/** Página sin marcas de esquina: se guarda tal cual, reducida al tamaño canónico. */
function shrink(cv: any, g: Gray, layout: LayoutDoc): Gray {
  const [wmm, hmm] = layout.pages[0].page_mm;
  const src = cv.matFromArray(g.height, g.width, cv.CV_8UC1, g.data);
  const dst = new cv.Mat();
  cv.resize(src, dst, new cv.Size(Math.round(wmm * CANON_PX_MM), Math.round(hmm * CANON_PX_MM)), 0, 0, cv.INTER_AREA);
  const out = { data: new Uint8Array(dst.data), width: dst.cols, height: dst.rows };
  src.delete();
  dst.delete();
  return out;
}

async function process(req: ProcessRequest) {
  const { id, layout } = req;
  post({ src: 'korrige-omr', type: 'progress', id, phase: 'motor', done: 0, total: 0 });
  const cv = await loadCv();

  // 1) abrir todos los PDF para conocer el total de páginas
  const docs: { name: string; task: any; doc: any }[] = [];
  let total = 0;
  for (const f of req.files) {
    post({ src: 'korrige-omr', type: 'progress', id, phase: 'pdf', done: 0, total: 0, fileName: f.name });
    const task = pdfjs.getDocument({
      data: new Uint8Array(f.data),
      CanvasFactory: OffscreenCanvasFactory,
      FilterFactory: NoFilterFactory,
      wasmUrl,
      useWorkerFetch: false,
      isOffscreenCanvasSupported: true,
      disableFontFace: true,
      useSystemFonts: false,
      verbosity: 0,
    } as any);
    const doc = await task.promise;
    docs.push({ name: f.name, task, doc });
    total += doc.numPages;
  }

  // 2) leer página a página
  let done = 0;
  const nHoja = layout.pages.length;
  for (let fi = 0; fi < docs.length; fi++) {
    const { name, doc, task } = docs[fi];
    let lastHoja = nHoja;
    for (let p = 1; p <= doc.numPages; p++) {
      if (cancelled.has(id)) break;
      const page = await doc.getPage(p);
      const gray = await renderPageGray(page, (w, h) => new OffscreenCanvasFactory().create(w, h));
      page.cleanup();
      const fallback = lastHoja < nHoja ? lastHoja + 1 : 1;
      const out = readPage(cv, gray, layout, { pagina: p, fallbackHojaPagina: fallback });
      lastHoja = out.result.hoja_pagina;
      let jpeg: ArrayBuffer | null = null;
      if (req.jpegQuality > 0) {
        const img = out.result.markers ? warpCanonical(cv, out.gray, out.result.markers, out.layout) : shrink(cv, out.gray, layout);
        jpeg = await toJpeg(img, req.jpegQuality);
      }
      done++;
      post({ src: 'korrige-omr', type: 'page', id, fileIndex: fi, fileName: name, read: out.result, jpeg, done, total }, jpeg ? [jpeg] : []);
    }
    await task.destroy();
  }
  cancelled.delete(id);
  post({ src: 'korrige-omr', type: 'done', id, total: done });
}

self.addEventListener('message', (ev: MessageEvent) => {
  const msg = ev.data as ProcessRequest | CancelRequest;
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'cancel') cancelled.add(msg.id);
  if (msg.type === 'process') {
    process(msg).catch((e) => post({ src: 'korrige-omr', type: 'error', id: msg.id, message: e?.message ?? String(e) }));
  }
});
