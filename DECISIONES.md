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
18. **Invitaciones por correo.** Al invitar a un profesor se le envía un correo con la marca de Korrige (Edge Function `send-invite`, vía Resend) con el enlace de registro; también se puede reenviar o copiar el enlace a mano. La invitación se acepta sola cuando esa persona entra con ese email **verificado**. Solo un administrador de la organización puede enviarla.
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

29. **Personalización de la hoja.** Se puede añadir un logotipo en la cabecera, cambiar las etiquetas de los tres campos manuscritos y poner una nota junto al título «Respuestas», además del título y el subtítulo. El logotipo se reduce en el navegador (máx. 600 px) y se guarda dentro de la configuración de la hoja. No se pueden cambiar el color ni la posición de las burbujas, las marcas de esquina ni el QR: de ellos depende la lectura validada. Hay un test con el peor caso (un logotipo cuadrado negro, parecido a una marca de esquina) que comprueba que la lectura no cambia, tampoco con la hoja girada. Como el resto de la configuración, queda bloqueada al subir hojas.

30. **Valores por defecto de la organización.** El administrador define en Organización el logotipo, el título de la hoja, el identificador (NIA, NIUB, NIU, DNI… y su nº de dígitos) y la fórmula de corrección. Se aplican a cada examen nuevo y el profesor puede cambiarlos en el suyo; no modifican exámenes ya creados. Se guardan en `organizations.exam_defaults`.
31. **Preguntas en blanco.** Por defecto no restan. Se puede configurar que cada blanco reste una cantidad fija, además de lo que resten los errores (nada, 1/(k−1) o una cantidad fija). Nota = (aciertos − a × errores − b × blancos) ÷ preguntas válidas × escala.
32. **Lectura de los KPIs.** Dificultad: fácil ≥ 80 % de acierto, media 50–80 %, difícil < 50 %, muy difícil < 20 %. Discriminación: buena ≥ 0,30, aceptable 0,20–0,30, baja < 0,20, negativa < 0. Son los umbrales habituales en análisis de ítems; están en `src/lib/stats.ts`.

33. **Planes y precios.** Gratis: 1 examen por cuenta, completo y sin tarjeta. **Korrige Plus:** 5 exámenes nuevos al mes por usuario, 9,90 €/mes o 89 €/año (IVA incluido; precio propuesto, se cambia en `src/config.ts` y en Stripe). **Korrige Academy:** organización completa sin límites, a medida, con «Hablar con ventas»; se activa a mano poniendo `organizations.plan = 'academy'`.
34. **Cómo se cuentan los exámenes.** Cuenta cada examen creado (también al duplicar). Borrar un examen no devuelve el cupo: así el examen gratis no se recupera borrando y creando otro. En Plus el contador es por mes natural. Los exámenes creados dentro de una organización Academy no gastan el cupo personal. Los límites los impone la base de datos (trigger `exams_quota`), no solo la interfaz.
35. **Al superar el límite no se pierde nada.** Los exámenes existentes siguen accesibles y editables; solo se impide crear otro. Si una suscripción Plus caduca, se vuelve al plan gratis con el mismo criterio. Hay 3 días de margen si falla un cobro.
36. **Cobro con Stripe Checkout** (Edge Functions `create-checkout`, `billing-portal` y `stripe-webhook`). El alta, las renovaciones y las bajas llegan por webhook firmado; la tabla `subscriptions` solo la escribe el servicio. El usuario gestiona tarjeta, facturas y cancelación en el portal de Stripe.

37. **Bienvenida y tutorial.** Al entrar por primera vez con el email confirmado se envía un correo de bienvenida (Edge Function `welcome`, una vez por cuenta) y se muestra un tutorial de cuatro pasos, que se puede saltar y volver a abrir desde el pie de la aplicación. A las cuentas anteriores no se les envía la bienvenida con retraso.
38. **Pago con tarjeta aún sin activar.** Mientras Stripe no esté configurado (`VITE_BILLING_ENABLED`), el botón de Korrige Plus abre un correo a ventas y el alta se hace a mano insertando la fila en `subscriptions`.

## Verificado contra el proyecto real de Supabase

Proyecto **Korrige** (`cjjwxnotywppigmdrkyq`, región eu-west-3, París), creado el 20/11/2026:

- Las 5 migraciones están aplicadas y las dos Edge Functions desplegadas.
- `npm run seed:demo` se ejecutó con la sesión del profesor demo (RLS real): organización, examen, 34 imágenes en Storage, 31 notas y 7 incidencias.
- En Chromium contra ese proyecto: acceso con contraseña, imágenes con URL firmada, corrección en la cola de revisión, registro de actividad y página de organización, sin errores de consola.
- `sales-lead` guarda el lead (200), rechaza un email inválido (422) y `retention-purge` responde 403 sin secreto.
- El linter de seguridad de Supabase detectó que los usuarios autenticados podían ejecutar por RPC funciones internas (p. ej. `mark_images_purged`), porque Supabase concede EXECUTE por defecto. Se corrigió con la migración `20261120100400_harden_functions.sql` y hay tests que lo cubren.

**Sigue sin probar:** el envío real con Resend (falta `RESEND_API_KEY`), el enlace mágico y los correos de confirmación (dependen de la configuración de Auth/SMTP), la ejecución programada de `retention-purge` y el despliegue en Netlify.

39. **Sin burbuja «P» en las hojas nuevas:** la hoja ya no imprime el recuadro «Solo profesorado»; la plantilla se introduce en la plataforma. El lector no cambia: los exámenes creados antes conservan su layout guardado (con la burbuja) y sus hojas-plantilla se siguen detectando. `computeLayout(…, { keyBubble: true })` reproduce la hoja de referencia para los tests.

40. **Idiomas (castellano, catalán, inglés):** están traducidas la portada (cada idioma con su dirección: `/`, `/ca`, `/en`, con `hreflang`), la página de alumnos `/comprobar` (elige el idioma del navegador, con selector) y la hoja de respuestas (idioma por examen, con valor por defecto en la organización; solo cambian los textos, no la geometría). Las páginas de segmento, las guías públicas, los textos legales y los correos siguen solo en castellano.

41. **Aplicación del profesor en tres idiomas:** selector en el menú de usuario, en «Mi cuenta» y en la pantalla de acceso; la preferencia se guarda en el navegador (`korrige-lang`) y cambiarla recarga la página. Sistema tipo gettext (`tr`/`trn` en `src/i18n/app.ts`, clave = texto en castellano, diccionarios en `src/i18n/app/`); un test exige traducción al catalán y al inglés de todo texto envuelto. Lo que se guarda en la base de datos (incidencias, motivos, detalles del registro de actividad) y los mensajes de error del servidor siguen en castellano; los textos fijos se traducen al mostrarlos. Las cabeceras del CSV de Moodle no se traducen. Ver `docs/i18n.md`.
