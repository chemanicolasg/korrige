import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { scoreColor } from '../../components/SheetOverlay';
import { Empty, Modal, Notice, fmtNum } from '../../components/ui';
import { tr, trn } from '../../i18n/app';
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

const STATE_LABEL = { ok: tr('Revisada'), pendiente: tr('Pendiente de revisión'), sin_nota: tr('Sin nota'), excluida: tr('Excluida') };

// Textos fijos que se guardan en castellano en la base de datos y se traducen al mostrarlos
const INCIDENT_TEXT: Record<string, string> = {
  'Hoja escaneada al revés (corregido)': tr('Hoja escaneada al revés (corregido)'),
  'No se encuentran las 4 marcas de esquina': tr('No se encuentran las 4 marcas de esquina'),
  'QR no leído': tr('QR no leído'),
};
/** Aviso de lectura guardado: los fijos se traducen (con o sin «Pág. N: » delante); los que llevan datos se dejan. */
function incidentText(inc: string): string {
  const m = /^Pág\. (\d+): (.*)$/.exec(inc);
  if (m && INCIDENT_TEXT[m[2]]) return tr('Pág. {n}: {aviso}', { n: m[1], aviso: INCIDENT_TEXT[m[2]] });
  return INCIDENT_TEXT[inc] ?? inc;
}
const REASON_TEXT: Record<string, string> = {
  'Excluida manualmente': tr('Excluida manualmente'),
  'Sustituida por una subida posterior': tr('Sustituida por una subida posterior'),
};
const MARK_TEXT: Record<string, string> = { doble: tr('doble'), floja: tr('floja') };
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
              {trn('Modelo {m}', { m: <b>{model ?? '—'}</b> })}
            </span>
            {result ? (
              <>
                <span className="text-emerald-700">{tr('{n} aciertos', { n: result.n_correct })}</span>
                <span className="text-red-700">{tr('{n} errores', { n: result.n_wrong })}</span>
                <span className="text-slate-500">{tr('{n} en blanco', { n: result.n_blank })}</span>
                {result.n_void > 0 && <span className="text-slate-500">{tr('{n} anuladas', { n: result.n_void })}</span>}
                <span className="text-lg font-semibold">{tr('Nota: {nota}', { nota: fmtNum(result.grade, data.exam.grading_config.decimals) })}</span>
              </>
            ) : (
              <span className="text-amber-700">{sheet.excluded
                  ? tr('Excluida: {motivo}', { motivo: REASON_TEXT[sheet.excluded_reason ?? ''] ?? sheet.excluded_reason ?? '' })
                  : !model
                    ? tr('Sin modelo: no se puede corregir')
                    : !key
                      ? tr('Falta la plantilla del modelo {m}', { m: model })
                      : tr('Sin nota')}</span>
            )}
          </div>
          {!readOnly && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              {cfg.nModels > 1 && (
                <label className="flex items-center gap-1.5">
                  {tr('Modelo:')}
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
                  const v = prompt(tr('{etiqueta} de esta hoja:', { etiqueta: cfg.idLabel }), sheet.identifier.replace(/\?/g, ''));
                  if (v && /^\d+$/.test(v.trim())) void run((d) => correctSheet(db, d, userId, sheet.id, { identifier: v.trim() }, 'edición desde Notas'));
                }}
              >
                {tr('Cambiar {etiqueta}', { etiqueta: cfg.idLabel })}
              </button>
              <button className="btn btn-sm" disabled={busy} onClick={() => void run((d) => correctSheet(db, d, userId, sheet.id, { excluded: !sheet.excluded, excluded_reason: 'Excluida manualmente' }, 'edición desde Notas'))}>
                {sheet.excluded ? tr('Volver a incluir la hoja') : tr('Excluir hoja')}
              </button>
            </div>
          )}
          <h3 className="mt-4 text-sm font-semibold text-slate-600">{tr('Respuestas frente a la plantilla {version}', { version: key ? `(v${key.version})` : '' })}</h3>
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
                    title={`${tr('Pregunta {q}: {respuesta} · correcta: {correcta}', { q, respuesta: a === INVALID ? tr('nula') : a || tr('en blanco'), correcta: correct || '—' })}${changed ? tr(' · corregida a mano') : ''}${
                      sheet.marks[String(q)] ? tr(' · lectura: {estado} {valor}', { estado: MARK_TEXT[sheet.marks[String(q)].e] ?? sheet.marks[String(q)].e, valor: sheet.marks[String(q)].v }) : ''
                    }`}
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
                      <button className="btn btn-sm" onClick={() => set(q, '')} title={tr('En blanco')}>
                        ·
                      </button>
                      <button className="btn btn-sm" onClick={() => set(q, INVALID)} title={tr('Nula (cuenta como error)')}>
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {tr('Verde = acierto · rojo = error (a la derecha, la correcta) · tachada = anulada · borde azul = corregida a mano.')}
            {!readOnly && tr(' Haz clic en una respuesta para corregirla; queda registrado.')}
          </p>
          {sheet.incidents.length > 0 && <p className="mt-2 text-xs text-slate-500">{tr('Avisos de lectura: {avisos}', { avisos: sheet.incidents.map(incidentText).join(' · ') })}</p>}
        </div>
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={overlay} onChange={(e) => setOverlay(e.target.checked)} />
            <span>
              {trn('Mostrar la lectura sobre la imagen: {verde} = marcada, {naranja} = floja, {gris} = vacía', {
                verde: <b style={{ color: scoreColor(1) }}>{tr('verde')}</b>,
                naranja: <b style={{ color: scoreColor(0.3) }}>{tr('naranja')}</b>,
                gris: <b style={{ color: scoreColor(0) }}>{tr('gris')}</b>,
              })}
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
        title={tr('Aún no hay notas')}
        action={
          <Link className="btn-primary" to="../subir">
            {tr('Subir hojas')}
          </Link>
        }
      >
        {tr('Aún no has subido hojas. Escanea el taco en la fotocopiadora y sube el PDF: las notas aparecerán aquí al momento.')}
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
          {trn('Falta la plantilla de respuestas del modelo {modelos}: esas hojas no tienen nota todavía. {link}', {
            modelos: missingKeys.join(', '),
            link: (
              <Link className="font-medium underline" to="../plantillas">
                {tr('Definir plantilla')}
              </Link>
            ),
          })}
        </Notice>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <input className="input w-56" placeholder={tr('Buscar alumno o identificador…')} aria-label={tr('Buscar')} value={q} onChange={(e) => setQ(e.target.value)} />
        {cfg.nModels > 1 && (
          <select className="input w-auto" aria-label={tr('Filtrar por modelo')} value={fModel} onChange={(e) => setFModel(e.target.value)}>
            <option value="">{tr('Todos los modelos')}</option>
            {modelLetters(cfg).map((m) => (
              <option key={m} value={m}>
                {tr('Modelo {m}', { m })}
              </option>
            ))}
          </select>
        )}
        <select className="input w-auto" aria-label={tr('Filtrar por estado')} value={fState} onChange={(e) => setFState(e.target.value)}>
          <option value="">{tr('Todos los estados')}</option>
          <option value="ok">{tr('Revisadas')}</option>
          <option value="pendiente">{tr('Pendientes de revisión')}</option>
          <option value="sin_nota">{tr('Sin nota')}</option>
          <option value="excluida">{tr('Excluidas ({n})', { n: excluded })}</option>
        </select>
        <span className="text-sm text-slate-500">
          {tr('{n} hojas', { n: shown.length })}
          {illegible > 0 && tr(' · {n} ilegibles', { n: illegible })}
        </span>
        <div className="ml-auto flex gap-2">
          <button className="btn" disabled={exporting || !data.results.length} onClick={() => void doExport('xlsx')}>
            {tr('Exportar a Excel')}
          </button>
          <button className="btn" disabled={exporting || !data.results.length} onClick={() => void doExport('moodle')}>
            {tr('CSV para Moodle')}
          </button>
        </div>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full" data-testid="grades-table">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              {th('name', tr('Alumno'))}
              {th('identifier', cfg.idLabel)}
              {cfg.nModels > 1 && th('model', tr('Modelo'))}
              {th('n_correct', tr('Aciertos'), true)}
              {th('n_wrong', tr('Errores'), true)}
              {th('n_blank', tr('En blanco'), true)}
              {th('raw', tr('Bruta'), true)}
              {th('grade', tr('Nota'), true)}
              {th('state', tr('Estado'))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.map((r) => (
              <tr key={r.sheet.id} className={`cursor-pointer hover:bg-slate-50 ${r.state === 'excluida' ? 'text-slate-400' : ''}`} onClick={() => setOpen(r.sheet.id)}>
                <td className="td">
                  <button className="text-left font-medium text-brand-800 hover:underline" onClick={() => setOpen(r.sheet.id)}>
                    {r.name || <span className="font-normal italic text-slate-500">{tr('(no está en la lista)')}</span>}
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
        {shown.length === 0 && <p className="p-4 text-sm text-slate-500">{tr('Ninguna hoja coincide con los filtros.')}</p>}
      </div>
      {readOnly && <p className="text-xs text-slate-500">{tr('Examen cerrado: las notas no se pueden modificar.')}</p>}
      {openRow && <Detail row={openRow} onClose={() => setOpen(null)} />}
    </div>
  );
}
