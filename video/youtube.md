# Tutoriales de Korrige para YouTube

Generado con `node video/youtube.mjs` a partir de `video/tutoriales.mjs` (cada descripción tiene menos de
5000 caracteres y ningún `<` ni `>`, que YouTube no admite). Para cada vídeo: `<slug>.mp4`, la miniatura
`public/tutoriales/<slug>.jpg` y los subtítulos `public/tutoriales/<slug>.vtt` (castellano).

En todos: audiencia «No, no está hecho para niños», idioma Español (España), categoría Educación,
lista de reproducción «Aprende Korrige» y pantalla final al siguiente vídeo.

Cuando estén publicados, añade sus ids en `YT` (arriba de `video/youtube.mjs`) y vuelve a generar este
archivo para que la lista de la serie enlace a YouTube; y ponlos también en `src/tutorials.ts` (`youtubeId`).

## 1. Crear un examen

**Archivo:** `01-crear-examen.mp4` · descripción de 3258 caracteres

**Título**
```
Crear un examen y su hoja de respuestas | Tutorial Korrige 1/8
```
**Descripción**
```
Crea un examen tipo test, configura la hoja de respuestas (preguntas, opciones, modelos e identificador) y descárgala para imprimir. Tutorial 1 de 8 de la serie «Aprende Korrige», en menos de un minuto.

▶ PASO A PASO
0:00 Introducción
0:05 Exámenes: Entra en «Exámenes» y pulsa «Nuevo examen».
0:09 Datos del examen: Escribe el nombre del examen, la asignatura, el grupo y la convocatoria. Así lo encontrarás después.
0:16 Preguntas y opciones: En «Hoja de respuestas», indica el número de preguntas y cuántas opciones tiene cada una.
0:22 Modelos e identificador: Si haces varios modelos, elige cuántos. Y pon el identificador de tu centro, como el NIA, con sus dígitos.
0:30 Personaliza la hoja: Si quieres, añade el logotipo de tu centro y una nota, como la duración del examen.
0:36 La hoja, al momento: Pulsa «Crear examen». Korrige genera la hoja al momento, con su código QR.
0:42 Descarga e imprime: Descarga el PDF e imprímelo al 100 %, a tamaño real. Nunca con «ajustar a página».

❓ PREGUNTAS FRECUENTES
¿Puedo usar mis propias hojas?
No: la hoja la genera Korrige para cada examen, con su código QR y sus marcas de esquina. A cambio puedes configurar preguntas, opciones, modelos, identificador y cabecera, e imprimirla donde quieras.

¿Cuántas preguntas admite?
De 10 a 200 por examen. Hasta 100 caben en una página; a partir de ahí la hoja tiene dos páginas y Korrige las empareja por alumno.

¿Bolígrafo o lápiz?
Bolígrafo azul o negro, rellenando la burbuja entera. El lápiz blando suele funcionar, pero las marcas flojas se envían a revisión para que decidas tú.

📚 LA SERIE COMPLETA «APRENDE KORRIGE»
1. Crear un examen (y su hoja de respuestas) ← estás aquí
2. Añadir las respuestas (plantillas y modelos): https://korrige.es/tutoriales#02-plantilla-respuestas
3. Corregir las hojas (escanea y sube el PDF): https://korrige.es/tutoriales#03-subir-hojas
4. Revisar incidencias (solo lo dudoso): https://korrige.es/tutoriales#04-revisar-incidencias
5. Notas y exportación (Excel y Moodle): https://korrige.es/tutoriales#05-notas-exportar
6. Estadísticas (qué preguntas funcionan): https://korrige.es/tutoriales#06-estadisticas
7. Los alumnos se comprueban (publica las respuestas): https://korrige.es/tutoriales#07-alumnos-comprueban
8. Tu organización (profesores y valores por defecto): https://korrige.es/tutoriales#08-organizacion

⏭ Siguiente: Añadir las respuestas → https://korrige.es/tutoriales#02-plantilla-respuestas

✅ QUÉ ES KORRIGE
Korrige corrige exámenes tipo test con la impresora que ya tienes. Imprime la hoja de respuestas, escanea todo el taco de golpe en tu fotocopiadora y sube el PDF: Korrige lee todas las hojas, calcula las notas y te enseña solo lo que hay que revisar. Sin lectores ópticos, sin hojas especiales y sin fotos con el móvil.
Para universidades, facultades y academias: de 10 a 200 preguntas por examen, varios modelos, revisión con el recorte de cada hoja, estadísticas por pregunta y exportación a Excel o Moodle.

🎁 Tu primer examen es gratis, completo y sin tarjeta: https://korrige.es
🧪 Prueba la demo sin registrarte: https://korrige.es/demo
🎬 Todos los tutoriales: https://korrige.es/tutoriales
📄 Guía de impresión y escaneo: https://korrige.es/guia

#Korrige #ExamenesTipoTest #Profesores
```
**Etiquetas**
```
Korrige, corregir exámenes tipo test, corrección automática de exámenes, hoja de respuestas, plantilla de respuestas, lector óptico, OMR, examen tipo test, profesores, universidad, academias, Moodle, tutorial, crear un examen, exámenes, datos del examen, preguntas y opciones, modelos e identificador, personaliza la hoja, la hoja al momento, descarga e imprime
```

