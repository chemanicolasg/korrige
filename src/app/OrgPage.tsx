import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ErrorBox, Field, Notice, Spinner, fmtDate, fmtDateTime } from '../components/ui';
import { ACTION_LABEL, logAudit } from '../lib/service';
import { AuditEntry, Invitation, Membership, OrgRole, Profile } from '../lib/types';
import { useSession } from './AuthContext';
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
    void load();
  }, [load, org.name, org.retention_months]);

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
    }, 'Cambios guardados.');
  }
  async function invite(e: FormEvent) {
    e.preventDefault();
    await act(async () => {
      await db.insert('invitations', { org_id: org.id, email: email.trim().toLowerCase(), role: invRole, invited_by: user.id });
      await logAudit(db, org.id, null, 'invitacion_enviada', { email: email.trim().toLowerCase(), rol: invRole });
      setEmail('');
    }, 'Invitación creada. Envíale el enlace de registro.');
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
        <h2 className="font-semibold">Profesores</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200">
              <tr>
                {['Nombre', 'Email', 'Rol', ...(admin ? ['Exámenes', 'Hojas leídas', 'Última actividad', ''] : [])].map((h) => (
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
                      <select className="input w-auto py-1" aria-label={`Rol de ${m.profile?.email}`} value={m.role} onChange={(e) => void act(() => db.update('memberships', { org_id: org.id, user_id: m.user_id }, { role: e.target.value }))}>
                        <option value="profesor">Profesor</option>
                        <option value="admin">Administrador</option>
                      </select>
                    ) : m.role === 'admin' ? (
                      'Administrador'
                    ) : (
                      'Profesor'
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
                            onClick={() => confirm(`¿Quitar a ${m.profile?.email} de la organización? Sus exámenes se conservan y los seguirán viendo los administradores.`) && void act(() => db.remove('memberships', { org_id: org.id, user_id: m.user_id }))}
                          >
                            Quitar
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
        {!admin && <p className="mt-3 text-xs text-slate-500">Solo los administradores pueden invitar profesores y cambiar la configuración.</p>}
      </section>

      {admin && (
        <>
          <section className="card p-5">
            <h2 className="font-semibold">Invitar profesores</h2>
            <p className="mt-1 text-sm text-slate-600">
              Escribe su email y envíale el enlace de registro. Al crear su cuenta con ese mismo email (y confirmarlo) entrará directamente en {org.name}.
            </p>
            {db.kind === 'local' ? (
              <p className="mt-3 text-sm text-slate-500">Las invitaciones no están disponibles en el modo demo.</p>
            ) : (
              <>
                <form onSubmit={invite} className="mt-3 flex flex-wrap gap-2">
                  <input className="input max-w-xs" type="email" required placeholder="profesor@universidad.es" aria-label="Email del profesor" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <select className="input w-auto" aria-label="Rol" value={invRole} onChange={(e) => setInvRole(e.target.value as OrgRole)}>
                    <option value="profesor">Profesor</option>
                    <option value="admin">Administrador</option>
                  </select>
                  <button className="btn-primary">Invitar</button>
                </form>
                {invites.length > 0 && (
                  <ul className="mt-4 divide-y divide-slate-100 text-sm">
                    {invites.map((i) => (
                      <li key={i.id} className="flex flex-wrap items-center gap-3 py-2">
                        <span className="font-medium">{i.email}</span>
                        <span className="badge bg-slate-100 text-slate-600">{i.role}</span>
                        {i.accepted_at ? <span className="text-emerald-700">Aceptada el {fmtDate(i.accepted_at)}</span> : <span className="text-amber-700">Pendiente desde el {fmtDate(i.created_at)}</span>}
                        {!i.accepted_at && (
                          <button className="btn btn-sm" onClick={() => void navigator.clipboard.writeText(link(i.email)).then(() => setSaved('Enlace copiado.'))}>
                            Copiar enlace de registro
                          </button>
                        )}
                        <button className="ml-auto text-xs text-red-700 hover:underline" onClick={() => void act(() => db.remove('invitations', { id: i.id }))}>
                          Eliminar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>

          <form onSubmit={saveOrg} className="card space-y-4 p-5">
            <h2 className="font-semibold">Configuración y protección de datos</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre de la organización">
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={120} required />
              </Field>
              <Field label="Conservación de las imágenes de las hojas" hint="Meses tras cerrar un examen. Pasado ese plazo se borran las imágenes y se conservan las notas. Vacío = no borrar automáticamente.">
                <input className="input" type="number" min={1} max={120} placeholder="Sin límite" value={retention} onChange={(e) => setRetention(e.target.value)} />
              </Field>
            </div>
            <p className="text-xs text-slate-500">
              Las hojas contienen datos personales de los alumnos (RGPD). Cualquier examen se puede borrar por completo desde su pestaña Resumen.
            </p>
            <button className="btn-primary">Guardar</button>
          </form>

          <section className="card p-5">
            <h2 className="font-semibold">Actividad reciente de la organización</h2>
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {log.map((a) => (
                <li key={a.id} className="flex flex-wrap gap-x-3 py-1.5">
                  <span className="w-36 shrink-0 text-slate-500">{fmtDateTime(a.created_at)}</span>
                  <span className="font-medium">{ACTION_LABEL[a.action] ?? a.action.replace(/_/g, ' ')}</span>
                  <span className="text-slate-500">{a.user_email}</span>
                  <span className="w-full truncate text-xs text-slate-500 sm:w-auto">{auditSummary(a)}</span>
                </li>
              ))}
              {!log.length && <li className="py-2 text-slate-500">Sin actividad todavía.</li>}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
