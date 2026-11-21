import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Empty, ErrorBox, Field, Spinner, StatusBadge, fmtDate } from '../components/ui';
import { createExam } from '../lib/service';
import { DEFAULT_GRADING, Exam, ExamFolder, ExamFolderItem, ExamStatus, Profile, STATUS_LABEL } from '../lib/types';
import { DEFAULT_SHEET_CONFIG, SheetConfig } from '../omr/layout';
import { useSession } from './AuthContext';
import { SheetConfigForm } from './SheetConfigForm';

const SCOPE_KEY = 'korrige-exam-scope';

export function ExamList() {
  const { db, org, orgs, user, plan, unlimited, canCreateExam, setOrgId } = useSession();
  const [exams, setExams] = useState<Exam[] | null>(null);
  const [owners, setOwners] = useState<Record<string, Profile>>({});
  const [folders, setFolders] = useState<ExamFolder[]>([]);
  /** examen → carpeta (de este usuario) */
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fSubject, setFSubject] = useState('');
  const [fSession, setFSession] = useState('');
  const [fOwner, setFOwner] = useState('');
  /** '' todas · 'none' sin carpeta · id de carpeta */
  const [fFolder, setFFolder] = useState('');
  // con varias organizaciones se pueden ver los exámenes de todas a la vez
  const [allOrgs, setAllOrgs] = useState(() => localStorage.getItem(SCOPE_KEY) === 'all');
  const multi = orgs.length > 1;
  const everywhere = multi && allOrgs;
  const orgIds = everywhere ? orgs.map((o) => o.id) : [org.id];
  const orgKey = orgIds.join(',');
  /** Formulario de carpeta: nueva (con examen que guardar al crearla, si lo hay) o renombrar. */
  const [form, setForm] = useState<{ mode: 'new' | 'rename'; name: string; examId?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    setExams(null);
    (async () => {
      try {
        const [list, fs, items] = await Promise.all([
          db.select<Exam>('exams', { org_id: orgKey.split(',') }, { order: 'created_at', asc: false }),
          db.select<ExamFolder>('exam_folders', { user_id: user.id }, { order: 'name' }),
          db.select<ExamFolderItem>('exam_folder_items', { user_id: user.id }),
        ]);
        const ids = [...new Set(list.map((e) => e.owner_id))];
        const ps = ids.length ? await db.select<Profile>('profiles', { id: ids }) : [];
        if (!alive) return;
        setOwners(Object.fromEntries(ps.map((p) => [p.id, p])));
        setFolders(fs);
        setPlaced(Object.fromEntries(items.map((i) => [i.exam_id, i.folder_id])));
        setExams(list);
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    })();
    return () => {
      alive = false;
    };
  }, [db, orgKey, user.id]);

  const all = exams ?? [];
  const ownerName = (id: string) => (id === user.id ? 'Tú' : owners[id]?.full_name || owners[id]?.email || '—');
  const orgName = (id: string) => orgs.find((o) => o.id === id)?.name ?? '—';
  const sortedFolders = [...folders].sort((x, y) => x.name.localeCompare(y.name, 'es', { numeric: true }));
  const folderOf = (e: Exam) => (folders.some((f) => f.id === placed[e.id]) ? placed[e.id] : '');
  const inFolder = (id: string) => all.filter((e) => folderOf(e) === id).length;
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
      (!fOwner || e.owner_id === fOwner) &&
      (!fFolder || (fFolder === 'none' ? !folderOf(e) : folderOf(e) === fFolder)),
  );
  const filtering = !!(needle || fStatus || fSubject || fSession || fOwner || fFolder);
  const clear = () => {
    setQ('');
    setFStatus('');
    setFSubject('');
    setFSession('');
    setFOwner('');
    setFFolder('');
  };

  function chooseOrg(value: string) {
    const every = value === 'all';
    localStorage.setItem(SCOPE_KEY, every ? 'all' : 'org');
    setAllOrgs(every);
    if (!every) setOrgId(value);
  }

  /** Guarda el examen en una carpeta ('' = sacarlo de la carpeta). */
  async function move(examId: string, folderId: string) {
    const prev = placed;
    setPlaced((p) => {
      const next = { ...p };
      if (folderId) next[examId] = folderId;
      else delete next[examId];
      return next;
    });
    try {
      if (folderId) await db.upsert('exam_folder_items', { user_id: user.id, exam_id: examId, folder_id: folderId }, 'user_id,exam_id');
      else await db.remove('exam_folder_items', { user_id: user.id, exam_id: examId });
      setError('');
      return true;
    } catch (e) {
      setPlaced(prev);
      setError((e as Error).message);
      return false;
    }
  }

  async function submitFolder(ev: FormEvent) {
    ev.preventDefault();
    if (!form) return;
    const name = form.name.trim();
    if (!name) return;
    if (folders.some((f) => f.name.toLowerCase() === name.toLowerCase() && !(form.mode === 'rename' && f.id === fFolder))) return setError('Ya tienes una carpeta con ese nombre.');
    setBusy(true);
    try {
      if (form.mode === 'rename') {
        await db.update('exam_folders', { id: fFolder }, { name });
        setFolders((fs) => fs.map((f) => (f.id === fFolder ? { ...f, name } : f)));
      } else {
        const [f] = await db.insert<ExamFolder>('exam_folders', { user_id: user.id, name });
        setFolders((fs) => [...fs, f]);
        // si no se pudo guardar el examen, el error de move() se queda a la vista
        if (form.examId && !(await move(form.examId, f.id))) return setForm(null);
        if (!form.examId) setFFolder(f.id);
      }
      setForm(null);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function removeFolder() {
    const f = folders.find((x) => x.id === fFolder);
    if (!f || !confirm(`¿Eliminar la carpeta «${f.name}»? Los exámenes no se borran: vuelven a «Sin carpeta».`)) return;
    try {
      await db.remove('exam_folders', { id: f.id });
      setFolders((fs) => fs.filter((x) => x.id !== f.id));
      setPlaced((p) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== f.id)));
      setFFolder('');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const pill = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${active ? 'border-brand-700 bg-brand-50 font-semibold text-brand-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`;
  const count = (n: number) => <span className="text-xs font-normal text-slate-400">{n}</span>;
  const headers = ['Examen', 'Asignatura', 'Grupo', 'Convocatoria', 'Fecha', 'Estado', ...(everywhere ? ['Organización'] : []), 'Profesor', 'Carpeta'];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Exámenes</h1>
        <div className="flex flex-wrap items-center gap-3">
          {plan && !unlimited && (
            <Link to="/app/plan" className="text-sm text-slate-600 underline-offset-4 hover:underline" data-testid="plan-chip">
              {plan.plan === 'plus' ? `Korrige Plus · ${plan.used} de ${plan.limit} exámenes este mes` : `Plan Gratis · ${plan.used} de ${plan.limit} examen usado`}
            </Link>
          )}
          <Link to={canCreateExam ? '/app/examenes/nuevo' : '/app/plan?limite=1'} className="btn-primary">
            Nuevo examen
          </Link>
        </div>
      </div>
      <div className="mt-5">
        <ErrorBox error={error} />
        {!exams && !error && <Spinner label="Cargando exámenes…" />}
        {exams && exams.length === 0 && !everywhere && (
          <Empty
            title={multi ? `Aún no tienes exámenes en ${org.name}` : 'Aún no tienes exámenes'}
            action={
              <Link to={canCreateExam ? '/app/examenes/nuevo' : '/app/plan?limite=1'} className="btn-primary">
                Crear mi primer examen
              </Link>
            }
          >
            Crea el examen, descarga e imprime la hoja de respuestas y, después del examen, escanea todo el taco en la fotocopiadora y sube el PDF.
          </Empty>
        )}
        {exams && (exams.length > 0 || multi) && (
          <div className="mb-3 flex flex-wrap items-center gap-2" data-testid="exam-folders" aria-label="Carpetas">
            <button className={pill(fFolder === '')} onClick={() => setFFolder('')}>
              Todos {count(all.length)}
            </button>
            {sortedFolders.map((f) => (
              <button key={f.id} className={pill(fFolder === f.id)} onClick={() => setFFolder(f.id)}>
                <svg width="14" height="12" viewBox="0 0 14 12" aria-hidden className="text-slate-400">
                  <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3l1.5 1.8h4.5A1.5 1.5 0 0 1 13 4.3v5.2A1.5 1.5 0 0 1 11.5 11h-9A1.5 1.5 0 0 1 1 9.5z" fill="none" stroke="currentColor" strokeWidth="1.3" />
                </svg>
                {f.name} {count(inFolder(f.id))}
              </button>
            ))}
            {folders.length > 0 && (
              <button className={pill(fFolder === 'none')} onClick={() => setFFolder('none')}>
                Sin carpeta {count(inFolder(''))}
              </button>
            )}
            {form && !form.examId ? null : (
              <button className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-white" onClick={() => setForm({ mode: 'new', name: '' })}>
                + Nueva carpeta
              </button>
            )}
            {folders.some((f) => f.id === fFolder) && !form && (
              <span className="ml-auto flex gap-1">
                <button className="btn-ghost btn-sm" onClick={() => setForm({ mode: 'rename', name: folders.find((f) => f.id === fFolder)?.name ?? '' })}>
                  Renombrar
                </button>
                <button className="btn-ghost btn-sm text-red-700" onClick={() => void removeFolder()}>
                  Eliminar carpeta
                </button>
              </span>
            )}
          </div>
        )}
        {form && (
          <form onSubmit={submitFolder} className="mb-3 flex flex-wrap items-center gap-2" data-testid="folder-form">
            <input
              className="input w-full sm:w-72"
              autoFocus
              maxLength={60}
              required
              placeholder="Nombre de la carpeta (p. ej. Curso 2026-27)"
              aria-label="Nombre de la carpeta"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <button className="btn-primary btn-sm" disabled={busy}>
              {form.mode === 'rename' ? 'Guardar nombre' : form.examId ? 'Crear y guardar el examen' : 'Crear carpeta'}
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setForm(null)}>
              Cancelar
            </button>
            <span className="text-xs text-slate-500">Las carpetas son tuyas: tus compañeros no las ven.</span>
          </form>
        )}
        {exams && (exams.length > 0 || multi) && (
          <div className="mb-3 flex flex-wrap items-center gap-2" role="search" aria-label="Filtrar exámenes" data-testid="exam-filters">
            <input className="input w-full sm:w-64" type="search" placeholder="Buscar por nombre, asignatura, grupo o código…" aria-label="Buscar examen" value={q} onChange={(e) => setQ(e.target.value)} />
            {multi && (
              <select className="input w-auto max-w-64" aria-label="Filtrar por organización" value={everywhere ? 'all' : org.id} onChange={(e) => chooseOrg(e.target.value)}>
                <option value="all">Todas mis organizaciones</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            )}
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
            {(needle || fStatus || fSubject || fSession || fOwner) && (
              <button className="btn-ghost btn-sm" onClick={clear}>
                Quitar filtros
              </button>
            )}
            <span className="ml-auto text-sm text-slate-500" aria-live="polite">
              {filtering ? `${shown.length} de ${all.length} exámenes` : `${all.length} ${all.length === 1 ? 'examen' : 'exámenes'}`}
            </span>
          </div>
        )}
        {exams && exams.length === 0 && everywhere && <p className="card p-4 text-sm text-slate-500">Aún no tienes exámenes en ninguna de tus organizaciones.</p>}
        {exams && exams.length > 0 && (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  {headers.map((h) => (
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
                      {/* al abrir un examen de otra organización, esa pasa a ser la activa */}
                      <Link to={`/app/examenes/${e.id}`} className="font-medium text-brand-800 hover:underline" onClick={() => e.org_id !== org.id && setOrgId(e.org_id)}>
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
                    {everywhere && <td className="td text-slate-600">{orgName(e.org_id)}</td>}
                    <td className="td text-slate-600">{ownerName(e.owner_id)}</td>
                    <td className="td">
                      <select
                        className="max-w-40 rounded-md border border-transparent bg-transparent py-1 pl-1 pr-6 text-sm text-slate-600 hover:border-slate-200 focus:border-slate-300"
                        aria-label={`Carpeta de ${e.title}`}
                        value={folderOf(e)}
                        onChange={(ev) => (ev.target.value === '+' ? setForm({ mode: 'new', name: '', examId: e.id }) : void move(e.id, ev.target.value))}
                      >
                        <option value="">Sin carpeta</option>
                        {sortedFolders.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                        <option value="+">+ Nueva carpeta…</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shown.length === 0 && (
              <p className="p-4 text-sm text-slate-500">
                {fFolder && fFolder !== 'none' && !needle && !fStatus && !fSubject && !fSession && !fOwner
                  ? 'Esta carpeta está vacía. Usa la columna «Carpeta» de la lista para guardar exámenes en ella. '
                  : 'Ningún examen coincide con los filtros. '}
                <button className="font-medium text-brand-700 underline" onClick={clear}>
                  {fFolder && !needle ? 'Ver todos' : 'Quitar filtros'}
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
  const { db, org, user, refresh, canCreateExam } = useSession();
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
      void refresh(); // actualiza el consumo del plan
      nav(`/app/examenes/${exam.id}/hoja`);
    } catch (err) {
      // límite del plan alcanzado (lo decide la base de datos)
      if (/LIMITE_(GRATIS|PLUS)/.test((err as Error).message)) return nav('/app/plan?limite=1');
      setError((err as Error).message);
      setBusy(false);
    }
  }
  const txt = (k: keyof typeof f, label: string, opts: { required?: boolean; type?: string; hint?: string } = {}) => (
    <Field label={label} hint={opts.hint}>
      <input className="input" type={opts.type ?? 'text'} required={opts.required} maxLength={160} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </Field>
  );
  if (!canCreateExam) return <Navigate to="/app/plan?limite=1" replace />;
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