## 2. Añadir las respuestas

**Archivo:** `02-plantilla-respuestas.mp4` · descripción de 3245 caracteres

**Título**
```
Añadir las respuestas (plantillas y modelos) | Tutorial Korrige 2/8
```
**Descripción**
```
Introduce la plantilla de respuestas correctas, acepta varias respuestas o anula preguntas, y relaciona los modelos A y B. Tutorial 2 de 8 de la serie «Aprende Korrige», en menos de un minuto.

▶ PASO A PASO
0:00 Introducción
0:04 Abre «Plantillas»: Abre el examen y entra en la pestaña «Plantillas».
0:09 Marca las correctas: Haz clic en la respuesta correcta de cada pregunta. Abajo verás cuántas faltan por definir.
0:15 Varias válidas o anular: Si aceptas dos respuestas, marca las dos. Y si una pregunta está mal planteada, márcala como «Anular»: no puntuará para nadie.
0:25 Cada modelo, la suya: Si tienes varios modelos, cambia al modelo B y repite. Cada modelo tiene su propia plantilla.
0:32 Correspondencia: En «Correspondencia entre modelos», indica a qué pregunta del modelo A equivale cada una. Así las estadísticas cuadran.
0:41 Guarda y recalcula: Pulsa «Guardar plantilla». Cada cambio crea una versión nueva y recalcula todas las notas.

❓ PREGUNTAS FRECUENTES
¿Qué pasa si anulo una pregunta?
No puntúa para nadie y sale del cálculo: la nota se hace sobre las preguntas válidas. Todas las notas se recalculan al momento y la versión anterior de la plantilla se conserva.

¿Para qué sirve la correspondencia entre modelos?
Si el modelo B tiene las mismas preguntas en otro orden, le dices a qué pregunta del A equivale cada una. Así las estadísticas de cada pregunta suman a todos los alumnos, hicieran el modelo que hicieran.

¿Cuántas preguntas admite?
De 10 a 200 por examen. Hasta 100 caben en una página; a partir de ahí la hoja tiene dos páginas y Korrige las empareja por alumno.

📚 LA SERIE COMPLETA «APRENDE KORRIGE»
1. Crear un examen (y su hoja de respuestas): https://youtu.be/z6yr1sEGPXM
2. Añadir las respuestas (plantillas y modelos) ← estás aquí
3. Corregir las hojas (escanea y sube el PDF): https://korrige.es/tutoriales#03-subir-hojas
4. Revisar incidencias (solo lo dudoso): https://korrige.es/tutoriales#04-revisar-incidencias
5. Notas y exportación (Excel y Moodle): https://korrige.es/tutoriales#05-notas-exportar
6. Estadísticas (qué preguntas funcionan): https://korrige.es/tutoriales#06-estadisticas
7. Los alumnos se comprueban (publica las respuestas): https://korrige.es/tutoriales#07-alumnos-comprueban
8. Tu organización (profesores y valores por defecto): https://korrige.es/tutoriales#08-organizacion

⏭ Siguiente: Corregir las hojas → https://korrige.es/tutoriales#03-subir-hojas

✅ QUÉ ES KORRIGE
Korrige corrige exámenes tipo test con la impresora que ya tienes. Imprime la hoja de respuestas, escanea todo el taco de golpe en tu fotocopiadora y sube el PDF: Korrige lee todas las hojas, calcula las notas y te enseña solo lo que hay que revisar. Sin lectores ópticos, sin hojas especiales y sin fotos con el móvil.
Para universidades, facultades y academias: de 10 a 200 preguntas por examen, varios modelos, revisión con el recorte de cada hoja, estadísticas por pregunta y exportación a Excel o Moodle.

🎁 Tu primer examen es gratis, completo y sin tarjeta: https://korrige.es
🧪 Prueba la demo sin registrarte: https://korrige.es/demo
🎬 Todos los tutoriales: https://korrige.es/tutoriales
📄 Guía de impresión y escaneo: https://korrige.es/guia

#Korrige #ExamenesTipoTest #Profesores
```
**Etiquetas**
```
Korrige, corregir exámenes tipo test, corrección automática de exámenes, hoja de respuestas, plantilla de respuestas, lector óptico, OMR, examen tipo test, profesores, universidad, academias, Moodle, tutorial, añadir las respuestas, abre plantillas, marca las correctas, varias válidas o anular, cada modelo la suya, correspondencia, guarda y recalcula
```

