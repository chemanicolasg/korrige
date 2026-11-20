# Korrige

Plataforma web para corregir exámenes tipo test con hoja óptica usando la fotocopiadora que ya tienes:

1. El profesor crea el examen y descarga la hoja de respuestas (PDF con QR y marcas de esquina).
2. Imprime, examina y **escanea todo el taco de golpe** en la multifunción (PDF por correo).
3. Sube el PDF: Korrige lee todas las hojas **en el navegador**, calcula las notas, muestra las incidencias para revisar y lo guarda todo con registro de cambios.

Producto: **Korrige** · dominio: **korrige.es** (ambos en `src/config.ts`).

| | |
|---|---|
| Frontend | Vite + React + TypeScript + Tailwind (SPA en Netlify, landing prerenderizada) |
| Backend | Supabase: Auth, Postgres con RLS, Storage, Edge Functions (región UE) |
| Lectura de hojas | pdf.js + OpenCV.js + jsQR en un Web Worker (no hay servidor de procesamiento) |
| Hoja de respuestas | pdf-lib + qrcode-generator (mismas medidas que `referencia/hoja.py`) |
| Correo de ventas | Edge Function `sales-lead` + Resend |

Documentos relacionados: [`DECISIONES.md`](DECISIONES.md) (decisiones tomadas donde el encargo era ambiguo) y [`docs/guia-profesor.md`](docs/guia-profesor.md) (cómo imprimir y escanear).

---

## 1. Ejecutar en local

Requisitos: Node 22+.

```bash
npm install
```

```bash
cp .env.example .env
```

```bash
npm run dev
```

Abre http://localhost:5173.

- **Sin** `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` la app arranca en **modo demo**: todo se guarda en el navegador (localStorage + IndexedDB) y `/demo` crea un examen de ejemplo leyendo 34 hojas generadas. Sirve para desarrollar y para enseñar el producto.
- **Con** las variables rellenas, la app usa tu proyecto de Supabase (`/demo` sigue disponible como demo pública).
- `/dev/omr` es el banco de pruebas del lector: sube un PDF escaneado y muestra la lectura y los overlays.

## 2. Tests

| Comando | Qué comprueba |
|---|---|
| `npm test` | Motor OMR (**test de aceptación** contra `referencia/salida_referencia.json`, generado con `lector.py`), generador de hoja, corrección, estadísticas, cola de revisión, flujo completo del profesor y formulario de ventas |
| `npm run test:rls` | Aplica las migraciones a un PostgreSQL local desechable y ejecuta ~90 comprobaciones de RLS (`supabase/tests/rls_test.sql`) |
| `npm run test:e2e` | Chromium real (Playwright): lector en Web Worker con el escaneo de la Xerox, app completa en modo demo y landing |
| `npm run typecheck` | TypeScript |

`test:rls` necesita un PostgreSQL accesible (por defecto `postgresql://postgres:postgres@localhost:5432`; cámbialo con `PGURL=...`). Crea la base `korrige_test` con una imitación mínima de los esquemas `auth` y `storage` de Supabase, así que no hace falta Docker. `test:e2e` necesita Playwright (`npm i -D playwright && npx playwright install chromium`).

El test de aceptación verifica exactamente la tabla del encargo (QR, NIA, modelo, nº de marcas y preguntas en blanco de las 4 páginas, y la página 1 girada 180° + 2°). Los umbrales (≥ 0,40 marcada; 0,22–0,40 floja; < 0,22 vacía) están en `src/omr/thresholds.ts` y **no deben tocarse**.

## 3. Crear el proyecto de Supabase

