// Serie de vídeos tutoriales de Korrige (YouTube + página /tutoriales).
//
// Cada vídeo tiene capítulos (la lista de la izquierda) y escenas. Cada escena:
//   ch    índice del capítulo que se resalta (intro/outro no tienen)
//   text  subtítulo; lo que va entre *asteriscos* se resalta
//   say   lo que lee la voz si no coincide con el subtítulo (números, siglas, URLs)
//   shot  captura de la aplicación (la genera video/capture.mjs con ese nombre)
//
// La voz se genera con ElevenLabs (voz «Cristina - Serious, Narration») a partir de
// estos textos; ver video/README.md.

export const VOICE = { name: 'Cristina - Serious, Narration', id: '6eHm1OlVfyf3wZacL2k3', model: 'eleven_multilingual_v2' };

export const TUTORIALS = [
  {
    slug: '01-crear-examen',
    title: 'Crear un examen',
    kicker: 'y su hoja de respuestas',
    summary: 'Crea un examen tipo test, configura la hoja de respuestas (preguntas, opciones, modelos e identificador) y descárgala para imprimir.',
    chapters: [
      ['ANTES', 'Exámenes'],
      ['PASO 1', 'Datos del examen'],
      ['PASO 2', 'Preguntas y opciones'],
      ['PASO 3', 'Modelos e identificador'],
      ['PASO 4', 'Personaliza la hoja'],
      ['PASO 5', 'La hoja, al momento'],
      ['PASO 6', 'Descarga e imprime'],
    ],
    scenes: [
      { type: 'intro', text: 'Vamos a crear un examen tipo test en Korrige, *de principio a fin*.' },
      { ch: 0, shot: 'lista', text: 'Entra en «Exámenes» y pulsa *«Nuevo examen»*.' },
      { ch: 1, shot: 'datos', text: 'Escribe el *nombre del examen*, la asignatura, el grupo y la convocatoria. Así lo encontrarás después.' },
      { ch: 2, shot: 'preguntas', text: 'En «Hoja de respuestas», indica el *número de preguntas* y cuántas *opciones* tiene cada una.' },
      { ch: 3, shot: 'modelos', text: 'Si haces *varios modelos*, elige cuántos. Y pon el *identificador* de tu centro, como el NIA, con sus dígitos.' },
      { ch: 4, shot: 'personaliza', text: 'Si quieres, añade el *logotipo* de tu centro y una nota, como la duración del examen.' },
      { ch: 5, shot: 'vista-previa', text: 'Pulsa «Crear examen». Korrige genera la hoja al momento, *con su código QR*.' },
      { ch: 6, shot: 'descargar', text: 'Descarga el PDF e imprímelo *al 100 %*, a tamaño real. Nunca con «ajustar a página».', say: 'Descarga el PDF e imprímelo al cien por cien, a tamaño real. Nunca con «ajustar a página».' },
      { type: 'outro', text: 'Listo. En el siguiente tutorial, *añadimos las respuestas correctas*.' },
    ],
  },
  {
    slug: '02-plantilla-respuestas',
    title: 'Añadir las respuestas',
    kicker: 'plantillas y modelos',
    summary: 'Introduce la plantilla de respuestas correctas, acepta varias respuestas o anula preguntas, y relaciona los modelos A y B.',
    chapters: [
      ['PASO 1', 'Abre «Plantillas»'],
      ['PASO 2', 'Marca las correctas'],
      ['PASO 3', 'Varias válidas o anular'],
      ['PASO 4', 'Cada modelo, la suya'],
      ['PASO 5', 'Correspondencia'],
      ['PASO 6', 'Guarda y recalcula'],
    ],
    scenes: [
      { type: 'intro', text: 'Ahora vamos a introducir *las respuestas correctas* del examen.' },
      { ch: 0, shot: 'pestana', text: 'Abre el examen y entra en la pestaña *«Plantillas»*.' },
      { ch: 1, shot: 'marcar', text: 'Haz clic en la *respuesta correcta* de cada pregunta. Abajo verás cuántas faltan por definir.' },
      { ch: 2, shot: 'anular', text: 'Si aceptas dos respuestas, *marca las dos*. Y si una pregunta está mal planteada, márcala como *«Anular»*: no puntuará para nadie.' },
      { ch: 3, shot: 'modelo-b', text: 'Si tienes varios modelos, cambia al *modelo B* y repite. Cada modelo tiene su propia plantilla.' },
      { ch: 4, shot: 'correspondencia', text: 'En *«Correspondencia entre modelos»*, indica a qué pregunta del modelo A equivale cada una. Así las estadísticas cuadran.' },
      { ch: 5, shot: 'guardar', text: 'Pulsa *«Guardar plantilla»*. Cada cambio crea una versión nueva y *recalcula todas las notas*.' },
      { type: 'outro', text: 'Ya puedes poner el examen. En el siguiente tutorial, *subimos las hojas escaneadas*.' },
    ],
  },
  {
    slug: '03-subir-hojas',
    title: 'Corregir las hojas',
    kicker: 'escanea y sube el PDF',
    summary: 'Importa la lista de clase, escanea todo el taco en la fotocopiadora y sube el PDF: Korrige lee las hojas y calcula las notas en segundos.',
    chapters: [
      ['ANTES', 'Lista de alumnos'],
      ['PASO 1', 'Escanea el taco'],
      ['PASO 2', 'Sube el PDF'],
      ['PASO 3', 'Lectura en segundos'],
      ['PASO 4', 'Resumen y guardar'],
      ['PASO 5', 'Notas al momento'],
    ],
    scenes: [
      { type: 'intro', text: 'Vamos a corregir el examen: *escanear las hojas y subirlas* a Korrige.' },
      { ch: 0, shot: 'alumnos', text: 'Antes, si quieres ver nombres en las notas, importa la *lista de clase* desde un CSV o un Excel.', say: 'Antes, si quieres ver nombres en las notas, importa la lista de clase desde un archivo CSV o un Excel.' },
      { ch: 1, shot: 'escanea', text: 'Escanea todo el taco de golpe en la fotocopiadora: *300 ppp*, sin grapas, y envíatelo por correo en un solo PDF.', say: 'Escanea todo el taco de golpe en la fotocopiadora: a trescientos puntos por pulgada, sin grapas, y envíatelo por correo en un solo PDF.' },
      { ch: 2, shot: 'elegir', text: 'En «Subir hojas», *arrastra el PDF* o pulsa «Elegir PDF». Da igual si alguna hoja va al revés.' },
      { ch: 3, shot: 'leyendo', text: 'Las hojas se leen *en tu ordenador*, en segundos. El PDF no se envía a ningún servidor.' },
      { ch: 4, shot: 'resumen', text: 'Comprueba el *resumen de la lectura* y pulsa «Guardar».' },
      { ch: 5, shot: 'notas', text: 'Las notas ya están calculadas. Lo dudoso queda *en «Revisión»*, para que lo decidas tú.' },
      { type: 'outro', text: 'En el siguiente tutorial, *revisamos esas incidencias*.' },
    ],
  },
  {
    slug: '04-revisar-incidencias',
    title: 'Revisar incidencias',
    kicker: 'solo lo dudoso',
    summary: 'Resuelve dobles marcas, marcas flojas e identificadores dudosos con el recorte de la hoja delante y atajos de teclado.',
    chapters: [
      ['PASO 1', 'Cola de revisión'],
      ['PASO 2', 'Filtra por tipo'],
      ['PASO 3', 'Doble marca'],
      ['PASO 4', 'Identificador dudoso'],
      ['PASO 5', 'Atajos de teclado'],
      ['PASO 6', 'Todo queda registrado'],
    ],
    scenes: [
      { type: 'intro', text: 'Korrige corrige lo que está claro. *Lo dudoso te lo deja a ti*.' },
      { ch: 0, shot: 'cola', text: 'En la pestaña *«Revisión»* tienes la cola de incidencias. El número indica cuántas quedan.' },
      { ch: 1, shot: 'filtros', text: 'Puedes filtrarlas por tipo: *dobles marcas*, marcas flojas, identificadores dudosos u hojas en blanco.' },
      { ch: 2, shot: 'doble', text: 'Cada incidencia muestra *el recorte de la hoja*. Aquí hay dos marcas: elige la buena, o déjala en blanco o nula.' },
      { ch: 3, shot: 'identificador', text: 'Si el identificador no está en la lista, *corrígelo* mirando los dígitos que escribió el alumno.' },
      { ch: 4, shot: 'atajos', text: 'Con el teclado va más rápido: *de la A a la E* para responder, Intro para aceptar y Suprimir para excluir la hoja.' },
      { ch: 5, shot: 'actividad', text: 'Las notas se recalculan solas y *cada corrección queda registrada* en «Actividad».' },
      { type: 'outro', text: 'En el siguiente tutorial, *vemos las notas y cómo exportarlas*.' },
    ],
  },
  {
    slug: '05-notas-exportar',
    title: 'Notas y exportación',
    kicker: 'Excel y Moodle',
    summary: 'Consulta las notas, abre la hoja escaneada de cada alumno, corrige a mano, exporta a Excel o Moodle y cierra el examen.',
    chapters: [
      ['PASO 1', 'Tabla de notas'],
      ['PASO 2', 'Busca y filtra'],
      ['PASO 3', 'La hoja de cada alumno'],
      ['PASO 4', 'Corrige a mano'],
      ['PASO 5', 'Excel y Moodle'],
      ['PASO 6', 'Cierra el examen'],
    ],
    scenes: [
      { type: 'intro', text: 'Ya tienes las notas. Vamos a *consultarlas y exportarlas*.' },
      { ch: 0, shot: 'tabla', text: 'En *«Notas»* ves a cada alumno con sus aciertos, errores, preguntas en blanco y la nota final.' },
      { ch: 1, shot: 'buscar', text: 'Busca por nombre o identificador, o *filtra por modelo* y por estado.' },
      { ch: 2, shot: 'detalle', text: 'Haz clic en un alumno para ver *su hoja escaneada*, con cada respuesta comparada con la plantilla.' },
      { ch: 3, shot: 'corregir', text: 'Si algo no cuadra, *haz clic en la respuesta* para corregirla. Queda registrado.' },
      { ch: 4, shot: 'exportar', text: 'Exporta las notas *a Excel*, o en un CSV listo para *importar en Moodle*.', say: 'Exporta las notas a Excel, o en un archivo CSV listo para importar en Moodle.' },
      { ch: 5, shot: 'cerrar', text: 'Al terminar, *cierra el examen* desde «Resumen»: queda en solo lectura, y puedes reabrirlo si lo necesitas.' },
      { type: 'outro', text: 'En el siguiente tutorial, *analizamos cada pregunta*.' },
    ],
  },
  {
    slug: '06-estadisticas',
    title: 'Estadísticas',
    kicker: 'qué preguntas funcionan',
    summary: 'Lee el resultado del examen, la distribución de notas y la dificultad y discriminación de cada pregunta; anula las que fallan.',
    chapters: [
      ['PASO 1', 'Resultado del examen'],
      ['PASO 2', 'Distribución de notas'],
      ['PASO 3', 'Calidad de las preguntas'],
      ['PASO 4', 'Análisis por pregunta'],
      ['PASO 5', 'Revisa la clave'],
      ['PASO 6', 'Anula y recalcula'],
    ],
    scenes: [
      { type: 'intro', text: 'Korrige no solo corrige: también te dice *qué preguntas han funcionado*.' },
      { ch: 0, shot: 'kpis', text: 'En *«Estadísticas»* tienes el resumen: presentados, aprobados, nota media, mediana y dispersión.' },
      { ch: 1, shot: 'histograma', text: 'El histograma muestra *cómo se reparten las notas* de la clase.' },
      { ch: 2, shot: 'calidad', text: 'Cada pregunta tiene su *dificultad* y su *discriminación*: si distingue a quien domina la materia de quien no.' },
      { ch: 3, shot: 'tabla', text: 'En el análisis por pregunta, filtra *las problemáticas*. Verás qué opción eligió cada alumno.' },
      { ch: 4, shot: 'distractor', text: 'Si una opción incorrecta supera a la correcta, *revisa la clave* y el enunciado.' },
      { ch: 5, shot: 'anular', text: 'Si la pregunta estaba mal, *anúlala* en «Plantillas». Las notas se recalculan al momento.' },
      { type: 'outro', text: 'En el siguiente tutorial, *tus alumnos comprueban sus respuestas*.' },
    ],
  },
  {
    slug: '07-alumnos-comprueban',
    title: 'Los alumnos se comprueban',
    kicker: 'publica las respuestas',
    summary: 'Publica las respuestas correctas con un código para que cada alumno se compruebe en korrige.es/comprobar, con calculadora de nota opcional.',
    chapters: [
      ['ANTES', 'Que anoten sus respuestas'],
      ['PASO 1', 'Publica las respuestas'],
      ['PASO 2', '¿Cuándo se ven?'],
      ['PASO 3', 'Código para los alumnos'],
      ['PASO 4', 'Calculadora de nota'],
      ['PASO 5', 'Comparte el enlace'],
      ['EL ALUMNO', 'Entra con el código'],
      ['EL ALUMNO', 'Se comprueba'],
    ],
    scenes: [
      { type: 'intro', text: 'Tus alumnos pueden *comprobar sus respuestas* sin que tengas que hacer nada más.' },
      { ch: 0, shot: 'tarjeta', text: 'Durante el examen, pídeles que *anoten sus respuestas* en el cuadernillo que se llevan.' },
      { ch: 1, shot: 'publicar', text: 'En el «Resumen» del examen, marca *«Publicar las respuestas correctas»*.' },
      { ch: 2, shot: 'cuando', text: 'Elige si se ven *desde ahora* o a partir de una fecha y hora.' },
      { ch: 3, shot: 'codigo', text: 'Usa el código del examen o *elige uno tuyo*, fácil de recordar.' },
      { ch: 4, shot: 'calculadora', text: 'Si quieres, ofrece la *calculadora de nota*: el alumno marca lo que contestó y ve su nota estimada.' },
      { ch: 5, shot: 'enlace', text: 'Pulsa «Publicar» y comparte *el código o el enlace*.' },
      { ch: 6, shot: 'alumno-codigo', text: 'El alumno entra en *korrige.es/comprobar*, escribe el código y elige su modelo.', say: 'El alumno entra en korrige punto es barra comprobar, escribe el código y elige su modelo.' },
      { ch: 7, shot: 'alumno-nota', text: 'Ve las respuestas correctas y *calcula su nota*. Sin cuenta, y sin ver datos de nadie.' },
      { type: 'outro', text: 'Así de fácil. *Encuentra más tutoriales* en korrige.es.', say: 'Así de fácil. Encuentra más tutoriales en korrige punto es.' },
    ],
  },
  {
    slug: '08-organizacion',
    title: 'Tu organización',
    kicker: 'profesores y valores por defecto',
    summary: 'Invita a los profesores de tu centro o academia, define los valores por defecto de los exámenes y comparte exámenes entre colegas.',
    chapters: [
      ['PASO 1', 'Profesores'],
      ['PASO 2', 'Invita por email'],
      ['PASO 3', 'Roles'],
      ['PASO 4', 'Valores por defecto'],
      ['PASO 5', 'Fórmula de corrección'],
      ['PASO 6', 'Comparte un examen'],
      ['PASO 7', 'Protección de datos'],
    ],
    scenes: [
      { type: 'intro', text: 'Si en tu centro o academia sois *varios profesores*, esto te interesa.' },
      { ch: 0, shot: 'profesores', text: 'En *«Organización»* ves a los profesores, con sus exámenes, hojas leídas y última actividad.' },
      { ch: 1, shot: 'invitar', text: 'Para sumar a alguien, escribe su email y pulsa *«Invitar»*. Recibirá un correo con el enlace de registro.' },
      { ch: 2, shot: 'roles', text: 'Elige su rol: *profesor o administrador*. Los administradores ven todos los exámenes de la organización.' },
      { ch: 3, shot: 'defaults', text: 'En *«Valores por defecto»* define el logotipo, el título de la hoja y el identificador de tu centro.' },
      { ch: 4, shot: 'formula', text: 'Y la *fórmula de corrección*. Se aplicará a cada examen nuevo.' },
      { ch: 5, shot: 'compartir', text: 'Para preparar un examen entre varios, *compártelo* desde su «Resumen» con otro profesor.' },
      { ch: 6, shot: 'retencion', text: 'Y decide *cuántos meses se guardan* las imágenes de las hojas una vez cerrado el examen.' },
      { type: 'outro', text: 'Ya conoces Korrige. *Tu primer examen es gratis*.' },
    ],
  },
];

/** Texto que lee la voz: escenas separadas por una pausa larga (se detecta para sincronizar). */
export function voiceScript(t, pause = 1.4) {
  return t.scenes.map((s) => (s.say ?? s.text).replaceAll('*', '')).join(` <break time="${pause}s" /> `);
}