## 3. Corregir las hojas

**Archivo:** `03-subir-hojas.mp4` · descripción de 3151 caracteres

**Título**
```
Corregir las hojas (escanea y sube el PDF) | Tutorial Korrige 3/8
```
**Descripción**
```
Importa la lista de clase, escanea todo el taco en la fotocopiadora y sube el PDF: Korrige lee las hojas y calcula las notas en segundos. Tutorial 3 de 8 de la serie «Aprende Korrige», en menos de un minuto.

▶ PASO A PASO
0:00 Introducción
0:05 Lista de alumnos: Antes, si quieres ver nombres en las notas, importa la lista de clase desde un CSV o un Excel.
0:13 Escanea el taco: Escanea todo el taco de golpe en la fotocopiadora: 300 ppp, sin grapas, y envíatelo por correo en un solo PDF.
0:22 Sube el PDF: En «Subir hojas», arrastra el PDF o pulsa «Elegir PDF». Da igual si alguna hoja va al revés.
0:30 Lectura en segundos: Las hojas se leen en tu ordenador, en segundos. El PDF no se envía a ningún servidor.
0:37 Resumen y guardar: Comprueba el resumen de la lectura y pulsa «Guardar».
0:41 Notas al momento: Las notas ya están calculadas. Lo dudoso queda en «Revisión», para que lo decidas tú.

❓ PREGUNTAS FRECUENTES
¿Qué escáner necesito?
Cualquier fotocopiadora o multifunción con alimentador automático que escanee a PDF (Xerox, Canon, Ricoh, Konica Minolta, HP…). Recomendamos 300 ppp en blanco y negro o escala de grises. También sirve un escáner de sobremesa.

¿Y si el escáner mete una hoja torcida o al revés?
Las cuatro marcas de las esquinas permiten enderezar cada hoja, y si está boca abajo se gira sola.

¿Dónde se leen las hojas?
En tu ordenador, en el navegador: el PDF no se envía a ningún servidor. Solo se guarda una imagen comprimida de cada hoja para la revisión.

📚 LA SERIE COMPLETA «APRENDE KORRIGE»
1. Crear un examen (y su hoja de respuestas): https://youtu.be/z6yr1sEGPXM
2. Añadir las respuestas (plantillas y modelos): https://korrige.es/tutoriales#02-plantilla-respuestas
3. Corregir las hojas (escanea y sube el PDF) ← estás aquí
4. Revisar incidencias (solo lo dudoso): https://korrige.es/tutoriales#04-revisar-incidencias
5. Notas y exportación (Excel y Moodle): https://korrige.es/tutoriales#05-notas-exportar
6. Estadísticas (qué preguntas funcionan): https://korrige.es/tutoriales#06-estadisticas
7. Los alumnos se comprueban (publica las respuestas): https://korrige.es/tutoriales#07-alumnos-comprueban
8. Tu organización (profesores y valores por defecto): https://korrige.es/tutoriales#08-organizacion

⏭ Siguiente: Revisar incidencias → https://korrige.es/tutoriales#04-revisar-incidencias

✅ QUÉ ES KORRIGE
Korrige corrige exámenes tipo test con la impresora que ya tienes. Imprime la hoja de respuestas, escanea todo el taco de golpe en tu fotocopiadora y sube el PDF: Korrige lee todas las hojas, calcula las notas y te enseña solo lo que hay que revisar. Sin lectores ópticos, sin hojas especiales y sin fotos con el móvil.
Para universidades, facultades y academias: de 10 a 200 preguntas por examen, varios modelos, revisión con el recorte de cada hoja, estadísticas por pregunta y exportación a Excel o Moodle.

🎁 Tu primer examen es gratis, completo y sin tarjeta: https://korrige.es
🧪 Prueba la demo sin registrarte: https://korrige.es/demo
🎬 Todos los tutoriales: https://korrige.es/tutoriales
📄 Guía de impresión y escaneo: https://korrige.es/guia

#Korrige #ExamenesTipoTest #Profesores
```
**Etiquetas**
```
Korrige, corregir exámenes tipo test, corrección automática de exámenes, hoja de respuestas, plantilla de respuestas, lector óptico, OMR, examen tipo test, profesores, universidad, academias, Moodle, tutorial, corregir las hojas, lista de alumnos, escanea el taco, sube el pdf, lectura en segundos, resumen y guardar, notas al momento
```

