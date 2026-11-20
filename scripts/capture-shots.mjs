// Capturas reales de la aplicación para la landing (public/shots/*.jpg).
// Se generan con el modo demo:  npm run build && node scripts/capture-shots.mjs
import { spawn } from 'node:child_process';
import { chromium } from '../e2e/pw.mjs';

const PORT = 4174;
const base = `http://localhost:${PORT}`;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
process.on('exit', () => server.kill());
for (let i = 0; i < 50; i++) {
  try {
    if ((await fetch(base)).ok) break;
  } catch {
    await new Promise((r) => setTimeout(r, 200));
  }
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
const out = (name) => ({ path: `public/shots/${name}.jpg`, type: 'jpeg', quality: 82 });
const tab = async (name) => {
  await page.getByRole('link', { name }).first().click();
  await page.waitForLoadState('networkidle');
};
await page.goto(`${base}/demo`);
await page.waitForURL(/\/resumen$/, { timeout: 180_000 });

await tab('Revisión');
await page.getByRole('button', { name: /^Doble marca \(/ }).click();
await page.getByRole('heading', { name: /Doble marca/ }).waitFor();
await page.waitForTimeout(900);
await page.getByTestId('review-panel').screenshot(out('revision'));

await tab('Notas');
const table = page.getByTestId('grades-table');
await table.waitFor();
const box = await table.boundingBox();
await page.screenshot({ ...out('notas'), clip: { x: box.x, y: box.y, width: box.width, height: Math.min(box.height, 420) } });

await tab('Estadísticas');
await page.getByTestId('items-table').waitFor();
await page.locator('section', { hasText: 'Distribución de notas' }).first().screenshot(out('estadisticas'));

await tab('Hoja');
const canvas = page.locator('[data-testid=pdf-preview] canvas').first();
await canvas.waitFor({ timeout: 30_000 });
await page.waitForTimeout(500);
await canvas.screenshot(out('hoja'));

await browser.close();
server.kill();
console.log('✓ capturas en public/shots');
process.exit(0);
