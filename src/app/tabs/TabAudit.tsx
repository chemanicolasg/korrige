import { useEffect, useState } from 'react';
import { Empty, ErrorBox, Spinner, fmtDateTime } from '../../components/ui';
import { tr } from '../../i18n/app';
import { ACTION_LABEL } from '../../lib/service';
import { AuditEntry } from '../../lib/types';
import { useExam } from '../ExamPage';

/** Resumen legible de los detalles de un apunte de auditoría. */
export function auditSummary(a: AuditEntry): string {
  const d = a.details as Record<string, unknown>;
  const parts: string[] = [];
  const cambios = d.cambios;
  if (Array.isArray(cambios)) {
    for (const c of cambios as { campo: string; pregunta?: number; antes: unknown; ahora: unknown }[]) {
      const show = (v: unknown) => (v === '' ? tr('en blanco') : v === '*' ? tr('nula') : v === null ? '—' : String(v));
      parts.push(`${c.campo}${c.pregunta ? ` P${c.pregunta}` : ''}: ${show(c.antes)} → ${show(c.ahora)}`);
    }
    if (d.hoja) parts.unshift(tr('hoja {hoja} ({id})', { hoja: String(d.hoja), id: String(d.identificador ?? '') }));
    if (d.motivo) parts.push(String(d.motivo));
  } else {
    for (const [k, v] of Object.entries(d)) {
      if (v === undefined || v === null || v === '') continue;
      if (typeof v === 'object') {
        if (Array.isArray(v)) v.length && parts.push(`${k}: ${v.slice(0, 6).join(', ')}${v.length > 6 ? '…' : ''}`);
        else if (k === 'cambios') parts.push(tr('{n} preguntas cambiadas ({lista})', { n: Object.keys(v as object).length, lista: Object.keys(v as object).slice(0, 10).join(', ') }));
        else parts.push(`${k}: ${JSON.stringify(v)}`);
      } else parts.push(`${k.replace(/_/g, ' ')}: ${String(v)}`);
    }
  }
  return parts.join(' · ');
}

export default function TabAudit() {
  const { data, db } = useExam();
  const [rows, setRows] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  useEffect(() => {
    let alive = true;
    db.select<AuditEntry>('audit_log', { exam_id: data.exam.id }, { order: 'id', asc: false })
      .then((r) => alive && setRows(r))
      .catch((e) => alive && setError((e as Error).message));
    return () => {
      alive = false;
    };
  }, [db, data.exam.id, data.exam.updated_at, data.items, data.keys.length, data.sheets.length]);

  if (error) return <ErrorBox error={error} />;
  if (!rows) return <Spinner />;
  if (!rows.length) return <Empty title={tr('Sin actividad registrada')} />;
  const actions = [...new Set(rows.map((r) => r.action))];
  const shown = rows.filter((r) => !filter || r.action === filter);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-slate-600">{tr('Registro de todo lo que ocurre en el examen. No se puede modificar ni borrar.')}</p>
        <select className="input ml-auto w-auto" aria-label={tr('Filtrar por tipo')} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">{tr('Toda la actividad ({n})', { n: rows.length })}</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {ACTION_LABEL[a] ?? a}
            </option>
          ))}
        </select>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full" data-testid="audit-table">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">{tr('Cuándo')}</th>
              <th className="th">{tr('Quién')}</th>
              <th className="th">{tr('Qué')}</th>
              <th className="th">{tr('Detalle')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.map((a) => (
              <tr key={a.id}>
                <td className="td whitespace-nowrap text-slate-600">{fmtDateTime(a.created_at)}</td>
                <td className="td">{a.user_email || tr('sistema')}</td>
                <td className="td font-medium">{ACTION_LABEL[a.action] ?? a.action}</td>
                <td className="td text-xs text-slate-600">{auditSummary(a)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
