# Decisiones tomadas

Donde el encargo era ambiguo se ha elegido la opción más simple que cumple el objetivo. Todas son fáciles de cambiar.

## Motor OMR

1. **Tolerancia en los scores brutos.** El lector es un port línea a línea de `lector.py` y sus decisiones (QR, NIA, modelo, respuestas, estados, incidencias) coinciden exactamente con la referencia. Los *scores* de relleno difieren hasta ±0,10 porque el navegador rasteriza el PDF con pdf.js y la referencia con poppler; el test admite ≤ 0,12 en el score y exige igualdad en todo lo demás. En el escaneo real las burbujas vacías siguen por debajo de 0,20 y las marcadas por encima de 0,40.
2. **QR con jsQR** (el encargo daba a elegir entre jsQR y zxing), con la misma estrategia de la referencia: recorte de la zona, escalas ×1/×2/×3, en crudo y binarizado.
3. **El QR lleva un código corto de examen** (8 caracteres sin ambiguos, p. ej. `UICOMR|K7F3Q9XZ|v1`) en lugar del UUID: el QR queda con módulos grandes y se lee bien a 150 ppp. El prefijo `UICOMR` se mantiene (constante `QR_PREFIX`).
4. **Hojas de 2 páginas (> 100 preguntas).** Las dos páginas llevan el bloque de identificador y modelo y el QR `…|v1|p1` / `…|v1|p2`. Se emparejan por orden; una página 2 suelta se empareja por identificador con una entrega incompleta. Si falta una página se crea la incidencia «Falta una página». En exámenes de 1 página el QR no lleva sufijo (como la referencia).
5. **Con un solo modelo no se imprime el bloque «Modelo de examen»** y todas las hojas son del modelo A.
6. **Imagen guardada de cada hoja:** JPEG en gris enderezado a un A4 canónico de 5 px/mm (1050×1485, calidad 0,6, ~100–200 kB). Al ser canónica, los recortes y overlays de la revisión se calculan directamente en mm.
7. **Las casillas manuscritas del identificador se dibujan todas en gris** (en `hoja.py` la primera sale gris y el resto rosa por un efecto colateral del color de trazo). No afecta a la lectura.

## Corrección y revisión

8. **Doble marca o marca floja sin revisar = en blanco** (como en la referencia) y la hoja aparece como «pendiente de revisión». Al revisarla el profesor elige una letra, «en blanco» o «nula (cuenta como error)».
9. **Pregunta anulada:** no puntúa para nadie y sale del denominador (nota = bruta ÷ preguntas válidas × escala). Una pregunta sin respuesta correcta definida se trata igual hasta que se complete la plantilla.
10. **Hoja-plantilla (burbuja «P»):** crea una versión nueva de la plantilla de su modelo. Una doble marca en la plantilla significa «se aceptan ambas respuestas». Si no tiene el modelo marcado, se pregunta el modelo antes de guardar. Las plantillas no generan incidencias.
11. **Las notas se calculan en el navegador** (`src/lib/grading.ts`, función pura con tests) y se guardan en `results`; así el recálculo es instantáneo. La base de datos impone quién puede escribir y que un examen cerrado no cambia.
12. **Aprobado = nota ≥ 50 % de la nota máxima** (para el % de aprobados y el histograma).
13. **Correspondencia entre modelos:** se introduce como una lista de números (permutación) por modelo. Solo reordena preguntas; el análisis de distractores asume que las opciones A–E no se barajan entre modelos.
14. **NIA duplicado entre tandas:** al guardar una subida se pregunta una sola vez qué hacer con todos los repetidos (sustituir / conservar ambas y revisar / descartar las nuevas). Duplicados dentro de una misma tanda van a la cola de revisión.

## Datos y permisos

