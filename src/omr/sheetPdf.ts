/**
 * Genera el PDF de la hoja de respuestas con pdf-lib, replicando el diseño de
 * referencia/hoja.py (mismas medidas en mm).
 */
import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import qrcode from 'qrcode-generator';
import { APP_NAME } from '../config';
import { SHEET_LANGS, SHEET_TEXT, SheetLang, sheetLang } from './sheetText';
import { BUBBLE_R, GEO, LayoutDoc, MARGIN, MARK, PAGE_H, PAGE_W, PageLayout, QUESTIONS_PER_COLUMN } from './layout';

const MM = 72 / 25.4;
const GRIS = rgb(0.35, 0.35, 0.35);
const ROSA = rgb(0.8, 0.2, 0.35);
const NEGRO = rgb(0, 0, 0);

/** Sustituye los caracteres que la fuente estándar (WinAnsi) no puede codificar. */
function safe(font: PDFFont, text: string): string {
  let out = '';
  for (const ch of text) {
    try {
      font.encodeText(ch);
      out += ch;
    } catch {
      out += '?';
    }
  }
  return out;
}

class Pen {
  constructor(
    private page: PDFPage,
    private regular: PDFFont,
    private bold: PDFFont,
  ) {}

  text(x: number, y: number, s: string, size: number, opts: { bold?: boolean; color?: ReturnType<typeof rgb>; align?: 'left' | 'center' | 'right' } = {}) {
    const font = opts.bold ? this.bold : this.regular;
    const str = safe(font, s);
    let px = x * MM;
    if (opts.align === 'center') px -= font.widthOfTextAtSize(str, size) / 2;
    if (opts.align === 'right') px -= font.widthOfTextAtSize(str, size);
    this.page.drawText(str, { x: px, y: y * MM, size, font, color: opts.color ?? NEGRO });
  }

  rect(x: number, y: number, w: number, h: number, opts: { fill?: ReturnType<typeof rgb>; stroke?: ReturnType<typeof rgb>; width?: number }) {
    this.page.drawRectangle({
      x: x * MM,
      y: y * MM,
      width: w * MM,
      height: h * MM,
      color: opts.fill,
      borderColor: opts.stroke,
      borderWidth: opts.stroke ? (opts.width ?? 0.6) : 0,
    });
  }

  line(x1: number, y1: number, x2: number, y2: number, width: number, color = NEGRO) {
    this.page.drawLine({ start: { x: x1 * MM, y: y1 * MM }, end: { x: x2 * MM, y: y2 * MM }, thickness: width, color });
  }

  circle(x: number, y: number, r: number, opts: { fill?: ReturnType<typeof rgb>; stroke?: ReturnType<typeof rgb>; width?: number }) {
    this.page.drawCircle({
      x: x * MM,
      y: y * MM,
      size: r * MM,
      color: opts.fill,
      borderColor: opts.stroke,
      borderWidth: opts.stroke ? (opts.width ?? 0.6) : 0,
    });
  }

  bubble(x: number, y: number, label: string) {
    this.circle(x, y, BUBBLE_R, { stroke: ROSA, width: 0.6 });
    this.text(x, y - 0.9, label, 5.5, { color: ROSA, align: 'center' });
  }
}

function drawQr(pen: Pen, text: string, x: number, y: number, size: number) {
  const qr = qrcode(0, 'L');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const border = 4; // zona de silencio, como QrCodeWidget de ReportLab
  const m = size / (n + 2 * border);
  for (let row = 0; row < n; row++) {
    let col = 0;
    while (col < n) {
      if (!qr.isDark(row, col)) {
        col++;
        continue;
      }
      let end = col;
      while (end + 1 < n && qr.isDark(row, end + 1)) end++;
      // pequeño solape para que no queden rendijas entre módulos al rasterizar
      pen.rect(x + (border + col) * m, y + size - (border + row + 1) * m, (end - col + 1) * m + 0.02, m + 0.02, { fill: NEGRO });
      col = end + 1;
    }
  }
}

/** Caja reservada al logotipo en la cabecera (mm). Lejos del QR, de las marcas y de las burbujas. */
const LOGO_BOX = { x: 24, top: PAGE_H - 12.3, maxW: 34, maxH: 14.2 };

/** Incrusta el logotipo (data URL PNG/JPEG). Si no se puede leer, la hoja sale sin él. */
async function embedLogo(pdf: PDFDocument, dataUrl: string | undefined): Promise<PDFImage | null> {
  if (!dataUrl) return null;
  try {
    const [head, b64] = dataUrl.split(',');
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return head.includes('image/png') ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
  } catch {
    return null;
  }
}

