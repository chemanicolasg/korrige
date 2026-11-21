/**
 * Implementación local (modo demo): los datos viven en este navegador
 * (localStorage + IndexedDB para las imágenes). Imita lo esencial de las reglas
 * del servidor (código de examen, examen cerrado, layout bloqueado, cascadas).
 */
import { Db, Filter, SelectOptions, SessionUser } from './db';

type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;

const STORE_KEY = 'korrige-demo-v1';
const SESSION_KEY = 'korrige-demo-session';
const IDB_NAME = 'korrige-demo';
const NO_ID = new Set(['memberships', 'exam_collaborators', 'results', 'exam_layouts']);
const EXAM_CHILDREN = ['exam_layouts', 'exam_collaborators', 'answer_keys', 'students', 'uploads', 'sheets', 'results', 'review_items'];

export const DEMO_USER: SessionUser = { id: '00000000-0000-4000-8000-000000000001', email: 'demo@korrige.es' };
const DEMO_COLLEAGUE = { id: '00000000-0000-4000-8000-000000000002', email: 'colega@korrige.es', full_name: 'Marta Colega' };
const DEMO_ORG = '00000000-0000-4000-8000-0000000000aa';

const uuid = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const now = () => new Date().toISOString();

function matches(row: Row, filter: Filter = {}): boolean {
  for (const [k, v] of Object.entries(filter)) {
    const val = row[k] ?? null;
    if (Array.isArray(v)) {
      if (!v.includes(val as string | number)) return false;
    } else if (val !== v) return false;
  }
  return true;
}

function seedTables(): Tables {
  const t: Tables = {};
  t.profiles = [
    { id: DEMO_USER.id, email: DEMO_USER.email, full_name: 'Profesor Demo', created_at: now() },
    { ...DEMO_COLLEAGUE, created_at: now() },
  ];
  t.organizations = [{ id: DEMO_ORG, name: 'Facultad de Demostración', retention_months: 12, created_at: now() }];
  t.memberships = [
    { org_id: DEMO_ORG, user_id: DEMO_USER.id, role: 'admin', created_at: now() },
    { org_id: DEMO_ORG, user_id: DEMO_COLLEAGUE.id, role: 'profesor', created_at: now() },
  ];
  return t;
}

