import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config';
import { Db, Filter, SelectOptions, SessionUser, chunk } from './db';

const BUCKET = 'sheets';
const PAGE = 1000;

/** Traduce los errores más habituales de Supabase a mensajes para el profesor. */
function fail(error: { message: string; code?: string } | null, ctx: string): never {
  const m = error?.message ?? 'Error desconocido';
  const map: [RegExp, string][] = [
    [/Invalid login credentials/i, 'Email o contraseña incorrectos.'],
    [/Email not confirmed/i, 'Confirma tu email con el enlace que te hemos enviado antes de entrar.'],
    [/User already registered/i, 'Ya existe una cuenta con ese email.'],
    [/Password should be at least/i, 'La contraseña debe tener al menos 8 caracteres.'],
    [/row-level security|permission denied/i, 'No tienes permiso para hacer esto (¿el examen está cerrado?).'],
    [/rate limit|too many requests/i, 'Demasiados intentos. Espera un minuto y vuelve a probar.'],
    [/Failed to fetch|NetworkError/i, 'No hay conexión con el servidor. Comprueba tu conexión a internet.'],
  ];
  for (const [re, msg] of map) if (re.test(m)) throw new Error(msg);
  throw new Error(`${ctx}: ${m}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilter(q: any, filter: Filter = {}) {
  for (const [k, v] of Object.entries(filter)) {
    if (Array.isArray(v)) q = q.in(k, v);
    else if (v === null) q = q.is(k, null);
    else q = q.eq(k, v);
  }
  return q;
}

export function createSupabaseDb(client?: SupabaseClient): Db {
  const sb =
    client ??
    createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  const signed = new Map<string, { url: string; exp: number }>();
  const toUser = (u: { id: string; email?: string } | null | undefined): SessionUser | null => (u ? { id: u.id, email: u.email ?? '' } : null);
  const redirect = () => (typeof location !== 'undefined' ? `${location.origin}/app` : undefined);

  return {
    kind: 'supabase',

    async getSession() {
      const { data } = await sb.auth.getSession();
      return toUser(data.session?.user);
    },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_ev, session) => cb(toUser(session?.user)));
      return () => data.subscription.unsubscribe();
    },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) fail(error, 'No se pudo iniciar sesión');
    },
    async signUp(email, password, fullName) {
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: redirect() } });
      if (error) fail(error, 'No se pudo crear la cuenta');
      return !data.session;
    },
    async signInMagic(email) {
      const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect(), shouldCreateUser: false } });
      if (error) fail(error, 'No se pudo enviar el enlace');
    },
    async resetPassword(email) {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: typeof location !== 'undefined' ? `${location.origin}/acceso?modo=nueva` : undefined });
      if (error) fail(error, 'No se pudo enviar el email');
    },
    async updatePassword(password) {
      const { error } = await sb.auth.updateUser({ password });
      if (error) fail(error, 'No se pudo cambiar la contraseña');
    },
    async signOut() {
      await sb.auth.signOut();
    },

    async select<T>(table: string, filter?: Filter, opts: SelectOptions = {}) {
      const out: T[] = [];
      const max = opts.limit ?? Infinity;
      for (let from = 0; out.length < max; from += PAGE) {
        let q = applyFilter(sb.from(table).select(opts.columns ?? '*'), filter);
        if (opts.order) q = q.order(opts.order, { ascending: opts.asc ?? true });
        const to = Math.min(from + PAGE, max) - 1;
        const { data, error } = await q.range(from, to);
        if (error) fail(error, `No se pudo leer ${table}`);
        out.push(...(data as T[]));
        if (!data || data.length < to - from + 1) break;
      }
      return out;
    },
    async insert<T>(table: string, rows: object | object[]) {
      const list = Array.isArray(rows) ? rows : [rows];
      const out: T[] = [];
      for (const part of chunk(list, 100)) {
        const { data, error } = await sb.from(table).insert(part).select();
        if (error) fail(error, `No se pudo guardar en ${table}`);
        out.push(...(data as T[]));
      }
      return out;
    },
    async update<T>(table: string, filter: Filter, patch: object) {
      const { data, error } = await applyFilter(sb.from(table).update(patch), filter).select();
      if (error) fail(error, `No se pudo actualizar ${table}`);
      return data as T[];
    },
    async upsert<T>(table: string, rows: object | object[], onConflict: string) {
      const list = Array.isArray(rows) ? rows : [rows];
      const out: T[] = [];
      for (const part of chunk(list, 200)) {
        const { data, error } = await sb.from(table).upsert(part, { onConflict }).select();
        if (error) fail(error, `No se pudo guardar en ${table}`);
        out.push(...(data as T[]));
      }
      return out;
    },
    async remove(table: string, filter: Filter) {
      if (!Object.keys(filter).length) throw new Error('remove() necesita un filtro');
      const { error } = await applyFilter(sb.from(table).delete(), filter);
      if (error) fail(error, `No se pudo borrar de ${table}`);
    },
    async rpc<T>(fn: string, args?: Record<string, unknown>) {
      const { data, error } = await sb.rpc(fn, args);
      if (error) throw new Error(error.message);
      return data as T;
    },

    async uploadImage(path, blob) {
      const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: true });
      if (error) fail(error, 'No se pudo subir la imagen de la hoja');
    },
    async imageUrl(path) {
      const hit = signed.get(path);
      if (hit && hit.exp > Date.now()) return hit.url;
      const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, 3600);
      if (error || !data) return null;
      signed.set(path, { url: data.signedUrl, exp: Date.now() + 50 * 60_000 });
      return data.signedUrl;
    },
    async removeImages(paths) {
      for (const part of chunk(paths, 100)) {
        const { error } = await sb.storage.from(BUCKET).remove(part);
        if (error) fail(error, 'No se pudieron borrar las imágenes');
      }
    },
  };
}