15. **La lista de alumnos es por examen** (no por organización): es lo que el profesor tiene a mano (la lista del grupo) y evita mezclar datos personales entre asignaturas.
16. **Una fila de `sheets` por entrega de alumno** (con 1 o 2 páginas en `pages`), con respuestas, scores brutos e incidencias en JSONB. No hay tabla `sheet_answers`.
17. **Las correcciones manuales se registran en `audit_log`** (quién, cuándo, valor anterior y nuevo), sin tabla aparte. `audit_log` solo admite inserciones y sobrevive al borrado del examen (sin datos de alumnos más allá del identificador de la hoja corregida).
18. **Invitaciones sin correo automático:** el admin escribe el email y copia un enlace de registro para enviárselo. La invitación se acepta sola cuando esa persona entra con ese email **verificado**. Enviar el correo desde una Edge Function es una mejora sencilla.
19. **Quien se registra sin invitación crea su propia organización** (y es su admin). Si preferís alta solo por invitación, basta con desactivar el registro público en Supabase Auth y crear las organizaciones a mano.
20. **Coautores:** se comparten con profesores de la misma organización; pueden hacer todo menos borrar el examen o compartirlo.
21. **Retención:** al vencer el plazo se borran las imágenes y se conservan notas y respuestas. El borrado lo ejecuta la Edge Function `retention-purge`, que hay que programar (ver README).
22. **Duplicar examen** copia configuración, fórmula, correspondencia y plantillas vigentes (como versión 1); no copia alumnos ni hojas. El duplicado tiene otro código y otro QR.

## Producto

23. **Modo demo local.** Además de Supabase hay una segunda implementación de la capa de datos que vive en el navegador. Se usa en `/demo` (para enseñar el producto sin registro), cuando no hay Supabase configurado y en los tests E2E. No formaba parte del encargo; se añadió porque en el entorno de desarrollo no había Docker para levantar Supabase en local.
24. **Landing prerenderizada** en el build para SEO y velocidad; el resto es SPA.
25. **i18n solo en la landing:** español completo; catalán e inglés con la estructura preparada (`src/i18n`) y ocultos en el selector hasta completarlos. La aplicación del profesor está solo en español.
26. **Sin cookies de analítica**, así que no hay banner de cookies; la página de cookies describe el almacenamiento técnico.
27. **Textos comerciales por validar:** «≈ 1 s por hoja», «100 hojas por minuto», «respondemos en un día laborable», «piloto gratuito» y «formación incluida» son propuestas de redacción en `src/i18n/es.ts`; ajustadlas a vuestra oferta real. Los textos legales son plantillas marcadas como pendientes de revisión legal.

28. **Identidad visual.** El diseño parte del propio producto en lugar de una plantilla genérica: papel blanco, azul de bolígrafo, el rosa de las burbujas de la hoja y las marcas negras de esquina como marco. Titulares en serif (Fraunces), etiquetas en monoespaciada (IBM Plex Mono) y texto en Archivo, todas servidas desde el propio sitio. En el logotipo la «o» es una burbuja rellenada. La landing usa capturas reales de la aplicación (`public/shots`, se regeneran con `node scripts/capture-shots.mjs` tras `npm run build`) en vez de ilustraciones. Sustituye a una primera versión inspirada en el branding «Concept C». Paleta y tipografías están en `tailwind.config.js` y `src/index.css`.

## Verificado contra el proyecto real de Supabase

Proyecto **Korrige** (`cjjwxnotywppigmdrkyq`, región eu-west-3, París), creado el 20/11/2026:

- Las 5 migraciones están aplicadas y las dos Edge Functions desplegadas.
- `npm run seed:demo` se ejecutó con la sesión del profesor demo (RLS real): organización, examen, 34 imágenes en Storage, 31 notas y 7 incidencias.
- En Chromium contra ese proyecto: acceso con contraseña, imágenes con URL firmada, corrección en la cola de revisión, registro de actividad y página de organización, sin errores de consola.
- `sales-lead` guarda el lead (200), rechaza un email inválido (422) y `retention-purge` responde 403 sin secreto.
- El linter de seguridad de Supabase detectó que los usuarios autenticados podían ejecutar por RPC funciones internas (p. ej. `mark_images_purged`), porque Supabase concede EXECUTE por defecto. Se corrigió con la migración `20261120100400_harden_functions.sql` y hay tests que lo cubren.

**Sigue sin probar:** el envío real con Resend (falta `RESEND_API_KEY`), el enlace mágico y los correos de confirmación (dependen de la configuración de Auth/SMTP), la ejecución programada de `retention-purge` y el despliegue en Netlify.
