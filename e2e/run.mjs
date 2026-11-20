// Ejecuta los tests E2E contra el build de producción: npm run build && npm run test:e2e
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { testApp } from './app.mjs';
import { testLanding } from './landing.mjs';
import { testOmr } from './omr.mjs';

const PORT = 4173;
const base = `http://localhost:${PORT}`;
const out = 'e2e/out';
fs.mkdirSync(out, { recursive: true });
const only = process.argv[2];

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
