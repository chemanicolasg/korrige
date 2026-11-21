/**
 * Capa de datos. Dos implementaciones con la misma interfaz:
 *  · Supabase (producción): Postgres + RLS, Auth y Storage.
 *  · Local (modo demo): todo en el navegador, sin servidor. Se usa cuando no hay
 *    Supabase configurado o al entrar por /demo.
 * La lógica de la aplicación (src/lib/service.ts) solo conoce esta interfaz.
 */
import { SUPABASE_CONFIGURED } from '../config';

export type FilterValue = string | number | boolean | null | (string | number)[];
export type Filter = Record<string, FilterValue>;

export interface SessionUser {
  id: string;
  email: string;
}

export interface SelectOptions {
  columns?: string;
  order?: string;
  asc?: boolean;
  limit?: number;
}

export interface Db {
  kind: 'supabase' | 'local';

  getSession(): Promise<SessionUser | null>;
  onAuthChange(cb: (user: SessionUser | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  /** Devuelve true si hace falta confirmar el email antes de entrar. */
  signUp(email: string, password: string, fullName: string): Promise<boolean>;
  signInMagic(email: string): Promise<void>;
  resetPassword(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  signOut(): Promise<void>;

  select<T>(table: string, filter?: Filter, opts?: SelectOptions): Promise<T[]>;
  insert<T>(table: string, rows: object | object[]): Promise<T[]>;
  update<T>(table: string, filter: Filter, patch: object): Promise<T[]>;
  upsert<T>(table: string, rows: object | object[], onConflict: string): Promise<T[]>;
  remove(table: string, filter: Filter): Promise<void>;
  rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T>;
  /** Llama a una Edge Function con la sesión del usuario. Devuelve el cuerpo JSON de la respuesta. */
  invoke<T>(fn: string, body: Record<string, unknown>): Promise<T>;

  uploadImage(path: string, blob: Blob): Promise<void>;
  /** URL temporal de una imagen (firmada en Supabase; blob: en local). */
  imageUrl(path: string): Promise<string | null>;
  removeImages(paths: string[]): Promise<void>;
}

const MODE_KEY = 'korrige-mode';

export function isDemoMode(): boolean {
  if (!SUPABASE_CONFIGURED) return true;
  try {
    return globalThis.localStorage?.getItem(MODE_KEY) === 'demo';
  } catch {
    return false;
  }
}

export function setDemoMode(on: boolean) {
  try {
    if (on) localStorage.setItem(MODE_KEY, 'demo');
    else localStorage.removeItem(MODE_KEY);
  } catch {
    /* sin almacenamiento: se queda como está */
  }
}

let dbPromise: Promise<Db> | null = null;
let dbMode = '';

/** Devuelve la implementación activa (carga diferida: la landing no arrastra Supabase). */
export function getDb(): Promise<Db> {
  const mode = isDemoMode() ? 'local' : 'supabase';
  if (!dbPromise || dbMode !== mode) {
    dbMode = mode;
    dbPromise = mode === 'local' ? import('./dbLocal').then((m) => m.createLocalDb()) : import('./dbSupabase').then((m) => m.createSupabaseDb());
  }
  return dbPromise;
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
