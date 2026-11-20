import fs from 'node:fs';
import path from 'node:path';
import { Gray } from '../src/omr/reader';
import { ROOT, loadCv, processPdfsNode, renderPdf } from '../scripts/node-omr';

export { ROOT, loadCv, processPdfsNode, renderPdf };
export const REF = path.join(ROOT, 'referencia');

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
