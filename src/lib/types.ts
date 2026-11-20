import type { LayoutDoc, SheetConfig } from '../omr/layout';
import type { Mark } from '../omr/group';

export type OrgRole = 'admin' | 'profesor';
export type ExamStatus = 'borrador' | 'hojas_descargadas' | 'con_resultados' | 'cerrado';

export const STATUS_LABEL: Record<ExamStatus, string> = {
  borrador: 'Borrador',
  hojas_descargadas: 'Hojas descargadas',
  con_resultados: 'Con resultados',
  cerrado: 'Cerrado',
};

export interface Organization {
  id: string;
  name: string;
  retention_months: number | null;
  exam_defaults?: ExamDefaults | null;
  created_at: string;
}
export interface Profile {
  id: string;
  email: string;
  full_name: string;
}
export interface Membership {
  org_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
}
export interface Invitation {
  id: string;
  org_id: string;
  email: string;
  role: OrgRole;
  invited_by: string | null;
  created_at: string;
  accepted_at: string | null;
}

export type Formula = 'none' | 'classic' | 'custom';
export interface GradingConfig {
  /** none: sin penalización · classic: errores/(k−1) · custom: penalización fija por error */
  formula: Formula;
  /** Puntos que resta cada error con la fórmula personalizada. */
  penalty: number;
  /** Nota máxima (por defecto 10). */
  scale: number;
  decimals: number;
  /** Permitir notas negativas (por defecto la mínima es 0). */
  allowNegative: boolean;
  /** Puntos que resta cada pregunta en blanco (por defecto 0: no restan). */
  blankPenalty?: number;
}
export const DEFAULT_GRADING: GradingConfig = { formula: 'none', penalty: 0.25, scale: 10, decimals: 2, allowNegative: false, blankPenalty: 0 };

/** Valores por defecto de la organización para los exámenes nuevos. */
export interface ExamDefaults {
  logo?: string;
  title?: string;
  idLabel?: string;
  idDigits?: number;
  grading?: GradingConfig;
}

/** Correspondencia entre modelos: modelo → (pregunta del modelo → pregunta del modelo A). */
export type ModelMap = Record<string, Record<string, number>>;

export interface Exam {
  id: string;
  org_id: string;
  owner_id: string;
  code: string;
  title: string;
  subject: string;
  group_name: string;
  session: string;
  exam_date: string | null;
  status: ExamStatus;
  sheet_config: SheetConfig;
  grading_config: GradingConfig;
  model_map: ModelMap;
  closed_at: string | null;
  images_purged_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExamLayoutRow {
  exam_id: string;
  layout: LayoutDoc;
}

/** Respuesta correcta de una pregunta: c = letras aceptadas, v = anulada. */
export interface KeyEntry {
  c: string[];
  v?: boolean;
}
export type KeyAnswers = Record<string, KeyEntry>;

export interface AnswerKey {
  id: string;
  exam_id: string;
  model: string;
  version: number;
  answers: KeyAnswers;
  source: 'manual' | 'escaneo';
  note: string;
  created_by: string | null;
  created_at: string;
}

export interface Student {
  id: string;
  exam_id: string;
  identifier: string;
  last_name: string;
  first_name: string;
  email: string;
  group_name: string;
}

export interface Upload {
  id: string;
  exam_id: string;
  file_names: string[];
  n_pages: number;
  n_sheets: number;
  n_excluded: number;
  uploaded_by: string | null;
  created_at: string;
}

export interface SheetPage {
  hoja_pagina: number;
  archivo: string;
  pdf_pagina: number;
  image_path?: string | null;
  girada: boolean;
  legible: boolean;
  qr: string | null;
  incidencias: string[];
}

export interface Sheet {
  id: string;
  exam_id: string;
  upload_id: string;
  seq: number;
  pages: SheetPage[];
  identifier_read: string;
  identifier: string;
  model_read: string | null;
  model: string | null;
  is_key: boolean;
  answers_read: Record<string, string>;
  /** letra, '' (en blanco) o '*' (nula: cuenta como error) */
  answers: Record<string, string>;
  marks: Record<string, Mark>;
  scores: Record<string, number[]>;
  id_scores: number[][];
  model_scores: number[];
  incidents: string[];
  excluded: boolean;
  excluded_reason: string | null;
  created_at: string;
}

export interface Result {
  sheet_id: string;
  exam_id: string;
  key_version: number;
  n_correct: number;
  n_wrong: number;
  n_blank: number;
  n_void: number;
  raw: number;
  grade: number;
}

export type ReviewKind =
  | 'doble'
  | 'floja'
  | 'id_dudoso'
  | 'modelo'
  | 'qr'
  | 'id_no_en_lista'
  | 'en_blanco'
  | 'id_duplicado'
  | 'pagina_faltante'
  | 'ilegible';

export const KIND_LABEL: Record<ReviewKind, string> = {
  doble: 'Doble marca',
  floja: 'Marca floja',
  id_dudoso: 'Identificador incompleto o dudoso',
  modelo: 'Modelo no marcado',
  qr: 'QR no leído',
  id_no_en_lista: 'Identificador que no está en la lista',
  en_blanco: 'Hoja en blanco',
  id_duplicado: 'Identificador duplicado',
  pagina_faltante: 'Falta una página',
  ilegible: 'Hoja ilegible',
};

export interface ReviewItem {
  id: string;
  exam_id: string;
  sheet_id: string;
  kind: ReviewKind;
  question: number | null;
  detail: Record<string, unknown>;
  status: 'pendiente' | 'resuelta';
  resolution: Record<string, unknown> | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface AuditEntry {
  id: number;
  org_id: string;
  exam_id: string | null;
  user_id: string | null;
  user_email: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

export const INVALID = '*';
