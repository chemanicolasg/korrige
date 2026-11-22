// Capturas de la aplicación para los tutoriales, en modo demo (todo en el navegador).
//   npm run build && node video/capture.mjs [slug…]
// Deja en video/build/shots/<slug>/ una imagen por escena y shots.json con, para cada una,
// la zona que se enfoca (area), lo que se resalta (hl) y la URL que se muestra en la barra.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '../e2e/pw.mjs';

const PORT = 4175;
const BASE = `http://localhost:${PORT}`;
const VIEW = { width: 1440, height: 900 };
const OUT = new URL('./build/shots/', import.meta.url).pathname;

// Lo que no forma parte del producto real se oculta: aviso del modo demo y botón de hojas de ejemplo.
const HIDE_CSS = `
  .border-amber-200.bg-amber-50:has(button) { display: none !important; }
  [data-testid=upload-sample] { display: none !important; }
  * { caret-color: transparent !important; }
`;

// ── utilidades ────────────────────────────────────────────────────────────────
const union = (rects) => {
  const r = rects.filter(Boolean);
  const x = Math.min(...r.map((b) => b.x)), y = Math.min(...r.map((b) => b.y));
  return { x, y, w: Math.max(...r.map((b) => b.x + b.w)) - x, h: Math.max(...r.map((b) => b.y + b.h)) - y };
};
const pad = (r, p = 12) => ({ x: r.x - p, y: r.y - p, w: r.w + 2 * p, h: r.h + 2 * p });

function session(page, slug) {
  const dir = `${OUT}${slug}/`;
  mkdirSync(dir, { recursive: true });
  const shots = {};
  const box = async (target) => {
    if (!target) return null;
    if (typeof target === 'object' && 'x' in target && 'w' in target) return target;
    const list = Array.isArray(target) ? target : [target];
    const boxes = [];
    for (const t of list) {
      const loc = typeof t === 'string' ? page.locator(t).first() : t;
      const b = await loc.boundingBox();
      if (!b) throw new Error(`${slug}: sin caja para ${t}`);
      boxes.push({ x: b.x, y: b.y, w: b.width, h: b.height });
    }
    return union(boxes);
  };
  return {
    page,
    shots,
    /** Captura la pantalla. area = zona a enfocar; hl = lo que se resalta (puede ser null). */
    async snap(name, { area, hl, hlPad = 8, areaPad = 24, scrollTo, cursor = true, wait = 450 } = {}) {
      if (scrollTo) {
        const loc = typeof scrollTo === 'string' ? page.locator(scrollTo).first() : scrollTo;
        await loc.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      }
      await page.mouse.move(VIEW.width - 2, VIEW.height - 2);
      await page.waitForTimeout(wait);
      const hlBox = hl ? pad(await box(hl), hlPad) : null;
      let areaBox = area === 'full' || !area ? { x: 0, y: 0, ...{ w: VIEW.width, h: VIEW.height } } : pad(await box(area), areaPad);
      if (hlBox && area && area !== 'full') areaBox = union([areaBox, pad(hlBox, 16)]);
      await page.screenshot({ path: `${dir}${name}.jpg`, type: 'jpeg', quality: 90 });
      const url = page.url().replace(BASE, 'korrige.es');
      shots[name] = { file: `${name}.jpg`, area: areaBox, hl: hlBox, url, cursor };
      console.log(`  · ${slug}/${name}`);
    },
    save() {
      writeFileSync(`${dir}shots.json`, JSON.stringify({ view: VIEW, scale: 2, shots }, null, 2));
    },
  };
}

async function newDemo(browser) {
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2, locale: 'es-ES', timezoneId: 'Europe/Madrid' });
  await ctx.addInitScript((css) => {
    const add = () => {
      const s = document.createElement('style');
      s.textContent = css;
      document.head.appendChild(s);
    };
    if (document.head) add();
    else document.addEventListener('DOMContentLoaded', add);
  }, HIDE_CSS);
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.accept());
  await page.goto(`${BASE}/demo`);
  await page.waitForURL(/\/resumen$/, { timeout: 180_000 });
  await page.getByRole('heading', { name: 'Siguientes pasos' }).waitFor();
  await page.waitForTimeout(800);
  return { ctx, page };
}

