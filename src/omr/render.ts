/**
 * Render de páginas de PDF a gris con pdf.js (150 ppp, respetando /Rotate).
 * Independiente del entorno: recibe la fábrica de canvas (OffscreenCanvas en el
 * worker del navegador, @napi-rs/canvas en los tests de Node).
 */
import { DPI, Gray } from './reader';

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface CanvasLike {
  canvas: any;
  context: any;
}

export async function renderPageGray(page: any, makeCanvas: (w: number, h: number) => CanvasLike, dpi = DPI): Promise<Gray> {
  const viewport = page.getViewport({ scale: dpi / 72 });
  const w = Math.ceil(viewport.width);
  const h = Math.ceil(viewport.height);
  const { canvas, context } = makeCanvas(w, h);
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, w, h);
  await page.render({ canvasContext: context, canvas, viewport, intent: 'print', background: '#ffffff' }).promise;
  const rgba: Uint8ClampedArray = context.getImageData(0, 0, w, h).data;
  return { data: rgbaToGray(rgba), width: w, height: h };
}

/** Luminancia como poppler/OpenCV: 0,299 R + 0,587 G + 0,114 B. */
export function rgbaToGray(rgba: Uint8ClampedArray | Uint8Array): Uint8Array {
  const n = rgba.length >> 2;
  const out = new Uint8Array(n);
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    out[i] = (rgba[j] * 4899 + rgba[j + 1] * 9617 + rgba[j + 2] * 1868 + 8192) >> 14;
  }
  return out;
}

export function grayToRgba(g: Gray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(g.width * g.height * 4);
  for (let i = 0, j = 0; i < g.data.length; i++, j += 4) {
    const v = g.data[i];
    out[j] = v;
    out[j + 1] = v;
    out[j + 2] = v;
    out[j + 3] = 255;
  }
  return out;
}
