/**
 * Lector OMR: port fiel de referencia/lector.py.
 *
 * Entrada: una página en gris a 150 ppp. Salida: mismas claves que el JSON de
 * referencia (pagina, qr, nia, modelo, es_plantilla, respuestas, revisar,
 * scores, en_blanco_total, incidencias) más detalle extra para la revisión.
 *
 * NO cambiar el algoritmo ni los umbrales: están validados con escaneos reales.
 */
import jsQR from 'jsqr';
import { LayoutDoc, PageLayout, Pt, parseQr } from './layout';
import { DUDOSA, MARCADA } from './thresholds';

export const DPI = 150;
export const PX = DPI / 25.4; // píxeles por mm

export { DUDOSA, MARCADA };

export const INC_AL_REVES = 'Hoja escaneada al revés (corregido)';
export const INC_SIN_MARCAS = 'No se encuentran las 4 marcas de esquina';
export const INC_QR = 'QR no leído';

export interface Gray {
  data: Uint8Array;
  width: number;
  height: number;
}

export type Estado = 'ok' | 'blanco' | 'doble' | 'floja';
export type Markers = Record<'tl' | 'tr' | 'bl' | 'br', Pt>;

export interface PageRead {
  pagina: number;
  incidencias: string[];
  qr?: string | null;
  nia?: string;
  modelo?: string | null;
  es_plantilla?: boolean;
  respuestas?: Record<string, string>;
  revisar?: Record<string, string>;
  scores?: Record<string, number[]>;
  en_blanco_total?: boolean;
  // --- extras (no están en la referencia) ---
  /** false si no se encontraron las marcas de esquina (hoja ilegible). */
  legible: boolean;
  girada: boolean;
  /** Página de la hoja de respuestas (1 o 2) según el QR o la inferencia. */
  hoja_pagina: number;
  markers?: Markers;
  nia_scores?: number[][];
  nia_estados?: Estado[];
  modelo_estado?: Estado;
  modelo_valor?: string;
  modelo_scores?: number[];
  plantilla_score?: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type CV = any;

/** Redondeo "bancario" como round() de Python. */
export function pyRound(x: number): number {
  const f = Math.floor(x);
  const d = x - f;
  if (d < 0.5) return f;
  if (d > 0.5) return f + 1;
  return f % 2 === 0 ? f : f + 1;
}

const round2 = (s: number) => Math.round(s * 100) / 100;

export function rotate180(g: Gray): Gray {
  const out = new Uint8Array(g.data.length);
  const n = g.data.length;
  for (let i = 0; i < n; i++) out[i] = g.data[n - 1 - i];
  return { data: out, width: g.width, height: g.height };
}

/** Centros de los 4 cuadrados negros de esquina (tl, tr, bl, br) o null. */
export function findMarkers(cv: CV, gray: Gray): Markers | null {
  const { width: w, height: h } = gray;
  const src = cv.matFromArray(h, w, cv.CV_8UC1, gray.data);
  const bw = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  const cands: Pt[] = [];
  try {
    cv.threshold(src, bw, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);
    cv.findContours(bw, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    const side = 8 * PX;
    const n = contours.size();
    for (let i = 0; i < n; i++) {
      const c = contours.get(i);
      const r = cv.boundingRect(c);
      const cw = r.width;
      const ch = r.height;
      if (0.6 * side < cw && cw < 1.5 * side && 0.6 * side < ch && ch < 1.5 * side && 0.75 < cw / ch && cw / ch < 1.33) {
        // cuadrado macizo (descarta QR, burbujas)
        if (cv.contourArea(c) / (cw * ch) >= 0.85) cands.push([r.x + cw / 2, r.y + ch / 2]);
      }
      c.delete();
    }
  } finally {
    src.delete();
    bw.delete();
    contours.delete();
    hierarchy.delete();
  }
  if (cands.length < 4) return null;
  const corners: Record<keyof Markers, Pt> = { tl: [0, 0], tr: [w, 0], bl: [0, h], br: [w, h] };
  const out = {} as Markers;
  const seen = new Set<string>();
  for (const k of ['tl', 'tr', 'bl', 'br'] as const) {
    const [cx, cy] = corners[k];
    let best = cands[0];
    let bestD = Infinity;
    for (const p of cands) {
      const d = (p[0] - cx) ** 2 + (p[1] - cy) ** 2;
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    out[k] = best;
    seen.add(`${best[0]},${best[1]}`);
  }
  return seen.size < 4 ? null : out;
}

/** Homografía 3x3 (fila a fila) que lleva puntos destino←origen. */
function perspective(cv: CV, src: number[], dst: number[]): number[] {
  const s = cv.matFromArray(4, 1, cv.CV_32FC2, src);
  const d = cv.matFromArray(4, 1, cv.CV_32FC2, dst);
  const M = cv.getPerspectiveTransform(s, d);
  const out = Array.from(M.data64F as Float64Array);
  s.delete();
  d.delete();
  M.delete();
  return out;
}

const ORDER = ['tl', 'tr', 'bl', 'br'] as const;

/** Homografía mm (x, H−y) → píxel de la imagen. */
export function homography(cv: CV, layout: PageLayout, markers: Markers): number[] {
  const H = layout.page_mm[1];
  const src = ORDER.flatMap((k) => [layout.markers[k][0], H - layout.markers[k][1]]);
  const dst = ORDER.flatMap((k) => [markers[k][0], markers[k][1]]);
  return perspective(cv, src, dst);
}

export function warpPoints(Hm: number[], layout: PageLayout, pts: Pt[]): Pt[] {
  const H = layout.page_mm[1];
  return pts.map(([x, yy]) => {
    const px = Math.fround(x);
    const py = Math.fround(H - yy);
    const w = Hm[6] * px + Hm[7] * py + Hm[8];
    return [Math.fround((Hm[0] * px + Hm[1] * py + Hm[2]) / w), Math.fround((Hm[3] * px + Hm[4] * py + Hm[5]) / w)] as Pt;
  });
}

/** Fracción de píxeles oscuros (<150) dentro del círculo de radio r_px. */
export function fillScore(gray: Gray, center: Pt, rPx: number): number {
  const [x, y] = center;
  const r = pyRound(rPx);
  const x0 = pyRound(x) - r;
  const y0 = pyRound(y) - r;
  const xs = Math.max(x0, 0);
  const ys = Math.max(y0, 0);
  const xe = Math.min(x0 + 2 * r + 1, gray.width);
  const ye = Math.min(y0 + 2 * r + 1, gray.height);
  if (xe <= xs || ye <= ys) return 0;
  const r2 = rPx * rPx;
  const cx = x - xs;
  const cy = y - ys;
  let total = 0;
  let dark = 0;
  for (let yy = ys; yy < ye; yy++) {
    const dy = yy - ys - cy;
    const row = yy * gray.width;
    for (let xx = xs; xx < xe; xx++) {
      const dx = xx - xs - cx;
      if (dx * dx + dy * dy <= r2) {
        total++;
        if (gray.data[row + xx] < 150) dark++;
      }
    }
  }
  return total ? dark / total : 0;
}

/** Devuelve [valor, estado]. estado: ok | blanco | doble | floja */
export function decide(labels: string[], sc: number[]): [string, Estado] {
  const marcadas = labels.filter((_, i) => sc[i] >= MARCADA);
  const flojas = labels.filter((_, i) => DUDOSA <= sc[i] && sc[i] < MARCADA);
  if (marcadas.length === 1 && !flojas.length) return [marcadas[0], 'ok'];
  if (marcadas.length > 1) return [marcadas.join(''), 'doble'];
  if (marcadas.length === 1 && flojas.length) return [marcadas[0], 'floja']; // una clara + otra a medias (¿borrón?)
  if (flojas.length) return [flojas.join(''), 'floja'];
  return ['', 'blanco'];
}

function cropGray(g: Gray, x0: number, y0: number, x1: number, y1: number): Gray {
  const xs = Math.max(x0, 0);
  const ys = Math.max(y0, 0);
  const xe = Math.min(Math.max(x1, 0), g.width);
  const ye = Math.min(Math.max(y1, 0), g.height);
  const w = Math.max(0, xe - xs);
  const h = Math.max(0, ye - ys);
  const data = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) data.set(g.data.subarray((ys + y) * g.width + xs, (ys + y) * g.width + xs + w), y * w);
  return { data, width: w, height: h };
}

function withBorderRgba(g: Gray, border: number): { data: Uint8ClampedArray; width: number; height: number } {
  const W = g.width + 2 * border;
  const Hh = g.height + 2 * border;
  const out = new Uint8ClampedArray(W * Hh * 4).fill(255);
  for (let y = 0; y < g.height; y++) {
    let o = ((y + border) * W + border) * 4;
    const row = y * g.width;
    for (let x = 0; x < g.width; x++) {
      const v = g.data[row + x];
      out[o] = v;
      out[o + 1] = v;
      out[o + 2] = v;
      o += 4;
    }
  }
  return { data: out, width: W, height: Hh };
}

/** Lee el QR del recorte probando escalas x1/x2/x3, en crudo y binarizado (Otsu). */
export function decodeQr(cv: CV, crop: Gray): string {
  if (!crop.width || !crop.height) return '';
  const src = cv.matFromArray(crop.height, crop.width, cv.CV_8UC1, crop.data);
  try {
    for (const scale of [1, 2, 3]) {
      const big = new cv.Mat();
      const bin = new cv.Mat();
      try {
        cv.resize(src, big, new cv.Size(0, 0), scale, scale, cv.INTER_CUBIC);
        cv.threshold(big, bin, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
        for (const m of [big, bin]) {
          const g: Gray = { data: new Uint8Array(m.data), width: m.cols, height: m.rows };
          const img = withBorderRgba(g, 20);
          const res = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
          if (res?.data) return res.data;
        }
      } finally {
        big.delete();
        bin.delete();
      }
    }
  } finally {
    src.delete();
  }
  return '';
}

export interface ReadOptions {
  /** Nº de página dentro del PDF (1-based). */
  pagina: number;
  /** Página de la hoja a asumir si el QR no se lee o no trae página (por defecto 1). */
  fallbackHojaPagina?: number;
}

export interface ReadOutput {
  result: PageRead;
  /** Imagen en gris ya orientada (girada 180° si hacía falta). */
  gray: Gray;
  layout: PageLayout;
}

export function readPage(cv: CV, input: Gray, doc: LayoutDoc, opts: ReadOptions): ReadOutput {
  const base = doc.pages[0];
  const res: PageRead = { pagina: opts.pagina, incidencias: [], legible: false, girada: false, hoja_pagina: 1 };

  // Orientación y QR: se localiza la zona del QR a partir de las marcas de esquina
  const tryOrientation = (g: Gray): { m: Markers | null; crop: Gray | null; dark: number } => {
    const m = findMarkers(cv, g);
    if (!m) return { m: null, crop: null, dark: 0 };
    const Hm = homography(cv, base, m);
    const [qx, qy, qw, qh] = base.qr;
    const pts = warpPoints(Hm, base, [
      [qx - 3, qy + qh + 3],
      [qx + qw + 3, qy - 3],
    ]);
    const [x0, y0] = pts[0].map(Math.trunc);
    const [x1, y1] = pts[1].map(Math.trunc);
    const crop = cropGray(g, x0, y0, x1, y1);
    let dark = 0;
    for (let i = 0; i < crop.data.length; i++) if (crop.data[i] < 128) dark++;
    return { m, crop, dark: crop.data.length ? dark / crop.data.length : 0 };
  };

  let gray = input;
  const o0 = tryOrientation(gray);
  const g180 = rotate180(gray);
  const o1 = tryOrientation(g180);
  let markers: Markers | null;
  let crop: Gray | null;
  if (o1.dark > o0.dark) {
    // el QR (zona muy oscura) está abajo: hoja al revés
    gray = g180;
    markers = o1.m;
    crop = o1.crop;
    res.girada = true;
    res.incidencias.push(INC_AL_REVES);
  } else {
    markers = o0.m;
    crop = o0.crop;
  }
  if (!markers) {
    res.incidencias.push(INC_SIN_MARCAS);
    return { result: res, gray, layout: base };
  }
  res.legible = true;
  res.markers = markers;

  const qrTxt = crop ? decodeQr(cv, crop) : '';
  res.qr = qrTxt || null;
  if (!qrTxt) res.incidencias.push(INC_QR);

  // Página de la hoja (exámenes de más de 100 preguntas)
  const parsed = parseQr(qrTxt);
  let hojaPagina = parsed?.page ?? opts.fallbackHojaPagina ?? 1;
  if (hojaPagina < 1 || hojaPagina > doc.pages.length) hojaPagina = 1;
  res.hoja_pagina = hojaPagina;
  const layout = doc.pages[hojaPagina - 1];

  const Hm = homography(cv, layout, markers);
  const rPx = layout.radius_mm * PX * 0.75; // interior de la burbuja, sin el borde
  const scores = (points: Pt[]) => warpPoints(Hm, layout, points).map((p) => fillScore(gray, p, rPx));

  // Identificador
  const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  let nia = '';
  let niaOk = true;
  res.nia_scores = [];
  res.nia_estados = [];
  for (const col of layout.nia) {
    const sc = scores(col);
    const [v, st] = decide(digits, sc);
    nia += st === 'ok' ? v : '?';
    niaOk &&= st === 'ok';
    res.nia_scores.push(sc.map(round2));
    res.nia_estados.push(st);
  }
  res.nia = nia;
  if (!niaOk) res.incidencias.push(`NIA incompleto o dudoso: ${nia}`);

  // Modelo y plantilla
  const mods = Object.keys(layout.modelo);
  if (mods.length) {
    const sc = scores(mods.map((m) => layout.modelo[m]));
    const [v, st] = decide(mods, sc);
    res.modelo = st === 'ok' ? v : null;
    res.modelo_estado = st;
    res.modelo_valor = v;
    res.modelo_scores = sc.map(round2);
    if (st !== 'ok') res.incidencias.push(`Modelo ${st}: ${v || '-'}`);
  } else {
    // examen de un único modelo: no hay burbujas de modelo
    res.modelo = 'A';
    res.modelo_estado = 'ok';
    res.modelo_valor = 'A';
    res.modelo_scores = [];
  }
  const pScore = layout.plantilla ? scores([layout.plantilla])[0] : 0;
  res.plantilla_score = round2(pScore);
  res.es_plantilla = pScore >= MARCADA;

  // Respuestas
  const ops = [...layout.opciones];
  res.respuestas = {};
  res.revisar = {};
  res.scores = {};
  for (const [q, opts_] of Object.entries(layout.preguntas)) {
    const sc = scores(ops.map((o) => opts_[o]));
    const [v, st] = decide(ops, sc);
    res.respuestas[q] = st === 'ok' ? v : '';
    res.scores[q] = sc.map(round2);
    if (st === 'doble' || st === 'floja') res.revisar[q] = `${st}: ${v}`;
  }

  res.en_blanco_total = Object.values(res.respuestas).every((v) => v === '') && nia.replace(/^\?+|\?+$/g, '') === '';
  return { result: res, gray, layout };
}

/** Píxeles por mm de la imagen enderezada que se guarda para revisión. */
export const CANON_PX_MM = 5;

/**
 * Endereza la hoja a un A4 canónico (CANON_PX_MM px/mm): en esa imagen la
 * burbuja de coordenadas (x, y) mm está en (x·s, (H−y)·s).
 */
export function warpCanonical(cv: CV, gray: Gray, markers: Markers, layout: PageLayout, pxPerMm = CANON_PX_MM): Gray {
  const [Wmm, Hmm] = layout.page_mm;
  const W = Math.round(Wmm * pxPerMm);
  const Hh = Math.round(Hmm * pxPerMm);
  const src = ORDER.flatMap((k) => [markers[k][0], markers[k][1]]);
  const dst = ORDER.flatMap((k) => [layout.markers[k][0] * pxPerMm, (Hmm - layout.markers[k][1]) * pxPerMm]);
  const s = cv.matFromArray(4, 1, cv.CV_32FC2, src);
  const d = cv.matFromArray(4, 1, cv.CV_32FC2, dst);
  const M = cv.getPerspectiveTransform(s, d);
  const srcMat = cv.matFromArray(gray.height, gray.width, cv.CV_8UC1, gray.data);
  const out = new cv.Mat();
  try {
    cv.warpPerspective(srcMat, out, M, new cv.Size(W, Hh), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255, 255));
    return { data: new Uint8Array(out.data), width: W, height: Hh };
  } finally {
    s.delete();
    d.delete();
    M.delete();
    srcMat.delete();
    out.delete();
  }
}

/** Carga OpenCV.js de forma diferida (≈10 MB; solo en el worker de lectura). */
let cvPromise: Promise<{ cv: CV }> | null = null;
export async function loadCv(): Promise<CV> {
  cvPromise ??= import('./cvLoader').then((m) => m.initCv());
  return (await cvPromise).cv;
}
