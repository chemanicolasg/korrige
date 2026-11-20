/** Generación de la cola de revisión a partir de una entrega leída (función pura). */
import type { Submission } from '../omr/group';
import type { ReviewKind } from './types';

export interface NewReviewItem {
  kind: ReviewKind;
  question: number | null;
  detail: Record<string, unknown>;
}

export interface ReviewContext {
  nModels: number;
  /** Identificadores de la lista de clase (vacío = no hay lista importada). */
  roster: Set<string>;
  /** Identificadores repetidos (en esta tanda o con hojas ya guardadas). */
  duplicates: Set<string>;
}

type SubLike = Pick<Submission, 'legible' | 'blank' | 'isKey' | 'qrRead' | 'missingPages' | 'identifier' | 'model' | 'marks' | 'modelValue' | 'modelState'>;

export function buildReviewItems(sub: SubLike, ctx: ReviewContext): NewReviewItem[] {
  if (!sub.legible) return [{ kind: 'ilegible', question: null, detail: {} }];
  // Las plantillas no generan incidencias: se revisan en la pestaña Plantillas
  if (sub.isKey) return [];
  if (sub.blank) return [{ kind: 'en_blanco', question: null, detail: {} }];

  const items: NewReviewItem[] = [];
  if (!sub.qrRead) items.push({ kind: 'qr', question: null, detail: {} });
  for (const p of sub.missingPages) items.push({ kind: 'pagina_faltante', question: null, detail: { pagina: p } });

  if (sub.identifier.includes('?')) {
    items.push({ kind: 'id_dudoso', question: null, detail: { leido: sub.identifier } });
  } else {
    if (ctx.duplicates.has(sub.identifier)) items.push({ kind: 'id_duplicado', question: null, detail: { leido: sub.identifier } });
    if (ctx.roster.size && !ctx.roster.has(sub.identifier)) items.push({ kind: 'id_no_en_lista', question: null, detail: { leido: sub.identifier } });
  }
  if (ctx.nModels > 1 && !sub.model) items.push({ kind: 'modelo', question: null, detail: { leido: sub.modelValue, estado: sub.modelState } });

  for (const [q, m] of Object.entries(sub.marks).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    if (m.e === 'doble' || m.e === 'floja') items.push({ kind: m.e, question: Number(q), detail: { leido: m.v } });
  }
  return items;
}

/** Identificadores repetidos dentro de una lista (ignora los dudosos). */
export function findDuplicates(ids: string[]): Set<string> {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const id of ids) {
    if (!id || id.includes('?')) continue;
    if (seen.has(id)) dup.add(id);
    seen.add(id);
  }
  return dup;
}
