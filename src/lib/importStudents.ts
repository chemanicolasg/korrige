/** Importación de la lista de clase desde CSV o Excel. */
import type { StudentRow } from './service';

const norm = (s: unknown) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const COLUMNS: Record<keyof StudentRow, string[]> = {
  identifier: ['identificador', 'id', 'nia', 'dni', 'nif', 'nie', 'expediente', 'numerodeid', 'idnumber', 'niu', 'matricula', 'codigo', 'numero'],
  last_name: ['apellidos', 'apellido', 'apellidos1', 'lastname', 'surname', 'cognoms'],
  first_name: ['nombre', 'firstname', 'name', 'nom'],
  email: ['email', 'correo', 'correoelectronico', 'direcciondecorreo', 'mail', 'emailaddress'],
  group_name: ['grupo', 'group', 'grup', 'clase'],
};

export interface ParsedStudents {
  rows: StudentRow[];
  /** Filas descartadas por no tener identificador válido. */
  skipped: number;
  /** Columnas reconocidas (campo → cabecera original). */
  mapping: Partial<Record<keyof StudentRow, string>>;
}

/** Convierte una tabla (primera fila = cabeceras) en alumnos. */
export function tableToStudents(table: unknown[][], idDigits: number): ParsedStudents {
  const rows = table.filter((r) => r.some((c) => String(c ?? '').trim() !== ''));
  if (!rows.length) return { rows: [], skipped: 0, mapping: {} };
  const header = rows[0].map(norm);
  const idx: Partial<Record<keyof StudentRow, number>> = {};
  const mapping: ParsedStudents['mapping'] = {};
  for (const [field, names] of Object.entries(COLUMNS) as [keyof StudentRow, string[]][]) {
    const i = header.findIndex((h) => names.includes(h));
    if (i >= 0) {
      idx[field] = i;
      mapping[field] = String(rows[0][i]);
    }
  }
  // sin cabeceras reconocibles: se asume identificador, apellidos, nombre, email, grupo
  const hasHeader = idx.identifier !== undefined;
  if (!hasHeader) (['identifier', 'last_name', 'first_name', 'email', 'group_name'] as const).forEach((f, i) => (idx[f] = i));
  const cell = (r: unknown[], f: keyof StudentRow) => (idx[f] === undefined ? '' : String(r[idx[f]!] ?? '').trim());
  const out = new Map<string, StudentRow>();
  let skipped = 0;
  for (const r of rows.slice(hasHeader ? 1 : 0)) {
    let id = cell(r, 'identifier').replace(/\.0+$/, '').replace(/[\s.-]/g, '');
    // DNI con letra: la hoja solo tiene dígitos
    id = id.replace(/\D/g, '');
    if (!id) {
      skipped++;
      continue;
    }
    if (id.length < idDigits) id = id.padStart(idDigits, '0'); // Excel se come los ceros a la izquierda
    out.set(id, { identifier: id, last_name: cell(r, 'last_name'), first_name: cell(r, 'first_name'), email: cell(r, 'email'), group_name: cell(r, 'group_name') });
  }
  return { rows: [...out.values()], skipped, mapping };
}

export async function parseStudentsFile(file: File, idDigits: number): Promise<ParsedStudents> {
  const XLSX = await import('xlsx');
  const isCsv = /\.(csv|txt|tsv)$/i.test(file.name);
  const wb = isCsv ? XLSX.read(await file.text(), { type: 'string', raw: true }) : XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const table = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '', raw: false });
  return tableToStudents(table, idDigits);
}