## 4. Revisar incidencias

**Archivo:** `04-revisar-incidencias.mp4` · descripción de 3153 caracteres

**Título**
```
Revisar incidencias (solo lo dudoso) | Tutorial Korrige 4/8
```
**Descripción**
```
Resuelve dobles marcas, marcas flojas e identificadores dudosos con el recorte de la hoja delante y atajos de teclado. Tutorial 4 de 8 de la serie «Aprende Korrige», en menos de un minuto.

▶ PASO A PASO
0:00 Introducción
0:05 Cola de revisión: En la pestaña «Revisión» tienes la cola de incidencias. El número indica cuántas quedan.
0:11 Filtra por tipo: Puedes filtrarlas por tipo: dobles marcas, marcas flojas, identificadores dudosos u hojas en blanco.
0:19 Doble marca: Cada incidencia muestra el recorte de la hoja. Aquí hay dos marcas: elige la buena, o déjala en blanco o nula.
0:27 Identificador dudoso: Si el identificador no está en la lista, corrígelo mirando los dígitos que escribió el alumno.
0:33 Atajos de teclado: Con el teclado va más rápido: de la A a la E para responder, Intro para aceptar y Suprimir para excluir la hoja.
0:41 Todo queda registrado: Las notas se recalculan solas y cada corrección queda registrada en «Actividad».

❓ PREGUNTAS FRECUENTES
¿Qué pasa si un alumno marca dos respuestas?
La pregunta va a la cola de revisión con el recorte de la imagen. Decides con un clic si cuenta una de las dos, se deja en blanco o es nula, y queda registrado.

¿Bolígrafo o lápiz?
Bolígrafo azul o negro, rellenando la burbuja entera. El lápiz blando suele funcionar, pero las marcas flojas se envían a revisión para que decidas tú.

¿Y si el escáner mete una hoja torcida o al revés?
Las cuatro marcas de las esquinas permiten enderezar cada hoja, y si está boca abajo se gira sola.

📚 LA SERIE COMPLETA «APRENDE KORRIGE»
1. Crear un examen (y su hoja de respuestas): https://youtu.be/z6yr1sEGPXM
2. Añadir las respuestas (plantillas y modelos): https://korrige.es/tutoriales#02-plantilla-respuestas
3. Corregir las hojas (escanea y sube el PDF): https://korrige.es/tutoriales#03-subir-hojas
4. Revisar incidencias (solo lo dudoso) ← estás aquí
5. Notas y exportación (Excel y Moodle): https://korrige.es/tutoriales#05-notas-exportar
6. Estadísticas (qué preguntas funcionan): https://korrige.es/tutoriales#06-estadisticas
7. Los alumnos se comprueban (publica las respuestas): https://korrige.es/tutoriales#07-alumnos-comprueban
8. Tu organización (profesores y valores por defecto): https://korrige.es/tutoriales#08-organizacion

⏭ Siguiente: Notas y exportación → https://korrige.es/tutoriales#05-notas-exportar

✅ QUÉ ES KORRIGE
Korrige corrige exámenes tipo test con la impresora que ya tienes. Imprime la hoja de respuestas, escanea todo el taco de golpe en tu fotocopiadora y sube el PDF: Korrige lee todas las hojas, calcula las notas y te enseña solo lo que hay que revisar. Sin lectores ópticos, sin hojas especiales y sin fotos con el móvil.
Para universidades, facultades y academias: de 10 a 200 preguntas por examen, varios modelos, revisión con el recorte de cada hoja, estadísticas por pregunta y exportación a Excel o Moodle.

🎁 Tu primer examen es gratis, completo y sin tarjeta: https://korrige.es
🧪 Prueba la demo sin registrarte: https://korrige.es/demo
🎬 Todos los tutoriales: https://korrige.es/tutoriales
📄 Guía de impresión y escaneo: https://korrige.es/guia

#Korrige #ExamenesTipoTest #Profesores
```
**Etiquetas**
```
Korrige, corregir exámenes tipo test, corrección automática de exámenes, hoja de respuestas, plantilla de respuestas, lector óptico, OMR, examen tipo test, profesores, universidad, academias, Moodle, tutorial, revisar incidencias, cola de revisión, filtra por tipo, doble marca, identificador dudoso, atajos de teclado, todo queda registrado
```

