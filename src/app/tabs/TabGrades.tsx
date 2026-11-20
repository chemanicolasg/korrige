import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { scoreColor } from '../../components/SheetOverlay';
import { Empty, Modal, Notice, fmtNum } from '../../components/ui';
import { downloadBlob, fileSlug, toMoodleCsv, toXlsx } from '../../lib/exportData';
import { gradeSheet } from '../../lib/grading';
import { correctSheet, currentKeys, isLegible, isStudentSheet, logAudit, sheetModel } from '../../lib/service';
import { INVALID, Result, Sheet, Student } from '../../lib/types';
import { modelLetters, optionLetters } from '../../omr/layout';
import { useExam } from '../ExamPage';
import { SheetImage } from '../SheetImage';

interface Row {
  sheet: Sheet;
  student?: Student;
  result?: Result;
  pending: number;
  name: string;
  state: 'ok' | 'pendiente' | 'sin_nota' | 'excluida';
}
type SortKey = 'name' | 'identifier' | 'model' | 'n_correct' | 'n_wrong' | 'n_blank' | 'raw' | 'grade' | 'state';

const STATE_LABEL = { ok: 'Revisada', pendiente: 'Pendiente de revisión', sin_nota: 'Sin nota', excluida: 'Excluida' };
const STATE_CLS = { ok: 'bg-emerald-100 text-emerald-800', pendiente: 'bg-amber-100 text-amber-800', sin_nota: 'bg-red-100 text-red-800', excluida: 'bg-slate-200 text-slate-600' };

