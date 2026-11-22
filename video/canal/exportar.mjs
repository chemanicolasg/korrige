// Exporta las imágenes del canal de YouTube de Korrige a video/canal/:
//   banner.png (2048×1152), perfil.png (800×800), marca-de-agua.png (150×150, transparente)
//   node video/canal/exportar.mjs
import { chromium } from '../../e2e/pw.mjs';
const dir = new URL('./', import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 2200, height: 2400 } });
await page.goto(`file://${dir}canal.html`);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
// el texto del banner debe caber en la zona segura (lo único que se ve en el móvil)
const fuera = await page.evaluate(() => {
  const safe = document.querySelector('#banner .safe').getBoundingClientRect();
  return [...document.querySelectorAll('#banner .safe *')].map((el) => el.getBoundingClientRect()).filter((r) => r.width && (r.left < safe.left - 1 || r.right > safe.right + 1 || r.top < safe.top - 1 || r.bottom > safe.bottom + 1)).length;
});
if (fuera) throw new Error(`${fuera} elementos del banner se salen de la zona segura`);
for (const [id, file, transparent] of [['banner', 'banner.png'], ['perfil', 'perfil.png'], ['agua', 'marca-de-agua.png', true]]) {
  if (transparent) await page.evaluate(() => (document.body.style.background = 'transparent'));
  await page.locator(`#${id}`).screenshot({ path: `${dir}${file}`, omitBackground: !!transparent });
  console.log(`✓ video/canal/${file}`);
}
await browser.close();
