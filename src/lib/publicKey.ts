/**
 * Lectura pública de la plantilla de un examen publicado (página /comprobar).
 * No usa sesión ni carga el cliente de Supabase: una sola llamada a la función
 * public_answer_key, que es lo único accesible sin iniciar sesión.
 */
import { SUPABASE_ANON_KEY, SUPABASE_CONFIGURED, SUPABASE_URL } from '../config';
import { getDb, isDemoMode } from './db';
import { PublicKey } from './types';

export const cleanCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 16);

export async function fetchPublicKey(code: string): Promise<PublicKey> {
  const p_code = cleanCode(code);
  if (p_code.length < 4) return { status: 'not_found' };
  if (!SUPABASE_CONFIGURED || isDemoMode()) return (await getDb()).rpc<PublicKey>('public_answer_key', { p_code });
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/public_answer_key`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ p_code }),
  });
  if (!res.ok) throw new Error('No se ha podido consultar. Inténtalo de nuevo en unos minutos.');
  return (await res.json()) as PublicKey;
}
