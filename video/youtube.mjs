// Genera video/youtube.md: título, descripción y etiquetas de cada vídeo para subirlo a YouTube.
//   node video/youtube.mjs
import { writeFileSync } from 'node:fs';
import { TUTORIALS } from './tutoriales.mjs';

const TAGS = ['Korrige', 'corregir exámenes tipo test', 'corrección automática', 'hoja de respuestas', 'lector óptico', 'OMR', 'exámenes test', 'profesores', 'universidad', 'academias', 'Moodle', 'tutorial'];

const out = [
  '# Tutoriales de Korrige para YouTube',
  '',
  'Generado con `node video/youtube.mjs` a partir de `video/tutoriales.mjs`. Para cada vídeo: el archivo',
  '`video/build/out/<slug>.mp4` (1080p), la miniatura `video/build/out/<slug>.jpg` y los subtítulos',
  '`video/build/out/<slug>.vtt` (súbelos en «Subtítulos» como castellano).',
  '',
  'Lista de reproducción sugerida: **Aprende Korrige** — «Del examen en blanco a las notas en Moodle, en vídeos de menos de un minuto.»',
  '',
  'Cuando estén publicados, copia el id de cada vídeo (lo que va tras `watch?v=`) en `youtubeId` dentro de',
  '`src/tutorials.ts`, y el de la lista en `TUTORIALS_PLAYLIST`: la web pasará a incrustar YouTube.',
  '',
];
TUTORIALS.forEach((t, i) => {
  const n = i + 1;
  const steps = t.chapters.map(([c, l]) => `• ${l}`).join('\n');
  const next = TUTORIALS[i + 1];
  out.push(
    `## ${n}. ${t.title}`,
    '',
    `**Archivo:** \`${t.slug}.mp4\``,
    '',
    '**Título**',
    '```',
    `${t.kicker.startsWith('y ') ? `${t.title} ${t.kicker}` : `${t.title} (${t.kicker})`} | Tutorial Korrige ${n}/${TUTORIALS.length}`,
    '```',
    '**Descripción**',
    '```',
    `${t.summary}`,
    '',
    'En este vídeo:',
    steps,
    '',
    next ? `Siguiente tutorial: ${next.title} (${next.kicker}).` : 'Es el último vídeo de la serie.',
    '',
    'Korrige corrige exámenes tipo test escaneando las hojas de respuestas en cualquier fotocopiadora. Tu primer examen es gratis: https://korrige.es',
    'Todos los tutoriales: https://korrige.es/tutoriales',
    '',
    '#Korrige #ExamenesTipoTest #Profesores',
    '```',
    '**Etiquetas**',
    '```',
    [...TAGS, t.title.toLowerCase()].join(', '),
    '```',
    '',
  );
});
writeFileSync(new URL('./youtube.md', import.meta.url), out.join('\n'));
console.log('✓ video/youtube.md');