const tab = async (page, name) => {
  await page.getByRole('link', { name, exact: false }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
};
const card = (page, text) => page.locator('.card').filter({ has: page.getByRole('heading', { name: text, exact: true }) }).first();

// ── vídeos ────────────────────────────────────────────────────────────────────
const VIDEOS = {
  async '01-crear-examen'(s) {
    const { page } = s;
    await page.getByRole('link', { name: 'Exámenes' }).first().click();
    await page.getByRole('link', { name: /Anatomía I/ }).waitFor();
    await s.snap('lista', { area: { x: 560, y: 80, w: 860, h: 480 }, hl: page.getByRole('link', { name: 'Nuevo examen' }) });

    await page.getByRole('link', { name: 'Nuevo examen' }).click();
    await page.getByLabel('Nombre del examen').waitFor();
    const datos = card(page, 'Datos del examen');
    await page.getByLabel('Nombre del examen').fill('Bioquímica · Parcial 1');
    await page.getByLabel('Asignatura', { exact: true }).first().fill('Bioquímica');
    await page.getByLabel('Grupo').first().fill('G1');
    await page.getByLabel('Convocatoria').first().fill('Enero');
    await page.getByLabel('Fecha', { exact: true }).first().fill('2027-01-18');
    await page.getByLabel('Fecha', { exact: true }).first().blur();
    await s.snap('datos', { area: datos, hl: page.getByLabel('Nombre del examen') });

    const hoja = card(page, 'Hoja de respuestas');
    await page.getByLabel('Nº de preguntas').fill('50');
    await page.getByLabel('Opciones por pregunta').selectOption({ index: 1 }).catch(() => {});
    await s.snap('preguntas', { scrollTo: page.getByLabel('Nº de preguntas'), area: [page.getByLabel('Nº de preguntas'), page.getByLabel('Opciones por pregunta'), hoja.getByRole('heading')], hl: [page.getByLabel('Nº de preguntas'), page.getByLabel('Opciones por pregunta')] });

    await page.getByLabel('Modelos de examen').selectOption({ index: 1 });
    const idInput = page.locator('input[list=korrige-id-labels]');
    await s.snap('modelos', { area: [page.getByLabel('Modelos de examen'), page.getByLabel('Nº de dígitos'), page.getByLabel('Nº de preguntas')], hl: [page.getByLabel('Modelos de examen'), idInput, page.getByLabel('Nº de dígitos')] });

    await page.locator('input[type=file][accept*=image]').first().setInputFiles('video/assets/logo-facultad.png');
    await page.getByAltText('Logotipo de la hoja').waitFor();
    await page.getByLabel('Nota junto a «Respuestas»').fill('Duración: 90 min · Cada error resta 1/3');
    await s.snap('personaliza', { scrollTo: page.getByAltText('Logotipo de la hoja'), area: [page.getByText('Personalización', { exact: true }), page.getByLabel('Nota junto a «Respuestas»'), page.getByLabel('Idioma de la hoja')], hl: [page.getByAltText('Logotipo de la hoja'), page.getByLabel('Nota junto a «Respuestas»')] });

    await page.getByRole('button', { name: 'Crear examen' }).click();
    await page.waitForURL(/\/hoja$/);
    const canvas = page.locator('[data-testid=pdf-preview] canvas').first();
    await canvas.waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1200);
    const cb = await canvas.boundingBox();
    await s.snap('vista-previa', { area: { x: cb.x - 20, y: cb.y - 20, w: cb.width + 40, h: cb.width * 0.62 }, hl: { x: cb.x + cb.width * 0.74, y: cb.y + cb.height * 0.02, w: cb.width * 0.2, h: cb.width * 0.16 } });

    const dl = page.getByRole('button', { name: 'Descargar hojas en PDF' });
    await s.snap('descargar', { scrollTo: dl, area: [page.getByRole('heading', { name: 'Descargar e imprimir' }), dl], hl: dl, areaPad: 160 });
  },

  async '02-plantilla-respuestas'(s) {
    const { page } = s;
    // examen nuevo, sin plantilla, con dos modelos
    await page.goto(`${BASE}/app/examenes/nuevo`);
    await page.getByLabel('Nombre del examen').fill('Bioquímica · Parcial 1');
    await page.getByLabel('Asignatura', { exact: true }).first().fill('Bioquímica');
    await page.getByLabel('Nº de preguntas').fill('30');
    await page.getByLabel('Modelos de examen').selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Crear examen' }).click();
    await page.waitForURL(/\/hoja$/);
    await tab(page, 'Plantillas');
    await page.getByRole('button', { name: 'Pregunta 1, opción A' }).waitFor();
    const tabs = page.getByRole('link', { name: 'Plantillas' }).first();
    await s.snap('pestana', { area: { x: 60, y: 90, w: 1320, h: 520 }, hl: tabs });

    const key = 'BCADDACBBADCABDCCADBACDBBCADCA';
    for (let q = 1; q <= 12; q++) await page.getByRole('button', { name: `Pregunta ${q}, opción ${key[q - 1]}` }).click();
    const row = (q) => page.getByRole('button', { name: `Pregunta ${q}, opción A` });
    await s.snap('marcar', { area: [row(1), row(13), page.getByRole('button', { name: 'Pregunta 13, opción D' })], hl: [row(1), page.getByRole('button', { name: 'Pregunta 12, opción D' })], areaPad: 60 });

    await page.getByRole('button', { name: 'Pregunta 3, opción C' }).click();
    await page.getByLabel('Anular pregunta 7').first().check();
    await s.snap('anular', { area: [row(1), row(12)], hl: [row(3), page.getByLabel('Anular pregunta 3').first(), row(7), page.getByLabel('Anular pregunta 7').first()], areaPad: 60 });

    for (let q = 13; q <= 30; q++) await page.getByRole('button', { name: `Pregunta ${q}, opción ${key[q - 1]}` }).click();
    await page.getByRole('button', { name: /^Guardar/ }).first().click();
    await page.waitForTimeout(800);
    await page.getByRole('tab', { name: 'Modelo B' }).click();
    await page.waitForTimeout(400);
    const keyB = 'DACBBCADDCBAACDBBADCDAACBDCBAD';
    for (let q = 1; q <= 9; q++) await page.getByRole('button', { name: `Pregunta ${q}, opción ${keyB[q - 1]}` }).click();
    await s.snap('modelo-b', { area: [page.getByRole('tab', { name: 'Modelo B' }), row(10)], hl: page.getByRole('tab', { name: 'Modelo B' }), areaPad: 40 });

    for (let q = 10; q <= 30; q++) await page.getByRole('button', { name: `Pregunta ${q}, opción ${keyB[q - 1]}` }).click();
    await page.getByRole('button', { name: /Correspondencia entre modelos/ }).first().click();
    await page.waitForTimeout(500);
    const ta = page.locator('textarea').first();
    await ta.fill('4 1 7 2 9 3 12 5 8 6 15 10 11 14 13 18 16 20 17 19 23 21 25 22 24 28 26 30 27 29');
    await s.snap('correspondencia', { area: ta.locator('xpath=ancestor::*[contains(@class,"card") or @role="dialog"][1]'), hl: ta });
    await page.getByRole('button', { name: 'Guardar correspondencia' }).click();
    await page.waitForTimeout(500);

    const save = page.getByRole('button', { name: /^Guardar plantilla|^Guardar versión/ }).first();
    await s.snap('guardar', { scrollTo: save, area: save, hl: save, areaPad: 220 });
  },

  async '03-subir-hojas'(s) {
    const { page } = s;
    await tab(page, 'Alumnos');
    await page.getByRole('button', { name: 'Importar lista (CSV o Excel)' }).waitFor();
    await s.snap('alumnos', { area: { x: 60, y: 90, w: 1320, h: 560 }, hl: page.getByRole('button', { name: 'Importar lista (CSV o Excel)' }) });

    // para enseñar la subida desde cero se elimina la subida de ejemplo
    await tab(page, 'Subir hojas');
    await page.getByRole('button', { name: 'Eliminar subida' }).click();
    await page.getByText('Aún no has subido hojas').waitFor({ timeout: 30_000 });
    await page.waitForTimeout(600);
    await page.goto(`${BASE}/app/guia`);
    await page.waitForTimeout(800);
    const scanHead = page.getByRole('heading', { name: /Escanear/ }).first();
    const scanList = scanHead.locator('xpath=following-sibling::ol[1]');
    await s.snap('escanea', { scrollTo: scanHead, area: [scanHead, scanList], hl: scanList });

    await page.goBack();
    await page.waitForTimeout(800);
    const drop = page.getByRole('button', { name: 'Elegir PDF…' });
    await s.snap('elegir', { area: drop.locator('xpath=ancestor::div[contains(@class,"border-dashed")][1]'), hl: drop });

    await page.getByTestId('upload-sample').evaluate((b) => b.click());
    const prog = page.getByTestId('upload-progress');
    await prog.waitFor();
    await page.waitForFunction(() => /Procesando hoja ([4-9]|1\d) de/.test(document.querySelector('[data-testid=upload-progress]')?.textContent ?? ''), null, { timeout: 120_000 });
    await s.snap('leyendo', { area: prog.locator('xpath=ancestor::div[contains(@class,"card")][1]'), hl: prog, wait: 0 });

    const summary = page.getByTestId('upload-summary');
    await summary.waitFor({ timeout: 120_000 });
    const save = page.getByRole('button', { name: /^Guardar 12 hojas/ });
    await s.snap('resumen', { area: summary, hl: save });

    await save.click();
    await page.getByText('12 hojas guardadas.').waitFor({ timeout: 60_000 });
    const msg = page.getByText('12 hojas guardadas.').locator('xpath=ancestor::div[1]');
    await s.snap('notas', { area: { x: 60, y: 90, w: 1320, h: 480 }, hl: [msg, page.getByRole('link', { name: 'Revisión' }).first()] });
  },

  async '04-revisar-incidencias'(s) {
    const { page } = s;
    await tab(page, 'Revisión');
    await page.getByTestId('review-panel').waitFor();
    const revTab = page.getByRole('link', { name: 'Revisión' }).first();
    await s.snap('cola', { area: { x: 60, y: 90, w: 1320, h: 720 }, hl: revTab });

    const chips = page.getByRole('button', { name: /^Todas \(/ });
    const chipsRow = chips.locator('xpath=..');
    await s.snap('filtros', { area: { x: 60, y: 150, w: 1320, h: 300 }, hl: chipsRow });

    await page.getByRole('button', { name: /^Doble marca \(/ }).click();
    await page.getByRole('heading', { name: /Doble marca/ }).waitFor();
    await page.waitForTimeout(700);
    const panel = page.getByTestId('review-panel');
    const read = panel.getByText(/El sistema ha leído/).first();
    const crop = read.locator('xpath=preceding-sibling::*[1]');
    await s.snap('doble', { area: panel, hl: [crop, panel.getByRole('button', { name: /^Nula/ })] });

    await page.getByRole('button', { name: /^Identificador que no está en la lista \(/ }).click();
    await page.waitForTimeout(800);
    const idField = panel.locator('input').first();
    await s.snap('identificador', { area: panel, hl: idField.locator('xpath=ancestor::form[1] | ancestor::div[1]').last() });

    await page.getByRole('button', { name: /^Doble marca \(/ }).click();
    await page.waitForTimeout(600);
    const atajos = panel.getByText(/^Atajos/).first();
    await s.snap('atajos', { area: panel, hl: atajos.locator('xpath=..') });

    // se resuelven unas cuantas con el teclado y se va a Actividad
    await page.keyboard.press('A');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /^Todas \(/ }).click();
    await page.waitForTimeout(400);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(500);
    await tab(page, 'Actividad');
    const audit = page.getByTestId('audit-table');
    await audit.waitFor();
    await s.snap('actividad', { area: { x: 60, y: 90, w: 1320, h: 520 }, hl: audit.locator('tbody tr').first().or(audit).first(), hlPad: 4 });
  },

  async '05-notas-exportar'(s) {
    const { page } = s;
    await tab(page, 'Notas');
    const table = page.getByTestId('grades-table');
    await table.waitFor();
    await s.snap('tabla', { area: { x: 60, y: 90, w: 1320, h: 620 }, hl: table.locator('thead') });

    const search = page.getByPlaceholder('Buscar alumno o identificador…');
    await search.fill('García');
    await page.getByLabel('Filtrar por modelo').selectOption({ index: 1 }).catch(() => {});
    await page.waitForTimeout(600);
    await s.snap('buscar', { area: { x: 60, y: 90, w: 1320, h: 420 }, hl: [search, page.getByLabel('Filtrar por estado')] });
    await search.fill('');
    await page.getByLabel('Filtrar por modelo').selectOption({ index: 0 }).catch(() => {});
    await page.waitForTimeout(400);

    await table.locator('tbody tr').filter({ hasText: 'Díaz Díaz' }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    await page.waitForTimeout(1500);
    const db = await dialog.boundingBox();
    await s.snap('detalle', { area: 'full', hl: { x: db.x + db.width * 0.505, y: db.y + 100, w: db.width * 0.47, h: Math.min(db.height, 900 - db.y) - 110 } });

    const answers = dialog.getByText('Respuestas frente a la plantilla', { exact: false }).locator('xpath=..');
    const someAnswer = dialog.locator('button[title^="Pregunta 6:"]').first();
    await someAnswer.click();
    await page.waitForTimeout(400);
    const nula = dialog.getByTitle('Nula (cuenta como error)').first();
    await s.snap('corregir', { area: [answers, nula], hl: [someAnswer, nula], hlPad: 6, areaPad: 60 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    const xl = page.getByRole('button', { name: 'Exportar a Excel' });
    const moodle = page.getByRole('button', { name: 'CSV para Moodle' });
    await s.snap('exportar', { area: { x: 60, y: 90, w: 1320, h: 420 }, hl: [xl, moodle] });

    await tab(page, 'Resumen');
    const close = page.getByRole('button', { name: 'Cerrar examen (solo lectura)' });
    await s.snap('cerrar', { scrollTo: close, area: card(page, 'Acciones'), hl: close, areaPad: 80 });
  },

  async '06-estadisticas'(s) {
    const { page } = s;
    await tab(page, 'Estadísticas');
    await page.getByTestId('items-table').waitFor();
    const kpis = page.getByText('Presentados', { exact: true }).locator('xpath=ancestor::div[contains(@class,"grid")][1]');
    await s.snap('kpis', { scrollTo: kpis, area: [kpis, page.getByText('Resultado del examen', { exact: true })], hl: kpis });

    const hist = page.locator('section, .card').filter({ hasText: 'Distribución de notas' }).last();
    await s.snap('histograma', { scrollTo: hist, area: hist, hl: hist.locator('svg').first() });

    const calidad = page.getByText('Calidad de las preguntas', { exact: true });
    const calGrid = calidad.locator('xpath=following-sibling::*[1]');
    await s.snap('calidad', { scrollTo: calidad, area: [calidad, calGrid], hl: calGrid });

    const only = page.getByRole('button', { name: /^Solo las problemáticas/ }).or(page.getByLabel(/Solo las problemáticas/)).first();
    await only.click();
    await page.waitForTimeout(600);
    const items = page.getByTestId('items-table');
    await s.snap('tabla', { scrollTo: items, area: [only, items], hl: items.locator('tbody tr').first() });

    const opts = items.locator('tbody tr').first().locator('td').nth(4);
    await s.snap('distractor', { scrollTo: items, area: items, hl: opts });

    await tab(page, 'Plantillas');
    await page.getByLabel('Anular pregunta 13').check();
    await page.waitForTimeout(300);
    const row13 = page.getByRole('button', { name: 'Pregunta 13, opción A' });
    await s.snap('anular', { scrollTo: row13, area: [page.getByRole('button', { name: 'Pregunta 8, opción A' }), page.getByRole('button', { name: 'Pregunta 18, opción A' })], hl: [row13, page.getByLabel('Anular pregunta 13')], areaPad: 80 });
  },

  async '07-alumnos-comprueban'(s) {
    const { page } = s;
    const pub = page.getByTestId('publish-answers');
    await s.snap('tarjeta', { scrollTo: pub, area: pub, hl: pub, areaPad: 60 });

    await pub.getByLabel('Publicar las respuestas correctas').check();
    await page.waitForTimeout(400);
    await s.snap('publicar', { scrollTo: pub, area: pub, hl: pub.getByText('Publicar las respuestas correctas').locator('xpath=..') });

    const when = pub.locator('fieldset').first();
    await s.snap('cuando', { area: pub, hl: when });

    await pub.getByLabel('Código elegido').fill('ANATOMIA26');
    const code = pub.locator('fieldset').nth(1);
    await s.snap('codigo', { area: pub, hl: code });

    await pub.getByText('Ofrecer la calculadora de nota').click();
    const calc = pub.getByText('Ofrecer la calculadora de nota').locator('xpath=ancestor::label[1]');
    await s.snap('calculadora', { area: pub, hl: calc });

    await pub.getByRole('button', { name: 'Publicar' }).click();
    const status = page.getByTestId('publish-status');
    await status.waitFor();
    await s.snap('enlace', { scrollTo: status, area: pub, hl: status });

    await page.goto(`${BASE}/comprobar`);
    const codeInput = page.locator('input').first();
    await codeInput.waitFor();
    await codeInput.fill('ANATOMIA26');
    await page.keyboard.press('Enter');
    await page.getByTestId('check-published').or(page.getByTestId('answer-key')).first().waitFor({ timeout: 20_000 });
    await page.waitForTimeout(800);
    await s.snap('alumno-codigo', { area: { x: 140, y: 60, w: 1160, h: 620 }, hl: [codeInput, page.getByText(/Modelo/).first()] });

    const calcBox = page.getByTestId('calculator');
    if (await calcBox.count()) {
      const bubbles = page.locator('[data-testid=answer-key] button');
      const n = Math.min(await bubbles.count(), 160);
      for (let i = 0; i < n; i += 4) await bubbles.nth(i + (i % 3)).click().catch(() => {});
      await page.waitForTimeout(500);
      await s.snap('alumno-nota', { scrollTo: calcBox, area: [calcBox, page.getByTestId('answer-key')], hl: page.getByTestId('calc-grade') });
    } else {
      await s.snap('alumno-nota', { area: 'full', hl: page.getByTestId('answer-key') });
    }
  },

  async '08-organizacion'(s) {
    const { page } = s;
    await page.getByRole('link', { name: 'Organización' }).click();
    await page.getByRole('heading', { name: 'Profesores', exact: true }).waitFor();
    const profes = card(page, 'Profesores').or(page.locator('section').filter({ has: page.getByRole('heading', { name: 'Profesores', exact: true }) })).first();
    await s.snap('profesores', { area: { x: 60, y: 60, w: 1320, h: 480 }, hl: profes.locator('table') });

    // En la demo no hay envío de correos: se muestra el formulario tal cual aparece con una cuenta real.
    await page.evaluate(() => {
      const p = [...document.querySelectorAll('p')].find((e) => e.textContent?.includes('no están disponibles en el modo demo'));
      if (!p) return;
      p.outerHTML = `<div id="tut-invite"><form class="mt-3 flex flex-wrap gap-2"><input class="input max-w-xs" type="email" value="laura.mendez@facultad.es" aria-label="Email del profesor"><select class="input w-auto" aria-label="Rol"><option>Profesor</option><option>Administrador</option></select><button type="button" class="btn-primary">Invitar</button></form>
      <ul class="mt-4 divide-y divide-slate-100 text-sm" id="tut-pending" style="display:none"><li class="flex flex-wrap items-center gap-3 py-2"><span class="font-medium">javier.ortega@facultad.es</span><span class="badge bg-slate-100 text-slate-600">profesor</span><span class="text-amber-700">Pendiente desde el 22/11/2026</span><button class="btn btn-sm">Reenviar correo</button><button class="btn btn-sm">Copiar enlace de registro</button><button class="ml-auto text-xs text-red-700">Eliminar</button></li></ul></div>`;
    });
    const inv = page.locator('#tut-invite');
    const invCard = inv.locator('xpath=ancestor::section[1]');
    await s.snap('invitar', { scrollTo: invCard, area: invCard, hl: [inv.locator('input'), inv.getByRole('button', { name: 'Invitar' })], areaPad: 40 });

    await page.evaluate(() => (document.getElementById('tut-pending').style.display = ''));
    await s.snap('roles', { scrollTo: invCard, area: invCard, hl: [inv.locator('select'), page.locator('#tut-pending')] });

    const defaults = page.getByTestId('org-defaults');
    await defaults.getByTestId('org-logo-input').setInputFiles('video/assets/logo-facultad.png');
    await defaults.getByAltText('Logotipo por defecto').waitFor();
    await defaults.getByLabel('Título de la hoja').fill('Facultad de Ciencias de la Salud');
    await defaults.getByLabel('Identificador del alumno').fill('NIA');
    await s.snap('defaults', { scrollTo: defaults.getByLabel('Identificador del alumno'), area: [defaults.getByRole('heading').first(), defaults.getByLabel('Nº de dígitos del identificador')], hl: [defaults.getByAltText('Logotipo por defecto'), defaults.getByLabel('Título de la hoja'), defaults.getByLabel('Identificador del alumno')] });

    await defaults.getByLabel('Si falla una pregunta…').selectOption('classic');
    const formula = defaults.getByText('Fórmula de corrección por defecto');
    const formulaText = defaults.getByText(/^Nota = /);
    await s.snap('formula', { scrollTo: defaults.getByLabel('Si la deja en blanco…'), area: [formula, defaults.getByRole('button', { name: 'Guardar valores por defecto' })], hl: [defaults.getByLabel('Si falla una pregunta…'), defaults.getByLabel('Si la deja en blanco…'), formulaText] });

    const ret = page.getByLabel('Conservación de las imágenes de las hojas');
    const retCard = card(page, 'Configuración y protección de datos');

    await page.getByRole('link', { name: 'Exámenes' }).first().click();
    await page.getByRole('link', { name: /Anatomía I/ }).click();
    await page.waitForURL(/\/resumen$/);
    const share = card(page, 'Profesores con acceso');
    await share.getByLabel('Email del coautor').fill('colega@korrige.es');
    await s.snap('compartir', { scrollTo: share, area: share, hl: [share.getByLabel('Email del coautor'), share.getByRole('button', { name: 'Compartir' })], areaPad: 60 });

    await page.getByRole('link', { name: 'Organización' }).click();
    await retCard.waitFor();
    await s.snap('retencion', { scrollTo: retCard, area: retCard, hl: [ret, ret.locator('xpath=following-sibling::*[1]')] });
  },
};

// ── main ──────────────────────────────────────────────────────────────────────
const only = process.argv.slice(2);
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
process.on('exit', () => server.kill());
for (let i = 0; i < 100; i++) {
  try {
    if ((await fetch(BASE)).ok) break;
  } catch {
    await new Promise((r) => setTimeout(r, 200));
  }
}
const browser = await chromium.launch({ args: ['--lang=es-ES'], env: { ...process.env, LANG: 'es_ES.UTF-8', LANGUAGE: 'es_ES' } }) // fechas en formato español;
let failed = 0;
for (const [slug, fn] of Object.entries(VIDEOS)) {
  if (only.length && !only.some((o) => slug.startsWith(o))) continue;
  console.log(`▶ ${slug}`);
  const { ctx, page } = await newDemo(browser);
  const s = session(page, slug);
  try {
    await fn(s);
  } catch (e) {
    failed++;
    console.error(`✗ ${slug}: ${e.message.split('\n')[0]}`);
    await page.screenshot({ path: `${OUT}${slug}/zz-error.png` });
  }
  s.save();
  await ctx.close();
}
await browser.close();
server.kill();
process.exit(failed ? 1 : 0);
