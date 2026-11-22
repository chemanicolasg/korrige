// Monta cada tutorial: plantilla HTML + capturas + voz → MP4 1080p (YouTube) y versión web.
//   node video/render.mjs [slug…] [--preview]   (--preview: solo unos fotogramas sueltos en PNG)
// Necesita video/build/shots/<slug>/ (node video/capture.mjs) y video/audio/<slug>.mp3.
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { chromium } from '../e2e/pw.mjs';
import { TUTORIALS } from './tutoriales.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const BUILD = `${ROOT}video/build/`;
const FPS = 30;
const LEAD = 0.8; // segundos antes de que empiece la voz
const TAIL = 3.2; // segundos tras la última frase

const args = process.argv.slice(2);
const preview = args.includes('--preview');
const only = args.filter((a) => !a.startsWith('--'));

/** Tramos hablados a partir de los silencios largos que separan las escenas. */
function voiceSegments(mp3) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', mp3, '-af', 'silencedetect=noise=-40dB:d=0.9', '-f', 'null', '-'], { encoding: 'utf8' });
  const log = r.stderr;
  const dur = Number(log.match(/Duration: (\d+):(\d+):([\d.]+)/).slice(1).reduce((a, v, i) => a + Number(v) * [3600, 60, 1][i], 0));
  const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  const segs = [];
  let s = 0;
  for (let i = 0; i < ends.length; i++) {
    if (starts[i] < 0.3) { s = ends[i]; continue; } // silencio inicial
    segs.push([s, starts[i]]);
    s = ends[i];
  }
  if (s < dur - 0.3) segs.push([s, dur]);
  return { segs, dur };
}

const fmt = (t) => {
  const ms = Math.round(t * 1000);
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
  const m = String(Math.floor((ms / 60000) % 60)).padStart(2, '0');
  const s = String(Math.floor((ms / 1000) % 60)).padStart(2, '0');
  return `${h}:${m}:${s}.${String(ms % 1000).padStart(3, '0')}`;
};

const browser = await chromium.launch();
for (const [idx, tut] of TUTORIALS.entries()) {
  if (only.length && !only.some((o) => tut.slug.startsWith(o))) continue;
  const mp3 = `${ROOT}video/audio/${tut.slug}.mp3`;
  const shotsDir = `${BUILD}shots/${tut.slug}/`;
  if (!existsSync(mp3) || !existsSync(`${shotsDir}shots.json`)) {
    console.error(`✗ ${tut.slug}: falta el audio o las capturas`);
    continue;
  }
  const { shots } = JSON.parse(readFileSync(`${shotsDir}shots.json`, 'utf8'));
  const { segs, dur: audioDur } = voiceSegments(mp3);
  if (segs.length !== tut.scenes.length) throw new Error(`${tut.slug}: ${segs.length} tramos de voz para ${tut.scenes.length} escenas`);
  for (const sc of tut.scenes) if (sc.shot && !shots[sc.shot]) throw new Error(`${tut.slug}: falta la captura «${sc.shot}»`);

  const duration = LEAD + audioDur + TAIL;
  const scenes = tut.scenes.map((sc, i) => ({ ...sc, v0: LEAD + segs[i][0], v1: LEAD + segs[i][1], t0: i === 0 ? 0 : LEAD + segs[i][0] - 0.35 }));
  scenes.forEach((sc, i) => (sc.t1 = i < scenes.length - 1 ? scenes[i + 1].t0 : duration));

  const data = { title: tut.title, kicker: tut.kicker, chapters: tut.chapters, scenes, shots, shotsBase: `build/shots/${tut.slug}/`, duration, index: idx + 1, total: TUTORIALS.length };
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(`file://${ROOT}video/template.html`);
  await page.evaluate((d) => window.init(d), data);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((im) => im.decode().catch(() => {})));
  });

  // subtítulos (WebVTT) con los mismos tiempos que el vídeo
  const chunks = await page.evaluate(() => window.capChunksForExport?.() ?? []);
  if (chunks.length) {
    const vtt = ['WEBVTT', '', ...chunks.map((c, i) => `${i + 1}\n${fmt(c.t0)} --> ${fmt(Math.min(c.t1 + 0.3, chunks[i + 1]?.t0 ?? Infinity))}\n${c.text}\n`)].join('\n');
    mkdirSync(`${BUILD}out`, { recursive: true });
    writeFileSync(`${BUILD}out/${tut.slug}.vtt`, vtt);
  }

  // póster (web) y miniatura (YouTube): la tarjeta de entrada, antes de que aparezca el primer subtítulo
  const still = async () => {
    mkdirSync(`${BUILD}out`, { recursive: true });
    await page.evaluate((x) => window.seek(x), 0.4);
    await page.screenshot({ path: `${BUILD}out/${tut.slug}.jpg`, type: 'jpeg', quality: 90 });
  };

  if (preview) {
    await still();
    mkdirSync(`${BUILD}preview/${tut.slug}`, { recursive: true });
    const times = scenes.flatMap((sc) => [sc.t0 + 1.6]).concat([duration - 0.5]);
    for (const [k, t] of times.entries()) {
      await page.evaluate((x) => window.seek(x), t);
      await page.screenshot({ path: `${BUILD}preview/${tut.slug}/${String(k).padStart(2, '0')}.png` });
    }
    console.log(`✓ vista previa ${tut.slug} (${times.length} fotogramas, ${duration.toFixed(1)} s)`);
    await page.close();
    continue;
  }

  mkdirSync(`${BUILD}out`, { recursive: true });
  const out = `${BUILD}out/${tut.slug}.mp4`;
  const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-itsoffset', String(LEAD), '-i', mp3, '-filter_complex', `[1:a]apad,atrim=0:${duration.toFixed(3)},afade=t=out:st=${(duration - 0.6).toFixed(3)}:d=0.6[a]`, '-map', '0:v', '-map', '[a]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const frames = Math.ceil(duration * FPS);
  const t0 = Date.now();
  for (let f = 0; f < frames; f++) {
    await page.evaluate((x) => window.seek(x), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 94 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 300 === 0) process.stdout.write(`  ${tut.slug}: ${f}/${frames}\n`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await still();
  console.log(`✓ ${out} · ${duration.toFixed(1)} s · ${((Date.now() - t0) / 1000).toFixed(0)} s de render`);
  await page.close();
}
await browser.close();
