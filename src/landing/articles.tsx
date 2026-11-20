/**
 * Páginas de contenido («Recursos»): responden a búsquedas concretas y enlazan
 * con el producto. Se prerenderizan en el build y entran en el sitemap.
 * title ≤ 60 caracteres y description ≤ 155 (lo comprueba scripts/prerender.mjs).
 */
import { ReactNode } from 'react';

export interface Article {
  slug: string;
  /** <title> de la página (≤ 60 caracteres). */
  title: string;
  /** Meta descripción (≤ 155 caracteres). */
  description: string;
  h1: string;
  intro: string;
  updated: string;
  body: ReactNode;
}

const Formula = ({ children }: { children: ReactNode }) => (
  <p className="my-5 border-l-[3px] border-brand-700 bg-brand-50 px-5 py-4 font-mono text-[15px] text-ink">{children}</p>
);

export const ARTICLES: Article[] = [
  {
    slug: 'corregir-examenes-tipo-test',
    title: 'Cómo corregir exámenes tipo test con hoja de respuestas',
    description: 'Formas de corregir un examen tipo test con hoja de respuestas: a mano, con móvil, lectora óptica o escaneando todo el taco en la fotocopiadora.',
    h1: 'Cómo corregir exámenes tipo test con hoja de respuestas',
    intro: 'Corregir un test de 150 alumnos puede llevar una tarde o diez minutos. La diferencia no está en el examen, sino en cómo se leen las hojas.',
    updated: '2026-11-20',
    body: (
      <>
        <h2>Las cuatro formas de corregir un test</h2>
        <h3>1. A mano, con plantilla perforada</h3>
        <p>
          Se superpone una plantilla con agujeros en las respuestas correctas y se cuentan las marcas. No necesita nada, pero es lento, es fácil equivocarse al sumar y no
          deja ningún dato: ni cuántos fallaron cada pregunta ni qué distractor eligieron. Si después hay que anular una pregunta, toca repasar todas las hojas.
        </p>
        <h3>2. Con una app de móvil</h3>
        <p>
          Se fotografía cada hoja con la cámara del teléfono. Funciona bien con grupos pequeños; con cien o doscientas hojas son cien o doscientas fotos, cada una con buena
          luz y la hoja bien encuadrada, y normalmente con el teléfono personal del profesor.
        </p>
        <h3>3. Con una lectora óptica dedicada</h3>
        <p>
          Es el sistema clásico de las universidades: una máquina específica y hojas preimpresas del fabricante. Lee muy rápido, pero exige comprar y mantener el equipo, y
          suele haber un único puesto por el que pasan todos los profesores.
        </p>
        <h3>4. Escaneando el taco en la fotocopiadora</h3>
        <p>
          Las multifunción de cualquier centro ya tienen alimentador automático y escanean a PDF. Se coloca el taco entero, se envía por correo como un único PDF y un programa
          lee todas las hojas de golpe. No hay que comprar nada y el profesor no fotografía hoja por hoja. Es el método que usa Korrige.
        </p>

        <h2>Qué necesita una buena hoja de respuestas</h2>
        <ul>
          <li>
            <b>Marcas de referencia en las esquinas</b>, para enderezar la hoja aunque el escáner la coja torcida o del revés.
          </li>
          <li>
            <b>Un código que identifique el examen</b> (por ejemplo un QR), para que no se mezclen hojas de asignaturas distintas.
          </li>
          <li>
            <b>El identificador del alumno en burbujas</b> (NIA, DNI o expediente), además de escrito a mano, para poder comprobarlo.
          </li>
          <li>
            <b>Burbujas para el modelo de examen</b> si hay varias versiones con las preguntas en distinto orden.
          </li>
        </ul>

        <h2>Pasos para corregir escaneando en la fotocopiadora</h2>
        <ol>
          <li>Genera la hoja de respuestas para tu examen: número de preguntas, opciones (de 3 a 5) y modelos.</li>
          <li>Imprímela al 100 % («tamaño real»), nunca con «ajustar a página», y repártela con el examen.</li>
          <li>Pide que marquen con bolígrafo azul o negro, rellenando la burbuja entera.</li>
          <li>Al terminar, quita grapas y coloca todo el taco en el alimentador. Escanea a 300 ppp y envíatelo por correo como PDF.</li>
          <li>Sube el PDF. Las hojas claras se corrigen solas; las dudosas quedan apartadas para que las mires.</li>
        </ol>

        <h2>Qué revisar siempre antes de publicar las notas</h2>
        <p>Ningún lector automático debería decidir por ti los casos dudosos. Antes de dar las notas por buenas, conviene revisar:</p>
        <ul>
          <li>
            <b>Dobles marcas</b>: ¿cuenta una de las dos, se anula o queda en blanco?
          </li>
          <li>
            <b>Marcas flojas</b>: lápiz, borrones o una burbuja a medio rellenar.
          </li>
          <li>
            <b>Identificadores incompletos o repetidos</b>, y hojas cuyo número no está en la lista de clase.
          </li>
          <li>
            <b>Preguntas problemáticas</b>: si casi nadie la acierta, o la aciertan más los que peor nota sacan, puede estar mal planteada.
          </li>
        </ul>
        <p>
          En Korrige cada uno de esos casos aparece con el recorte de la imagen de la hoja, se resuelve con un clic y queda registrado quién lo cambió y cuándo, lo que
          ayuda mucho en las revisiones de examen.
        </p>
      </>
    ),
  },
  {
    slug: 'formula-penalizacion-examen-tipo-test',
    title: 'Fórmula de penalización en exámenes tipo test (con ejemplos)',
    description: 'Cómo se calcula la nota de un test con penalización: aciertos − errores/(k−1). Ejemplos con 3, 4 y 5 opciones y qué hacer con las preguntas anuladas.',
    h1: 'Fórmula de penalización en exámenes tipo test',
    intro: 'La fórmula clásica resta una fracción de punto por cada error para que responder al azar no dé ventaja. Así se calcula, paso a paso.',
    updated: '2026-11-20',
    body: (
      <>
        <h2>La fórmula clásica</h2>
        <Formula>Puntuación = aciertos − errores ÷ (k − 1)</Formula>
        <p>
          Donde <b>k</b> es el número de opciones de cada pregunta. Las preguntas en blanco ni suman ni restan. Para pasar la puntuación a una nota sobre 10:
        </p>
        <Formula>Nota = puntuación ÷ nº de preguntas × 10</Formula>

        <h2>Cuánto resta cada error</h2>
        <table>
          <thead>
            <tr>
              <th>Opciones por pregunta</th>
              <th>Cada error resta</th>
              <th>Errores que anulan un acierto</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>3 (A–C)</td>
              <td>1/2 = 0,50</td>
              <td>2</td>
            </tr>
            <tr>
              <td>4 (A–D)</td>
              <td>1/3 ≈ 0,33</td>
              <td>3</td>
            </tr>
            <tr>
              <td>5 (A–E)</td>
              <td>1/4 = 0,25</td>
              <td>4</td>
            </tr>
          </tbody>
        </table>

        <h2>Ejemplo resuelto</h2>
        <p>Examen de 40 preguntas con 4 opciones. Un alumno tiene 28 aciertos, 9 errores y 3 en blanco.</p>
        <ul>
          <li>Penalización: 9 ÷ (4 − 1) = 3 puntos.</li>
          <li>Puntuación: 28 − 3 = 25.</li>
          <li>
            Nota: 25 ÷ 40 × 10 = <b>6,25</b>.
          </li>
        </ul>
        <p>Sin penalización, el mismo alumno tendría 28 ÷ 40 × 10 = 7,00.</p>

        <h2>Por qué se divide entre k − 1</h2>
        <p>
          Quien responde al azar una pregunta de 4 opciones acierta, de media, 1 de cada 4. Con la fórmula gana 1 punto una vez y pierde 1/3 las otras tres: 1 − 3 × 1/3 =
          0. Es decir, contestar a ciegas no sube ni baja la nota esperada. Si el alumno puede descartar alguna opción, arriesgar sí le compensa.
        </p>

        <h2>Casos que conviene decidir antes del examen</h2>
        <ul>
          <li>
            <b>Preguntas anuladas.</b> Lo habitual es que no puntúen para nadie y salgan del total: con una anulada, la nota se calcula sobre 39 preguntas, no sobre 40.
          </li>
          <li>
            <b>Preguntas con dos respuestas válidas.</b> Se acepta cualquiera de las dos como acierto.
          </li>
          <li>
            <b>Doble marca.</b> Suele contarse como error o como respuesta en blanco; indícalo en las instrucciones.
          </li>
          <li>
            <b>Nota mínima.</b> Con penalización la puntuación puede ser negativa; lo normal es dejar la nota mínima en 0.
          </li>
          <li>
            <b>Penalización distinta.</b> Algunas asignaturas restan una cantidad fija por error (por ejemplo 0,25) con independencia del número de opciones.
          </li>
        </ul>
        <p>
          En Korrige se elige entre sin penalización, fórmula clásica o penalización personalizada, y al anular una pregunta o cambiar la fórmula todas las notas se
          recalculan al instante.
        </p>
      </>
    ),
  },
  {
    slug: 'alternativa-zipgrade-fotocopiadora',
    title: 'Alternativa a ZipGrade: corrige con la fotocopiadora',
    description: 'Si corriges tests foto a foto con el móvil, hay otra forma: escanear todo el taco en la fotocopiadora y subir un único PDF. Cuándo conviene cada método.',
    h1: 'Una alternativa a ZipGrade: escanear el taco en la fotocopiadora',
    intro: 'Las apps de móvil como ZipGrade corrigen fotografiando cada hoja. Cuando los grupos son grandes, escanear todas las hojas de una vez cambia la cuenta.',
    updated: '2026-11-20',
    body: (
      <>
        <h2>Dos formas de capturar las hojas</h2>
        <p>
          ZipGrade es una aplicación para móvil y tableta que lee hojas de respuestas con la cámara: el profesor enfoca cada hoja y la app la corrige al momento. Es cómodo
          y no requiere más equipo que el teléfono.
        </p>
        <p>
          Korrige parte de otra idea: casi todos los centros tienen ya una fotocopiadora multifunción con alimentador automático. Se coloca el taco completo, la máquina lo
          escanea en un par de minutos y lo envía por correo como un único PDF. Ese PDF se sube a la plataforma y se leen todas las hojas de una vez.
        </p>

        <table>
          <thead>
            <tr>
              <th></th>
              <th>App de móvil (foto a foto)</th>
              <th>Korrige (escáner de la fotocopiadora)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Cómo se capturan las hojas</td>
              <td>Una foto por hoja, con la cámara</td>
              <td>Todo el taco en el alimentador, un solo PDF</td>
            </tr>
            <tr>
              <td>Dispositivo</td>
              <td>El móvil o la tableta del profesor</td>
              <td>La multifunción del centro y un navegador</td>
            </tr>
            <tr>
              <td>Con 150 hojas</td>
              <td>150 fotos</td>
              <td>Un escaneo</td>
            </tr>
            <tr>
              <td>Hoja de respuestas</td>
              <td>La de la aplicación</td>
              <td>La que genera Korrige para cada examen</td>
            </tr>
          </tbody>
        </table>

        <h2>Cuándo conviene cada método</h2>
        <ul>
          <li>
            <b>Grupos pequeños o corrección en el aula:</b> una app de móvil es rápida y suficiente.
          </li>
          <li>
            <b>Grupos grandes, varios grupos o exámenes finales:</b> escanear el taco ahorra el trabajo repetitivo y evita depender de la luz o del pulso.
          </li>
          <li>
            <b>Varios profesores de una misma facultad o academia:</b> ayuda que los exámenes estén en la organización y no en el teléfono de cada uno.
          </li>
        </ul>

        <h2>Qué añade Korrige al cambiar de método</h2>
        <ul>
          <li>Hasta 200 preguntas, de 3 a 5 opciones y hasta 4 modelos de examen.</li>
          <li>Cola de revisión con la imagen de cada marca dudosa y registro de todas las correcciones.</li>
          <li>Estadísticas por pregunta: dificultad, discriminación y análisis de distractores.</li>
          <li>Exportación a Excel y CSV para Moodle.</li>
          <li>La lectura se hace en el navegador del profesor y los datos se alojan en la Unión Europea.</li>
        </ul>
        <p className="text-sm text-slate-500">
          ZipGrade es una marca de su respectivo propietario. Korrige no tiene relación con ella; esta página compara dos formas de capturar las hojas, no evalúa ese
          producto.
        </p>
      </>
    ),
  },
];

export const articleBySlug = (slug: string | undefined) => ARTICLES.find((a) => a.slug === slug);