## 5. Notas y exportación

**Archivo:** `05-notas-exportar.mp4` · descripción de 3196 caracteres

**Título**
```
Notas y exportación (Excel y Moodle) | Tutorial Korrige 5/8
```
**Descripción**
```
Consulta las notas, abre la hoja escaneada de cada alumno, corrige a mano, exporta a Excel o Moodle y cierra el examen. Tutorial 5 de 8 de la serie «Aprende Korrige», en menos de un minuto.

▶ PASO A PASO
0:00 Introducción
0:05 Tabla de notas: En «Notas» ves a cada alumno con sus aciertos, errores, preguntas en blanco y la nota final.
0:12 Busca y filtra: Busca por nombre o identificador, o filtra por modelo y por estado.
0:17 La hoja de cada alumno: Haz clic en un alumno para ver su hoja escaneada, con cada respuesta comparada con la plantilla.
0:23 Corrige a mano: Si algo no cuadra, haz clic en la respuesta para corregirla. Queda registrado.
0:29 Excel y Moodle: Exporta las notas a Excel, o en un CSV listo para importar en Moodle.
0:35 Cierra el examen: Al terminar, cierra el examen desde «Resumen»: queda en solo lectura, y puedes reabrirlo si lo necesitas.

❓ PREGUNTAS FRECUENTES
¿Se integra con Moodle?
Exporta un CSV que se importa directamente en el calificador de Moodle (por número de ID o por email). También un Excel completo con las respuestas de cada alumno. Si necesitáis una conexión directa con vuestro Moodle o vuestra intranet, la hacemos a medida con Korrige Academy.

¿Qué pasa al cerrar el examen?
Queda en solo lectura: nadie puede cambiar notas ni plantillas por error. Si hace falta, se reabre desde el Resumen.

¿Qué pasa si un alumno marca dos respuestas?
La pregunta va a la cola de revisión con el recorte de la imagen. Decides con un clic si cuenta una de las dos, se deja en blanco o es nula, y queda registrado.

📚 LA SERIE COMPLETA «APRENDE KORRIGE»
1. Crear un examen (y su hoja de respuestas): https://youtu.be/z6yr1sEGPXM
2. Añadir las respuestas (plantillas y modelos): https://korrige.es/tutoriales#02-plantilla-respuestas
3. Corregir las hojas (escanea y sube el PDF): https://korrige.es/tutoriales#03-subir-hojas
4. Revisar incidencias (solo lo dudoso): https://korrige.es/tutoriales#04-revisar-incidencias
5. Notas y exportación (Excel y Moodle) ← estás aquí
6. Estadísticas (qué preguntas funcionan): https://korrige.es/tutoriales#06-estadisticas
7. Los alumnos se comprueban (publica las respuestas): https://korrige.es/tutoriales#07-alumnos-comprueban
8. Tu organización (profesores y valores por defecto): https://korrige.es/tutoriales#08-organizacion

⏭ Siguiente: Estadísticas → https://korrige.es/tutoriales#06-estadisticas

✅ QUÉ ES KORRIGE
Korrige corrige exámenes tipo test con la impresora que ya tienes. Imprime la hoja de respuestas, escanea todo el taco de golpe en tu fotocopiadora y sube el PDF: Korrige lee todas las hojas, calcula las notas y te enseña solo lo que hay que revisar. Sin lectores ópticos, sin hojas especiales y sin fotos con el móvil.
Para universidades, facultades y academias: de 10 a 200 preguntas por examen, varios modelos, revisión con el recorte de cada hoja, estadísticas por pregunta y exportación a Excel o Moodle.

🎁 Tu primer examen es gratis, completo y sin tarjeta: https://korrige.es
🧪 Prueba la demo sin registrarte: https://korrige.es/demo
🎬 Todos los tutoriales: https://korrige.es/tutoriales
📄 Guía de impresión y escaneo: https://korrige.es/guia

#Korrige #ExamenesTipoTest #Profesores
```
**Etiquetas**
```
Korrige, corregir exámenes tipo test, corrección automática de exámenes, hoja de respuestas, plantilla de respuestas, lector óptico, OMR, examen tipo test, profesores, universidad, academias, Moodle, tutorial, notas y exportación, tabla de notas, busca y filtra, la hoja de cada alumno, corrige a mano, excel y moodle, cierra el examen
```

