// Genera video/youtube.md: título, descripción (≤ 5000 caracteres, el límite de YouTube) y etiquetas
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

// Preguntas frecuentes de cada vídeo (mismos textos que la web y DECISIONES.md)
const FAQ = {
  q_hoja: ['¿Puedo usar mis propias hojas?', 'No: la hoja la genera Korrige para cada examen, con su código QR y sus marcas de esquina. A cambio puedes configurar preguntas, opciones, modelos, identificador y cabecera, e imprimirla donde quieras.'],
  q_preg: ['¿Cuántas preguntas admite?', 'De 10 a 200 por examen. Hasta 100 caben en una página; a partir de ahí la hoja tiene dos páginas y Korrige las empareja por alumno.'],
  q_boli: ['¿Bolígrafo o lápiz?', 'Bolígrafo azul o negro, rellenando la burbuja entera. El lápiz blando suele funcionar, pero las marcas flojas se envían a revisión para que decidas tú.'],
  q_anular: ['¿Qué pasa si anulo una pregunta?', 'No puntúa para nadie y sale del cálculo: la nota se hace sobre las preguntas válidas. Todas las notas se recalculan al momento y la versión anterior de la plantilla se conserva.'],
  q_modelos: ['¿Para qué sirve la correspondencia entre modelos?', 'Si el modelo B tiene las mismas preguntas en otro orden, le dices a qué pregunta del A equivale cada una. Así las estadísticas de cada pregunta suman a todos los alumnos, hicieran el modelo que hicieran.'],
  q_escaner: ['¿Qué escáner necesito?', 'Cualquier fotocopiadora o multifunción con alimentador automático que escanee a PDF (Xerox, Canon, Ricoh, Konica Minolta, HP…). Recomendamos 300 ppp en blanco y negro o escala de grises. También sirve un escáner de sobremesa.'],
  q_torcida: ['¿Y si el escáner mete una hoja torcida o al revés?', 'Las cuatro marcas de las esquinas permiten enderezar cada hoja, y si está boca abajo se gira sola.'],
  q_privacidad: ['¿Dónde se leen las hojas?', 'En tu ordenador, en el navegador: el PDF no se envía a ningún servidor. Solo se guarda una imagen comprimida de cada hoja para la revisión.'],
  q_doble: ['¿Qué pasa si un alumno marca dos respuestas?', 'La pregunta va a la cola de revisión con el recorte de la imagen. Decides con un clic si cuenta una de las dos, se deja en blanco o es nula, y queda registrado.'],
  q_moodle: ['¿Se integra con Moodle?', 'Exporta un CSV que se importa directamente en el calificador de Moodle (por número de ID o por email). También un Excel completo con las respuestas de cada alumno. Si necesitáis una conexión directa con vuestro Moodle o vuestra intranet, la hacemos a medida con Korrige Academy.'],
  q_cerrar: ['¿Qué pasa al cerrar el examen?', 'Queda en solo lectura: nadie puede cambiar notas ni plantillas por error. Si hace falta, se reabre desde el Resumen.'],
  q_dificultad: ['¿Cómo se leen la dificultad y la discriminación?', 'Dificultad: porcentaje de alumnos que aciertan. Fácil, 80 % o más; media, entre 50 y 80 %; difícil, menos del 50 %. Discriminación: si la aciertan más los que mejor nota sacan. Buena desde 0,30; baja por debajo de 0,20; negativa, revisa la pregunta.'],
  q_alumnos: ['¿Pueden los alumnos comprobar sus respuestas?', 'Sí, si tú quieres. Publicas las respuestas correctas, desde ya o a partir de una fecha y hora, y das a los alumnos un código. Entran en korrige.es/comprobar, eligen su modelo y se comprueban con lo que anotaron en su cuadernillo; opcionalmente calculan su nota estimada. No necesitan cuenta y no se muestran notas ni datos de nadie.'],
  q_retirar: ['¿Puedo retirar la publicación?', 'Cuando quieras, también con el examen cerrado. Si corriges la plantilla o anulas una pregunta después de publicar, los alumnos ven la versión actualizada con un aviso.'],
  q_coautor: ['¿Qué puede hacer un profesor con quien comparto un examen?', 'Todo menos borrarlo o volver a compartirlo. Los administradores de la organización ven todos los exámenes.'],
  q_retencion: ['¿Qué se borra al vencer la conservación?', 'Las imágenes de las hojas. Las notas y las respuestas se conservan.'],
};
const FAQ_OF = {
  '01-crear-examen': ['q_hoja', 'q_preg', 'q_boli'],
  '02-plantilla-respuestas': ['q_anular', 'q_modelos', 'q_preg'],
  '03-subir-hojas': ['q_escaner', 'q_torcida', 'q_privacidad'],
  '04-revisar-incidencias': ['q_doble', 'q_boli', 'q_torcida'],
  '05-notas-exportar': ['q_moodle', 'q_cerrar', 'q_doble'],
  '06-estadisticas': ['q_dificultad', 'q_anular', 'q_modelos'],
  '07-alumnos-comprueban': ['q_alumnos', 'q_retirar', 'q_anular'],
  '08-organizacion': ['q_coautor', 'q_retencion', 'q_moodle'],
};

