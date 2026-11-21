/**
 * Geometría de la hoja de respuestas (port de referencia/hoja.py).
 *
 * Todo en mm con origen en la esquina inferior izquierda de la página.
 * El generador de PDF y el lector usan este mismo layout.
 */
import { QR_PREFIX, QR_VERSION } from '../config';
import { SHEET_TEXT, SheetLang, sheetLang } from './sheetText';

export type Pt = [number, number];

export interface SheetConfig {
  /** Nº de preguntas (10–200). */
  nQuestions: number;
  /** Nº de opciones por pregunta (3, 4 o 5 → letras A–E). */
  nOptions: number;
  /** Nº de modelos de examen (1–4 → A–D). Con 1 no se imprime el bloque de modelo. */
  nModels: number;
  /** Nº de dígitos del identificador (6–10). */
  idDigits: number;
  /** Etiqueta del identificador (NIA, DNI…). */
  idLabel: string;
  /** Primera línea de la cabecera (institución). */
  title: string;
  /** Segunda línea de la cabecera (asignatura, convocatoria…). */
  subtitle: string;
  /** Logotipo de la cabecera, como data URL PNG o JPEG (opcional). */
  logo?: string;
  /** Etiquetas de los tres campos manuscritos (opcional). */
  fields?: string[];
  /** Nota breve impresa junto al título «Respuestas» (duración, penalización…). */
  note?: string;
  /** Idioma de los textos impresos (por defecto, castellano). No afecta a la lectura. */
  lang?: SheetLang;
}

export const DEFAULT_FIELDS = ['Apellidos y nombre', 'Asignatura', 'Fecha'];
/** Etiquetas por defecto de los campos manuscritos en el idioma de la hoja. */
export const defaultFields = (lang?: SheetLang): string[] => [...SHEET_TEXT[sheetLang(lang)].fields];
/** Tamaño máximo del logotipo guardado (caracteres del data URL ≈ 220 kB). */
export const MAX_LOGO_CHARS = 300_000;

export const DEFAULT_SHEET_CONFIG: SheetConfig = {
  nQuestions: 100,
  nOptions: 5,
  nModels: 4,
  idDigits: 8,
  idLabel: 'NIA',
  title: '',
  subtitle: 'Hoja de respuestas  ·  Examen tipo test',
};

/** Layout de una página. Mismo formato que el JSON de referencia, más `page`, `pages` y `qr_text`. */
export interface PageLayout {
  exam_id: string;
  page_mm: [number, number];
  markers: { tl: Pt; tr: Pt; bl: Pt; br: Pt };
  nia: Pt[][];
  modelo: Record<string, Pt>;
  plantilla: Pt | null;
  preguntas: Record<string, Record<string, Pt>>;
  radius_mm: number;
  opciones: string;
  qr: [number, number, number, number];
  page?: number;
  pages?: number;
  qr_text?: string;
}

export interface LayoutDoc {
  version: 1;
  exam_id: string;
  config: SheetConfig;
  pages: PageLayout[];
}

export const PAGE_W = 210;
export const PAGE_H = 297;
export const MARK = 8;
export const MARGIN = 10;
export const BUBBLE_R = 2.1;
export const QUESTIONS_PER_COLUMN = 25;
export const QUESTIONS_PER_PAGE = 100;
export const MAX_QUESTIONS = 200;
export const ALL_OPTIONS = 'ABCDE';
export const ALL_MODELS = 'ABCD';

/** Constantes de composición compartidas con el generador de PDF. */
export const GEO = {
  top: PAGE_H - 62,
  niaX0: 27,
  niaDx: 6.2,
  niaDy: 5.0,
  modeloX: 90,
  instrX: 145,
  sepY: PAGE_H - 132,
  colX: [30, 72, 114, 156],
  rowDy: 5.6,
  optDx: 5.6,
  qrSize: 24,
} as const;

const r4 = (n: number) => Math.round(n * 1e4) / 1e4;

export function clampConfig(c: Partial<SheetConfig>): SheetConfig {
  const n = (v: unknown, def: number, lo: number, hi: number) => {
    const x = Math.round(Number(v));
    return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : def;
  };
  const out: SheetConfig = {
    nQuestions: n(c.nQuestions, 100, 10, MAX_QUESTIONS),
    nOptions: n(c.nOptions, 5, 3, 5),
    nModels: n(c.nModels, 1, 1, 4),
    idDigits: n(c.idDigits, 8, 6, 10),
    idLabel: (c.idLabel ?? 'NIA').toString().trim().slice(0, 12) || 'NIA',
    title: (c.title ?? '').toString().slice(0, 60),
    subtitle: (c.subtitle ?? '').toString().slice(0, 80),
  };
  // personalización opcional (solo se guarda lo que se ha rellenado)
  if (typeof c.logo === 'string' && /^data:image\/(png|jpeg);base64,/.test(c.logo) && c.logo.length <= MAX_LOGO_CHARS) out.logo = c.logo;
  const lang = sheetLang(c.lang);
  if (lang !== 'es') out.lang = lang;
  if (Array.isArray(c.fields)) {
    const defs = defaultFields(lang);
    const fields = defs.map((def, i) => (c.fields?.[i] ?? def).toString().trim().slice(0, 22));
    // solo se guardan si el profesor las ha cambiado (y no son las de otro idioma por defecto)
    const isDefaultOf = (l: SheetLang) => fields.every((f, i) => f === SHEET_TEXT[l].fields[i]);
    if (!isDefaultOf('es') && !isDefaultOf('ca') && !isDefaultOf('en')) out.fields = fields;
  }
  const note = (c.note ?? '').toString().trim().slice(0, 90);
  if (note) out.note = note;
  return out;
}

