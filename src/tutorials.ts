/**
 * Vídeos tutoriales (página pública /tutoriales y /app/tutoriales dentro de la aplicación).
 *
 * Los vídeos se generan con video/ (ver video/README.md) y se sirven desde public/tutoriales/:
 * <slug>.mp4, <slug>.jpg (póster) y <slug>.vtt (subtítulos). Cuando se suban a YouTube, basta con
 * rellenar `youtubeId`: la página pasa a incrustar el vídeo de YouTube en lugar del MP4.
 * El orden y los textos coinciden con video/tutoriales.mjs.
 */
export type Tutorial = {
  slug: string;
  title: string;
  kicker: string;
  summary: string;
  /** duración en segundos */
  seconds: number;
  /** id del vídeo en YouTube (lo que va después de watch?v=); vacío = se usa el MP4 propio */
  youtubeId: string;
  steps: string[];
};

/** Lista de reproducción de YouTube con toda la serie (vacío hasta que se publique). */
export const TUTORIALS_PLAYLIST = '';

export const TUTORIALS: Tutorial[] = [
  {
    slug: '01-crear-examen',
    title: 'Crear un examen',
    kicker: 'y su hoja de respuestas',
    summary: 'Crea un examen tipo test, configura la hoja de respuestas (preguntas, opciones, modelos e identificador) y descárgala para imprimir.',
    seconds: 57,
    youtubeId: '',
    steps: ['Datos del examen', 'Preguntas y opciones', 'Modelos e identificador', 'Personaliza la hoja', 'La hoja, al momento', 'Descarga e imprime'],
  },
  {
    slug: '02-plantilla-respuestas',
    title: 'Añadir las respuestas',
    kicker: 'plantillas y modelos',
    summary: 'Introduce la plantilla de respuestas correctas, acepta varias respuestas o anula preguntas, y relaciona los modelos A y B.',
    seconds: 56,
    youtubeId: '',
    steps: ['Abre «Plantillas»', 'Marca las correctas', 'Varias válidas o anular', 'Cada modelo, la suya', 'Correspondencia', 'Guarda y recalcula'],
  },
  {
    slug: '03-subir-hojas',
    title: 'Corregir las hojas',
    kicker: 'escanea y sube el PDF',
    summary: 'Importa la lista de clase, escanea todo el taco en la fotocopiadora y sube el PDF: Korrige lee las hojas y calcula las notas en segundos.',
    seconds: 55,
    youtubeId: '',
    steps: ['Lista de alumnos', 'Escanea el taco', 'Sube el PDF', 'Lectura en segundos', 'Resumen y guardar', 'Notas al momento'],
  },
  {
    slug: '04-revisar-incidencias',
    title: 'Revisar incidencias',
    kicker: 'solo lo dudoso',
    summary: 'Resuelve dobles marcas, marcas flojas e identificadores dudosos con el recorte de la hoja delante y atajos de teclado.',
    seconds: 54,
    youtubeId: '',
    steps: ['Cola de revisión', 'Filtra por tipo', 'Doble marca', 'Identificador dudoso', 'Atajos de teclado', 'Todo queda registrado'],
  },
  {
    slug: '05-notas-exportar',
    title: 'Notas y exportación',
    kicker: 'Excel y Moodle',
    summary: 'Consulta las notas, abre la hoja escaneada de cada alumno, corrige a mano, exporta a Excel o Moodle y cierra el examen.',
    seconds: 50,
    youtubeId: '',
    steps: ['Tabla de notas', 'Busca y filtra', 'La hoja de cada alumno', 'Corrige a mano', 'Excel y Moodle', 'Cierra el examen'],
  },
  {
    slug: '06-estadisticas',
    title: 'Estadísticas',
    kicker: 'qué preguntas funcionan',
    summary: 'Lee el resultado del examen, la distribución de notas y la dificultad y discriminación de cada pregunta; anula las que fallan.',
    seconds: 50,
    youtubeId: '',
    steps: ['Resultado del examen', 'Distribución de notas', 'Calidad de las preguntas', 'Análisis por pregunta', 'Revisa la clave', 'Anula y recalcula'],
  },
  {
    slug: '07-alumnos-comprueban',
    title: 'Los alumnos se comprueban',
    kicker: 'publica las respuestas',
    summary: 'Publica las respuestas correctas con un código para que cada alumno se compruebe en korrige.es/comprobar, con calculadora de nota opcional.',
    seconds: 59,
    youtubeId: '',
    steps: ['Que anoten sus respuestas', 'Publica las respuestas', '¿Cuándo se ven?', 'Código para los alumnos', 'Calculadora de nota', 'Comparte el enlace', 'El alumno se comprueba'],
  },
  {
    slug: '08-organizacion',
    title: 'Tu organización',
    kicker: 'profesores y valores por defecto',
    summary: 'Invita a los profesores de tu centro o academia, define los valores por defecto de los exámenes y comparte exámenes entre colegas.',
    seconds: 57,
    youtubeId: '',
    steps: ['Profesores', 'Invita por email', 'Roles', 'Valores por defecto', 'Fórmula de corrección', 'Comparte un examen', 'Protección de datos'],
  },
];

export const fmtDuration = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
