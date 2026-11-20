/**
 * Genera un PDF de hojas ya rellenadas (como si se hubieran escaneado) para la
 * demo y los tests: la hoja real + burbujas pintadas con "bolígrafo".
 */
import { PDFDocument, degrees, rgb } from 'pdf-lib';
import { BUBBLE_R, LayoutDoc, PAGE_H, PAGE_W, Pt } from './layout';
import { generateSheetPdf } from './sheetPdf';

export interface FilledSheet {
  /** Dígitos del identificador; '?' deja la columna sin marcar. */
  identifier: string;
  model: string;
  /** pregunta → letras marcadas ('' en blanco, 'AB' doble marca). */
  answers: Record<string, string>;
  /** pregunta → letra marcada flojito (queda como "marca floja"). */
  weak?: Record<string, string>;
  isKey?: boolean;
  /** Página metida al revés en el alimentador. */
  upsideDown?: boolean;
}

const MM = 72 / 25.4;
const TINTA = rgb(0.1, 0.13, 0.5);

export async function generateFilledPdf(doc: LayoutDoc, sheets: FilledSheet[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  const template = await PDFDocument.load(await generateSheetPdf(doc));
  const embedded = await out.embedPdf(template, template.getPageIndices());
  for (const s of sheets) {
    doc.pages.forEach((lay, i) => {
      const page = out.addPage([PAGE_W * MM, PAGE_H * MM]);
      page.drawPage(embedded[i], { x: 0, y: 0 });
      const fill = ([x, y]: Pt, r = BUBBLE_R * 0.92) => page.drawCircle({ x: x * MM, y: y * MM, size: r * MM, color: TINTA });
      [...s.identifier].forEach((d, col) => {
        if (/\d/.test(d) && lay.nia[col]) fill(lay.nia[col][Number(d)]);
      });
      if (lay.modelo[s.model]) fill(lay.modelo[s.model]);
      if (s.isKey && lay.plantilla) fill(lay.plantilla);
      for (const [q, opts] of Object.entries(lay.preguntas)) {
        for (const letter of s.answers[q] ?? '') if (opts[letter]) fill(opts[letter]);
        const w = s.weak?.[q];
        if (w && opts[w]) fill(opts[w], 0.85);
      }
      if (s.upsideDown) page.setRotation(degrees(180));
    });
  }
  return out.save();
}
