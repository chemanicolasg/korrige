/**
 * Idioma de la aplicación del profesor (castellano, catalán o inglés).
 *
 * Estilo «gettext»: el texto en castellano es la clave.  tr('Guardar cambios')
 * devuelve la traducción del idioma activo o, si falta, el propio texto en castellano.
 * El idioma se fija al cargar la página (preferencia guardada) y cambiarlo la recarga,
 * así que tr() es una función normal: sirve en componentes, en constantes y en src/lib.
 */
import { Fragment, ReactNode, createElement } from 'react';
import { APP_DICTS } from './app/index';
import type { Locale } from './index';

const KEY = 'korrige-lang';
const BCP: Record<Locale, string> = { es: 'es-ES', ca: 'ca-ES', en: 'en-GB' };

function initial(): Locale {
  try {
    const v = globalThis.localStorage?.getItem(KEY);
    if (v === 'ca' || v === 'en') return v;
  } catch {
    /* sin almacenamiento (tests, SSR) */
  }
  return 'es';
}

let current: Locale = initial();

export const appLocale = (): Locale => current;
/** Código regional para fechas y números (es-ES, ca-ES, en-GB). */
export const bcp = (): string => BCP[current];

/** Cambia el idioma de la aplicación y recarga la página. */
export function setAppLocale(l: Locale) {
  try {
    localStorage.setItem(KEY, l);
  } catch {
    /* sin almacenamiento */
  }
  if (l !== current) location.reload();
}

/** Solo para tests: fija el idioma sin recargar. */
export function __setLocaleForTests(l: Locale) {
  current = l;
}

const lookup = (s: string): string => (current === 'es' ? s : (APP_DICTS[current][s] ?? s));

/** Traduce un texto. Los huecos van entre llaves: tr('{n} de {total} exámenes', { n, total }). */
export function tr(s: string, vars?: Record<string, string | number>): string {
  const out = lookup(s);
  return vars ? out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : out;
}

/**
 * Como tr(), pero devuelve nodos de React: admite <b>negrita</b> en el texto y
 * huecos que sean elementos (enlaces, botones…):
 *   trn('Imprime al <b>100 %</b>. {link}', { link: <a href="…">{tr('Ver la guía')}</a> })
 */
export function trn(s: string, vars: Record<string, ReactNode> = {}): ReactNode {
  const parts = lookup(s).split(/(<b>.*?<\/b>|\{\w+\})/g);
  return createElement(
    Fragment,
    null,
    ...parts.map((p, i) => {
      const bold = /^<b>(.*)<\/b>$/.exec(p);
      if (bold) return createElement('b', { key: i }, bold[1]);
      const hole = /^\{(\w+)\}$/.exec(p);
      if (hole && hole[1] in vars) return createElement(Fragment, { key: i }, vars[hole[1]]);
      return p;
    }),
  );
}
