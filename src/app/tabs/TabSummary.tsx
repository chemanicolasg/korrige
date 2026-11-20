import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ErrorBox, Field, Modal, Notice, fmtDateTime } from '../../components/ui';
import { penaltyPerError } from '../../lib/grading';
import { currentKeys, deleteExam, duplicateExam, isStudentSheet, logAudit, setExamClosed, updateExamFields, updateGrading } from '../../lib/service';
import { Formula, GradingConfig, Profile } from '../../lib/types';
import { modelLetters } from '../../omr/layout';
import { useSession } from '../AuthContext';
import { useExam } from '../ExamPage';

function Steps() {
  const { data } = useExam();
  const keys = currentKeys(data.keys);
  const models = modelLetters(data.exam.sheet_config);
  const pending = data.items.filter((i) => i.status === 'pendiente').length;
  const nSheets = data.sheets.filter(isStudentSheet).length;
  const steps: [boolean, string, string, string][] = [
    [data.exam.status !== 'borrador', 'Descarga e imprime la hoja de respuestas', 'hoja', 'Imprime al 100 % («tamaño real»).'],
    [models.every((m) => keys[m]), 'Define la plantilla de respuestas correctas', 'plantillas', 'En pantalla, o marcando la burbuja «P» en una hoja y escaneándola con las demás.'],
    [nSheets > 0, 'Escanea el taco y sube el PDF', 'subir', 'Escanea todas las hojas de golpe en la fotocopiadora y envíatelas por correo.'],
    [nSheets > 0 && pending === 0, 'Revisa las incidencias', 'revision', pending ? `${pending} pendientes.` : 'Dobles marcas, marcas flojas, identificadores dudosos…'],
    [data.exam.status === 'cerrado', 'Exporta las notas y cierra el examen', 'notas', 'Excel o CSV para Moodle.'],
  ];
  const next = steps.findIndex((s) => !s[0]);
  return (
    <section className="card p-5">
      <h2 className="font-semibold">Siguientes pasos</h2>
      <ol className="mt-3 space-y-2">
        {steps.map(([done, title, to, hint], i) => (
          <li key={to} className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${done ? 'bg-emerald-100 text-emerald-700' : i === next ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'}`}
              aria-hidden
            >
              {done ? '✓' : i + 1}
            </span>
            <div>
              <Link to={`../${to}`} className={`text-sm font-medium hover:underline ${done ? 'text-slate-500' : 'text-slate-900'}`}>
                {title}
                <span className="sr-only">{done ? ' (hecho)' : ''}</span>
              </Link>
              <p className="text-xs text-slate-500">{hint}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function GradingForm() {
  const { data, run, readOnly, db, busy } = useExam();
  const [g, setG] = useState<GradingConfig>(data.exam.grading_config);
  useEffect(() => setG(data.exam.grading_config), [data.exam.grading_config]);
  const dirty = JSON.stringify(g) !== JSON.stringify(data.exam.grading_config);
  const k = data.exam.sheet_config.nOptions;
  const pen = penaltyPerError(g, k);
  return (
    <section className="card p-5">
      <h2 className="font-semibold">Corrección</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Fórmula">
          <select className="input" disabled={readOnly} value={g.formula} onChange={(e) => setG({ ...g, formula: e.target.value as Formula })}>
            <option value="none">Sin penalización (solo cuentan los aciertos)</option>
            <option value="classic">Penalización clásica: aciertos − errores/(k−1)</option>
            <option value="custom">Penalización personalizada por error</option>
          </select>
        </Field>
        {g.formula === 'custom' ? (
          <Field label="Puntos que resta cada error" hint="Por ejemplo 0,25 = cada 4 errores restan un acierto.">
            <input className="input" type="number" step="0.01" min={0} max={5} disabled={readOnly} value={g.penalty} onChange={(e) => setG({ ...g, penalty: Number(e.target.value) })} />
          </Field>
        ) : (
          <div className="self-end pb-2 text-sm text-slate-600">
            {g.formula === 'classic' ? `Con ${k} opciones, cada error resta 1/${k - 1} de acierto.` : 'Los errores no restan.'} En blanco = 0.
          </div>
        )}
        <Field label="Nota máxima">
          <input className="input" type="number" min={1} max={1000} step="0.5" disabled={readOnly} value={g.scale} onChange={(e) => setG({ ...g, scale: Number(e.target.value) || 10 })} />
        </Field>
        <Field label="Decimales">
          <select className="input" disabled={readOnly} value={g.decimals} onChange={(e) => setG({ ...g, decimals: Number(e.target.value) })}>
            {[0, 1, 2, 3].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" disabled={readOnly} checked={g.allowNegative} onChange={(e) => setG({ ...g, allowNegative: e.target.checked })} />
          Permitir notas negativas (por defecto la nota mínima es 0)
        </label>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Nota = (aciertos − {pen ? pen.toLocaleString('es-ES', { maximumFractionDigits: 3 }) : '0'} × errores) ÷ preguntas válidas × {g.scale}. Las preguntas anuladas no cuentan.
      </p>
      {!readOnly && (
        <button className="btn-primary mt-4" disabled={!dirty || busy} onClick={() => run((d) => updateGrading(db, d, g))}>
          Guardar y recalcular notas
        </button>
      )}
    </section>
  );
}

function Sharing() {
  const { data, db, readOnly } = useExam();
  const { user, role } = useSession();
  const [collabs, setCollabs] = useState<Profile[]>([]);
  const [owner, setOwner] = useState<Profile | null>(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const canShare = (data.exam.owner_id === user.id || role === 'admin') && !readOnly;

  const load = async () => {
    const rows = await db.select<{ user_id: string }>('exam_collaborators', { exam_id: data.exam.id });
    const ids = [data.exam.owner_id, ...rows.map((r) => r.user_id)];
    const ps = await db.select<Profile>('profiles', { id: ids });
    setOwner(ps.find((p) => p.id === data.exam.owner_id) ?? null);
    setCollabs(ps.filter((p) => rows.some((r) => r.user_id === p.id)));
  };
  useEffect(() => {
    void load().catch((e) => setError((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.exam.id]);

  async function share(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await db.rpc('share_exam', { p_exam: data.exam.id, p_email: email.trim() });
      setEmail('');
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  async function unshare(p: Profile) {
    await db.remove('exam_collaborators', { exam_id: data.exam.id, user_id: p.id });
    await logAudit(db, data.exam.org_id, data.exam.id, 'examen_dejado_de_compartir', { email: p.email });
    await load();
  }
  return (
    <section className="card p-5">
      <h2 className="font-semibold">Profesores con acceso</h2>
      <ul className="mt-3 space-y-1.5 text-sm">
        <li>
          {owner?.full_name || owner?.email || '…'} <span className="badge bg-slate-100 text-slate-600">propietario</span>
        </li>
        {collabs.map((p) => (
          <li key={p.id} className="flex items-center gap-2">
            {p.full_name || p.email} <span className="badge bg-brand-50 text-brand-800">coautor</span>
            {canShare && (
              <button className="text-xs text-red-700 hover:underline" onClick={() => void unshare(p)}>
                Quitar
              </button>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-500">Los administradores de la organización ven todos los exámenes.</p>
      {canShare && (
        <form onSubmit={share} className="mt-3 flex gap-2">
          <input className="input" type="email" required placeholder="Email de otro profesor de tu organización" aria-label="Email del coautor" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn shrink-0">Compartir</button>
        </form>
      )}
      <div className="mt-2">
        <ErrorBox error={error} />
      </div>
    </section>
  );
}

export default function TabSummary() {
  const { data, db, run, readOnly, busy, userId } = useExam();
  const { user, role } = useSession();
  const nav = useNavigate();
  const { exam } = data;
  const [f, setF] = useState({ title: exam.title, subject: exam.subject, group_name: exam.group_name, session: exam.session, exam_date: exam.exam_date ?? '' });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [typed, setTyped] = useState('');
  const dirty = f.title !== exam.title || f.subject !== exam.subject || f.group_name !== exam.group_name || f.session !== exam.session || f.exam_date !== (exam.exam_date ?? '');
  const canDelete = exam.owner_id === user.id || role === 'admin';
  const pending = data.items.filter((i) => i.status === 'pendiente').length;

  const input = (k: keyof typeof f, label: string, type = 'text') => (
    <Field label={label}>
      <input className="input" type={type} disabled={readOnly} maxLength={160} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </Field>
  );
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <section className="card p-5">
          <h2 className="font-semibold">Ficha del examen</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {input('title', 'Nombre del examen')}
            {input('subject', 'Asignatura')}
            {input('group_name', 'Grupo')}
            {input('session', 'Convocatoria')}
            {input('exam_date', 'Fecha', 'date')}
            <div className="text-sm text-slate-600">
              <span className="label">Hoja de respuestas</span>
              {exam.sheet_config.nQuestions} preguntas · {exam.sheet_config.nOptions} opciones · {exam.sheet_config.nModels} modelo(s) · {exam.sheet_config.idLabel} de{' '}
              {exam.sheet_config.idDigits} dígitos.{' '}
              <Link to="../hoja" className="text-brand-700 hover:underline">
                Ver hoja
              </Link>
            </div>
          </div>
          {!readOnly && (
            <button
              className="btn-primary mt-4"
              disabled={!dirty || busy || !f.title.trim()}
              onClick={() => run(async (d) => ({ ...d, exam: { ...d.exam, ...(await updateExamFields(db, d.exam, { ...f, title: f.title.trim(), exam_date: f.exam_date || null })) } }))}
            >
              Guardar cambios
            </button>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Creado el {fmtDateTime(exam.created_at)}
            {exam.closed_at && ` · Cerrado el ${fmtDateTime(exam.closed_at)}`}
            {exam.images_purged_at && ` · Imágenes borradas por retención el ${fmtDateTime(exam.images_purged_at)}`}
          </p>
        </section>
        <GradingForm />
      </div>
      <div className="space-y-4">
        <Steps />
        <Sharing />
        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">Acciones</h2>
          {readOnly ? (
            <button className="btn w-full" disabled={busy} onClick={() => run((d) => setExamClosed(db, d, false))}>
              Reabrir examen
            </button>
          ) : (
            <>
              {pending > 0 && <Notice tone="warn">Quedan {pending} incidencias por revisar. Puedes cerrar igualmente, pero las notas afectadas son provisionales.</Notice>}
              <button className="btn w-full" disabled={busy} onClick={() => run((d) => setExamClosed(db, d, true))}>
                Cerrar examen (solo lectura)
              </button>
            </>
          )}
          <button
            className="btn w-full"
            disabled={busy}
            onClick={() =>
              run(async (d) => {
                const copy = await duplicateExam(db, d, userId);
                nav(`/app/examenes/${copy.id}/resumen`);
              })
            }
          >
            Duplicar examen
          </button>
          {canDelete && (
            <button className="btn w-full text-red-700" onClick={() => setConfirmDelete(true)}>
              Eliminar examen…
            </button>
          )}
          <p className="text-xs text-slate-500">Duplicar copia la configuración y las plantillas, no las hojas ni los alumnos.</p>
        </section>
      </div>
      {confirmDelete && (
        <Modal title="Eliminar examen" onClose={() => setConfirmDelete(false)}>
          <p className="text-sm text-slate-700">
            Se borrarán definitivamente las {data.sheets.length} hojas con sus imágenes, las notas, la lista de alumnos, las plantillas y las incidencias de{' '}
            <b>{exam.title}</b>. Solo quedará un apunte en el registro de actividad de la organización. Esta acción no se puede deshacer.
          </p>
          <Field label={`Escribe el código del examen (${exam.code}) para confirmar`}>
            <input className="input mt-3 font-mono" value={typed} onChange={(e) => setTyped(e.target.value.toUpperCase())} autoFocus />
          </Field>
          <div className="mt-4 flex justify-end gap-3">
            <button className="btn" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </button>
            <button
              className="btn-danger"
              disabled={typed !== exam.code || busy}
              onClick={() =>
                run(async (d) => {
                  await deleteExam(db, d);
                  nav('/app');
                })
              }
            >
              Eliminar definitivamente
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