function Detail({ row, onClose }: { row: Row; onClose: () => void }) {
  const { data, db, run, readOnly, busy, userId } = useExam();
  const sheet = data.sheets.find((s) => s.id === row.sheet.id) ?? row.sheet;
  const cfg = data.exam.sheet_config;
  const options = optionLetters(cfg);
  const model = sheetModel(data.exam, sheet);
  const key = model ? currentKeys(data.keys)[model] : undefined;
  const g = key ? gradeSheet(sheet.answers, key.answers, cfg.nQuestions, cfg.nOptions, data.exam.grading_config) : null;
  const result = data.results.find((r) => r.sheet_id === sheet.id);
  const [editing, setEditing] = useState<number | null>(null);
  const [overlay, setOverlay] = useState(true);
  const set = (q: number, v: string) => {
    setEditing(null);
    void run((d) => correctSheet(db, d, userId, sheet.id, { answers: { [String(q)]: v } }, 'edición desde Notas'));
  };
  const cell: Record<string, string> = { acierto: 'bg-emerald-100 text-emerald-900', error: 'bg-red-100 text-red-900', blanco: 'bg-white text-slate-400', anulada: 'bg-slate-200 text-slate-500 line-through', sin_clave: 'bg-amber-50 text-amber-800' };
  return (
    <Modal wide title={`${row.name || sheet.identifier} · ${cfg.idLabel} ${sheet.identifier}`} onClose={onClose}>
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            <span>
              Modelo <b>{model ?? '—'}</b>
            </span>
            {result ? (
              <>
                <span className="text-emerald-700">{result.n_correct} aciertos</span>
                <span className="text-red-700">{result.n_wrong} errores</span>
                <span className="text-slate-500">{result.n_blank} en blanco</span>
                {result.n_void > 0 && <span className="text-slate-500">{result.n_void} anuladas</span>}
                <span className="text-lg font-semibold">Nota: {fmtNum(result.grade, data.exam.grading_config.decimals)}</span>
              </>
            ) : (
              <span className="text-amber-700">{sheet.excluded ? `Excluida: ${sheet.excluded_reason ?? ''}` : !model ? 'Sin modelo: no se puede corregir' : !key ? `Falta la plantilla del modelo ${model}` : 'Sin nota'}</span>
            )}
          </div>
          {!readOnly && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              {cfg.nModels > 1 && (
                <label className="flex items-center gap-1.5">
                  Modelo:
                  <select className="input w-auto py-1" value={sheet.model ?? ''} disabled={busy} onChange={(e) => void run((d) => correctSheet(db, d, userId, sheet.id, { model: e.target.value || null }, 'edición desde Notas'))}>
                    <option value="">—</option>
                    {modelLetters(cfg).map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </label>
              )}
              <button
                className="btn btn-sm"
                disabled={busy}
                onClick={() => {
                  const v = prompt(`${cfg.idLabel} de esta hoja:`, sheet.identifier.replace(/\?/g, ''));
                  if (v && /^\d+$/.test(v.trim())) void run((d) => correctSheet(db, d, userId, sheet.id, { identifier: v.trim() }, 'edición desde Notas'));
                }}
              >
                Cambiar {cfg.idLabel}
              </button>
              <button className="btn btn-sm" disabled={busy} onClick={() => void run((d) => correctSheet(db, d, userId, sheet.id, { excluded: !sheet.excluded, excluded_reason: 'Excluida manualmente' }, 'edición desde Notas'))}>
                {sheet.excluded ? 'Volver a incluir la hoja' : 'Excluir hoja'}
              </button>
            </div>
          )}
          <h3 className="mt-4 text-sm font-semibold text-slate-600">Respuestas frente a la plantilla {key ? `(v${key.version})` : ''}</h3>
          <div className="mt-2 grid grid-cols-5 gap-1 text-xs sm:grid-cols-8 xl:grid-cols-10">
            {Array.from({ length: cfg.nQuestions }, (_, i) => {
              const q = i + 1;
              const a = sheet.answers[String(q)] ?? '';
              const o = g?.outcomes[String(q)] ?? 'sin_clave';
              const correct = key?.answers[String(q)]?.c.join('') ?? '';
              const changed = (sheet.answers_read[String(q)] ?? '') !== a;
              return (
                <div key={q} className="relative">
                  <button
                    disabled={readOnly}
                    onClick={() => setEditing(editing === q ? null : q)}
                    title={`Pregunta ${q}: ${a === INVALID ? 'nula' : a || 'en blanco'} · correcta: ${correct || '—'}${changed ? ' · corregida a mano' : ''}${sheet.marks[String(q)] ? ` · lectura: ${sheet.marks[String(q)].e} ${sheet.marks[String(q)].v}` : ''}`}
                    className={`w-full rounded border px-1 py-0.5 text-left tabular-nums ${cell[o]} ${changed ? 'border-brand-500' : 'border-slate-200'}`}
                  >
                    <span className="text-[10px] text-slate-500">{q}</span> <b>{a === INVALID ? '✕' : a || '·'}</b>
                    {o === 'error' && correct && <span className="float-right text-[10px] text-emerald-700">{correct}</span>}
                  </button>
                  {editing === q && (
                    <div className="absolute left-0 top-full z-10 mt-1 flex gap-1 rounded-lg border border-slate-300 bg-white p-1.5 shadow-lg">
                      {options.map((op) => (
                        <button key={op} className="btn btn-sm" onClick={() => set(q, op)}>
                          {op}
                        </button>
                      ))}
                      <button className="btn btn-sm" onClick={() => set(q, '')} title="En blanco">
                        ·
                      </button>
                      <button className="btn btn-sm" onClick={() => set(q, INVALID)} title="Nula (cuenta como error)">
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Verde = acierto · rojo = error (a la derecha, la correcta) · tachada = anulada · borde azul = corregida a mano.{!readOnly && ' Haz clic en una respuesta para corregirla; queda registrado.'}
          </p>
          {sheet.incidents.length > 0 && <p className="mt-2 text-xs text-slate-500">Avisos de lectura: {sheet.incidents.join(' · ')}</p>}
        </div>
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={overlay} onChange={(e) => setOverlay(e.target.checked)} />
            <span>
              Mostrar la lectura sobre la imagen: <b style={{ color: scoreColor(1) }}>verde</b> = marcada, <b style={{ color: scoreColor(0.3) }}>naranja</b> = floja,{' '}
              <b style={{ color: scoreColor(0) }}>gris</b> = vacía
            </span>
          </label>
          <div className="space-y-3">
            {sheet.pages.map((p) => (
              <SheetImage key={p.hoja_pagina} sheet={sheet} layout={data.layout} page={p.hoja_pagina} showOverlay={overlay} className="w-full rounded-lg border border-slate-200" />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function TabGrades() {
  const { data, db, readOnly } = useExam();
  const [q, setQ] = useState('');
  const [fModel, setFModel] = useState('');
  const [fState, setFState] = useState('');
  const [sort, setSort] = useState<{ k: SortKey; asc: boolean }>({ k: 'name', asc: true });
  const [open, setOpen] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const cfg = data.exam.sheet_config;
  const dec = data.exam.grading_config.decimals;

  const rows = useMemo<Row[]>(() => {
    const students = new Map(data.students.map((s) => [s.identifier, s]));
    const results = new Map(data.results.map((r) => [r.sheet_id, r]));
    const pend = new Map<string, number>();
    for (const it of data.items) if (it.status === 'pendiente') pend.set(it.sheet_id, (pend.get(it.sheet_id) ?? 0) + 1);
    return data.sheets
      .filter((s) => !s.is_key)
      .map((sheet) => {
        const student = students.get(sheet.identifier);
        const result = results.get(sheet.id);
        const pending = pend.get(sheet.id) ?? 0;
        return {
          sheet,
          student,
          result,
          pending,
          name: student ? `${student.last_name}, ${student.first_name}` : '',
          state: sheet.excluded ? 'excluida' : pending ? 'pendiente' : result ? 'ok' : 'sin_nota',
        } as Row;
      });
  }, [data]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const val = (r: Row): string | number => {
      switch (sort.k) {
        case 'name':
          return r.name || `~${r.sheet.identifier}`;
        case 'identifier':
          return r.sheet.identifier;
        case 'model':
          return r.sheet.model ?? '';
        case 'state':
          return r.state;
        default:
          return r.result?.[sort.k] ?? -Infinity;
      }
    };
    return rows
      .filter((r) => (fState ? r.state === fState : r.state !== 'excluida' || !!needle))
      .filter((r) => !fModel || r.sheet.model === fModel)
      .filter((r) => !needle || `${r.name} ${r.sheet.identifier} ${r.student?.email ?? ''} ${r.student?.group_name ?? ''}`.toLowerCase().includes(needle))
      .sort((a, b) => {
        const x = val(a);
        const y = val(b);
        const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es', { numeric: true });
        return sort.asc ? c : -c;
      });
  }, [rows, q, fModel, fState, sort]);

  if (!data.sheets.some(isStudentSheet) && !rows.length) {
    return (
      <Empty
        title="Aún no hay notas"
        action={
          <Link className="btn-primary" to="../subir">
            Subir hojas
          </Link>
        }
      >
        Aún no has subido hojas. Escanea el taco en la fotocopiadora y sube el PDF: las notas aparecerán aquí al momento.
      </Empty>
    );
  }

  const keys = currentKeys(data.keys);
  const missingKeys = modelLetters(cfg).filter((m) => !keys[m] && data.sheets.some((s) => isStudentSheet(s) && sheetModel(data.exam, s) === m));
  const excluded = rows.filter((r) => r.state === 'excluida').length;
  const illegible = data.sheets.filter((s) => isStudentSheet(s) && !isLegible(s)).length;
  const th = (k: SortKey, label: string, num = false) => (
    <th className={`th ${num ? 'text-right' : ''}`} aria-sort={sort.k === k ? (sort.asc ? 'ascending' : 'descending') : 'none'}>
      <button className="font-semibold uppercase tracking-wide hover:text-slate-900" onClick={() => setSort({ k, asc: sort.k === k ? !sort.asc : !num })}>
        {label}
        {sort.k === k ? (sort.asc ? ' ▲' : ' ▼') : ''}
      </button>
    </th>
  );

  async function doExport(kind: 'xlsx' | 'moodle') {
    setExporting(true);
    try {
      const name = `notas-${fileSlug(data.exam.title)}-${data.exam.code}`;
      if (kind === 'xlsx') downloadBlob((await toXlsx(data)) as BlobPart, `${name}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      else downloadBlob(toMoodleCsv(data), `${name}-moodle.csv`, 'text/csv;charset=utf-8');
      await logAudit(db, data.exam.org_id, data.exam.id, 'exportacion', { formato: kind === 'xlsx' ? 'Excel' : 'CSV Moodle', filas: data.results.length });
    } finally {
      setExporting(false);
    }
  }

  const openRow = rows.find((r) => r.sheet.id === open);
  return (
    <div className="space-y-4">
      {missingKeys.length > 0 && (
        <Notice tone="warn">
          Falta la plantilla de respuestas del modelo {missingKeys.join(', ')}: esas hojas no tienen nota todavía.{' '}
          <Link className="font-medium underline" to="../plantillas">
            Definir plantilla
          </Link>
        </Notice>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <input className="input w-56" placeholder="Buscar alumno o identificador…" aria-label="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
        {cfg.nModels > 1 && (
          <select className="input w-auto" aria-label="Filtrar por modelo" value={fModel} onChange={(e) => setFModel(e.target.value)}>
            <option value="">Todos los modelos</option>
            {modelLetters(cfg).map((m) => (
              <option key={m} value={m}>
                Modelo {m}
              </option>
            ))}
          </select>
        )}
        <select className="input w-auto" aria-label="Filtrar por estado" value={fState} onChange={(e) => setFState(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="ok">Revisadas</option>
          <option value="pendiente">Pendientes de revisión</option>
          <option value="sin_nota">Sin nota</option>
          <option value="excluida">Excluidas ({excluded})</option>
        </select>
        <span className="text-sm text-slate-500">
          {shown.length} hojas{illegible > 0 && ` · ${illegible} ilegibles`}
        </span>
        <div className="ml-auto flex gap-2">
          <button className="btn" disabled={exporting || !data.results.length} onClick={() => void doExport('xlsx')}>
            Exportar a Excel
          </button>
          <button className="btn" disabled={exporting || !data.results.length} onClick={() => void doExport('moodle')}>
            CSV para Moodle
          </button>
        </div>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full" data-testid="grades-table">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              {th('name', 'Alumno')}
              {th('identifier', cfg.idLabel)}
              {cfg.nModels > 1 && th('model', 'Modelo')}
              {th('n_correct', 'Aciertos', true)}
              {th('n_wrong', 'Errores', true)}
              {th('n_blank', 'En blanco', true)}
              {th('raw', 'Bruta', true)}
              {th('grade', 'Nota', true)}
              {th('state', 'Estado')}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.map((r) => (
              <tr key={r.sheet.id} className={`cursor-pointer hover:bg-slate-50 ${r.state === 'excluida' ? 'text-slate-400' : ''}`} onClick={() => setOpen(r.sheet.id)}>
                <td className="td">
                  <button className="text-left font-medium text-brand-800 hover:underline" onClick={() => setOpen(r.sheet.id)}>
                    {r.name || <span className="font-normal italic text-slate-500">(no está en la lista)</span>}
                  </button>
                </td>
                <td className="td font-mono">{r.sheet.identifier}</td>
                {cfg.nModels > 1 && <td className="td">{r.sheet.model ?? '—'}</td>}
                <td className="td text-right tabular-nums">{r.result?.n_correct ?? '—'}</td>
                <td className="td text-right tabular-nums">{r.result?.n_wrong ?? '—'}</td>
                <td className="td text-right tabular-nums">{r.result?.n_blank ?? '—'}</td>
                <td className="td text-right tabular-nums">{r.result ? fmtNum(r.result.raw, 2) : '—'}</td>
                <td className="td text-right text-base font-semibold tabular-nums">{r.result ? fmtNum(r.result.grade, dec) : '—'}</td>
                <td className="td">
                  <span className={`badge ${STATE_CLS[r.state]}`}>
                    {STATE_LABEL[r.state]}
                    {r.pending > 0 && ` (${r.pending})`}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <p className="p-4 text-sm text-slate-500">Ninguna hoja coincide con los filtros.</p>}
      </div>
      {readOnly && <p className="text-xs text-slate-500">Examen cerrado: las notas no se pueden modificar.</p>}
      {openRow && <Detail row={openRow} onClose={() => setOpen(null)} />}
    </div>
  );
}
