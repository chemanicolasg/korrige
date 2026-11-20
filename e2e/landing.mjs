// E2E de la landing: HTML prerenderizado, hidratación sin errores y formulario de ventas.
import assert from 'node:assert/strict';
import { chromium } from './pw.mjs';

export async function testLanding(baseUrl, outDir) {
  // 1) sin JavaScript ya hay contenido (SEO) y metadatos
  const html = await (await fetch(baseUrl)).text();
  assert.match(html, /<h1[^>]*>Corrige cientos de exámenes tipo test/);
  assert.match(html, /<link rel="canonical" href="https:\/\/korrige\.es\/"/);
  assert.match(html, /property="og:title"/);
  assert.match(html, /application\/ld\+json/);
  assert.match(await (await fetch(`${baseUrl}/sitemap.xml`)).text(), /https:\/\/korrige\.es\/legal\/privacidad/);
  assert.match(await (await fetch(`${baseUrl}/robots.txt`)).text(), /Sitemap: https:\/\/korrige\.es\/sitemap\.xml/);

  // las páginas públicas del sitemap son indexables y tienen su propia URL canónica
  for (const [p, re] of [['/guia', /imprimir y escanear/], ['/legal/privacidad', /Política de privacidad/], ['/recursos', /Guías para corregir/], ['/recursos/formula-penalizacion-examen-tipo-test', /errores ÷ \(k − 1\)/], ['/recursos/alternativa-zipgrade-fotocopiadora', /"@type":"Article"/]]) {
    // (Netlify sirve /guia desde guia/index.html; el servidor de pruebas necesita la ruta completa)
    const h = await (await fetch(`${baseUrl}${p}/index.html`)).text();
    assert.match(h, re, `${p} prerenderizada`);
    assert.ok(!/name="robots" content="noindex"/.test(h), `${p} no debe llevar noindex`);
    assert.ok(h.includes(`<link rel="canonical" href="https://korrige.es${p}"`), `${p} canónica propia`);
  }
  assert.match(await (await fetch(`${baseUrl}/app`)).text(), /noindex|<h1/, 'la app no es una página de contenido');

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => (m.type() === 'error' || /hydrat/i.test(m.text())) && errors.push(m.text()));
    let posted = null;
    await page.route('**/sales-lead-test', async (route) => {
      posted = JSON.parse(route.request().postData());
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');
    if (outDir) await page.screenshot({ path: `${outDir}/20-landing.png`, fullPage: true });

    // 2) el menú lleva a la tarjeta de ventas; validación y envío
    await page.getByRole('banner').getByRole('link', { name: 'Hablar con ventas' }).click();
    const form = page.getByTestId('sales-form');
    await form.getByRole('button', { name: 'Enviar' }).click();
    await page.getByRole('alert').waitFor();
    assert.equal(posted, null, 'no debe enviarse un formulario incompleto');
    await form.getByLabel('Nombre y apellidos').fill('Ana Pérez');
    await form.getByLabel('Email de trabajo').fill('ana@uni.es');
    await form.getByLabel('Institución').fill('Facultad de Medicina');
    await form.getByLabel('Nº aproximado de profesores').selectOption('11–50');
    await form.getByLabel('Mensaje').fill('Queremos un piloto.');
    await form.getByRole('checkbox').check();
    await form.getByRole('button', { name: 'Enviar' }).click();
    await page.getByTestId('sales-ok').waitFor();
    assert.equal(posted.email, 'ana@uni.es');
    assert.equal(posted.website, '', 'honeypot vacío');
    assert.equal(posted.privacy_accepted, true);
    assert.ok(posted.elapsed_ms > 0);

    // 3) páginas legales y guía
    await page.goto(`${baseUrl}/legal/privacidad`);
    await page.getByRole('heading', { name: 'Política de privacidad' }).waitFor();
    await page.goto(`${baseUrl}/guia`);
    await page.getByRole('heading', { name: /imprimir y escanear/ }).waitFor();

    // 3b) las guías se navegan desde la portada y cargan sin errores
    await page.goto(baseUrl);
    await page.getByRole('link', { name: 'Cómo corregir exámenes tipo test con hoja de respuestas' }).click();
    await page.getByRole('heading', { level: 1, name: /Cómo corregir exámenes tipo test/ }).waitFor();
    if (outDir) await page.screenshot({ path: `${outDir}/25-recurso.png` });
    await page.getByRole('link', { name: 'Fórmula de penalización en exámenes tipo test' }).click();
    await page.getByText('6,25').first().waitFor();

    // 4) móvil
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    await mobile.goto(baseUrl);
    await mobile.waitForLoadState('networkidle');
    const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, `desbordamiento horizontal en móvil: ${overflow}px`);
    if (outDir) await mobile.screenshot({ path: `${outDir}/21-landing-movil.png` });
    assert.deepEqual(errors, [], 'errores de consola o de hidratación');
    return `${(html.length / 1024).toFixed(0)} kB de HTML prerenderizado`;
  } finally {
    await browser.close();
  }
}
