/** Guía breve para el profesor: cómo imprimir y cómo escanear en la fotocopiadora. */
export default function Guide() {
  const H = ({ children }: { children: string }) => <h2 className="mt-8 text-lg font-semibold">{children}</h2>;
  return (
    <article className="mx-auto max-w-3xl text-[15px] leading-relaxed text-slate-700">
      <h1 className="text-2xl font-semibold text-slate-900">Guía rápida: imprimir y escanear</h1>
      <p className="mt-2">Cinco minutos de lectura para que la corrección salga bien a la primera.</p>

      <H>1. Imprimir las hojas</H>
      <ul className="mt-2 list-disc space-y-1.5 pl-6">
        <li>
          Descarga el PDF desde la pestaña <b>Hoja</b> del examen e imprímelo al <b>100 % («tamaño real»)</b>. Nunca uses «ajustar a página» ni «reducir para encajar»:
          cambia el tamaño de las burbujas.
        </li>
        <li>Papel A4 blanco normal, a una cara. Puedes imprimir una hoja y fotocopiarla, o pedir tantas copias como alumnos en el propio PDF.</li>
        <li>Cada examen tiene su propio código QR: no reutilices hojas de otro examen (la plataforma las detecta y las excluye).</li>
        <li>Si el examen tiene más de 100 preguntas, la hoja tiene 2 páginas: entrega las dos a cada alumno, sin grapar.</li>
      </ul>

      <H>2. Durante el examen</H>
      <ul className="mt-2 list-disc space-y-1.5 pl-6">
        <li>
          <b>Bolígrafo azul o negro.</b> El lápiz flojo puede leerse como «marca floja» y te tocará revisarlo.
        </li>
        <li>Rellenar la burbuja por completo; una sola respuesta por pregunta. Para rectificar: corrector (típex) y volver a marcar.</li>
        <li>El identificador se escribe en las casillas <b>y</b> se marca en las burbujas de debajo, un dígito por columna. Si hay modelos, hay que marcar el modelo.</li>
        <li>No escribir sobre las cuatro marcas negras de las esquinas ni sobre el QR. No doblar ni grapar la hoja.</li>
        <li>
          Plantilla de respuestas: puedes rellenar una hoja con las respuestas correctas, marcar la burbuja <b>«P» (solo profesorado)</b> y su modelo, y escanearla con las
          demás. Se detecta sola y no cuenta como alumno.
        </li>
      </ul>

      <H>3. Escanear en la fotocopiadora (Xerox AltaLink y similares)</H>
      <ol className="mt-2 list-decimal space-y-1.5 pl-6">
        <li>Quita grapas y clips, alisa las esquinas dobladas y coloca todo el taco en el alimentador automático de la parte superior. Da igual si alguna hoja va al revés.</li>
        <li>
          En la pantalla elige <b>Correo electrónico</b> (escanear a correo) y pon tu dirección.
        </li>
        <li>
          Ajustes recomendados: resolución <b>300 ppp</b>, <b>blanco y negro o escala de grises</b> (el color también funciona, pero el archivo pesa más), tamaño A4,{' '}
          <b>una cara</b> (salvo que hayas impreso a doble cara), formato <b>PDF</b> en un solo archivo.
        </li>
        <li>Pulsa Iniciar. Recibirás un único PDF con todas las hojas. Si el taco es muy grande, puedes hacerlo en varias tandas: se pueden subir varios PDF.</li>
      </ol>

      <H>4. Subir y revisar</H>
      <ul className="mt-2 list-disc space-y-1.5 pl-6">
        <li>
          Arrastra el PDF a la pestaña <b>Subir hojas</b>. La lectura se hace en tu ordenador (unos segundos por cada 10 hojas).
        </li>
        <li>
          En <b>Revisión</b> verás solo lo dudoso, con el recorte de la imagen: dobles marcas, marcas flojas, identificadores incompletos… Se resuelve con un clic o con
          el teclado, y todo queda registrado.
        </li>
        <li>
          En <b>Notas</b> puedes abrir la hoja de cualquier alumno, exportar a Excel o a Moodle y, cuando termines, cerrar el examen desde Resumen.
        </li>
      </ul>

      <H>Si algo sale mal</H>
      <ul className="mt-2 list-disc space-y-1.5 pl-6">
        <li>
          <b>«No se encuentran las 4 marcas de esquina»</b>: la hoja está doblada, cortada o se imprimió reducida. Vuelve a escanearla sola; si se imprimió con «ajustar a
          página», no se puede leer de forma fiable.
        </li>
        <li>
          <b>Muchas marcas flojas</b>: suele ser lápiz o un escaneo muy claro. Sube el contraste/oscuridad un punto en la fotocopiadora y repite.
        </li>
        <li>
          <b>«Hoja de otro examen»</b>: el QR no coincide. Comprueba que estás en el examen correcto.
        </li>
      </ul>
    </article>
  );
}
