# Vídeos tutoriales

Serie de 8 vídeos cortos (≈ 1 min, 1080p) que enseñan Korrige paso a paso. Se publican en YouTube y
en la web (`/tutoriales` y, dentro de la aplicación, `/app/tutoriales`).

| # | Vídeo | Qué enseña |
|---|---|---|
| 1 | `01-crear-examen` | Crear el examen y descargar la hoja de respuestas |
| 2 | `02-plantilla-respuestas` | Plantilla de respuestas, anular preguntas, modelos y correspondencia |
| 3 | `03-subir-hojas` | Lista de alumnos, escaneo, subida del PDF y lectura |
| 4 | `04-revisar-incidencias` | Cola de revisión, dobles marcas, identificadores, atajos |
| 5 | `05-notas-exportar` | Notas, hoja de cada alumno, corrección a mano, Excel/Moodle, cerrar |
| 6 | `06-estadisticas` | Resultado, histograma, dificultad/discriminación, anular |
| 7 | `07-alumnos-comprueban` | Publicar respuestas y página del alumno (`/comprobar`) |
| 8 | `08-organizacion` | Profesores, invitaciones, roles, valores por defecto, retención |

## Cómo se hacen

Todo sale de **`tutoriales.mjs`**: capítulos (la lista de la izquierda) y escenas (subtítulo, texto de la
voz y captura de cada paso).

1. **Voz** (`audio/<slug>.mp3`): ElevenLabs, voz **«Cristina - Serious, Narration»**
   (`6eHm1OlVfyf3wZacL2k3`), modelo `eleven_multilingual_v2`. El texto es `voiceScript(t)`: las escenas
   unidas con una pausa `<break time="1.4s" />`. Esas pausas largas son las que sincronizan: el render
   detecta los silencios y hace empezar cada escena con su frase. Si cambias un texto, vuelve a generar
   el audio de ese vídeo con `voiceScript`, y comprueba que hay tantos tramos como escenas (el render
   avisa si no).
   ```bash
   node -e "import('./video/tutoriales.mjs').then(m => console.log(m.voiceScript(m.TUTORIALS[0])))"
   ```
2. **Capturas** (`build/shots/<slug>/`): la aplicación real en modo demo, con Playwright. Se oculta el
   aviso del modo demo; en el vídeo 8 el formulario de invitación se dibuja igual que con una cuenta
   real (en la demo no se envían correos).
   ```bash
   npm run build && node video/capture.mjs          # o: node video/capture.mjs 03 04
   ```
3. **Render** (`build/out/<slug>.mp4`, `.jpg` miniatura, `.vtt` subtítulos): `template.html` dibuja cada
   fotograma (barra de capítulos, navegador con la captura, zoom al paso, resaltado, cursor y
   subtítulos) y ffmpeg lo une con la voz.
   ```bash
   node video/render.mjs --preview 03   # fotogramas sueltos en build/preview/ para revisar
   node video/render.mjs                # los 8 vídeos (≈ 10 min)
   ```
4. **Web**: `bash video/publish-web.sh` deja en `public/tutoriales/` una versión ligera de cada vídeo,
   su póster y sus subtítulos. Los textos de la página están en `src/tutorials.ts`.
5. **YouTube**: `node video/youtube.mjs` genera `youtube.md` con título, descripción y etiquetas.
   Tras subirlos, pon el id de cada vídeo en `youtubeId` (`src/tutorials.ts`) y la web incrustará
   YouTube (`youtube-nocookie.com`, ya permitido en la CSP de `netlify.toml`) en lugar del MP4.
