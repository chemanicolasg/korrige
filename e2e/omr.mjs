// E2E del lector en Chromium real: /dev/omr con el escaneo de la Xerox.
import { chromium } from './pw.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';

export async function testOmr(baseUrl, outDir) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  try {
    await page.goto(`${baseUrl}/dev/omr`);
    await page.setInputFiles('[data-testid=pdf-input]', 'referencia/escaneo_prueba_xerox.pdf');
    await page.waitForSelector('[data-testid=summary]', { timeout: 120_000 });
    const reads = JSON.parse(await page.locator('#omr-json').textContent());
    const ref = JSON.parse(fs.readFileSync('referencia/salida_referencia.json', 'utf8'));
    assert.equal(reads.length, 4);
    reads.forEach((r, i) => {
      for (const k of ['qr', 'nia', 'modelo', 'es_plantilla', 'respuestas', 'revisar', 'incidencias', 'en_blanco_total']) {
        assert.deepEqual(r[k], ref[i][k], `página ${i + 1}: ${k}`);
      }
    });
    const summary = await page.locator('[data-testid=summary]').textContent();
    if (outDir) await page.screenshot({ path: `${outDir}/dev-omr.png`, fullPage: true });
    return summary;
  } catch (e) {
    console.error(logs.join('\n'));
    throw e;
  } finally {
    await browser.close();
  }
}
