# Canal de YouTube de Korrige

Imágenes (se regeneran con `node video/canal/exportar.mjs` a partir de `canal.html`):

| Campo de YouTube | Archivo | Tamaño |
|---|---|---|
| Imagen de banner | `banner.png` | 2048×1152 (el texto cabe en la zona segura de 1235×338 que se ve en el móvil) |
| Imagen de perfil | `perfil.png` | 800×800 (la burbuja de Korrige, la misma del icono de la web) |
| Marca de agua de los vídeos | `marca-de-agua.png` | 150×150, fondo transparente |

## Textos para «Personalización del canal»

**Nombre**
```
Korrige
```

**Identificador** (si está libre; si no, `@korrige.es` o `@korrigeapp`)
```
korrige
```

**Descripción**
```
Corrige exámenes tipo test en minutos con la fotocopiadora que ya tienes: imprime la hoja de respuestas, escanea todo el taco y sube el PDF. Korrige lee las hojas, calcula las notas y te enseña solo lo que hay que revisar.

En este canal: tutoriales de menos de un minuto para profesores de universidad, facultades y academias. Crear el examen, la plantilla de respuestas, subir y revisar las hojas, notas y exportación a Excel o Moodle, estadísticas por pregunta y cómo publicar las respuestas para los alumnos.

Tu primer examen es gratis → https://korrige.es
```

**Enlaces**
| Título | URL |
|---|---|
| Korrige · tu primer examen gratis | https://korrige.es |
| Todos los tutoriales | https://korrige.es/tutoriales |
| Probar la demo (sin registro) | https://korrige.es/demo |

**Información de contacto:** el correo comercial de Korrige (por ejemplo, el de ventas que aparece en la web).

## Después de subir los vídeos

- Crea la lista de reproducción **«Aprende Korrige»** con los 8 vídeos en orden y ponla como sección destacada del canal.
- Títulos, descripciones y etiquetas de cada vídeo: `video/youtube.md`.
- Copia el id de cada vídeo en `youtubeId` y el de la lista en `TUTORIALS_PLAYLIST` (`src/tutorials.ts`): la web pasará a incrustar YouTube.