## 6. Estadísticas

**Archivo:** `06-estadisticas.mp4` · descripción de 3365 caracteres

**Título**
```
Estadísticas (qué preguntas funcionan) | Tutorial Korrige 6/8
```
**Descripción**
```
Lee el resultado del examen, la distribución de notas y la dificultad y discriminación de cada pregunta; anula las que fallan. Tutorial 6 de 8 de la serie «Aprende Korrige», en menos de un minuto.

▶ PASO A PASO
0:00 Introducción
0:05 Resultado del examen: En «Estadísticas» tienes el resumen: presentados, aprobados, nota media, mediana y dispersión.
0:13 Distribución de notas: El histograma muestra cómo se reparten las notas de la clase.
0:17 Calidad de las preguntas: Cada pregunta tiene su dificultad y su discriminación: si distingue a quien domina la materia de quien no.
0:24 Análisis por pregunta: En el análisis por pregunta, filtra las problemáticas. Verás qué opción eligió cada alumno.
0:31 Revisa la clave: Si una opción incorrecta supera a la correcta, revisa la clave y el enunciado.
0:36 Anula y recalcula: Si la pregunta estaba mal, anúlala en «Plantillas». Las notas se recalculan al momento.

❓ PREGUNTAS FRECUENTES
¿Cómo se leen la dificultad y la discriminación?
Dificultad: porcentaje de alumnos que aciertan. Fácil, 80 % o más; media, entre 50 y 80 %; difícil, menos del 50 %. Discriminación: si la aciertan más los que mejor nota sacan. Buena desde 0,30; baja por debajo de 0,20; negativa, revisa la pregunta.

¿Qué pasa si anulo una pregunta?
No puntúa para nadie y sale del cálculo: la nota se hace sobre las preguntas válidas. Todas las notas se recalculan al momento y la versión anterior de la plantilla se conserva.

¿Para qué sirve la correspondencia entre modelos?
Si el modelo B tiene las mismas preguntas en otro orden, le dices a qué pregunta del A equivale cada una. Así las estadísticas de cada pregunta suman a todos los alumnos, hicieran el modelo que hicieran.

📚 LA SERIE COMPLETA «APRENDE KORRIGE»
1. Crear un examen (y su hoja de respuestas): https://youtu.be/z6yr1sEGPXM
2. Añadir las respuestas (plantillas y modelos): https://korrige.es/tutoriales#02-plantilla-respuestas
3. Corregir las hojas (escanea y sube el PDF): https://korrige.es/tutoriales#03-subir-hojas
4. Revisar incidencias (solo lo dudoso): https://korrige.es/tutoriales#04-revisar-incidencias
5. Notas y exportación (Excel y Moodle): https://korrige.es/tutoriales#05-notas-exportar
6. Estadísticas (qué preguntas funcionan) ← estás aquí
7. Los alumnos se comprueban (publica las respuestas): https://korrige.es/tutoriales#07-alumnos-comprueban
8. Tu organización (profesores y valores por defecto): https://korrige.es/tutoriales#08-organizacion

⏭ Siguiente: Los alumnos se comprueban → https://korrige.es/tutoriales#07-alumnos-comprueban

✅ QUÉ ES KORRIGE
Korrige corrige exámenes tipo test con la impresora que ya tienes. Imprime la hoja de respuestas, escanea todo el taco de golpe en tu fotocopiadora y sube el PDF: Korrige lee todas las hojas, calcula las notas y te enseña solo lo que hay que revisar. Sin lectores ópticos, sin hojas especiales y sin fotos con el móvil.
Para universidades, facultades y academias: de 10 a 200 preguntas por examen, varios modelos, revisión con el recorte de cada hoja, estadísticas por pregunta y exportación a Excel o Moodle.

🎁 Tu primer examen es gratis, completo y sin tarjeta: https://korrige.es
🧪 Prueba la demo sin registrarte: https://korrige.es/demo
🎬 Todos los tutoriales: https://korrige.es/tutoriales
📄 Guía de impresión y escaneo: https://korrige.es/guia

#Korrige #ExamenesTipoTest #Profesores
```
**Etiquetas**
```
Korrige, corregir exámenes tipo test, corrección automática de exámenes, hoja de respuestas, plantilla de respuestas, lector óptico, OMR, examen tipo test, profesores, universidad, academias, Moodle, tutorial, estadísticas, resultado del examen, distribución de notas, calidad de las preguntas, análisis por pregunta, revisa la clave, anula y recalcula
```

