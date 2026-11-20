// E2E de la app del profesor en Chromium, en modo demo (sin servidor):
// examen de ejemplo → revisión con teclado → notas → estadísticas → hoja → plantillas → segunda subida.
import assert from 'node:assert/strict';
import { chromium } from './pw.mjs';

export async function testApp(baseUrl, outDir) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`[console] ${m.text()}`));
  const shot = async (name) => outDir && page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
  const tab = async (name) => {
    await page.getByRole('link', { name, exact: false }).first().click();
    await page.waitForLoadState('networkidle');
  };
  try {
    // 1) la demo crea el examen de ejemplo leyendo 34 hojas "escaneadas" en el worker
    //    (antes se interrumpe la carga a medias: la demo incompleta debe descartarse y rehacerse)
    await page.goto(`${baseUrl}/demo`);
    await page.waitForTimeout(2500);
    await page.goto(`${baseUrl}/demo`);
    await page.waitForURL(/\/app\/examenes\/.+\/resumen/, { timeout: 180_000 });
    await page.getByText('Con resultados').first().waitFor();
    await page.getByRole('heading', { name: 'Siguientes pasos' }).waitFor();
    await shot('01-resumen');

    // 2) revisión: 6 incidencias; se resuelven con el teclado
    await tab('Revisión');
    await page.getByTestId('review-panel').waitFor();
    await page.waitForTimeout(600);
    await shot('02-revision');
    const pendientes = async () => Number((await page.getByRole('button', { name: /^Todas \(/ }).textContent()).match(/\d+/)[0]);
    const inicial = await pendientes();
    assert.ok(inicial >= 6, `incidencias iniciales: ${inicial}`);
    // la primera es la hoja en blanco → Supr la excluye
    await page.getByRole('heading', { name: /Hoja en blanco/ }).waitFor();
    await page.keyboard.press('Delete');
    await page.waitForFunction((n) => document.body.innerText.includes(`Todas (${n - 1})`), inicial);
    // se salta hasta una incidencia de pregunta y se responde con el teclado
    await page.getByRole('button', { name: /^Doble marca \(/ }).click();
    await page.getByRole('heading', { name: /Doble marca · P8/ }).waitFor();
    await page.waitForTimeout(400);
    await shot('03-revision-doble');
    await page.keyboard.press('A');
    await page.waitForFunction((n) => document.body.innerText.includes(`Todas (${n - 2})`), inicial);

    // 3) notas: tabla, detalle de alumno con imagen y exportación
    await tab('Notas');
    await page.getByTestId('grades-table').waitFor();
    const filas = await page.locator('[data-testid=grades-table] tbody tr').count();
    assert.ok(filas >= 30, `filas de notas: ${filas}`);
    await shot('04-notas');
    await page.locator('[data-testid=grades-table] tbody tr').first().click();
    await page.getByRole('dialog').waitFor();
    await page.waitForTimeout(800);
    await shot('05-detalle-alumno');
    await page.keyboard.press('Escape');
    const [xlsx] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar a Excel' }).click()]);
    assert.match(xlsx.suggestedFilename(), /\.xlsx$/);
    const [csv] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'CSV para Moodle' }).click()]);
    assert.match(csv.suggestedFilename(), /moodle\.csv$/);

    // 4) estadísticas: histograma + preguntas problemáticas
    await tab('Estadísticas');
    await page.getByTestId('items-table').waitFor();
    assert.ok(await page.getByText(/candidatas a revisar o anular/).isVisible());
    await shot('06-estadisticas');

    // 5) hoja (vista previa real del PDF) y plantillas
    await tab('Hoja');
    await page.locator('[data-testid=pdf-preview] canvas').first().waitFor({ timeout: 30_000 });
    await shot('07-hoja');
    await tab('Plantillas');
    await page.getByRole('button', { name: 'Pregunta 1, opción A' }).waitFor();
    await shot('08-plantillas');

    // 6) segunda tanda: 12 hojas de ejemplo → resumen → guardar
    await tab('Subir hojas');
    await page.getByTestId('upload-sample').click();
    await page.getByTestId('upload-summary').waitFor({ timeout: 120_000 });
    await shot('09-subida-resumen');
    await page.getByRole('button', { name: /^Guardar 12 hojas/ }).click();
    await page.getByText('12 hojas guardadas.').waitFor({ timeout: 60_000 });

    // 7) actividad, alumnos, organización y lista de exámenes
    await tab('Actividad');
    await page.getByTestId('audit-table').waitFor();
    assert.ok((await page.locator('[data-testid=audit-table] tbody tr').count()) >= 8);
    await shot('10-actividad');
    await tab('Alumnos');
    await shot('11-alumnos');
    await page.getByRole('link', { name: 'Organización' }).click();
    await page.getByRole('heading', { name: 'Profesores', exact: true }).waitFor();
    await shot('12-organizacion');
    await page.getByRole('link', { name: 'Exámenes' }).first().click();
    await page.getByRole('link', { name: /Anatomía I/ }).waitFor();
    await shot('13-examenes');

    // 7b) valores por defecto de la organización: identificador, logotipo y fórmula para los exámenes nuevos
    await page.getByRole('link', { name: 'Organización' }).click();
    const defaults = page.getByTestId('org-defaults');
    await defaults.getByLabel('Identificador del alumno').fill('NIUB');
    await defaults.getByTestId('org-logo-input').setInputFiles('public/icon-512.png');
    await defaults.getByAltText('Logotipo por defecto').waitFor();
    await defaults.getByLabel('Si falla una pregunta…').selectOption('classic');
    await defaults.getByLabel('Si la deja en blanco…').selectOption('resta');
    await defaults.getByRole('button', { name: 'Guardar valores por defecto' }).click();
    await page.getByText('Valores por defecto guardados').waitFor();
    await page.getByRole('link', { name: 'Exámenes' }).first().click();

    // 8) crear un examen nuevo desde cero: hereda los valores por defecto
    await page.getByRole('link', { name: 'Nuevo examen' }).click();
    assert.equal(await page.locator('input[list=korrige-id-labels]').inputValue(), 'NIUB');
    await page.getByAltText('Logotipo de la hoja').waitFor();
    await page.getByLabel('Nombre del examen').fill('Bioquímica · Final');
    await page.getByRole('button', { name: 'Crear examen' }).click();
    await page.waitForURL(/\/hoja$/);
    await page.locator('[data-testid=pdf-preview] canvas').first().waitFor({ timeout: 30_000 });
    await page.getByRole('link', { name: 'Resumen' }).click();
    assert.match(await page.getByTestId('grading-formula').innerText(), /0,333 × errores − 0,1 × en blanco/);

    // 9) reiniciar la demo desde el aviso superior vuelve a crear el examen de ejemplo
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Reiniciar demo' }).click();
    await page.waitForURL(/\/app\/examenes\/.+\/resumen/, { timeout: 180_000 });
    await page.getByText('Con resultados').first().waitFor();
    await page.getByRole('link', { name: 'Exámenes' }).first().click();
    await page.getByRole('link', { name: /Anatomía I/ }).waitFor();
    assert.equal(await page.getByRole('link', { name: /Bioquímica/ }).count(), 0, 'el reinicio borra lo anterior');

    assert.deepEqual(errors, [], 'errores de consola');
    return `${filas} notas, ${inicial} incidencias`;
  } catch (e) {
    await shot('zz-error');
    console.error(errors.join('\n'));
    throw e;
  } finally {
    await browser.close();
  }
}
