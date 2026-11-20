/**
 * i18n mínimo de la landing. El español es el idioma completo; catalán e inglés
 * tienen la estructura preparada (src/i18n/ca.ts, en.ts) y heredan del español lo
 * que falte. Para publicar un idioma, complétalo y añádelo a ENABLED_LOCALES.
 */
import { ca } from './ca';
import { en } from './en';
import { Dict, es } from './es';

export type DeepPartial<T> = T extends readonly unknown[] ? T : T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;
export type Locale = 'es' | 'ca' | 'en';

export const LOCALE_NAMES: Record<Locale, string> = { es: 'Español', ca: 'Català', en: 'English' };
/** Idiomas visibles en el selector de la landing. */
export const ENABLED_LOCALES: Locale[] = ['es'];

function merge(base: unknown, over: unknown): unknown {
  if (over === undefined) return base;
  if (Array.isArray(base) || typeof base !== 'object' || base === null) return over;
  const out = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over as object)) out[k] = merge((base as Record<string, unknown>)[k], v);
  return out;
}

const DICTS: Record<Locale, Dict> = { es, ca: merge(es, ca) as Dict, en: merge(es, en) as Dict };

export function getDict(locale: Locale): Dict {
  return DICTS[locale] ?? es;
}

export function detectLocale(): Locale {
  try {
    const q = new URLSearchParams(location.search).get('lang') as Locale | null;
    const saved = localStorage.getItem('korrige-lang') as Locale | null;
    const pick = q ?? saved;
    if (pick && ENABLED_LOCALES.includes(pick)) return pick;
  } catch {
    /* SSR o sin almacenamiento */
  }
  return 'es';
}
