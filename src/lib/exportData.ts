/** Exportación de notas: Excel (.xlsx) y CSV compatible con Moodle. */
import { tr } from '../i18n/app';
import { ExamData, isStudentSheet } from './service';

export interface ExportRow {
  identifier: string;
  last_name: string;
  first_name: string;
  email: string;
  group_name: string;
  model: string;
  n_correct: number;
  n_wrong: number;
  n_blank: number;
  n_void: number;
  raw: number;
  grade: number;
  /** Incidencias pendientes de revisar en la hoja. */
  pending: number;
}

/** Una fila por hoja corregida, ordenada por apellidos e identificador. */
export function exportRows(data: ExamData): ExportRow[] {
  const students = new Map(data.students.map((s) => [s.identifier, s]));
  const results = new Map(data.results.map((r) => [r.sheet_id, r]));
  const rows: ExportRow[] = [];
  for (const s of data.sheets) {
    const r = results.get(s.id);
    if (!r || !isStudentSheet(s)) continue;
    const st = students.get(s.identifier);
    rows.push({
      identifier: s.identifier,
      last_name: st?.last_name ?? '',
      first_name: st?.first_name ?? '',
      email: st?.email ?? '',
      group_name: st?.group_name ?? '',
      model: data.exam.sheet_config.nModels > 1 ? (s.model ?? '') : 'A',
      n_correct: r.n_correct,
      n_wrong: r.n_wrong,
      n_blank: r.n_blank,
      n_void: r.n_void,
      raw: r.raw,
      grade: r.grade,
      pending: data.items.filter((it) => it.sheet_id === s.id && it.status === 'pendiente').length,
    });
  }
  return rows.sort((a, b) => a.last_name.localeCompare(b.last_name, 'es') || a.first_name.localeCompare(b.first_name, 'es') || a.identifier.localeCompare(b.identifier));
}

const csvCell = (v: string | number) => (typeof v === 'number' ? String(v) : `"${v.replace(/"/g, '""')}"`);

/**
 * CSV para "Calificaciones → Importar → Archivo CSV" de Moodle: UTF-8 con BOM,
 * separador coma y punto decimal. Se puede emparejar por "Número de ID" o por email.
 * Las cabeceras NO se traducen: Moodle las reconoce por su nombre al importar.
 */
export function toMoodleCsv(data: ExamData): string {
  const header = ['Número de ID', 'Dirección de correo', 'Apellido(s)', 'Nombre', data.exam.title];
  const lines = [header.map(csvCell).join(',')];
  for (const r of exportRows(data)) lines.push([r.identifier, r.email, r.last_name, r.first_name, r.grade].map(csvCell).join(','));
  return `${String.fromCharCode(0xfeff)}${lines.join('\r\n')}\r\n`;
}

/** Libro Excel con las notas y, en una segunda hoja, las respuestas de cada alumno. */
export async function toXlsx(data: ExamData): Promise<Uint8Array> {
  const XLSX = await import('xlsx');
  const label = data.exam.sheet_config.idLabel || tr('Identificador');
  const rows = exportRows(data).map((r) => ({
    [label]: r.identifier,
    [tr('Apellidos')]: r.last_name,
    [tr('Nombre')]: r.first_name,
    [tr('Email')]: r.email,
    [tr('Grupo')]: r.group_name,
    [tr('Modelo')]: r.model,
    [tr('Aciertos')]: r.n_correct,
    [tr('Errores')]: r.n_wrong,
    [tr('En blanco')]: r.n_blank,
    [tr('Anuladas')]: r.n_void,
    [tr('Puntuación bruta')]: r.raw,
    [tr('Nota')]: r.grade,
    [tr('Pendiente de revisión')]: r.pending ? tr('Sí ({n})', { n: r.pending }) : tr('No'),
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 14 }, { wch: 26 }, { wch: 20 }, { wch: 28 }, { wch: 10 }, { wch: 8 }, { wch: 9 }, { wch: 9 }, { wch: 10 }, { wch: 9 }, { wch: 16 }, { wch: 8 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws, tr('Notas'));

  const n = data.exam.sheet_config.nQuestions;
  const results = new Set(data.results.map((r) => r.sheet_id));
  const answers = data.sheets
    .filter((s) => isStudentSheet(s) && results.has(s.id))
    .map((s) => {
      const row: Record<string, string> = { [label]: s.identifier, [tr('Modelo')]: s.model ?? '' };
      for (let q = 1; q <= n; q++) row[tr('P{q}', { q })] = s.answers[String(q)] === '*' ? tr('NULA') : (s.answers[String(q)] ?? '');
      return row;
    });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(answers), tr('Respuestas'));
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
}

export function downloadBlob(data: BlobPart, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function fileSlug(s: string): string {
  return (
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'examen'
  );
}
