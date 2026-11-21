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
  {
    slug: 'plantilla-hoja-de-respuestas-tipo-test',
    title: 'Plantilla de hoja de respuestas tipo test en PDF',
    description: 'Crea gratis una hoja de respuestas tipo test en PDF: de 10 a 200 preguntas, 3 a 5 opciones, varios modelos y lista para corregir automáticamente.',
    h1: 'Plantilla de hoja de respuestas tipo test en PDF',
    intro: 'Una hoja de respuestas bien diseñada ahorra horas de corrección. Estas son las claves para hacer la tuya y cómo generarla gratis, a medida de tu examen.',
    updated: '2026-11-21',
    body: (
      <>
        <h2>Qué debe tener una hoja de respuestas</h2>
        <ul>
          <li>
            <b>Una burbuja por opción</b> (A, B, C, D…), todas del mismo tamaño y bien separadas, para que una marca no invada la de al lado.
          </li>
          <li>
            <b>Preguntas numeradas en columnas</b> de 25, que es lo que cabe con comodidad en un A4: 100 preguntas por cara.
          </li>
          <li>
            <b>Identificador del alumno en burbujas</b>: un dígito por columna. Escribirlo además a mano permite comprobarlo si se equivoca al marcar.
          </li>
          <li>
            <b>Espacio para nombre, asignatura y fecha</b>, e instrucciones breves de cómo marcar y cómo rectificar.
          </li>
          <li>
            <b>Modelo de examen</b>, si repartes varias versiones con las preguntas en distinto orden.
          </li>
          <li>
            <b>Marcas en las cuatro esquinas y un código del examen</b> si la vas a corregir de forma automática.
          </li>
        </ul>

        <h2>Por qué no conviene una plantilla genérica</h2>
        <p>
          Una plantilla en Word o un PDF descargado de internet sirve para corregir a mano, pero tiene dos problemas. El primero es que nunca encaja: sobran preguntas,
          faltan opciones o el identificador no tiene los dígitos de tu centro. El segundo es que un programa no puede leerla, porque no sabe en qué punto exacto de la
          página está cada burbuja ni a qué examen pertenece la hoja.
        </p>
        <p>Por eso lo más práctico es generar la hoja a partir de los datos de tu examen: sale ajustada y, además, queda preparada para la corrección automática.</p>

        <h2>Cómo crear tu hoja de respuestas gratis</h2>
        <ol>
          <li>Crea una cuenta en Korrige. El primer examen es gratis y completo, sin tarjeta.</li>
          <li>Indica el número de preguntas (de 10 a 200), las opciones por pregunta (3, 4 o 5) y cuántos modelos hay (hasta 4).</li>
          <li>Elige el identificador del alumno: NIA, DNI, número de expediente o el que uses, de 6 a 10 dígitos.</li>
          <li>Si quieres, añade el logotipo del centro, el título y una nota breve (duración, penalización…).</li>
          <li>Descarga el PDF e imprímelo. Con más de 100 preguntas la hoja ocupa dos páginas.</li>
        </ol>

        <h2>Tamaños habituales</h2>
        <table>
          <thead>
            <tr>
              <th>Examen</th>
              <th>Preguntas</th>
              <th>Opciones</th>
              <th>Páginas</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Parcial de universidad</td>
              <td>30–60</td>
              <td>4</td>
              <td>1</td>
            </tr>
            <tr>
              <td>Examen final</td>
              <td>80–100</td>
              <td>4 o 5</td>
              <td>1</td>
            </tr>
            <tr>
              <td>Simulacro de oposición</td>
              <td>100–150</td>
              <td>4</td>
              <td>1 o 2</td>
            </tr>
            <tr>
              <td>Simulacro tipo MIR o EIR</td>
              <td>hasta 200</td>
              <td>4</td>
              <td>2</td>
            </tr>
          </tbody>
        </table>

        <h2>Consejos de impresión</h2>
        <ul>
          <li>
            Imprime siempre al <b>100 % («tamaño real»)</b>. Con «ajustar a página» la hoja se encoge y las burbujas dejan de estar donde el programa las espera.
          </li>
          <li>Usa papel blanco normal de 80 g. Las fotocopias de fotocopias pierden contraste: imprime desde el PDF original.</li>
          <li>Pide que marquen con bolígrafo azul o negro y que rellenen la burbuja entera.</li>
          <li>No grapes la hoja de respuestas al examen: después hay que pasarla por el alimentador del escáner.</li>
        </ul>
      </>
    ),
  },
  {
    slug: 'corregir-simulacros-oposiciones',
    title: 'Cómo corregir simulacros de oposiciones tipo test',
    description: 'Cómo corregir rápido los simulacros tipo test de una academia de oposiciones: penalización, preguntas de reserva, anulaciones y análisis por pregunta.',
    h1: 'Cómo corregir simulacros de oposiciones tipo test',
    intro: 'Un simulacro solo sirve si el opositor recibe pronto su nota y sabe en qué ha fallado. Así se organiza la corrección para que no dependa de una tarde libre del preparador.',
    updated: '2026-11-21',
    body: (
      <>
        <h2>Corrige con las reglas de la convocatoria</h2>
        <p>
          La nota de un simulacro tiene que parecerse a la del examen real. Antes de corregir, revisa las bases de la convocatoria y aplica exactamente lo mismo:
        </p>
        <ul>
          <li>
            <b>Penalización por error.</b> Lo más frecuente con cuatro opciones es que cada error reste un tercio de un acierto, pero hay convocatorias que restan un
            cuarto, otras la mitad y otras que no penalizan.
          </li>
          <li>
            <b>Preguntas en blanco.</b> Normalmente ni suman ni restan.
          </li>
          <li>
            <b>Preguntas de reserva.</b> Solo cuentan si se anula alguna de las ordinarias, y en el orden que fijen las bases.
          </li>
          <li>
            <b>Nota de corte.</b> Algunas convocatorias exigen una puntuación mínima; otras aprueban a los mejores hasta cubrir plazas.
          </li>
        </ul>
        <Formula>Nota = (aciertos − errores × penalización) ÷ n.º de preguntas × nota máxima</Formula>

        <h2>El proceso, paso a paso</h2>
        <ol>
          <li>
            <b>Prepara la hoja de respuestas</b> con el número de preguntas del simulacro, incluidas las de reserva, y el identificador de tus alumnos.
          </li>
          <li>
            <b>Haz el simulacro en condiciones reales</b>: mismo tiempo, misma hoja de respuestas separada del cuadernillo y bolígrafo.
          </li>
          <li>
            <b>Escanea todas las hojas de una vez</b> en el alimentador de la fotocopiadora y envíate el PDF.
          </li>
          <li>
            <b>Revisa las hojas dudosas</b>: dobles marcas, marcas flojas e identificadores mal rellenados.
          </li>
          <li>
            <b>Publica las notas el mismo día</b> y reserva la clase siguiente para las preguntas más falladas.
          </li>
        </ol>

        <h2>Qué hacer con las preguntas impugnadas</h2>
        <p>
          En los simulacros, como en los exámenes reales, aparecen preguntas ambiguas o con la respuesta mal puesta en la plantilla. Si corriges a mano, anular una pregunta
          obliga a repasar todas las hojas. Con una corrección automática basta con marcarla como anulada o corregir la plantilla: las notas de todos los alumnos se
          recalculan solas.
        </p>

        <h2>Los datos que ayudan a preparar mejor</h2>
        <ul>
          <li>
            <b>Preguntas más falladas</b>: señalan los temas que el grupo no domina.
          </li>
          <li>
            <b>Distractor más elegido</b>: si la mayoría elige la misma opción incorrecta, hay un concepto mal entendido que conviene explicar en clase.
          </li>
          <li>
            <b>Preguntas en blanco</b>: muchas en blanco al final del examen indican un problema de tiempo, no de conocimiento.
          </li>
          <li>
            <b>Evolución de cada alumno</b> de un simulacro a otro, más útil que la nota aislada.
          </li>
        </ul>

        <h2>Cuánto tiempo se ahorra</h2>
        <p>
          Corregir a mano una hoja de 100 preguntas con plantilla perforada lleva entre dos y tres minutos, sin contar la suma ni el traslado de notas. Con 120 alumnos son
          varias horas por simulacro. Escaneando el taco entero, el tiempo no depende del número de hojas: unos minutos de escáner y la revisión de los casos dudosos.
        </p>
      </>
    ),
  },
  {
    slug: 'analisis-de-items-dificultad-discriminacion',
    title: 'Análisis de ítems: dificultad y discriminación',
    description: 'Qué son el índice de dificultad y el de discriminación de una pregunta tipo test, cómo se calculan y cómo usarlos para detectar preguntas defectuosas.',
    h1: 'Análisis de ítems: índice de dificultad y de discriminación',
    intro: 'Dos números por pregunta bastan para saber si un examen tipo test ha medido bien: cuántos la aciertan y si la aciertan los que más saben.',
    updated: '2026-11-21',
    body: (
      <>
        <h2>Índice de dificultad</h2>
        <p>Es la proporción de alumnos que acierta la pregunta. A pesar del nombre, cuanto más alto, más fácil es la pregunta.</p>
        <Formula>p = alumnos que aciertan ÷ alumnos que se presentan</Formula>
        <table>
          <thead>
            <tr>
              <th>Valor de p</th>
              <th>Interpretación</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>más de 0,85</td>
              <td>Muy fácil: casi todos la aciertan y apenas distingue entre alumnos</td>
            </tr>
            <tr>
              <td>0,50 – 0,85</td>
              <td>Dificultad adecuada para la mayoría de los exámenes</td>
            </tr>
            <tr>
              <td>0,25 – 0,50</td>
              <td>Difícil</td>
            </tr>
            <tr>
              <td>menos de 0,25</td>
              <td>Muy difícil: con cuatro opciones, equivale a responder al azar</td>
            </tr>
          </tbody>
        </table>
        <p>Los umbrales son orientativos: dependen del número de opciones y de la finalidad del examen.</p>

        <h2>Índice de discriminación</h2>
        <p>
          Mide si la pregunta separa a los alumnos que dominan la materia de los que no. La forma más sencilla de calcularlo es comparar el grupo con mejores notas y el
          grupo con peores notas, normalmente el 27 % superior y el 27 % inferior:
        </p>
        <Formula>D = p (grupo superior) − p (grupo inferior)</Formula>
        <p>
          Otra forma habitual es la correlación entre acertar la pregunta y la nota del resto del examen (correlación biserial puntual). Las dos se interpretan de manera
          parecida:
        </p>
        <table>
          <thead>
            <tr>
              <th>Valor de D</th>
              <th>Interpretación</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>0,40 o más</td>
              <td>Muy buena pregunta</td>
            </tr>
            <tr>
              <td>0,30 – 0,39</td>
              <td>Buena</td>
            </tr>
            <tr>
              <td>0,20 – 0,29</td>
              <td>Aceptable, mejorable</td>
            </tr>
            <tr>
              <td>0 – 0,19</td>
              <td>Discrimina poco: conviene revisarla</td>
            </tr>
            <tr>
              <td>negativo</td>
              <td>La aciertan más los que peor nota sacan: casi siempre hay un error</td>
            </tr>
          </tbody>
        </table>

        <h2>Un ejemplo</h2>
        <p>
          En un examen con 100 alumnos, la pregunta 12 la aciertan 62. Su dificultad es p = 0,62. Entre los 27 mejores la aciertan 24 (0,89) y entre los 27 peores, 9
          (0,33). Su discriminación es D = 0,89 − 0,33 = 0,56: una pregunta de dificultad media que distingue muy bien.
        </p>

        <h2>Señales de una pregunta defectuosa</h2>
        <ul>
          <li>
            <b>Discriminación negativa.</b> Revisa primero la plantilla: lo más habitual es que la respuesta marcada como correcta no lo sea.
          </li>
          <li>
            <b>Un distractor elegido más que la respuesta correcta.</b> El enunciado puede ser ambiguo o haber dos respuestas defendibles.
          </li>
          <li>
            <b>Dificultad por debajo del azar.</b> Si con cuatro opciones acierta menos del 25 %, algo induce al error.
          </li>
          <li>
            <b>Distractores que nadie elige.</b> No hacen daño a la nota, pero convierten la pregunta en una de menos opciones.
          </li>
        </ul>

        <h2>Qué hacer después</h2>
        <p>
          Si la plantilla estaba mal, se corrige y se recalculan las notas. Si la pregunta es ambigua, lo habitual es anularla para todos, o dar por buenas dos respuestas.
          Y en todos los casos, anota el resultado en tu banco de preguntas: al cabo de dos o tres cursos tendrás un examen mucho más fiable.
        </p>
        <p>
          Korrige calcula la dificultad y la discriminación de cada pregunta al corregir, muestra qué eligió el grupo y avisa de las preguntas sospechosas. Anular una
          pregunta o cambiar la plantilla recalcula todas las notas sin volver a escanear.
        </p>
      </>
    ),
  },
];

export const articleBySlug = (slug: string | undefined) => ARTICLES.find((a) => a.slug === slug);
