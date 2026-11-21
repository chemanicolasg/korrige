import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { tr } from '../i18n/app';
import { Db, SessionUser, getDb } from '../lib/db';
import { Membership, Organization, OrgRole, PlanInfo, Profile } from '../lib/types';

interface AuthState {
  db: Db;
  user: SessionUser | null;
  profile: Profile | null;
  orgs: Organization[];
  memberships: Membership[];
  /** Organización activa. */
  org: Organization | null;
  role: OrgRole | null;
  /** Plan del usuario; null mientras carga o si no se pudo leer. */
  plan: PlanInfo | null;
  /** La organización activa tiene Academy: exámenes sin límite. */
  unlimited: boolean;
  /** Puede crear otro examen con su plan actual. */
  canCreateExam: boolean;
  setOrgId: (id: string) => void;
  refresh: () => Promise<void>;
  /** Marca el tutorial de inicio como visto. */
  markOnboarded: () => void;
}

const Ctx = createContext<AuthState | null>(null);
const ORG_KEY = 'korrige-org';

export function AuthProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const [db, setDb] = useState<Db | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  /** Usuario cuyos datos (perfil, organizaciones, plan) están cargados; undefined = ninguno todavía. */
  const [loadedFor, setLoadedFor] = useState<string | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [orgId, setOrgIdState] = useState<string | null>(() => localStorage.getItem(ORG_KEY));
  const [error, setError] = useState('');

  useEffect(() => {
    let off = () => {};
    getDb()
      .then(async (d) => {
        setDb(d);
        setUser(await d.getSession());
        off = d.onAuthChange((u) => setUser((prev) => (prev?.id === u?.id ? prev : u)));
      })
      .catch((e) => setError((e as Error).message));
    return () => off();
  }, []);

  const load = useCallback(async () => {
    if (!db) return;
    if (!user) {
      setProfile(null);
      setOrgs([]);
      setMemberships([]);
      setPlan(null);
      setLoadedFor(null);
      setReady(true);
      return;
    }
    try {
      // invitaciones pendientes para este email (si las hay) antes de cargar las organizaciones
      await db.rpc<number>('accept_invitations').catch(() => 0);
      const [p, ms] = await Promise.all([db.select<Profile>('profiles', { id: user.id }), db.select<Membership>('memberships', { user_id: user.id })]);
      const os = ms.length ? await db.select<Organization>('organizations', { id: ms.map((m) => m.org_id) }, { order: 'name' }) : [];
      setProfile(p[0] ?? { id: user.id, email: user.email, full_name: '' });
      // correo de bienvenida: una vez por cuenta (la función comprueba que el email está confirmado)
      if (db.kind === 'supabase' && p[0] && !p[0].welcomed_at) void db.invoke('welcome', {}).catch(() => undefined);
      setMemberships(ms);
      setOrgs(os);
      setPlan(await db.rpc<PlanInfo>('my_plan').catch(() => null));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadedFor(user.id);
      setReady(true);
    }
  }, [db, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo<AuthState | null>(() => {
    if (!db) return null;
    const org = orgs.find((o) => o.id === orgId) ?? orgs[0] ?? null;
    const unlimited = !!org && !!plan?.academy_orgs.includes(org.id);
    return {
      plan,
      unlimited,
      // si no se conoce el plan no se bloquea aquí: decide la base de datos
      canCreateExam: unlimited || !plan || plan.used < plan.limit,
      db,
      user,
      profile,
      orgs,
      memberships,
      org,
      role: memberships.find((m) => m.org_id === org?.id)?.role ?? null,
      setOrgId: (id) => {
        localStorage.setItem(ORG_KEY, id);
        setOrgIdState(id);
      },
      refresh: load,
      markOnboarded: () => {
        if (!user) return;
        const onboarded_at = new Date().toISOString();
        setProfile((prev) => (prev ? { ...prev, onboarded_at } : prev));
        void db.update('profiles', { id: user.id }, { onboarded_at }).catch(() => undefined);
      },
    };
  }, [db, user, profile, orgs, memberships, orgId, load, plan]);

  if (error && !value?.user) return <div className="p-8 text-sm text-red-700">{tr('No se pudo conectar: {error}', { error })}</div>;
  // tras iniciar sesión se espera a tener sus datos: evita mostrar un instante la pantalla «sin organización»
  if (!value || !ready || loadedFor !== (user?.id ?? null)) return <>{fallback}</>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth fuera de AuthProvider');
  return v;
}

/** Sesión garantizada (dentro de las rutas privadas). */
export function useSession() {
  const a = useAuth();
  return { ...a, user: a.user!, org: a.org!, role: a.role! };
}
