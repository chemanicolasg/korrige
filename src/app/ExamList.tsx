import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Empty, ErrorBox, Field, Spinner, StatusBadge, fmtDate } from '../components/ui';
import { createExam } from '../lib/service';
import { DEFAULT_GRADING, Exam, ExamStatus, Profile, STATUS_LABEL } from '../lib/types';
import { DEFAULT_SHEET_CONFIG, SheetConfig } from '../omr/layout';
import { useSession } from './AuthContext';
import { SheetConfigForm } from './SheetConfigForm';

export function ExamList() {
  const { db, org, user } = useSession();
  const [exams, setExams] = useState<Exam[] | null>(null);
  const [owners, setOwners] = useState<Record<string, Profile>>({});
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fSubject, setFSubject] = useState('');
  const [fSession, setFSession] = useState('');
  const [fOwner, setFOwner] = useState('');

  useEffect(() => {
    let alive = true;
    setExams(null);
    (async () => {
      try {
        const list = await db.select<Exam>('exams', { org_id: org.id }, { order: 'created_at', asc: false });
        const ids = [...new Set(list.map((e) => e.owner_id))];
        const ps = ids.length ? await db.select<Profile>('profiles', { id: ids }) : [];
        if (!alive) return;
        setOwners(Object.fromEntries(ps.map((p) => [p.id, p])));
        setExams(list);
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    })();
    return () => {
      alive = false;
    };
  }, [db, org.id]);

  const all = exams ?? [];
  const ownerName = (id: string) => (id === user.id ? 'Tú' : owners[id]?.full_name || owners[id]?.email || '—');
  // las opciones de cada filtro salen de los exámenes que hay
  const distinct = (get: (e: Exam) => string) => [...new Set(all.map(get).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  const subjects = distinct((e) => e.subject);
  const sessions = distinct((e) => e.session);
  const ownerIds = [...new Set(all.map((e) => e.owner_id))];
  const needle = q.trim().toLowerCase();
  const shown = all.filter(
    (e) =>
      (!needle || `${e.title} ${e.subject} ${e.group_name} ${e.session} ${e.code}`.toLowerCase().includes(needle)) &&
      (!fStatus || e.status === fStatus) &&
      (!fSubject || e.subject === fSubject) &&
      (!fSession || e.session === fSession) &&
      (!fOwner || e.owner_id === fOwner),
  );
  const filtering = !!(needle || fStatus || fSubject || fSession || fOwner);
  const clear = () => {
    setQ('');
    setFStatus('');
    setFSubject('');
    setFSession('');
    setFOwner('');
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Exámenes</h1>
        <div className="flex gap-3">
          <Link to="/app/examenes/nuevo" className="btn-primary">
            Nuevo examen
          </Link>
        </div>
      </div>
      <div className="mt-5">
        <ErrorBox error={error} />
        {!exams && !error && <Spinner label="Cargando exámenes…" />}
        {exams && exams.length === 0 && (
          <Empty
            title="Aún no tienes exámenes"
            action={
              <Link to="/app/examenes/nuevo" className="btn-primary">
                Crear mi primer examen
              </Link>
            }
          >
            Crea el examen, descarga e imprime la hoja de respuestas y, después del examen, escanea todo el taco en la fotocopiadora y sube el PDF.
          </Empty>
        )}
        {exams && exams.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2" role="search" aria-label="Filtrar exámenes" data-testid="exam-filters">
            <input className="input w-full sm:w-64" type="search" placeholder="Buscar por nombre, asignatura, grupo o código…" aria-label="Buscar examen" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="input w-auto" aria-label="Filtrar por estado" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
              <option value="">Todos los estados</option>
              {(Object.keys(STATUS_LABEL) as ExamStatus[]).map((st) => (
                <option key={st} value={st}>
                  {STATUS_LABEL[st]}
                </option>
              ))}
            </select>
            {subjects.length > 1 && (
              <select className="input w-auto max-w-56" aria-label="Filtrar por asignatura" value={fSubject} onChange={(e) => setFSubject(e.target.value)}>
                <option value="">Todas las asignaturas</option>
                {subjects.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            )}
            {sessions.length > 1 && (
              <select className="input w-auto max-w-48" aria-label="Filtrar por convocatoria" value={fSession} onChange={(e) => setFSession(e.target.value)}>
                <option value="">Todas las convocatorias</option>
                {sessions.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            )}
            {ownerIds.length > 1 && (
              <select className="input w-auto max-w-56" aria-label="Filtrar por profesor" value={fOwner} onChange={(e) => setFOwner(e.target.value)}>
                <option value="">Todos los profesores</option>
                {ownerIds.map((id) => (
                  <option key={id} value={id}>
                    {ownerName(id)}
                  </option>
                ))}
              </select>
            )}
            {filtering && (
              <button className="btn-ghost btn-sm" onClick={clear}>
                Quitar filtros
              </button>
            )}
            <span className="ml-auto text-sm text-slate-500" aria-live="polite">
              {filtering ? `${shown.length} de ${all.length} exámenes` : `${all.length} ${all.length === 1 ? 'examen' : 'exámenes'}`}
            </span>
          </div>
        )}
        {exams && exams.length > 0 && (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  {['Examen', 'Asignatura', 'Grupo', 'Convocatoria', 'Fecha', 'Estado', 'Profesor'].map((h) => (
                    <th key={h} className="th">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="td">
                      <Link to={`/app/examenes/${e.id}`} className="font-medium text-brand-800 hover:underline">
                        {e.title}
                      </Link>
                      <div className="font-mono text-xs text-slate-400">{e.code}</div>
                    </td>
                    <td className="td">{e.subject || '—'}</td>
                    <td className="td">{e.group_name || '—'}</td>
                    <td className="td">{e.session || '—'}</td>
                    <td className="td whitespace-nowrap">{fmtDate(e.exam_date)}</td>
                    <td className="td">
                      <StatusBadge status={e.status} />
                    </td>
                    <td className="td text-slate-600">{ownerName(e.owner_id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shown.length === 0 && (
              <p className="p-4 text-sm text-slate-500">
                Ningún examen coincide con los filtros.{' '}
                <button className="font-medium text-brand-700 underline" onClick={clear}>
                  Quitar filtros
                </button>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ExamNew() {
  const { db, org, user } = useSession();
  const nav = useNavigate();
  const [f, setF] = useState({ title: '', subject: '', group_name: '', session: '', exam_date: '' });
  // los valores por defecto de la organización (logotipo, identificador, fórmula) se aplican a cada examen nuevo
  const def = org.exam_defaults ?? {};
  const [cfg, setCfg] = useState<SheetConfig>({
    ...DEFAULT_SHEET_CONFIG,
    nQuestions: 40,
    nOptions: 4,
    nModels: 1,
    title: def.title || org.name,
    idLabel: def.idLabel || DEFAULT_SHEET_CONFIG.idLabel,
    idDigits: def.idDigits || DEFAULT_SHEET_CONFIG.idDigits,
    ...(def.logo ? { logo: def.logo } : {}),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const subtitle = cfg.subtitle && cfg.subtitle !== DEFAULT_SHEET_CONFIG.subtitle ? cfg.subtitle : [f.subject || f.title, f.session].filter(Boolean).join('  ·  ');
      const exam = await createExam(db, org.id, user.id, { ...f, exam_date: f.exam_date || null }, { ...cfg, subtitle }, { ...DEFAULT_GRADING, ...(def.grading ?? {}) });
      nav(`/app/examenes/${exam.id}/hoja`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }
  const txt = (k: keyof typeof f, label: string, opts: { required?: boolean; type?: string; hint?: string } = {}) => (
    <Field label={label} hint={opts.hint}>
      <input className="input" type={opts.type ?? 'text'} required={opts.required} maxLength={160} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </Field>
  );
  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">Nuevo examen</h1>
      <section className="card mt-5 p-5">
        <h2 className="font-semibold">Datos del examen</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {txt('title', 'Nombre del examen', { required: true, hint: 'Por ejemplo: «Anatomía I – Parcial 1».' })}
          {txt('subject', 'Asignatura')}
          {txt('group_name', 'Grupo')}
          {txt('session', 'Convocatoria', { hint: 'Enero, junio, extraordinaria…' })}
          {txt('exam_date', 'Fecha', { type: 'date' })}
        </div>
      </section>
      <section className="card mt-5 p-5">
        <h2 className="font-semibold">Hoja de respuestas</h2>
        <p className="mb-4 mt-1 text-sm text-slate-600">
          Podrás cambiarla y ver la vista previa después, mientras no hayas subido hojas escaneadas.
          {(def.logo || def.idLabel || def.grading) && ' Se han aplicado los valores por defecto de tu organización (logotipo, identificador y fórmula de corrección).'}
        </p>
        <SheetConfigForm value={cfg} onChange={setCfg} />
      </section>
      <div className="mt-5 space-y-3">
        <ErrorBox error={error} />
        <div className="flex gap-3">
          <button className="btn-primary" disabled={busy}>
            {busy ? 'Creando…' : 'Crear examen'}
          </button>
          <Link to="/app" className="btn">
            Cancelar
          </Link>
        </div>
      </div>
    </form>
  );
}