const link = (t) => (YT[t.slug] ? `https://youtu.be/${YT[t.slug]}` : `https://korrige.es/tutoriales#${t.slug}`);
const ytTitle = (t, n) => `${t.kicker.startsWith('y ') ? `${t.title} ${t.kicker}` : `${t.title} (${t.kicker})`} | Tutorial Korrige ${n}/${TUTORIALS.length}`;
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const plain = (s) => (s.say ? s.text : s.text).replaceAll('*', '');

/** Segundo en el que empieza cada escena (los silencios largos separan las escenas, como en render.mjs). */
function sceneStarts(slug) {
  const log = spawnSync('ffmpeg', ['-hide_banner', '-i', new URL(`./audio/${slug}.mp3`, import.meta.url).pathname, '-af', 'silencedetect=noise=-40dB:d=0.9', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  return [0, ...ends.map((e) => LEAD + e - 0.35)];
}

const out = [
  '# Tutoriales de Korrige para YouTube',
  '',
  'Generado con `node video/youtube.mjs` a partir de `video/tutoriales.mjs` (cada descripción tiene menos de',
  '5000 caracteres y ningún `<` ni `>`, que YouTube no admite). Para cada vídeo: `<slug>.mp4`, la miniatura',
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
    `${t.summary} Tutorial ${n} de ${TUTORIALS.length} de la serie «Aprende Korrige», en menos de un minuto.`,
    '',
    '▶ PASO A PASO',
    `0:00 Introducción`,
    ...steps,
    '',
    '❓ PREGUNTAS FRECUENTES',
    ...FAQ_OF[t.slug].flatMap((k) => [FAQ[k][0], FAQ[k][1], '']),
    '📚 LA SERIE COMPLETA «APRENDE KORRIGE»',
    ...TUTORIALS.map((x, j) => `${j + 1}. ${x.title} (${x.kicker})${j === i ? ' ← estás aquí' : `: ${link(x)}`}`),
    '',
    next ? `⏭ Siguiente: ${next.title} → ${link(next)}` : '⏮ ¿Te lo has perdido? Empieza por el primero → ' + link(TUTORIALS[0]),
    '',
    '✅ QUÉ ES KORRIGE',
    'Korrige corrige exámenes tipo test con la impresora que ya tienes. Imprime la hoja de respuestas, escanea todo el taco de golpe en tu fotocopiadora y sube el PDF: Korrige lee todas las hojas, calcula las notas y te enseña solo lo que hay que revisar. Sin lectores ópticos, sin hojas especiales y sin fotos con el móvil.',
    'Para universidades, facultades y academias: de 10 a 200 preguntas por examen, varios modelos, revisión con el recorte de cada hoja, estadísticas por pregunta y exportación a Excel o Moodle.',
    '',
    '🎁 Tu primer examen es gratis, completo y sin tarjeta: https://korrige.es',
    '🧪 Prueba la demo sin registrarte: https://korrige.es/demo',
    '🎬 Todos los tutoriales: https://korrige.es/tutoriales',
    '📄 Guía de impresión y escaneo: https://korrige.es/guia',
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
