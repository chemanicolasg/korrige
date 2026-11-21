/**
 * Traducciones de la aplicación del profesor: todo texto envuelto en tr()/trn()
 * debe tener traducción al catalán y al inglés, con los mismos huecos {así}.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { APP_DICTS } from '../src/i18n/app/index';
import { __setLocaleForTests, tr } from '../src/i18n/app';

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(dir, e.name)] : []));
}

/** Claves usadas en el código: primer argumento literal de tr(…) o trn(…). */
function usedKeys(): Map<string, string> {
  const keys = new Map<string, string>();
  const re = /\btrn?\(\s*(?:'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\$]|\\.)*)`)/g;
  for (const file of walk('src')) {
    if (file.includes(`${path.sep}i18n${path.sep}`)) continue;
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(re)) {
      const raw = m[1] ?? m[2] ?? m[3];
      const key = raw.replace(/\\(['"`\\])/g, '$1').replace(/\\n/g, '\n');
      keys.set(key, file);
    }
  }
  return keys;
}

const holes = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
const bolds = (s: string) => (s.match(/<b>/g) ?? []).length;

describe('i18n de la aplicación', () => {
  const used = usedKeys();

  it.each(['ca', 'en'] as const)('todos los textos tienen traducción (%s)', (l) => {
    const missing = [...used].filter(([k]) => !(k in APP_DICTS[l])).map(([k, f]) => `${path.basename(f)}: ${k}`);
    expect(missing, `faltan ${missing.length} traducciones en ${l}`).toEqual([]);
  });

  it.each(['ca', 'en'] as const)('las traducciones conservan los huecos y las negritas (%s)', (l) => {
    const bad = Object.entries(APP_DICTS[l]).filter(([k, v]) => !v.trim() || holes(k) !== holes(v) || bolds(k) !== bolds(v)).map(([k]) => k);
    expect(bad).toEqual([]);
  });

  it('tr() sustituye los huecos y cae al castellano si falta la traducción', () => {
    expect(tr('{n} de {total} exámenes', { n: 2, total: 5 })).toBe('2 de 5 exámenes');
    __setLocaleForTests('ca');
    expect(tr('Texto que no existe en el diccionario')).toBe('Texto que no existe en el diccionario');
    __setLocaleForTests('es');
  });
});