function drawPage(page: PDFPage, regular: PDFFont, bold: PDFFont, doc: LayoutDoc, lay: PageLayout, logo: PDFImage | null) {
  const pen = new Pen(page, regular, bold);
  const cfg = doc.config;
  const W = PAGE_W;
  const H = PAGE_H;
  const nPages = doc.pages.length;
  const pageNo = lay.page ?? 1;

  // Marcas de esquina
  for (const [cx, cy] of Object.values(lay.markers)) {
    pen.rect(cx - MARK / 2, cy - MARK / 2, MARK, MARK, { fill: NEGRO });
  }

  // Cabecera (con logotipo opcional a la izquierda; el texto se desplaza y se encoge si hace falta)
  let hx = 24;
  if (logo) {
    const k = Math.min(LOGO_BOX.maxW / logo.width, LOGO_BOX.maxH / logo.height);
    const w = logo.width * k;
    const h = logo.height * k;
    page.drawImage(logo, { x: LOGO_BOX.x * MM, y: (LOGO_BOX.top - LOGO_BOX.maxH + (LOGO_BOX.maxH - h) / 2) * MM, width: w * MM, height: h * MM });
    hx = LOGO_BOX.x + w + 4;
  }
  const maxW = (lay.qr[0] - 4 - hx) * MM; // hasta el QR
  const fit = (s: string, size: number, font: PDFFont, min: number) => {
    let z = size;
    while (z > min && font.widthOfTextAtSize(safe(font, s), z) > maxW) z -= 0.25;
    return z;
  };
  const title = (cfg.title || APP_NAME).toUpperCase();
  const tx = SHEET_TEXT[sheetLang(cfg.lang)];
  // el subtítulo por defecto en castellano se traduce; uno escrito por el profesor se respeta
  const subtitle = !cfg.subtitle || cfg.subtitle === SHEET_TEXT.es.defaultSubtitle ? tx.defaultSubtitle : cfg.subtitle;
  const pag = nPages > 1 ? `   ·   ${tx.page(pageNo, nPages)}` : '';
  const aviso = `${tx.exam}: ${doc.exam_id}${pag}   (${tx.warning})`;
  pen.text(hx, H - 16, title, fit(title, 12, bold, 7), { bold: true });
  pen.text(hx, H - 21.5, subtitle, fit(subtitle, 10, regular, 6.5));
  pen.text(hx, H - 26, aviso, fit(aviso, 7.5, regular, 5.5), { color: GRIS });

  // QR
  const [qx, qy, qs] = lay.qr;
  drawQr(pen, lay.qr_text ?? `UICOMR|${doc.exam_id}|v1`, qx, qy, qs);

  // Campos manuscritos
  (cfg.fields ?? tx.fields).forEach((campo, i) => {
    const y = H - 35 - i * 7;
    pen.text(24, y, `${campo}:`, 8.5);
    pen.line(56, y - 0.8, W - 58, y - 0.8, 0.4);
  });

  // Identificador
  const top = GEO.top;
  pen.text(24, top, tx.idTitle(cfg.idLabel.toUpperCase()), 8, { bold: true });
  pen.text(24, top - 3.5, tx.idHint, 6.5, { color: GRIS });
  const boxY = top - 11;
  lay.nia.forEach((col) => {
    const x = col[0][0];
    pen.rect(x - 2.6, boxY, 5.2, 5.5, { stroke: GRIS, width: 0.6 });
    col.forEach(([bx, by], dig) => pen.bubble(bx, by, String(dig)));
  });

  // Modelo y plantilla
  const mx = GEO.modeloX;
  const modelos = Object.entries(lay.modelo);
  if (modelos.length) {
    pen.text(mx, top, tx.model, 8, { bold: true });
    modelos.forEach(([m, [x, y]]) => pen.bubble(x, y, m));
  }
  if (lay.plantilla) {
    const [px, py] = lay.plantilla;
    pen.text(mx, top - 20, 'SOLO PROFESORADO', 8, { bold: true });
    pen.bubble(px, py, 'P');
    pen.text(px + 4, py - 1, 'Marcar si esta hoja es la PLANTILLA', 6.5, { color: GRIS });
    pen.text(px + 4, py - 4, 'de respuestas correctas', 6.5, { color: GRIS });
  }

  // Instrucciones
  const ix = GEO.instrX;
  pen.text(ix, top, tx.instructions, 8, { bold: true });
  tx.lines.forEach((t, k) => t && pen.text(ix, top - 4.5 - k * 3.6, t, 6.8));
  const ey = top - 4.5 - 2.6 * 3.6;
  pen.circle(ix + 3, ey, BUBBLE_R, { fill: NEGRO });
  pen.text(ix + 6.5, ey - 0.9, tx.right, 6.5);
  pen.circle(ix + 25, ey, BUBBLE_R, { stroke: ROSA, width: 0.6 });
  pen.line(ix + 23.6, ey - 1.4, ix + 26.4, ey + 1.4, 0.8);
  pen.line(ix + 23.6, ey + 1.4, ix + 26.4, ey - 1.4, 0.8);
  pen.text(ix + 28.5, ey - 0.9, tx.wrong, 6.5);

  // Respuestas
  const sepY = GEO.sepY;
  pen.line(22, sepY, W - 22, sepY, 0.5);
  pen.text(24, sepY - 4.5, tx.answers, 8, { bold: true });
  if (cfg.note) pen.text(W - 24, sepY - 4.5, cfg.note, 7, { color: GRIS, align: 'right' });
  const qs_ = Object.keys(lay.preguntas).map(Number).sort((a, b) => a - b);
  const first = qs_[0] ?? 1;
  for (const q of qs_) {
    const opts = lay.preguntas[String(q)];
    const local = q - first;
    const col = Math.floor(local / QUESTIONS_PER_COLUMN);
    const row = local % QUESTIONS_PER_COLUMN;
    const y = Object.values(opts)[0][1];
    if (Math.floor(row / 5) % 2 === 1) {
      pen.rect(GEO.colX[col] - 8, y - 2.8, 38, GEO.rowDy, { fill: rgb(0.94, 0.94, 0.94) });
    }
    pen.text(GEO.colX[col] - 3.5, y - 1, String(q), 7, { bold: true, align: 'right' });
    for (const [o, [x, by]] of Object.entries(opts)) pen.bubble(x, by, o);
  }

  pen.text(W / 2, 13, `${doc.exam_id} · ${tx.footer} · v1${nPages > 1 ? ` · ${tx.pageShort} ${pageNo}/${nPages}` : ''}`, 6, {
    color: GRIS,
    align: 'center',
  });
  // referencia a MARGIN para mantener la constante ligada a la geometría de las marcas
  void MARGIN;
}