## 7. Los alumnos se comprueban

**Archivo:** `07-alumnos-comprueban.mp4` · descripción de 3498 caracteres

**Título**
```
Los alumnos se comprueban (publica las respuestas) | Tutorial Korrige 7/8
```
**Descripción**
```
Publica las respuestas correctas con un código para que cada alumno se compruebe en korrige.es/comprobar, con calculadora de nota opcional. Tutorial 7 de 8 de la serie «Aprende Korrige», en menos de un minuto.

▶ PASO A PASO
0:00 Introducción
0:05 Que anoten sus respuestas: Durante el examen, pídeles que anoten sus respuestas en el cuadernillo que se llevan.
0:10 Publica las respuestas: En el «Resumen» del examen, marca «Publicar las respuestas correctas».
0:16 ¿Cuándo se ven?: Elige si se ven desde ahora o a partir de una fecha y hora.
0:21 Código para los alumnos: Usa el código del examen o elige uno tuyo, fácil de recordar.
0:27 Calculadora de nota: Si quieres, ofrece la calculadora de nota: el alumno marca lo que contestó y ve su nota estimada.
0:34 Comparte el enlace: Pulsa «Publicar» y comparte el código o el enlace.
0:39 Entra con el código: El alumno entra en korrige.es/comprobar, escribe el código y elige su modelo.
0:45 Se comprueba: Ve las respuestas correctas y calcula su nota. Sin cuenta, y sin ver datos de nadie.

❓ PREGUNTAS FRECUENTES
¿Pueden los alumnos comprobar sus respuestas?
Sí, si tú quieres. Publicas las respuestas correctas, desde ya o a partir de una fecha y hora, y das a los alumnos un código. Entran en korrige.es/comprobar, eligen su modelo y se comprueban con lo que anotaron en su cuadernillo; opcionalmente calculan su nota estimada. No necesitan cuenta y no se muestran notas ni datos de nadie.

¿Puedo retirar la publicación?
Cuando quieras, también con el examen cerrado. Si corriges la plantilla o anulas una pregunta después de publicar, los alumnos ven la versión actualizada con un aviso.

¿Qué pasa si anulo una pregunta?
No puntúa para nadie y sale del cálculo: la nota se hace sobre las preguntas válidas. Todas las notas se recalculan al momento y la versión anterior de la plantilla se conserva.

📚 LA SERIE COMPLETA «APRENDE KORRIGE»
1. Crear un examen (y su hoja de respuestas): https://youtu.be/z6yr1sEGPXM
2. Añadir las respuestas (plantillas y modelos): https://korrige.es/tutoriales#02-plantilla-respuestas
3. Corregir las hojas (escanea y sube el PDF): https://korrige.es/tutoriales#03-subir-hojas
4. Revisar incidencias (solo lo dudoso): https://korrige.es/tutoriales#04-revisar-incidencias
5. Notas y exportación (Excel y Moodle): https://korrige.es/tutoriales#05-notas-exportar
6. Estadísticas (qué preguntas funcionan): https://korrige.es/tutoriales#06-estadisticas
7. Los alumnos se comprueban (publica las respuestas) ← estás aquí
8. Tu organización (profesores y valores por defecto): https://korrige.es/tutoriales#08-organizacion

⏭ Siguiente: Tu organización → https://korrige.es/tutoriales#08-organizacion

✅ QUÉ ES KORRIGE
Korrige corrige exámenes tipo test con la impresora que ya tienes. Imprime la hoja de respuestas, escanea todo el taco de golpe en tu fotocopiadora y sube el PDF: Korrige lee todas las hojas, calcula las notas y te enseña solo lo que hay que revisar. Sin lectores ópticos, sin hojas especiales y sin fotos con el móvil.
Para universidades, facultades y academias: de 10 a 200 preguntas por examen, varios modelos, revisión con el recorte de cada hoja, estadísticas por pregunta y exportación a Excel o Moodle.

🎁 Tu primer examen es gratis, completo y sin tarjeta: https://korrige.es
🧪 Prueba la demo sin registrarte: https://korrige.es/demo
🎬 Todos los tutoriales: https://korrige.es/tutoriales
📄 Guía de impresión y escaneo: https://korrige.es/guia

#Korrige #ExamenesTipoTest #Profesores
```
**Etiquetas**
```
Korrige, corregir exámenes tipo test, corrección automática de exámenes, hoja de respuestas, plantilla de respuestas, lector óptico, OMR, examen tipo test, profesores, universidad, academias, Moodle, tutorial, los alumnos se comprueban, que anoten sus respuestas, publica las respuestas, cuándo se ven, código para los alumnos, calculadora de nota, comparte el enlace, entra con el código, se comprueba
```

