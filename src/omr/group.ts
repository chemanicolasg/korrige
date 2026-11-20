/**
 * Agrupa las páginas leídas en "entregas" (una por alumno). En exámenes de más
 * de 100 preguntas la hoja tiene 2 páginas: se emparejan por orden y por QR.
 */
import { LayoutDoc, parseQr } from './layout';
import { Estado, PageRead } from './reader';

export interface ScannedPage {
  read: PageRead;
  fileIndex: number;
  fileName: string;
  /** JPEG de la hoja enderezada (no disponible en tests). */
  image?: Blob;
}

export interface Mark {
  /** doble | floja */
  e: Estado;
  /** Letras detectadas, p. ej. "AB". */
  v: string;
}

export interface Submission {
  pages: ScannedPage[];
  identifier: string;
  model: string | null;
  isKey: boolean;
  answers: Record<string, string>;
  marks: Record<string, Mark>;
  scores: Record<string, number[]>;
  idScores: number[][];
  idStates: Estado[];
  modelScores: number[];
  modelState: Estado;
  modelValue: string;
  incidents: string[];
  missingPages: number[];
  blank: boolean;
  legible: boolean;
  qrRead: boolean;
}

export interface Excluded {
  page: ScannedPage;
  reason: string;
}

const hasDoubt = (id: string | undefined) => !id || id.includes('?');
const allUnknown = (id: string | undefined) => !id || /^\?*$/.test(id);

function build(pages: ScannedPage[], doc: LayoutDoc): Submission {
  const nPages = doc.pages.length;
  const sorted = [...pages].sort((a, b) => a.read.hoja_pagina - b.read.hoja_pagina);
  const first = sorted[0].read;
  // identificador y modelo: los de la página 1; si son dudosos, los de otra página que estén limpios
  const idSrc = sorted.find((p) => p.read.legible && !hasDoubt(p.read.nia))?.read ?? sorted.find((p) => p.read.legible)?.read ?? first;
  const modSrc = sorted.find((p) => p.read.legible && p.read.modelo_estado === 'ok')?.read ?? idSrc;
  const sub: Submission = {
    pages: sorted,
    identifier: idSrc.nia ?? '?'.repeat(doc.config.idDigits),
    model: modSrc.modelo ?? null,
    isKey: sorted.some((p) => p.read.es_plantilla),
    answers: {},
    marks: {},
    scores: {},
    idScores: idSrc.nia_scores ?? [],
    idStates: idSrc.nia_estados ?? [],
    modelScores: modSrc.modelo_scores ?? [],
    modelState: modSrc.modelo_estado ?? 'blanco',
    modelValue: modSrc.modelo_valor ?? '',
    incidents: [],
    missingPages: [],
    blank: sorted.every((p) => p.read.legible && p.read.en_blanco_total),
    legible: sorted.every((p) => p.read.legible),
    qrRead: sorted.every((p) => !!p.read.qr),
  };
  for (const p of sorted) {
    const r = p.read;
    Object.assign(sub.answers, r.respuestas ?? {});
    Object.assign(sub.scores, r.scores ?? {});
    for (const [q, txt] of Object.entries(r.revisar ?? {})) {
      const [e, v] = txt.split(': ');
      sub.marks[q] = { e: e as Estado, v: v ?? '' };
    }
    for (const inc of r.incidencias) {
      const label = nPages > 1 ? `Pág. ${r.hoja_pagina}: ${inc}` : inc;
      if (!sub.incidents.includes(label)) sub.incidents.push(label);
    }
  }
  const present = new Set(sorted.map((p) => p.read.hoja_pagina));
  for (let n = 1; n <= nPages; n++) {
    if (!present.has(n)) {
      sub.missingPages.push(n);
      sub.incidents.push(`Falta la página ${n} de la hoja`);
      // las preguntas de la página que falta quedan en blanco
      for (const q of Object.keys(doc.pages[n - 1].preguntas)) sub.answers[q] ??= '';
    }
  }
  return sub;
}

export function groupPages(pages: ScannedPage[], doc: LayoutDoc, examCode: string): { submissions: Submission[]; excluded: Excluded[] } {
  const excluded: Excluded[] = [];
  const nPages = doc.pages.length;
  const groups: ScannedPage[][] = [];
  let open: ScannedPage[] | null = null;

  for (const p of pages) {
    const qr = parseQr(p.read.qr);
    if (p.read.qr && (!qr || qr.code !== examCode)) {
      excluded.push({ page: p, reason: qr ? `Hoja de otro examen (${qr.code})` : `Código QR desconocido (${p.read.qr})` });
      continue;
    }
    if (nPages === 1 || !p.read.legible) {
      // hoja de una página, o página ilegible (no se puede saber a quién pertenece)
      if (nPages > 1 && open && !p.read.legible && open.length < nPages) {
        open.push({ ...p, read: { ...p.read, hoja_pagina: open.length + 1 } });
        continue;
      }
      groups.push([p]);
      open = null;
      continue;
    }
    const n = p.read.hoja_pagina;
    if (n === 1) {
      open = [p];
      groups.push(open);
      continue;
    }
    const compatible = (g: ScannedPage[]) => {
      if (g.some((x) => x.read.hoja_pagina === n)) return false;
      const a = g[0].read.nia;
      const b = p.read.nia;
      return hasDoubt(a) || hasDoubt(b) || a === b;
    };
    if (open && compatible(open)) {
      open.push(p);
      continue;
    }
    // página suelta: se busca una entrega incompleta con el mismo identificador
    const match = !hasDoubt(p.read.nia) ? groups.find((g) => g.length < nPages && g[0].read.nia === p.read.nia && compatible(g)) : undefined;
    if (match) match.push(p);
    else groups.push([p]);
    open = null;
  }

  return { submissions: groups.map((g) => build(g, doc)), excluded };
}

export { allUnknown, hasDoubt };
