/**
 * Contenido de las páginas por tipo de centro (/academias y /universidades).
 * title ≤ 60 caracteres y description ≤ 155 (lo comprueba scripts/prerender.mjs).
 */
import { PLAN } from '../config';

export interface Segment {
  slug: 'academias' | 'universidades';
  title: string;
  description: string;
  label: string;
  h1: string;
  intro: string;
  /** Resumen para la portada. */
  teaser: string;
  problems: [string, string][];
  steps: [string, string][];
  features: [string, string][];
  faq: [string, string][];
  related: string[];
  cta: string;
}

const eur = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });

export const SEGMENTS: Segment[] = [
  {
    slug: 'academias',
    title: 'Corregir simulacros de oposiciones tipo test — Korrige',
    description: 'Corrige los simulacros tipo test de tu academia en minutos: escanea las hojas en la fotocopiadora y obtén notas y estadísticas por pregunta.',
    label: 'Para academias',
    h1: 'Corrige los simulacros de tu academia en minutos',
    intro:
      'Simulacros semanales, cientos de opositores y una tarde entera corrigiendo. Con Korrige pasas el taco de hojas por la fotocopiadora y tienes las notas antes de que los alumnos lleguen a casa.',
    teaser: 'Simulacros de oposiciones, MIR, EIR o PIR corregidos el mismo día, con las preguntas más falladas.',
    problems: [
      ['Los simulacros se corrigen tarde', 'Si el alumno recibe la nota una semana después, ya está con otro tema. Corregir el mismo día mantiene el simulacro como herramienta de estudio.'],
      ['Corregir a mano no escala', 'Con plantilla perforada o foto a foto con el móvil, cada grupo nuevo es más trabajo. Un escaneo del taco entero tarda lo mismo con 30 hojas que con 300.'],
      ['Sin datos por pregunta no se puede orientar', 'Saber qué preguntas falla el grupo y qué distractor eligen dice qué temas hay que repasar en clase.'],
    ],
    steps: [
      ['Crea el simulacro', 'Indica el número de preguntas (hasta 200), las opciones y la penalización que aplica tu oposición. Korrige genera la hoja de respuestas en PDF.'],
      ['Imprime y reparte', 'La hoja se imprime en cualquier impresora, al 100 %. Puedes poner el logotipo de la academia y elegir el identificador: DNI, número de alumno…'],
      ['Escanea el taco', 'Coloca todas las hojas en el alimentador de la fotocopiadora y envíate el PDF. No hace falta lectora óptica ni fotografiar hoja a hoja.'],
      ['Revisa y entrega notas', 'Las hojas claras se corrigen solas. Las dobles marcas y las dudosas se resuelven con un clic viendo la imagen. Exporta a Excel.'],
    ],
    features: [
      ['Penalización como en el examen real', 'Resta por error la fracción que marque la convocatoria (1/3, 1/4…) y decide si las preguntas en blanco restan.'],
      ['Preguntas impugnadas y anuladas', 'Anula una pregunta impugnada y todas las notas se recalculan al momento, sin volver a escanear.'],
      ['Varios modelos de examen', 'Hasta cuatro modelos con las preguntas en distinto orden; cada hoja se corrige con su plantilla.'],
      ['Estadísticas por pregunta', 'Porcentaje de aciertos, índice de discriminación y respuestas elegidas, para detectar temas flojos y preguntas mal planteadas.'],
      ['Varios profesores, una organización', 'Cada preparador con su cuenta, exámenes compartidos y registro de quién cambió qué.'],
      ['Datos de los alumnos protegidos', 'La lectura se hace en tu navegador y los datos se guardan en la Unión Europea, con borrado automático de imágenes.'],
    ],
    faq: [
      ['¿Sirve para simulacros de cualquier oposición?', 'Sí, siempre que el examen sea tipo test con entre 3 y 5 opciones por pregunta y hasta 200 preguntas: administración, justicia, sanidad, educación, cuerpos de seguridad, MIR, EIR o PIR.'],
      ['¿Necesito comprar un escáner o una lectora óptica?', 'No. Sirve cualquier fotocopiadora o multifunción con alimentador automático que escanee a PDF, que es lo habitual en una academia.'],
      ['¿Puedo aplicar la penalización de mi convocatoria?', 'Sí. Puedes usar la fórmula clásica (cada error resta 1/(k−1) de un acierto), fijar tú la penalización por error y decidir si las preguntas en blanco restan.'],
      ['¿Qué pasa si un alumno marca dos respuestas o usa lápiz?', 'Esas hojas no se corrigen a ciegas: quedan apartadas con el recorte de la imagen para que decidas tú, y la decisión queda registrada.'],
      ['¿Cuánto cuesta?', `El primer examen es gratis y completo, sin tarjeta. Korrige Plus cuesta ${eur(PLAN.plusMonthly)} € al mes por profesor (${PLAN.plusExamsPerMonth} exámenes al mes). Para toda la academia, con profesores y exámenes sin límite, hay Korrige Academy a medida.`],
    ],
    related: ['corregir-simulacros-oposiciones', 'formula-penalizacion-examen-tipo-test', 'plantilla-hoja-de-respuestas-tipo-test'],
    cta: 'Corrige gratis tu próximo simulacro',
  },
  {
    slug: 'universidades',
    title: 'Corrección de exámenes tipo test para universidades',
    description: 'Lectura óptica de exámenes tipo test con las multifunción de la facultad: sin lectora dedicada, con análisis de ítems, Moodle y datos en la UE.',
    label: 'Para universidades',
    h1: 'Lectura óptica de exámenes con las multifunción de la facultad',
    intro:
      'Los exámenes tipo test en papel siguen siendo la forma más segura de evaluar a grupos grandes. Korrige los corrige con las fotocopiadoras que la facultad ya tiene, sin lectora dedicada ni hojas preimpresas.',
    teaser: 'Lectura óptica sin lectora dedicada, con análisis de ítems, exportación a Moodle y datos en la UE.',
    problems: [
      ['Un único puesto de lectura óptica', 'Cuando todo pasa por una lectora y un servicio central, los profesores entregan las hojas y esperan. Con Korrige cada profesor corrige desde su despacho.'],
      ['Equipos y hojas específicos', 'Las lectoras dedicadas exigen mantenimiento y hojas preimpresas del fabricante. Aquí la hoja es un PDF que se imprime en cualquier impresora.'],
      ['Revisiones de examen sin evidencias', 'Cada hoja conserva su imagen y cada cambio manual queda registrado con autor y fecha, lo que simplifica las reclamaciones.'],
    ],
    steps: [
      ['El profesor crea el examen', 'Preguntas (hasta 200), opciones, modelos y criterios de corrección. La organización puede fijar el logotipo y los valores por defecto.'],
      ['Se imprime la hoja de respuestas', 'Un PDF en A4 con el identificador que use la universidad: NIA, NIUB, DNI o número de expediente.'],
      ['Se escanea en la multifunción', 'El taco completo pasa por el alimentador de la Xerox o equipo similar y llega por correo como un único PDF.'],
      ['Revisión, notas y análisis', 'Las incidencias se resuelven en pantalla. Las notas se exportan a Excel o en CSV para el libro de calificaciones de Moodle.'],
    ],
    features: [
      ['Análisis de ítems', 'Índice de dificultad y de discriminación por pregunta y distribución de respuestas, para mejorar el banco de preguntas.'],
      ['Varios modelos y preguntas anuladas', 'Hasta cuatro modelos por examen. Al anular una pregunta o corregir la plantilla, las notas se recalculan sin volver a escanear.'],
      ['Lista de clase y Moodle', 'Importa el listado de alumnos para detectar identificadores erróneos y exporta las notas en el formato de Moodle.'],
      ['Trabajo en equipo', 'Coautores por examen, administradores de la organización y registro de actividad completo.'],
      ['Protección de datos', 'La lectura de las hojas se hace en el navegador del profesor. Los datos se alojan en la Unión Europea y las imágenes se borran tras el plazo que fije el centro.'],
      ['Sin instalación', 'Funciona en el navegador, sin software en los equipos ni integración con los sistemas de la universidad para empezar.'],
    ],
    faq: [
      ['¿Sustituye al servicio de lectura óptica de la universidad?', 'Puede sustituirlo o complementarlo. Muchas facultades lo usan para que cada profesor corrija por su cuenta, y en centros adscritos o universidades sin servicio central es la forma de tener lectura óptica sin comprar equipos.'],
      ['¿Con qué equipos funciona?', 'Con cualquier multifunción con alimentador automático que escanee a PDF: Xerox, Canon, Ricoh, Konica Minolta, HP y similares. Se recomienda escanear a 300 ppp.'],
      ['¿Dónde se guardan los datos de los estudiantes?', 'En servidores de la Unión Europea. Las imágenes de las hojas se eliminan automáticamente pasado el plazo de conservación que configure la organización.'],
      ['¿Se integra con Moodle?', 'Las notas se exportan en un CSV que se importa en el libro de calificaciones de Moodle. No requiere instalar ningún complemento en el campus virtual.'],
      ['¿Cómo se contrata para una facultad o un departamento?', 'Con Korrige Academy: una organización con profesores y exámenes sin límite, puesta en marcha, formación y soporte. Se presupuesta a medida.'],
    ],
    related: ['analisis-de-items-dificultad-discriminacion', 'corregir-examenes-tipo-test', 'plantilla-hoja-de-respuestas-tipo-test'],
    cta: 'Pide una demostración para tu facultad',
  },
];

export const segmentBySlug = (slug: string) => SEGMENTS.find((s) => s.slug === slug);

export function segmentJsonLd(s: Segment): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: s.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  });
}
