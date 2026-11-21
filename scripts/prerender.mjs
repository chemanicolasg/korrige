// Post-build: prerenderiza la landing (HTML estático para SEO y carga rápida) y
// genera sitemap.xml y robots.txt a partir del dominio de src/config.ts.
//   dist/index.html → landing prerenderizada      dist/app.html → carcasa de la SPA
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const dist = path.resolve('dist');
const ssrDir = path.resolve('node_modules/.korrige-ssr');
execSync(`npx vite build --ssr src/landing/entry-server.tsx --outDir "${ssrDir}" --emptyOutDir --logLevel error`, { stdio: 'inherit' });
const entry = fs.readdirSync(ssrDir).find((f) => /^entry-server\.m?js$/.test(f));
const { render, faqJsonLd, siteJsonLd, site, pages } = await import(pathToFileURL(path.join(ssrDir, entry)).href);

const shell = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
if (!shell.includes('<!--app-html-->')) throw new Error('index.html no contiene el marcador <!--app-html-->');
// carcasa de la aplicación (rutas privadas): no se indexa
fs.writeFileSync(path.join(dist, 'app.html'), shell.replace('<!--app-html-->', '').replace('<!--app-head-->', '<meta name="robots" content="noindex" />'));

const INDEXABLE = '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
// Google corta los títulos hacia los 60 caracteres y las descripciones hacia los 155
const head = (re) => (shell.match(re) ?? [])[1] ?? '';
const meta = [{ path: '/', title: head(/<title>([^<]*)<\/title>/), description: head(/<meta name="description" content="([^"]*)"/) }, ...pages.filter((p) => p.path !== '/')];
const tooLong = meta.filter((p) => p.title.length > 60 || p.description.length > 155);
if (tooLong.length) throw new Error('Títulos (>60) o descripciones (>155) demasiado largos: ' + tooLong.map((p) => `${p.path} (${p.title.length}/${p.description.length})`).join(', '));

for (const page of pages) {
  const url = `${site.APP_URL}${page.path}`;
  let html = shell.replace('<!--app-html-->', render(page.path));
  if (page.path === '/') {
    const ld = (json) => `<script type="application/ld+json">${json.replace(/</g, '\\u003c')}</script>`;
    html = html.replace('<!--app-head-->', `${INDEXABLE}\n    ${ld(siteJsonLd())}\n    ${ld(faqJsonLd())}`);
  } else {
    // cada página pública lleva su propio título, descripción y URL canónica
    html = html
      .replace('<!--app-head-->', INDEXABLE + (page.jsonLd ? `\n    <script type="application/ld+json">${page.jsonLd.replace(/</g, '\\u003c')}</script>` : ''))
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(page.title)}</title>`)
      .replace(/(<meta name="description" content=")[^"]*"/, `$1${esc(page.description)}"`)
      .replace(/(<link rel="canonical" href=")[^"]*"/, `$1${url}"`)
      .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${url}"`)
      .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${esc(page.title)}"`)
      .replace(/(<meta property="og:description" content=")[^"]*"/, `$1${esc(page.description)}"`);
  }
  const file = page.path === '/' ? path.join(dist, 'index.html') : path.join(dist, `${page.path}.html`); // /guia → guia.html: Netlify la sirve en /guia sin redirigir a /guia/
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
    .map((p) => `  <url><loc>${site.APP_URL}${p.path}</loc><lastmod>${today}</lastmod><priority>${p.path === '/' ? '1.0' : (p.priority ?? '0.4')}</priority></url>`)
    .join('\n')}\n</urlset>\n`,
);
fs.writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /app\nDisallow: /acceso\nDisallow: /demo\nDisallow: /dev\n\nSitemap: ${site.APP_URL}/sitemap.xml\n`);
fs.rmSync(ssrDir, { recursive: true, force: true });
console.log(`✓ ${pages.length} páginas públicas prerenderizadas (portada ${(fs.statSync(path.join(dist, 'index.html')).size / 1024).toFixed(1)} kB), sitemap.xml y robots.txt para ${site.APP_DOMAIN}`);
