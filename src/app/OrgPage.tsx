import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ErrorBox, Field, Notice, Spinner, fmtDate, fmtDateTime } from '../components/ui';
import { tr } from '../i18n/app';
import { fileToLogo } from '../lib/logoImage';
import { ACTION_LABEL, logAudit } from '../lib/service';
import { AuditEntry, DEFAULT_GRADING, ExamDefaults, Invitation, Membership, OrgRole, Profile } from '../lib/types';
import { useSession } from './AuthContext';
import { GradingFields } from './GradingFields';
import { ID_LABELS } from './SheetConfigForm';
import { auditSummary } from './tabs/TabAudit';

interface Usage {
  user_id: string;
  email: string;
  full_name: string;
  role: OrgRole;
  n_exams: number;
  n_sheets: number;
  last_activity: string | null;
}

export default function OrgPage() {
  const { db, org, role, user, refresh } = useSession();
  const admin = role === 'admin';
  const [members, setMembers] = useState<(Membership & { profile?: Profile })[] | null>(null);
  const [usage, setUsage] = useState<Usage[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [log, setLog] = useState<AuditEntry[]>([]);
  const [error, setError] = useState('');
  const [name, setName] = useState(org.name);
  const [retention, setRetention] = useState(org.retention_months ? String(org.retention_months) : '');
  const [email, setEmail] = useState('');
  const [invRole, setInvRole] = useState<OrgRole>('profesor');
  const [saved, setSaved] = useState('');
  const [def, setDef] = useState<ExamDefaults>(org.exam_defaults ?? {});
  const logoFile = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const ms = await db.select<Membership>('memberships', { org_id: org.id });
      const ps = await db.select<Profile>('profiles', { id: ms.map((m) => m.user_id) });
      setMembers(ms.map((m) => ({ ...m, profile: ps.find((p) => p.id === m.user_id) })).sort((a, b) => (a.profile?.email ?? '').localeCompare(b.profile?.email ?? '')));
      if (admin) {
        setUsage(await db.rpc<Usage[]>('org_usage', { p_org: org.id }));
        setInvites(db.kind === 'local' ? [] : await db.select<Invitation>('invitations', { org_id: org.id }, { order: 'created_at', asc: false }));
        setLog(await db.select<AuditEntry>('audit_log', { org_id: org.id }, { order: 'id', asc: false, limit: 30 }));
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, [db, org.id, admin]);
  useEffect(() => {
    setName(org.name);
    setRetention(org.retention_months ? String(org.retention_months) : '');
    setDef(org.exam_defaults ?? {});
    void load();
  }, [load, org.name, org.retention_months, org.exam_defaults]);

  const act = async (fn: () => Promise<unknown>, okMsg = '') => {
    setError('');
    setSaved('');
    try {
      await fn();
      setSaved(okMsg);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  async function saveOrg(e: FormEvent) {
    e.preventDefault();
    await act(async () => {
      const months = retention ? Math.max(1, Math.min(120, Number(retention))) : null;
      await db.update('organizations', { id: org.id }, { name: name.trim(), retention_months: months });
      await logAudit(db, org.id, null, 'organizacion_editada', { nombre: name.trim(), retencion_meses: months });
      await refresh();
    }, tr('Cambios guardados.'));
  }
  async function saveDefaults(e: FormEvent) {
    e.preventDefault();
    await act(async () => {
      const clean: ExamDefaults = {
        ...(def.logo ? { logo: def.logo } : {}),
        ...(def.title?.trim() ? { title: def.title.trim().slice(0, 60) } : {}),
        ...(def.idLabel?.trim() ? { idLabel: def.idLabel.trim().slice(0, 12) } : {}),
        ...(def.idDigits ? { idDigits: Math.min(10, Math.max(6, Math.round(def.idDigits))) } : {}),
        ...(def.lang && def.lang !== 'es' ? { lang: def.lang } : {}),
        ...(def.grading ? { grading: def.grading } : {}),
      };
      await db.update('organizations', { id: org.id }, { exam_defaults: clean });
      await logAudit(db, org.id, null, 'valores_por_defecto', { logotipo: !!clean.logo, identificador: clean.idLabel, digitos: clean.idDigits, formula: clean.grading?.formula });
      await refresh();
    }, tr('Valores por defecto guardados. Se aplicarán a los exámenes nuevos.'));
  }
  async function onLogo(f: File | undefined) {
    if (!f) return;
    setError('');
    try {
      const logo = await fileToLogo(f);
      setDef((d) => ({ ...d, logo }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (logoFile.current) logoFile.current.value = '';
    }
  }
  const INVITE_ERRORS: Record<string, string> = {
    email_not_configured: tr('El envío de correo no está configurado (falta la clave de Resend).'),
    email_failed: tr('El servidor de correo ha rechazado el envío.'),
    accepted: tr('Esta invitación ya se aceptó.'),
    forbidden: tr('Solo un administrador puede enviar invitaciones.'),
    rate_wait: tr('Acabas de enviarle un correo: espera un par de minutos antes de reenviarlo.'),
    rate_address: tr('Ya se han enviado 5 correos a esta dirección en las últimas 24 horas.'),
    rate_org: tr('Tu organización ha alcanzado el máximo de 50 correos de invitación al día. Si necesitas invitar a más profesores de golpe, escribe a ventas.'),
  };
  /** Envía (o reenvía) el correo de invitación. Si falla, la invitación sigue creada y se puede copiar el enlace. */
  async function sendInviteEmail(id: string, mail: string): Promise<string> {
    try {
      await db.invoke('send-invite', { invitation_id: id });
      return tr('Invitación enviada por correo a {mail}.', { mail });
    } catch (e) {
      const code = (e as Error).message;
      throw new Error(tr('No se ha podido enviar el correo a {mail}: {motivo}. La invitación está creada: copia el enlace de registro y envíaselo tú.', { mail, motivo: INVITE_ERRORS[code] ?? code }));
    }
  }
  async function invite(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaved('');
    const mail = email.trim().toLowerCase();
    try {
      const [inv] = await db.insert<Invitation>('invitations', { org_id: org.id, email: mail, role: invRole, invited_by: user.id });
      await logAudit(db, org.id, null, 'invitacion_enviada', { email: mail, rol: invRole });
      setEmail('');
      await load();
      setSaved(await sendInviteEmail(inv.id, mail));
    } catch (err) {
      setError((err as Error).message);
      await load();
    }
  }
  async function resend(i: Invitation) {
    setError('');
    setSaved('');
    try {
      setSaved(await sendInviteEmail(i.id, i.email));
    } catch (err) {
      setError((err as Error).message);
    }
  }
  const link = (mail: string) => `${location.origin}/acceso?modo=crear&email=${encodeURIComponent(mail)}`;
  const use = (id: string) => usage.find((u) => u.user_id === id);

  if (!members && !error) return <Spinner />;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">{org.name}</h1>
      <ErrorBox error={error} />
      {saved && <Notice tone="ok">{saved}</Notice>}

      <section className="card p-5">
        <h2 className="font-semibold">{tr('Profesores')}</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200">
              <tr>
                {[tr('Nombre'), tr('Email'), tr('Rol'), ...(admin ? [tr('Exámenes'), tr('Hojas leídas'), tr('Última actividad'), ''] : [])].map((h) => (
                  <th key={h} className="th">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members?.map((m) => (
                <tr key={m.user_id}>
                  <td className="td">{m.profile?.full_name || '—'}</td>
                  <td className="td">{m.profile?.email}</td>
                  <td className="td">
                    {admin && m.user_id !== user.id ? (
                      <select className="input w-auto py-1" aria-label={tr('Rol de {email}', { email: String(m.profile?.email) })} value={m.role} onChange={(e) => void act(() => db.update('memberships', { org_id: org.id, user_id: m.user_id }, { role: e.target.value }))}>
                        <option value="profesor">{tr('Profesor')}</option>
                        <option value="admin">{tr('Administrador')}</option>
                      </select>
                    ) : m.role === 'admin' ? (
                      tr('Administrador')
                    ) : (
                      tr('Profesor')
                    )}
                  </td>
                  {admin && (
                    <>
                      <td className="td tabular-nums">{use(m.user_id)?.n_exams ?? 0}</td>
                      <td className="td tabular-nums">{use(m.user_id)?.n_sheets ?? 0}</td>
                      <td className="td text-slate-600">{fmtDateTime(use(m.user_id)?.last_activity)}</td>
                      <td className="td text-right">
                        {m.user_id !== user.id && (
                          <button
                            className="text-xs text-red-700 hover:underline"
                            onClick={() => confirm(tr('¿Quitar a {email} de la organización? Sus exámenes se conservan y los seguirán viendo los administradores.', { email: String(m.profile?.email) })) && void act(() => db.remove('memberships', { org_id: org.id, user_id: m.user_id }))}
                          >
                            {tr('Quitar')}
                          </button>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!admin && <p className="mt-3 text-xs text-slate-500">{tr('Solo los administradores pueden invitar profesores y cambiar la configuración.')}</p>}
      </section>

      {admin && (
        <>
          <section className="card p-5">
            <h2 className="font-semibold">{tr('Invitar profesores')}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {tr('Escribe su email y le enviaremos un correo con el enlace de registro. Al crear su cuenta con ese mismo email (y confirmarlo) entrará directamente en {org}.', { org: org.name })}
            </p>
            {db.kind === 'local' ? (
              <p className="mt-3 text-sm text-slate-500">{tr('Las invitaciones no están disponibles en el modo demo.')}</p>
            ) : (
              <>
                <form onSubmit={invite} className="mt-3 flex flex-wrap gap-2">
                  <input className="input max-w-xs" type="email" required placeholder="profesor@universidad.es" aria-label={tr('Email del profesor')} value={email} onChange={(e) => setEmail(e.target.value)} />
                  <select className="input w-auto" aria-label={tr('Rol')} value={invRole} onChange={(e) => setInvRole(e.target.value as OrgRole)}>
                    <option value="profesor">{tr('Profesor')}</option>
                    <option value="admin">{tr('Administrador')}</option>
                  </select>
                  <button className="btn-primary">{tr('Invitar')}</button>
                </form>
                {invites.length > 0 && (
                  <ul className="mt-4 divide-y divide-slate-100 text-sm">
                    {invites.map((i) => (
                      <li key={i.id} className="flex flex-wrap items-center gap-3 py-2">
                        <span className="font-medium">{i.email}</span>
                        <span className="badge bg-slate-100 text-slate-600">{i.role}</span>
                        {i.accepted_at ? <span className="text-emerald-700">{tr('Aceptada el {fecha}', { fecha: fmtDate(i.accepted_at) })}</span> : <span className="text-amber-700">{tr('Pendiente desde el {fecha}', { fecha: fmtDate(i.created_at) })}</span>}
                        {!i.accepted_at && (
                          <>
                            <button className="btn btn-sm" onClick={() => void resend(i)}>
                              {tr('Reenviar correo')}
                            </button>
                            <button className="btn btn-sm" onClick={() => void navigator.clipboard.writeText(link(i.email)).then(() => setSaved(tr('Enlace copiado.')))}>
                              {tr('Copiar enlace de registro')}
                            </button>
                          </>
                        )}
                        <button className="ml-auto text-xs text-red-700 hover:underline" onClick={() => void act(() => db.remove('invitations', { id: i.id }))}>
                          {tr('Eliminar')}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>

          <form onSubmit={saveDefaults} className="card space-y-5 p-5" data-testid="org-defaults">
            <div>
              <h2 className="font-semibold">{tr('Valores por defecto de los exámenes')}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {tr('Se aplican a cada examen nuevo de {org}. El profesor puede cambiarlos en su examen. No modifican los exámenes que ya existen.', { org: org.name })}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="label">{tr('Logotipo de la hoja')}</span>
                <div className="flex items-center gap-3">
                  <div className="flex h-16 w-32 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-1.5">
                    {def.logo ? <img src={def.logo} alt={tr('Logotipo por defecto')} className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-slate-400">{tr('Sin logotipo')}</span>}
                  </div>
                  <div className="flex flex-col items-start gap-1.5">
                    <input ref={logoFile} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" data-testid="org-logo-input" onChange={(e) => void onLogo(e.target.files?.[0])} />
                    <button type="button" className="btn btn-sm" onClick={() => logoFile.current?.click()}>
                      {def.logo ? tr('Cambiar logotipo') : tr('Subir logotipo')}
                    </button>
                    {def.logo && (
                      <button type="button" className="text-xs text-red-700 hover:underline" onClick={() => setDef({ ...def, logo: undefined })}>
                        {tr('Quitar')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <Field label={tr('Título de la hoja')} hint={tr('Primera línea de la cabecera. Vacío = nombre de la organización.')}>
                <input className="input" maxLength={60} placeholder={org.name} value={def.title ?? ''} onChange={(e) => setDef({ ...def, title: e.target.value })} />
              </Field>
              <Field label={tr('Identificador del alumno')} hint={tr('El que usa vuestro centro: NIA, NIUB, NIU, DNI, expediente…')}>
                <input className="input" list="korrige-org-id-labels" maxLength={12} placeholder="NIA" value={def.idLabel ?? ''} onChange={(e) => setDef({ ...def, idLabel: e.target.value })} />
                <datalist id="korrige-org-id-labels">
                  {ID_LABELS.map((l) => (
                    <option key={l} value={l} />
                  ))}
                </datalist>
              </Field>
              <Field label={tr('Idioma de la hoja de respuestas')} hint={tr('Idioma de los textos impresos en las hojas de los exámenes nuevos. Cada profesor puede cambiarlo en su examen.')}>
                <select className="input" value={def.lang ?? 'es'} onChange={(e) => setDef({ ...def, lang: e.target.value as ExamDefaults['lang'] })}>
                  <option value="es">Castellano</option>
                  <option value="ca">Català</option>
                  <option value="en">English</option>
                </select>
              </Field>
              <Field label={tr('Nº de dígitos del identificador')} hint={tr('Entre 6 y 10. En un DNI, los 8 números (sin la letra).')}>
                <input className="input" type="number" min={6} max={10} placeholder="8" value={def.idDigits ?? ''} onChange={(e) => setDef({ ...def, idDigits: e.target.value ? Number(e.target.value) : undefined })} />
              </Field>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">{tr('Fórmula de corrección por defecto')}</h3>
              <GradingFields value={{ ...DEFAULT_GRADING, ...(def.grading ?? {}) }} onChange={(grading) => setDef({ ...def, grading })} />
            </div>
            <button className="btn-primary">{tr('Guardar valores por defecto')}</button>
          </form>

          <form onSubmit={saveOrg} className="card space-y-4 p-5">
            <h2 className="font-semibold">{tr('Configuración y protección de datos')}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr('Nombre de la organización')}>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={120} required />
              </Field>
              <Field label={tr('Conservación de las imágenes de las hojas')} hint={tr('Meses tras cerrar un examen. Pasado ese plazo se borran las imágenes y se conservan las notas. Vacío = no borrar automáticamente.')}>
                <input className="input" type="number" min={1} max={120} placeholder={tr('Sin límite')} value={retention} onChange={(e) => setRetention(e.target.value)} />
              </Field>
            </div>
            <p className="text-xs text-slate-500">
              {tr('Las hojas contienen datos personales de los alumnos (RGPD). Cualquier examen se puede borrar por completo desde su pestaña Resumen.')}
            </p>
            <button className="btn-primary">{tr('Guardar')}</button>
          </form>

          <section className="card p-5">
            <h2 className="font-semibold">{tr('Actividad reciente de la organización')}</h2>
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {log.map((a) => (
                <li key={a.id} className="flex flex-wrap gap-x-3 py-1.5">
                  <span className="w-36 shrink-0 text-slate-500">{fmtDateTime(a.created_at)}</span>
                  <span className="font-medium">{ACTION_LABEL[a.action] ?? a.action.replace(/_/g, ' ')}</span>
                  <span className="text-slate-500">{a.user_email}</span>
                  <span className="w-full truncate text-xs text-slate-500 sm:w-auto">{auditSummary(a)}</span>
                </li>
              ))}
              {!log.length && <li className="py-2 text-slate-500">{tr('Sin actividad todavía.')}</li>}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
