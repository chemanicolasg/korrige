// Tests E2E en Chromium contra el build de producción (en modo demo, sin servidor):
//   npm run test:e2e            → compila y ejecuta todos
//   npm run test:e2e -- app     → solo uno (omr | app | landing)
import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import { testApp } from './app.mjs';
import { testLanding } from './landing.mjs';
import { testOmr } from './omr.mjs';

const PORT = 4173;
const base = `http://localhost:${PORT}`;
const out = 'e2e/out';
fs.mkdirSync(out, { recursive: true });
const only = process.argv[2];

// build propio: sin Supabase (modo demo) y con un endpoint de ventas que el test intercepta
execSync('npm run -s build', { stdio: 'inherit', env: { ...process.env, VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '', VITE_SALES_ENDPOINT: '/sales-lead-test' } });

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const stop = () => server.kill();
process.on('exit', stop);
for (let i = 0; i < 50; i++) {
  try {
    if ((await fetch(base)).ok) break;
  } catch {
    await new Promise((r) => setTimeout(r, 200));
  }
}

const tests = { omr: testOmr, app: testApp, landing: testLanding };
let failed = false;
for (const [name, fn] of Object.entries(tests)) {
  if (only && only !== name) continue;
  const t0 = Date.now();
  try {
    const info = await fn(base, out);
    console.log(`✓ ${name} (${((Date.now() - t0) / 1000).toFixed(1)} s) ${info ?? ''}`);
  } catch (e) {
    failed = true;
    console.error(`✗ ${name}: ${e.message}`);
  }
}
stop();
process.exit(failed ? 1 : 0);
