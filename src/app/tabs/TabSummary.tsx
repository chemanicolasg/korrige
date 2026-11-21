import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ErrorBox, Field, Modal, Notice, fmtDateTime } from '../../components/ui';
import { keyIsComplete } from '../../lib/grading';
import { currentKeys, deleteExam, duplicateExam, isStudentSheet, logAudit, setExamClosed, updateExamFields, updateGrading, updatePublication } from '../../lib/service';
import { GradingConfig, Profile } from '../../lib/types';
import { modelLetters } from '../../omr/layout';
import { APP_URL } from '../../config';
import { useSession } from '../AuthContext';
import { useExam } from '../ExamPage';
import { GradingFields } from '../GradingFields';

function Steps() {
  const { data } = useExam();
  const keys = currentKeys(data.keys);
  const models = modelLetters(data.exam.sheet_config);
  const pending = data.items.filter((i) => i.status === 'pendiente').length;
  const nSheets = data.sheets.filter(isStudentSheet).length;
  const steps: [boolean, string, string, string][] = [
    [data.exam.status !== 'borrador', 'Descarga e imprime la hoja de respuestas', 'hoja', 'Imprime al 100 % («tamaño real»).'],
    [models.every((m) => keys[m]), 'Define la plantilla de respuestas correctas', 'plantillas', 'En la pestaña «Plantillas», marcando la respuesta correcta de cada pregunta.'],
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
  return (
    <section className="card p-5">
      <h2 className="font-semibold">Corrección</h2>
      <div className="mt-4">
        <GradingFields value={g} onChange={setG} disabled={readOnly} nOptions={data.exam.sheet_config.nOptions} />
      </div>
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

/** Fecha ISO → valor de <input type="datetime-local"> en hora local. */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Publicar las respuestas correctas para que los alumnos se comprueben en /comprobar. */
function PublishAnswers() {
  const { data, db, run, busy } = useExam();
  const { exam } = data;
  const future = !!exam.answers_publish_at && new Date(exam.answers_publish_at) > new Date();
  const [on, setOn] = useState(!!exam.answers_published);
  const [when, setWhen] = useState<'now' | 'at'>(future ? 'at' : 'now');
  const [at, setAt] = useState(future ? toLocalInput(exam.answers_publish_at) : '');
  const [own, setOwn] = useState(!!exam.answers_code);
  const [custom, setCustom] = useState(exam.answers_code ?? '');
  const [calc, setCalc] = useState(!!exam.answers_calculator);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const keys = currentKeys(data.keys);
  const missing = modelLetters(exam.sheet_config).filter((m) => !keys[m] || !keyIsComplete(keys[m].answers, exam.sheet_config.nQuestions));
  const code = exam.answers_code || exam.code;
  const link = `${APP_URL}/comprobar/${code}`;
  const dirty =
    on !== !!exam.answers_published ||
    calc !== !!exam.answers_calculator ||
    (own ? custom : '') !== (exam.answers_code ?? '') ||
    (on && (when === 'at' ? at !== toLocalInput(exam.answers_publish_at) : future || !exam.answers_publish_at));

  async function save() {
    setError('');
    const answers_code = own ? custom.trim().toUpperCase() : null;
    if (answers_code && !/^[A-Z0-9]{5,16}$/.test(answers_code)) return setError('El código debe tener entre 5 y 16 letras o números, sin espacios ni acentos.');
    if (on && when === 'at' && !at) return setError('Indica la fecha y la hora de publicación.');
    // «ahora»: si ya estaban publicadas se conserva la fecha original
    const answers_publish_at = !on ? (exam.answers_publish_at ?? null) : when === 'at' ? new Date(at).toISOString() : !future && exam.answers_publish_at ? exam.answers_publish_at : new Date().toISOString();
    const ok = await run((d) => updatePublication(db, d, { answers_published: on, answers_publish_at, answers_code, answers_calculator: calc }));
    if (!ok) setError('No se ha podido guardar. Si has elegido un código propio, puede que ya esté en uso: prueba con otro.');
  }

  return (
    <section className="card p-5" data-testid="publish-answers">
      <h2 className="font-semibold">Respuestas para los alumnos</h2>
      <p className="mt-1 text-sm text-slate-600">
        Publica las respuestas correctas para que cada alumno se compruebe en <span className="font-mono text-xs">korrige.es/comprobar</span> con un código. No se muestran notas ni datos de ningún alumno.
      </p>
      <label className="mt-4 flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} />
        Publicar las respuestas correctas
      </label>
      {on && (
        <div className="mt-3 space-y-4 border-l-2 border-slate-200 pl-4">
          {missing.length > 0 && <Notice tone="warn">Falta completar la plantilla{missing.length > 1 ? ` de los modelos ${missing.join(', ')}` : exam.sheet_config.nModels > 1 ? ` del modelo ${missing[0]}` : ''}: los alumnos solo verán lo que esté introducido.</Notice>}
          <fieldset>
            <legend className="label">¿Cuándo se ven?</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="pub-when" checked={when === 'now'} onChange={() => setWhen('now')} />
              Desde ahora
            </label>
            <label className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
              <input type="radio" name="pub-when" checked={when === 'at'} onChange={() => setWhen('at')} />
              A partir de
              <input className="input w-auto py-1" type="datetime-local" aria-label="Fecha y hora de publicación" value={at} onFocus={() => setWhen('at')} onChange={(e) => setAt(e.target.value)} />
            </label>
          </fieldset>
          <fieldset>
            <legend className="label">Código para los alumnos</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="pub-code" checked={!own} onChange={() => setOwn(false)} />
              El del examen: <span className="font-mono font-semibold">{exam.code}</span>
            </label>
            <label className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
              <input type="radio" name="pub-code" checked={own} onChange={() => setOwn(true)} />
              Elegir uno:
              <input
                className="input w-44 py-1 font-mono uppercase"
                aria-label="Código elegido"
                placeholder="ANATOMIA26"
                maxLength={16}
                value={custom}
                onFocus={() => setOwn(true)}
                onChange={(e) => setCustom(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              />
            </label>
            <p className="mt-1 text-xs text-slate-500">Entre 5 y 16 letras o números. Si eliges uno, el código del examen deja de servir para esto.</p>
          </fieldset>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5" checked={calc} onChange={(e) => setCalc(e.target.checked)} />
            <span>
              Ofrecer la calculadora de nota
              <span className="block text-xs text-slate-500">El alumno marca lo que contestó y ve su nota estimada con la fórmula de este examen. No se guarda nada.</span>
            </span>
          </label>
        </div>
      )}
      <div className="mt-3">
        <ErrorBox error={error} />
      </div>
      <button className="btn-primary mt-3" disabled={!dirty || busy} onClick={() => void save()}>
        {on ? (exam.answers_published ? 'Guardar cambios' : 'Publicar') : 'Retirar la publicación'}
      </button>
      {exam.answers_published && (
        <div className="mt-4 rounded-lg bg-brand-50 p-3 text-sm" data-testid="publish-status">
          <p className="font-medium text-brand-800">
            {future ? `Programadas para el ${fmtDateTime(exam.answers_publish_at ?? '')}` : 'Publicadas'} · código <span className="font-mono">{code}</span>
          </p>
          <p className="mt-1 break-all font-mono text-xs text-slate-600">{link}</p>
          <div className="mt-2 flex gap-2">
            <button
              className="btn btn-sm"
              onClick={() => {
                void navigator.clipboard?.writeText(link);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? 'Copiado' : 'Copiar enlace'}
            </button>
            <a className="btn btn-sm" href={`/comprobar/${code}`} target="_blank" rel="noreferrer">
              Ver como alumno
            </a>
          </div>
        </div>
      )}
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
        <PublishAnswers />
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
                try {
                  const copy = await duplicateExam(db, d, userId);
                  nav(`/app/examenes/${copy.id}/resumen`);
                } catch (e) {
                  if (/LIMITE_(GRATIS|PLUS)/.test((e as Error).message)) return nav('/app/plan?limite=1');
                  throw e;
                }
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