export function qrText(examCode: string, page: number, pages: number): string {
  const base = `${QR_PREFIX}|${examCode}|${QR_VERSION}`;
  return pages > 1 ? `${base}|p${page}` : base;
}

export interface ParsedQr {
  prefix: string;
  code: string;
  version: string;
  page: number;
}

export function parseQr(text: string | null | undefined): ParsedQr | null {
  if (!text) return null;
  const parts = text.split('|');
  if (parts.length < 3 || parts[0] !== QR_PREFIX) return null;
  const m = /^p(\d+)$/.exec(parts[3] ?? '');
  return { prefix: parts[0], code: parts[1], version: parts[2], page: m ? Number(m[1]) : 1 };
}

export function pageCount(nQuestions: number): number {
  return Math.ceil(nQuestions / QUESTIONS_PER_PAGE);
}

/** Calcula el layout completo (1 o 2 páginas) para una configuración. */
export interface LayoutOptions {
  /**
   * Imprimir la burbuja «P» (hoja-plantilla del profesor), como en la hoja de referencia.
   * Las hojas nuevas no la llevan: la plantilla se introduce en la plataforma. Los exámenes
   * creados antes conservan su layout guardado y se siguen leyendo igual.
   */
  keyBubble?: boolean;
}

export function computeLayout(examCode: string, config: SheetConfig, opts: LayoutOptions = {}): LayoutDoc {
  const cfg = clampConfig(config);
  const nPages = pageCount(cfg.nQuestions);
  const opciones = ALL_OPTIONS.slice(0, cfg.nOptions);
  const modelos = cfg.nModels > 1 ? ALL_MODELS.slice(0, cfg.nModels) : '';
  const pages: PageLayout[] = [];

  for (let p = 1; p <= nPages; p++) {
    const markers = {
      tl: [MARGIN + MARK / 2, PAGE_H - MARGIN - MARK / 2] as Pt,
      tr: [PAGE_W - MARGIN - MARK / 2, PAGE_H - MARGIN - MARK / 2] as Pt,
      bl: [MARGIN + MARK / 2, MARGIN + MARK / 2] as Pt,
      br: [PAGE_W - MARGIN - MARK / 2, MARGIN + MARK / 2] as Pt,
    };
    const qx = PAGE_W - 20 - GEO.qrSize - 6;
    const qy = PAGE_H - 12 - GEO.qrSize;

    // Bloque de identificador
    const boxY = GEO.top - 11;
    const nia: Pt[][] = [];
    for (let col = 0; col < cfg.idDigits; col++) {
      const x = r4(GEO.niaX0 + col * GEO.niaDx);
      const colPts: Pt[] = [];
      for (let dig = 0; dig < 10; dig++) colPts.push([x, r4(boxY - 4 - dig * GEO.niaDy)]);
      nia.push(colPts);
    }

    // Modelo (y, solo en hojas antiguas o de referencia, la burbuja de plantilla)
    const modelo: Record<string, Pt> = {};
    [...modelos].forEach((m, i) => {
      modelo[m] = [r4(GEO.modeloX + 3 + i * 7), r4(GEO.top - 8)];
    });
    const plantilla: Pt | null = opts.keyBubble ? [GEO.modeloX + 3, GEO.top - 27] : null;

    // Respuestas: columnas de 25
    const preguntas: Record<string, Record<string, Pt>> = {};
    const first = (p - 1) * QUESTIONS_PER_PAGE;
    const last = Math.min(cfg.nQuestions, p * QUESTIONS_PER_PAGE);
    const yStart = GEO.sepY - 12;
    for (let q = first; q < last; q++) {
      const local = q - first;
      const col = Math.floor(local / QUESTIONS_PER_COLUMN);
      const row = local % QUESTIONS_PER_COLUMN;
      const y = r4(yStart - row * GEO.rowDy);
      const opts: Record<string, Pt> = {};
      [...opciones].forEach((o, j) => {
        opts[o] = [r4(GEO.colX[col] + j * GEO.optDx), y];
      });
      preguntas[String(q + 1)] = opts;
    }

    pages.push({
      exam_id: examCode,
      page_mm: [PAGE_W, PAGE_H],
      markers,
      nia,
      modelo,
      plantilla,
      preguntas,
      radius_mm: BUBBLE_R,
      opciones,
      qr: [qx, qy, GEO.qrSize, GEO.qrSize],
      page: p,
      pages: nPages,
      qr_text: qrText(examCode, p, nPages),
    });
  }
  return { version: 1, exam_id: examCode, config: cfg, pages };
}

/** Envuelve un layout de página suelto (formato de referencia) como documento. */
export function wrapReferenceLayout(page: PageLayout): LayoutDoc {
  const nQ = Object.keys(page.preguntas).length;
  return {
    version: 1,
    exam_id: page.exam_id,
    config: {
      ...DEFAULT_SHEET_CONFIG,
      nQuestions: nQ,
      nOptions: page.opciones.length,
      nModels: Math.max(1, Object.keys(page.modelo).length),
      idDigits: page.nia.length,
    },
    pages: [{ ...page, page: 1, pages: 1 }],
  };
}

/** Letras de modelo de un examen ('A' si solo hay uno). */
export function modelLetters(config: SheetConfig): string[] {
  return [...ALL_MODELS.slice(0, Math.max(1, config.nModels))];
}

export function optionLetters(config: SheetConfig): string[] {
  return [...ALL_OPTIONS.slice(0, config.nOptions)];
}
