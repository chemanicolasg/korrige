// Carga Playwright: del proyecto si está instalado (npm i -D playwright) o del global.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);
let pw;
try {
  pw = require('playwright');
} catch {
  const roots = [process.env.NODE_PATH, '/opt/node-tools/node_modules', execSync('npm root -g').toString().trim()].filter(Boolean);
  for (const r of roots) {
    try {
      pw = require(`${r}/playwright`);
      break;
    } catch {
      /* siguiente */
    }
  }
}
if (!pw) throw new Error('Playwright no está instalado: npm i -D playwright && npx playwright install chromium');
export const chromium = pw.chromium;
