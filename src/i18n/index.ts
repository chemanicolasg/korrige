/**
 * Idiomas de la parte pública: portada (/, /ca, /en), página de alumnos (/comprobar)
 * y hoja de respuestas. La aplicación del profesorado está, de momento, solo en castellano.
 */
import { ca } from './ca';
import { en } from './en';
import { Dict, es } from './es';

export type Locale = 'es' | 'ca' | 'en';

export const LOCALE_NAMES: Record<Locale, string> = { es: 'Español', ca: 'Català', en: 'English' };
/** Idiomas visibles en el selector de la landing. */
export const ENABLED_LOCALES: Locale[] = ['es', 'ca', 'en'];
/** Dirección de la portada en cada idioma. */
export const LOCALE_PATH: Record<Locale, string> = { es: '/', ca: '/ca', en: '/en' };

const DICTS: Record<Locale, Dict> = { es, ca, en };

export function getDict(locale: Locale): Dict {
  return DICTS[locale] ?? es;
}

/** Idioma para las páginas sin dirección propia por idioma (p. ej. /comprobar): ?lang → guardado → navegador. */
export function detectLocale(): Locale {
  const ok = (v: string | null | undefined): v is Locale => !!v && (ENABLED_LOCALES as string[]).includes(v);
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (ok(q)) return q;
    const saved = localStorage.getItem('korrige-lang');
    if (ok(saved)) return saved;
    for (const l of navigator.languages ?? [navigator.language]) {
      const short = l.slice(0, 2).toLowerCase();
      if (ok(short)) return short;
    }
  } catch {
    /* SSR o sin almacenamiento */
  }
  return 'es';
}

export function saveLocale(l: Locale) {
  try {
    localStorage.setItem('korrige-lang', l);
  } catch {
    /* sin almacenamiento */
  }
}
