import { useMemo, useRef, useState } from 'react';
import { Empty, ErrorBox, Modal, Notice } from '../../components/ui';
import { tr, trn } from '../../i18n/app';
import { ParsedStudents, parseStudentsFile } from '../../lib/importStudents';
import { importStudents, isStudentSheet } from '../../lib/service';
import { hasDoubt } from '../../omr/group';
import { useExam } from '../ExamPage';

export default function TabStudents() {
  const { data, db, run, readOnly, busy, userId } = useExam();
  const file = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedStudents | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'todos' | 'sin_hoja' | 'con_hoja'>('todos');
  const label = data.exam.sheet_config.idLabel;

  const sheetsById = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of data.sheets) if (isStudentSheet(s)) m.set(s.identifier, (m.get(s.identifier) ?? 0) + 1);
    return m;
  }, [data.sheets]);
  const roster = useMemo(() => new Set(data.students.map((s) => s.identifier)), [data.students]);
  const orphan = data.sheets.filter((s) => isStudentSheet(s) && !hasDoubt(s.identifier) && !roster.has(s.identifier));
  const missing = data.students.filter((s) => !sheetsById.has(s.identifier));
  const shown = data.students.filter((s) => (filter === 'todos' ? true : filter === 'sin_hoja' ? !sheetsById.has(s.identifier) : sheetsById.has(s.identifier)));
  const hasSheets = data.sheets.some(isStudentSheet);

  async function onFile(f: File | undefined) {
    if (!f) return;
    setError('');
    try {
      const p = await parseStudentsFile(f, data.exam.sheet_config.idDigits);
      if (!p.rows.length) throw new Error(tr('No se ha encontrado ningún alumno en el archivo. Revisa que la primera columna (o una columna llamada «identificador», «NIA», «DNI»…) tenga los números.'));
      setParsed(p);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (file.current) file.current.value = '';
    }
  }
  const doImport = (replace: boolean) =>
    run((d) => importStudents(db, d, userId, parsed!.rows, replace)).then((ok) => {
      if (ok) setParsed(null);
    });

  const picker = !readOnly && (
    <>
      <input ref={file} type="file" accept=".csv,.txt,.xlsx,.xls" className="hidden" data-testid="students-input" onChange={(e) => void onFile(e.target.files?.[0])} />
      <button className="btn-primary" onClick={() => file.current?.click()}>
        {tr('Importar lista (CSV o Excel)')}
      </button>
    </>
  );

  return (
    <div className="space-y-4">
      <ErrorBox error={error} />
      {data.students.length === 0 ? (
        <Empty title={tr('Aún no has importado la lista de clase')} action={picker}>
          {tr(
            'Es opcional, pero permite ver nombres en lugar de números, detectar {label} mal marcados y saber quién no ha entregado. Sube un CSV o Excel con las columnas: identificador ({label}), apellidos, nombre, email y grupo.',
            { label },
          )}
        </Empty>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm">
              {(
                [
                  ['todos', tr('Todos ({n})', { n: data.students.length })],
                  ['con_hoja', tr('Con hoja ({n})', { n: data.students.length - missing.length })],
                  ['sin_hoja', tr('Sin entregar ({n})', { n: missing.length })],
                ] as const
              ).map(([k, l]) => (
                <button key={k} className={`rounded-md px-3 py-1.5 ${filter === k ? 'bg-brand-700 text-white' : 'hover:bg-slate-100'}`} onClick={() => setFilter(k)}>
                  {l}
                </button>
              ))}
            </div>
            <div className="ml-auto">{picker}</div>
          </div>
          {hasSheets && orphan.length > 0 && (
            <Notice tone="warn">
              {tr('Hay {n} hoja(s) cuyo {label} no está en la lista: {lista}. Revísalas en la pestaña Revisión.', {
                n: orphan.length,
                label,
                lista: orphan.slice(0, 10).map((s) => s.identifier).join(', ') + (orphan.length > 10 ? '…' : ''),
              })}
            </Notice>
          )}
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  {[label, tr('Apellidos'), tr('Nombre'), tr('Email'), tr('Grupo'), tr('Hoja')].map((h) => (
                    <th key={h} className="th">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map((s) => (
                  <tr key={s.id}>
                    <td className="td font-mono">{s.identifier}</td>
                    <td className="td">{s.last_name}</td>
                    <td className="td">{s.first_name}</td>
                    <td className="td text-slate-600">{s.email}</td>
                    <td className="td">{s.group_name}</td>
                    <td className="td">
                      {sheetsById.has(s.identifier) ? (
                        <span className="badge bg-emerald-100 text-emerald-800">{tr('Entregada')}{sheetsById.get(s.identifier)! > 1 ? ` ×${sheetsById.get(s.identifier)}` : ''}</span>
                      ) : hasSheets ? (
                        <span className="badge bg-amber-100 text-amber-800">{tr('Sin entregar')}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {parsed && (
        <Modal title={tr('Importar lista de alumnos')} onClose={() => setParsed(null)}>
          <p className="text-sm text-slate-700">
            {parsed.skipped > 0
              ? trn('Se han leído {n} alumnos ({k} filas sin identificador se han ignorado).', { n: <b>{parsed.rows.length}</b>, k: parsed.skipped })
              : trn('Se han leído {n} alumnos.', { n: <b>{parsed.rows.length}</b> })}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {tr('Columnas reconocidas: {cols}.', {
              cols: Object.keys(parsed.mapping).length
                ? Object.values(parsed.mapping).join(', ')
                : tr('ninguna cabecera conocida; se asume el orden identificador, apellidos, nombre, email, grupo'),
            })}
          </p>
          <table className="mt-3 w-full text-xs">
            <tbody className="divide-y divide-slate-100">
              {parsed.rows.slice(0, 5).map((r) => (
                <tr key={r.identifier}>
                  <td className="py-1 font-mono">{r.identifier}</td>
                  <td>{r.last_name}</td>
                  <td>{r.first_name}</td>
                  <td>{r.email}</td>
                  <td>{r.group_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {parsed.rows.length > 5 && <p className="mt-1 text-xs text-slate-400">{tr('… y {n} más', { n: parsed.rows.length - 5 })}</p>}
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <button className="btn" onClick={() => setParsed(null)}>
              {tr('Cancelar')}
            </button>
            {data.students.length > 0 && (
              <button className="btn" disabled={busy} onClick={() => void doImport(false)}>
                {tr('Añadir a la lista actual')}
              </button>
            )}
            <button className="btn-primary" disabled={busy} onClick={() => void doImport(true)}>
              {data.students.length > 0 ? tr('Sustituir la lista') : tr('Importar')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