// --- imágenes en IndexedDB (con respaldo en memoria si no está disponible) ---
const memImages = new Map<string, Blob>();
/** true tras resetLocalDemo(): las instancias vivas dejan de guardar. */
let wiped = false;
function idb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('images');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}
async function idbOp<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  const d = await idb();
  if (!d) return null;
  return new Promise((resolve) => {
    const req = fn(d.transaction('images', mode).objectStore('images'));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

export function createLocalDb(opts: { persist?: boolean } = {}): Db {
  wiped = false;
  const persist = opts.persist ?? typeof localStorage !== 'undefined';
  let tables: Tables;
  try {
    tables = (persist && JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null')) || seedTables();
  } catch {
    tables = seedTables();
  }
  let user: SessionUser | null = null;
  try {
    user = persist && localStorage.getItem(SESSION_KEY) ? DEMO_USER : null;
  } catch {
    user = null;
  }
  if (!persist) user = DEMO_USER;
  const listeners = new Set<(u: SessionUser | null) => void>();
  const urls = new Map<string, string>();
  let auditSeq = Math.max(0, ...(tables.audit_log ?? []).map((r) => Number(r.id) || 0));
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  const T = (name: string) => (tables[name] ??= []);
  const flush = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = null;
    if (wiped) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(tables));
    } catch {
      console.warn('Modo demo: no queda espacio en el navegador para guardar más datos.');
    }
  };
  const save = () => {
    if (!persist) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 150);
  };
  // que no se pierda la última escritura si se recarga o se cierra la pestaña
  if (persist && typeof addEventListener === 'function') addEventListener('pagehide', () => saveTimer && !wiped && flush());
  const setUser = (u: SessionUser | null) => {
    user = u;
    try {
      if (persist) u ? localStorage.setItem(SESSION_KEY, '1') : localStorage.removeItem(SESSION_KEY);
    } catch {
      /* nada */
    }
    listeners.forEach((l) => l(u));
  };
  const exam = (id: unknown) => T('exams').find((e) => e.id === id);
  const guardOpen = (table: string, row: Row) => {
    if (!EXAM_CHILDREN.includes(table) || table === 'exam_collaborators') return;
    const e = exam(row.exam_id);
    if (!e) throw new Error('Examen inexistente');
    if (e.status === 'cerrado') throw new Error('El examen está cerrado: reábrelo para modificarlo');
  };
  // Plan de la demo: sin límite salvo que se fuerce con localStorage (para probar el muro de pago)
  const demoPlan = (): 'academy' | 'free' | 'plus' => {
    try {
      const v = persist ? localStorage.getItem('korrige-demo-plan') : null;
      return v === 'free' || v === 'plus' ? v : 'academy';
    } catch {
      return 'academy';
    }
  };
  const usage = () => {
    const mine = T('exam_usage').filter((u) => u.user_id === user?.id);
    const month = new Date().toISOString().slice(0, 7);
    return { total: mine.reduce((a, u) => a + Number(u.n), 0), month: mine.filter((u) => u.period === month).reduce((a, u) => a + Number(u.n), 0) };
  };
  const genCode = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (;;) {
      let c = '';
      for (let i = 0; i < 8; i++) c += alphabet[Math.floor(Math.random() * 32)];
      if (!T('exams').some((e) => e.code === c)) return c;
    }
  };
  const prepare = (table: string, input: Row): Row => {
    const row: Row = { ...input };
    if (!NO_ID.has(table) && table !== 'audit_log') row.id ??= uuid();
    row.created_at ??= now();
    if (table === 'exams') {
      const plan = demoPlan();
      if (plan !== 'academy') {
        const u = usage();
        if (plan === 'plus' && u.month >= 5) throw new Error('LIMITE_PLUS: has creado los 5 exámenes de este mes incluidos en Korrige Plus');
        if (plan === 'free' && u.total >= 1) throw new Error('LIMITE_GRATIS: ya has usado tu examen gratuito. Pasa a Korrige Plus para crear más');
        const month = new Date().toISOString().slice(0, 7);
        const rowU = T('exam_usage').find((x) => x.user_id === user?.id && x.period === month);
        if (rowU) rowU.n = Number(rowU.n) + 1;
        else T('exam_usage').push({ user_id: user?.id, period: month, n: 1 });
      }
      row.code ||= genCode();
      row.status ??= 'borrador';
      row.model_map ??= {};
      row.subject ??= '';
      row.group_name ??= '';
      row.session ??= '';
      row.exam_date ??= null;
      row.closed_at = null;
      row.images_purged_at = null;
      row.updated_at = now();
    }
    if (EXAM_CHILDREN.includes(table)) {
      guardOpen(table, row);
      row.org_id = exam(row.exam_id)!.org_id;
    }
    if (table === 'audit_log') {
      row.id = ++auditSeq;
      row.user_id = user?.id ?? null;
      row.user_email = user?.email ?? '';
      row.created_at = now();
      if (row.exam_id) row.org_id = exam(row.exam_id)?.org_id ?? row.org_id;
    }
    if (table === 'review_items') {
      row.status ??= 'pendiente';
      row.resolution ??= null;
      row.resolved_by ??= null;
      row.resolved_at ??= null;
    }
    return row;
  };

  const db: Db = {
    kind: 'local',

    async getSession() {
      return user;
    },
    onAuthChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    async signIn() {
      setUser(DEMO_USER);
    },
    async signUp() {
      setUser(DEMO_USER);
      return false;
    },
    async signInMagic() {
      setUser(DEMO_USER);
    },
    async resetPassword() {},
    async updatePassword() {},
    async signOut() {
      setUser(null);
    },

    async select<T>(table: string, filter?: Filter, o: SelectOptions = {}) {
      let rows = T(table).filter((r) => matches(r, filter));
      if (o.order) {
        const k = o.order;
        const dir = (o.asc ?? true) ? 1 : -1;
        rows = [...rows].sort((a, b) => (a[k]! < b[k]! ? -dir : a[k]! > b[k]! ? dir : 0));
      }
      if (o.limit) rows = rows.slice(0, o.limit);
      return structuredClone(rows) as T[];
    },
    async insert<T>(table: string, rows: object | object[]) {
      const list = (Array.isArray(rows) ? rows : [rows]).map((r) => prepare(table, structuredClone(r) as Row));
      T(table).push(...list);
      save();
      return structuredClone(list) as T[];
    },
    async update<T>(table: string, filter: Filter, patch: object) {
      const out: Row[] = [];
      for (const row of T(table)) {
        if (!matches(row, filter)) continue;
        const p = structuredClone(patch) as Row;
        if (table === 'exams') {
          const closed = row.status === 'cerrado';
          if (closed && (p.status ?? 'cerrado') === 'cerrado') throw new Error('El examen está cerrado: reábrelo para modificarlo');
          if (p.sheet_config && JSON.stringify(p.sheet_config) !== JSON.stringify(row.sheet_config) && T('sheets').some((s) => s.exam_id === row.id)) {
            throw new Error('La hoja de respuestas queda bloqueada al subir hojas: crea un examen nuevo');
          }
          if (p.status === 'cerrado' && !closed) p.closed_at = now();
          if (p.status && p.status !== 'cerrado' && closed) p.closed_at = null;
          p.updated_at = now();
        } else {
          guardOpen(table, row);
          if (table === 'exam_layouts' && T('sheets').some((s) => s.exam_id === row.exam_id)) {
            throw new Error('El layout queda bloqueado al subir hojas: crea un examen nuevo');
          }
        }
        Object.assign(row, p);
        out.push(row);
      }
      save();
      return structuredClone(out) as T[];
    },
    async upsert<T>(table: string, rows: object | object[], onConflict: string) {
      const keys = onConflict.split(',').map((k) => k.trim());
      const out: Row[] = [];
      for (const r of (Array.isArray(rows) ? rows : [rows]) as Row[]) {
        const existing = T(table).find((x) => keys.every((k) => x[k] === r[k]));
        if (existing) {
          guardOpen(table, existing);
          Object.assign(existing, structuredClone(r));
          out.push(existing);
        } else {
          const row = prepare(table, structuredClone(r));
          T(table).push(row);
          out.push(row);
        }
      }
      save();
      return structuredClone(out) as T[];
    },
    async remove(table: string, filter: Filter) {
      if (!Object.keys(filter).length) throw new Error('remove() necesita un filtro');
      const doomed = T(table).filter((r) => matches(r, filter));
      if (table !== 'exams') doomed.forEach((r) => guardOpen(table, r));
      tables[table] = T(table).filter((r) => !doomed.includes(r));
      if (table === 'exams') {
        const ids = new Set(doomed.map((r) => r.id));
        for (const child of EXAM_CHILDREN) tables[child] = T(child).filter((r) => !ids.has(r.exam_id));
        for (const a of T('audit_log')) if (ids.has(a.exam_id)) a.exam_id = null;
      }
      if (table === 'uploads' || table === 'sheets') {
        const sheetIds = new Set(table === 'sheets' ? doomed.map((r) => r.id) : T('sheets').filter((s) => doomed.some((u) => u.id === s.upload_id)).map((s) => s.id));
        tables.sheets = T('sheets').filter((s) => !sheetIds.has(s.id));
        tables.results = T('results').filter((r) => !sheetIds.has(r.sheet_id));
        tables.review_items = T('review_items').filter((r) => !sheetIds.has(r.sheet_id));
      }
      save();
    },
    async rpc<T>(fn: string, args: Record<string, unknown> = {}) {
      if (!user) throw new Error('No autenticado');
      if (fn === 'create_organization') {
        const id = uuid();
        T('organizations').push({ id, name: String(args.p_name).trim(), retention_months: null, created_at: now() });
        T('memberships').push({ org_id: id, user_id: user.id, role: 'admin', created_at: now() });
        save();
        return id as T;
      }
      if (fn === 'accept_invitations') return 0 as T;
      if (fn === 'my_plan') {
        const plan = demoPlan();
        const u = usage();
        return {
          plan: plan === 'plus' ? 'plus' : 'free',
          used: plan === 'plus' ? u.month : u.total,
          limit: plan === 'plus' ? 5 : 1,
          period_end: null,
          cancel_at_period_end: false,
          status: plan === 'plus' ? 'active' : null,
          interval: plan === 'plus' ? 'month' : null,
          academy_orgs: plan === 'academy' ? T('organizations').map((o) => o.id) : [],
        } as T;
      }
      if (fn === 'share_exam') {
        const e = exam(args.p_exam);
        const email = String(args.p_email).trim().toLowerCase();
        const p = T('profiles').find((x) => x.email === email && T('memberships').some((m) => m.user_id === x.id && m.org_id === e?.org_id));
        if (!e || !p) throw new Error('No hay ningún profesor con ese email en tu organización');
        if (!T('exam_collaborators').some((c) => c.exam_id === e.id && c.user_id === p.id)) {
          T('exam_collaborators').push({ exam_id: e.id, user_id: p.id, added_by: user.id, created_at: now() });
        }
        await db.insert('audit_log', { org_id: e.org_id, exam_id: e.id, action: 'examen_compartido', details: { email } });
        return p.id as T;
      }
      if (fn === 'org_usage') {
        const org = args.p_org;
        return T('memberships')
          .filter((m) => m.org_id === org)
          .map((m) => {
            const p = T('profiles').find((x) => x.id === m.user_id);
            const exams = T('exams').filter((e) => e.org_id === org && e.owner_id === m.user_id);
            const acts = T('audit_log').filter((a) => a.org_id === org && a.user_id === m.user_id);
            return {
              user_id: m.user_id,
              email: p?.email ?? '',
              full_name: p?.full_name ?? '',
              role: m.role,
              n_exams: exams.length,
              n_sheets: T('sheets').filter((s) => exams.some((e) => e.id === s.exam_id)).length,
              last_activity: acts.length ? acts[acts.length - 1].created_at : null,
            };
          }) as T;
      }
      throw new Error(`Función no disponible en modo demo: ${fn}`);
    },

    async invoke<T>() {
      throw new Error('No disponible en modo demo');
      return undefined as T;
    },

    async uploadImage(path, blob) {
      memImages.set(path, blob);
      await idbOp('readwrite', (s) => s.put(blob, path));
    },
    async imageUrl(path) {
      const hit = urls.get(path);
      if (hit) return hit;
      const blob = memImages.get(path) ?? ((await idbOp('readonly', (s) => s.get(path))) as Blob | null);
      if (!blob || typeof URL.createObjectURL !== 'function') return null;
      const url = URL.createObjectURL(blob);
      urls.set(path, url);
      return url;
    },
    async removeImages(paths) {
      for (const p of paths) {
        memImages.delete(p);
        urls.delete(p);
        await idbOp('readwrite', (s) => s.delete(p));
      }
    },
  };
  return db;
}

const SEEDED_KEY = 'korrige-demo-ready';

/** Id del examen de ejemplo si la demo terminó de crearse; null si nunca se creó o quedó a medias. */
export function demoReadyExam(): string | null {
  try {
    return localStorage.getItem(SEEDED_KEY);
  } catch {
    return null;
  }
}

export function markDemoReady(examId: string) {
  try {
    localStorage.setItem(SEEDED_KEY, examId);
  } catch {
    /* nada */
  }
}

/** Borra todos los datos del modo demo de este navegador. */
export async function resetLocalDemo() {
  wiped = true;
  try {
    localStorage.removeItem(SEEDED_KEY);
    localStorage.removeItem(STORE_KEY);
  } catch {
    /* nada */
  }
  memImages.clear();
  await idbOp('readwrite', (s) => s.clear());
}

export const DEMO_ORG_ID = DEMO_ORG;