/** PDF de una hoja (1 o 2 páginas según el nº de preguntas). */
export async function generateSheetPdf(doc: LayoutDoc): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Hoja de respuestas ${doc.exam_id}`);
  pdf.setCreator(APP_NAME);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedLogo(pdf, doc.config.logo);
  for (const lay of doc.pages) {
    const page = pdf.addPage([PAGE_W * MM, PAGE_H * MM]);
    drawPage(page, regular, bold, doc, lay, logo);
  }
  return pdf.save();
}

/** PDF con N copias de la hoja (las páginas se incrustan una vez y se reutilizan). */
export async function generateSheetCopiesPdf(doc: LayoutDoc, copies: number): Promise<Uint8Array> {
  const one = await generateSheetPdf(doc);
  const n = Math.max(1, Math.min(1000, Math.round(copies)));
  if (n === 1) return one;
  const out = await PDFDocument.create();
  out.setTitle(`Hoja de respuestas ${doc.exam_id} (${n} copias)`);
  out.setCreator(APP_NAME);
  const src = await PDFDocument.load(one);
  const embedded = await out.embedPdf(src, src.getPageIndices());
  for (let i = 0; i < n; i++) {
    for (const ep of embedded) {
      const page = out.addPage([PAGE_W * MM, PAGE_H * MM]);
      page.drawPage(ep, { x: 0, y: 0 });
    }
  }
  return out.save();
}

/**
 * PDF con hojas del mismo examen en varios idiomas (p. ej. 20 en castellano y 15 en catalán).
 * Solo cambian los textos impresos: todas se corrigen igual y se pueden escanear mezcladas.
 */
export async function generateSheetMixPdf(doc: LayoutDoc, copies: Partial<Record<SheetLang, number>>): Promise<Uint8Array> {
  const parts = SHEET_LANGS.map((lang) => [lang, Math.max(0, Math.min(1000, Math.round(copies[lang] ?? 0)))] as const).filter(([, n]) => n > 0);
  const withLang = (lang: SheetLang): LayoutDoc => ({ ...doc, config: { ...doc.config, lang } });
  if (!parts.length) return generateSheetPdf(doc);
  if (parts.length === 1) return generateSheetCopiesPdf(withLang(parts[0][0]), parts[0][1]);
  const out = await PDFDocument.create();
  out.setTitle(`Hoja de respuestas ${doc.exam_id} (${parts.map(([l, n]) => `${n} ${l}`).join(', ')})`);
  out.setCreator(APP_NAME);
  for (const [lang, n] of parts) {
    const src = await PDFDocument.load(await generateSheetCopiesPdf(withLang(lang), n));
    for (const page of await out.copyPages(src, src.getPageIndices())) out.addPage(page);
  }
  return out.save();
}
