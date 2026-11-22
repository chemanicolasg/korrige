// Genera video/youtube.md: título, descripción corta (YouTube admite hasta 5000 caracteres) y etiquetas
// de cada vídeo, listos para pegar en YouTube Studio.
//   node video/youtube.mjs
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { TUTORIALS } from './tutoriales.mjs';

// Ids de YouTube de los vídeos ya subidos (lo que va tras youtu.be/). Los que falten enlazan a la web.
const YT = {
  '01-crear-examen': 'z6yr1sEGPXM',
};
const LEAD = 0.8; // igual que en render.mjs

const TAGS = ['Korrige', 'corregir exámenes tipo test', 'corrección automática de exámenes', 'hoja de respuestas', 'plantilla de respuestas', 'lector óptico', 'OMR', 'examen tipo test', 'profesores', 'universidad', 'academias', 'Moodle', 'tutorial'];

const link = (t) => (YT[t.slug] ? `https://youtu.be/${YT[t.slug]}` : `https://korrige.es/tutoriales#${t.slug}`);
const ytTitle = (t, n) => `${t.kicker.startsWith('y ') ? `${t.title} ${t.kicker}` : `${t.title} (${t.kicker})`} | Tutorial Korrige ${n}/${TUTORIALS.length}`;
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Segundo en el que empieza cada escena (los silencios largos separan las escenas, como en render.mjs). */
function sceneStarts(slug) {
  const log = spawnSync('ffmpeg', ['-hide_banner', '-i', new URL(`./audio/${slug}.mp3`, import.meta.url).pathname, '-af', 'silencedetect=noise=-40dB:d=0.9', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  return [0, ...ends.map((e) => LEAD + e - 0.35)];
}

const out = [
  '# Tutoriales de Korrige para YouTube',
  '',
  'Generado con `node video/youtube.mjs` a partir de `video/tutoriales.mjs` (descripciones cortas, sin `<` ni `>`,',
  'que YouTube no admite). Para cada vídeo: `<slug>.mp4`, la miniatura',
  '`public/tutoriales/<slug>.jpg` y los subtítulos `public/tutoriales/<slug>.vtt` (castellano).',
  '',
  'En todos: audiencia «No, no está hecho para niños», idioma Español (España), categoría Educación,',
  'lista de reproducción «Aprende Korrige» y pantalla final al siguiente vídeo.',
  '',
  'Cuando estén publicados, añade sus ids en `YT` (arriba de `video/youtube.mjs`) y vuelve a generar este',
  'archivo para que la lista de la serie enlace a YouTube; y ponlos también en `src/tutorials.ts` (`youtubeId`).',
  '',
];
const sizes = [];
TUTORIALS.forEach((t, i) => {
  const n = i + 1;
  const starts = sceneStarts(t.slug);
  const steps = t.scenes
    .map((s, k) => (s.type ? null : `${mmss(starts[k])} ${t.chapters[s.ch][1]}: ${plain(s)}`))
    .filter(Boolean);
  const next = TUTORIALS[i + 1];
  const desc = [
    `${t.summary}`,
    '',
    ...t.scenes.map((s, k) => (s.type ? null : `${mmss(starts[k])} ${t.chapters[s.ch][1]}`)).filter(Boolean),
    '',
    next ? `▶ Siguiente: ${next.title} → ${link(next)}` : `▶ Desde el principio: ${TUTORIALS[0].title} → ${link(TUTORIALS[0])}`,
    '🎬 Todos los tutoriales: https://korrige.es/tutoriales',
    '🎁 Tu primer examen es gratis: https://korrige.es',
    '',
    '#Korrige #ExamenesTipoTest #Profesores',
  ].join('\n');
  if (/[<>]/.test(desc)) throw new Error(`${t.slug}: la descripción tiene < o >, que YouTube no admite`);
  if (desc.length > 5000) throw new Error(`${t.slug}: la descripción tiene ${desc.length} caracteres (máximo 5000)`);
  const tags = [...TAGS, t.title.toLowerCase(), ...t.chapters.map(([, l]) => l.toLowerCase().replace(/[«»¿?,]/g, ''))].join(', ');
  if (tags.length > 500) throw new Error(`${t.slug}: las etiquetas pasan de 500 caracteres`);
  sizes.push(`${t.slug}: ${desc.length} caracteres`);
  out.push(`## ${n}. ${t.title}`, '', `**Archivo:** \`${t.slug}.mp4\` · descripción de ${desc.length} caracteres`, '', '**Título**', '```', ytTitle(t, n), '```', '**Descripción**', '```', desc, '```', '**Etiquetas**', '```', tags, '```', '');
});
writeFileSync(new URL('./youtube.md', import.meta.url), out.join('\n'));
console.log(`✓ video/youtube.md\n  ${sizes.join('\n  ')}`);