## 8. Tu organización

**Archivo:** `08-organizacion.mp4` · descripción de 3272 caracteres

**Título**
```
Tu organización (profesores y valores por defecto) | Tutorial Korrige 8/8
```
**Descripción**
```
Invita a los profesores de tu centro o academia, define los valores por defecto de los exámenes y comparte exámenes entre colegas. Tutorial 8 de 8 de la serie «Aprende Korrige», en menos de un minuto.

▶ PASO A PASO
0:00 Introducción
0:05 Profesores: En «Organización» ves a los profesores, con sus exámenes, hojas leídas y última actividad.
0:12 Invita por email: Para sumar a alguien, escribe su email y pulsa «Invitar». Recibirá un correo con el enlace de registro.
0:19 Roles: Elige su rol: profesor o administrador. Los administradores ven todos los exámenes de la organización.
0:27 Valores por defecto: En «Valores por defecto» define el logotipo, el título de la hoja y el identificador de tu centro.
0:34 Fórmula de corrección: Y la fórmula de corrección. Se aplicará a cada examen nuevo.
0:39 Comparte un examen: Para preparar un examen entre varios, compártelo desde su «Resumen» con otro profesor.
0:45 Protección de datos: Y decide cuántos meses se guardan las imágenes de las hojas una vez cerrado el examen.

❓ PREGUNTAS FRECUENTES
¿Qué puede hacer un profesor con quien comparto un examen?
Todo menos borrarlo o volver a compartirlo. Los administradores de la organización ven todos los exámenes.

¿Qué se borra al vencer la conservación?
Las imágenes de las hojas. Las notas y las respuestas se conservan.

¿Se integra con Moodle?
Exporta un CSV que se importa directamente en el calificador de Moodle (por número de ID o por email). También un Excel completo con las respuestas de cada alumno. Si necesitáis una conexión directa con vuestro Moodle o vuestra intranet, la hacemos a medida con Korrige Academy.

📚 LA SERIE COMPLETA «APRENDE KORRIGE»
1. Crear un examen (y su hoja de respuestas): https://youtu.be/z6yr1sEGPXM
2. Añadir las respuestas (plantillas y modelos): https://korrige.es/tutoriales#02-plantilla-respuestas
3. Corregir las hojas (escanea y sube el PDF): https://korrige.es/tutoriales#03-subir-hojas
4. Revisar incidencias (solo lo dudoso): https://korrige.es/tutoriales#04-revisar-incidencias
5. Notas y exportación (Excel y Moodle): https://korrige.es/tutoriales#05-notas-exportar
6. Estadísticas (qué preguntas funcionan): https://korrige.es/tutoriales#06-estadisticas
7. Los alumnos se comprueban (publica las respuestas): https://korrige.es/tutoriales#07-alumnos-comprueban
8. Tu organización (profesores y valores por defecto) ← estás aquí

⏮ ¿Te lo has perdido? Empieza por el primero → https://youtu.be/z6yr1sEGPXM

✅ QUÉ ES KORRIGE
Korrige corrige exámenes tipo test con la impresora que ya tienes. Imprime la hoja de respuestas, escanea todo el taco de golpe en tu fotocopiadora y sube el PDF: Korrige lee todas las hojas, calcula las notas y te enseña solo lo que hay que revisar. Sin lectores ópticos, sin hojas especiales y sin fotos con el móvil.
Para universidades, facultades y academias: de 10 a 200 preguntas por examen, varios modelos, revisión con el recorte de cada hoja, estadísticas por pregunta y exportación a Excel o Moodle.

🎁 Tu primer examen es gratis, completo y sin tarjeta: https://korrige.es
🧪 Prueba la demo sin registrarte: https://korrige.es/demo
🎬 Todos los tutoriales: https://korrige.es/tutoriales
📄 Guía de impresión y escaneo: https://korrige.es/guia

#Korrige #ExamenesTipoTest #Profesores
```
**Etiquetas**
```
Korrige, corregir exámenes tipo test, corrección automática de exámenes, hoja de respuestas, plantilla de respuestas, lector óptico, OMR, examen tipo test, profesores, universidad, academias, Moodle, tutorial, tu organización, profesores, invita por email, roles, valores por defecto, fórmula de corrección, comparte un examen, protección de datos
```