1. En https://supabase.com/dashboard crea un proyecto en una **región de la UE** (p. ej. *West EU (Paris)* o *Central EU (Frankfurt)*). Guarda la contraseña de la base de datos.
2. Instala la CLI (https://supabase.com/docs/guides/cli) y enlaza el proyecto:

```bash
supabase login
```

```bash
supabase link --project-ref TU_PROJECT_REF
```

3. Aplica las migraciones (`supabase/migrations/*.sql`: esquema, RLS, Storage y RPC):

```bash
supabase db push
```

4. **Auth** (Dashboard → Authentication):
   - *URL Configuration*: Site URL `https://korrige.es`; Redirect URLs `https://korrige.es/app`, `https://korrige.es/acceso` y, para desarrollo, `http://localhost:5173/app` y `http://localhost:5173/acceso`.
   - *Providers → Email*: activado, con **confirmación de email** (las invitaciones solo se aceptan con email verificado). El enlace mágico usa el mismo proveedor.
   - *SMTP Settings*: usa Resend como SMTP (`smtp.resend.com`, puerto 465, usuario `resend`, contraseña = API key) con remitente `no-reply@korrige.es`, para que los correos de confirmación y enlace mágico salgan de tu dominio y sin los límites del SMTP de pruebas.
   - Más adelante, SSO: activa Google o Azure (Microsoft) en *Providers* y añade un botón en `src/app/Login.tsx` que llame a `signInWithOAuth`. El resto (perfiles, organizaciones, invitaciones por email) ya funciona igual.
5. Copia `Project URL` y la clave `anon` (Project Settings → API) a `.env` como `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

El bucket privado `sheets` (imágenes JPEG de las hojas) y sus políticas se crean con las migraciones. Las rutas son `<org_id>/<exam_id>/<subida>/<n>.jpg`.

## 4. Resend: verificar korrige.es y secretos

1. En https://resend.com → **Domains → Add Domain** → `korrige.es` (región `eu-west-1`).
2. Resend muestra los registros DNS exactos; créalos en el proveedor de DNS del dominio. Suelen ser:

   | Tipo | Nombre | Valor |
   |---|---|---|
   | MX | `send` | `feedback-smtp.eu-west-1.amazonses.com` (prioridad 10) |
   | TXT | `send` | `v=spf1 include:amazonses.com ~all` |
   | TXT | `resend._domainkey` | la clave DKIM `p=...` que te da Resend |
   | TXT (recomendado) | `_dmarc` | `v=DMARC1; p=none; rua=mailto:hola@korrige.es` |

   Usa siempre los valores que te muestre Resend (pueden cambiar según la región). Pulsa **Verify** y espera a que aparezca *Verified*.
3. Crea una API key (permiso *Sending access*) y guarda los secretos de las Edge Functions:

```bash
supabase secrets set RESEND_API_KEY=re_xxx SALES_EMAIL=ventas@korrige.es "SALES_FROM=Korrige <no-reply@korrige.es>" ALLOWED_ORIGINS=https://korrige.es,https://www.korrige.es LEAD_SALT=$(openssl rand -hex 16) CRON_SECRET=$(openssl rand -hex 16)
```

4. Despliega las funciones:

```bash
supabase functions deploy sales-lead retention-purge
```

`sales-lead` recibe el formulario «Hablar con ventas», lo guarda en `sales_leads` (tabla sin acceso desde la API pública) y avisa a `SALES_EMAIL` con `reply-to` del interesado. Protección anti-spam: honeypot, tiempo mínimo de envío, máximo 5 envíos por IP y hora (la IP se guarda solo como hash) y deduplicado por email.

Para recibir correo en `ventas@korrige.es` necesitas además un buzón o redirección en tu proveedor de correo (Resend solo envía).

### Retención de imágenes (RGPD)

Cada organización configura en **Organización** cuántos meses se conservan las imágenes tras cerrar un examen. La función `retention-purge` hace el borrado; prográmala a diario (Dashboard → Integrations → Cron → *HTTP request* a `https://TU_PROJECT_REF.supabase.co/functions/v1/retention-purge` con la cabecera `x-cron-secret: <CRON_SECRET>`).

## 5. Desplegar en Netlify y conectar korrige.es

1. En https://app.netlify.com → **Add new site → Import an existing project** → elige este repositorio. `netlify.toml` ya define el build (`npm run build`), la carpeta (`dist`), las cabeceras y la redirección de la SPA.
2. **Site configuration → Environment variables**: añade `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Nunca pongas aquí la clave `service_role`.
3. **Domain management → Add a domain** → `korrige.es`. Dos opciones:
   - *Netlify DNS* (recomendada): cambia los nameservers del dominio en tu registrador por los que indica Netlify y crea allí también los registros de Resend del apartado 4.
   - *DNS externo*: crea `A  @  75.2.60.5` (o el `ALIAS`/`ANAME` a `apex-loadbalancer.netlify.com` si tu proveedor lo admite) y `CNAME  www  <tu-sitio>.netlify.app`.
4. Activa HTTPS (certificado automático de Let's Encrypt) y elige `korrige.es` como dominio principal para que `www` redirija.
5. Comprueba: la landing, `https://korrige.es/sitemap.xml`, `https://korrige.es/robots.txt`, el formulario de ventas y el acceso.

El build prerenderiza la landing (`scripts/prerender.mjs`): `dist/index.html` lleva el HTML completo (SEO y carga rápida) y `dist/app.html` es la carcasa de la aplicación. `sitemap.xml` y `robots.txt` se generan con el dominio de `src/config.ts`.

Si cambias el nombre o el dominio: edita `src/config.ts`, los metadatos de `index.html`, `supabase/config.toml` y los valores por defecto de `supabase/functions/sales-lead/index.ts`.

## 6. Datos de demo

- **En el navegador**: visita `/demo` (no necesita servidor).
- **En Supabase** (organización demo, profesor demo y examen de ejemplo con 32 hojas leídas, incidencias y notas):

```bash
SUPABASE_URL=https://TU-PROYECTO.supabase.co SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... DEMO_PASSWORD='una-contraseña' npm run seed:demo
```

El script crea el usuario con la clave `service_role` y hace todo lo demás con la sesión de ese profesor, es decir, a través de las políticas RLS: sirve también como prueba de humo del despliegue.

## 7. Estructura

```
referencia/            prototipo Python validado (hoja.py, lector.py), escaneo de prueba y JSON de referencia
src/omr/               motor OMR: layout, hoja PDF, lector, worker, agrupación de páginas
src/lib/               capa de datos (Supabase / local), corrección, estadísticas, revisión, servicio, exportación
src/app/               aplicación del profesor (pestañas del examen en src/app/tabs)
src/landing/, src/i18n landing, formulario de ventas, páginas legales, textos (es completo; ca/en preparados)
supabase/migrations/   esquema, RLS, Storage y RPC
supabase/functions/    sales-lead (ventas + Resend) y retention-purge (RGPD)
supabase/tests/        tests de RLS
tests/, e2e/           tests unitarios/integración (Vitest) y de navegador (Playwright)
scripts/               prerender de la landing, lector en Node y datos de demo
```

### Cómo funciona la lectura

`src/omr/reader.ts` es un port fiel de `referencia/lector.py`: render a 150 ppp en gris → 4 marcas de esquina (contornos cuadrados macizos de ~8 mm) → homografía mm→píxel → orientación (si el QR queda abajo, se gira 180°) → QR (recorte ×1/×2/×3) → relleno de cada burbuja (fracción de píxeles < 150 en el 75 % del radio). El layout de cada examen se guarda en la base de datos (`exam_layouts`) y el lector siempre usa el guardado; queda bloqueado en cuanto se suben hojas.

### Seguridad

- RLS en todas las tablas y en Storage; `anon` no tiene acceso a ninguna tabla.
- El profesor ve sus exámenes y los compartidos; el admin, todos los de su organización; nadie ve nada de otra organización.
- Examen cerrado = solo lectura (lo impone la base de datos, no solo la interfaz). Plantillas versionadas e inmutables. `audit_log` solo admite inserciones.
