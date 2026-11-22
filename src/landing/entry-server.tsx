// Entrada para prerenderizar las páginas públicas en el build (scripts/prerender.mjs).
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { Route, Routes } from 'react-router-dom';
import { StaticRouter } from 'react-router-dom/server';
import { APP_DOMAIN, APP_NAME, APP_URL } from '../config';
import { ENABLED_LOCALES, LOCALE_PATH, Locale, getDict } from '../i18n';
import { ARTICLES } from './articles';
import Landing from './Landing';
import Legal from './Legal';
import PublicGuide from './PublicGuide';
import PublicTutorials from './PublicTutorials';
import { TUTORIALS, USE_YOUTUBE } from '../tutorials';
import ResourcePage from './Resources';
import { SEGMENTS, segmentJsonLd } from './segmentData';
import SegmentPage from './segments';

export const site = { APP_NAME, APP_DOMAIN, APP_URL };

/** Páginas públicas indexables, con sus metadatos. La portada conserva los de index.html. */
export const pages: { path: string; title?: string; description?: string; jsonLd?: string; priority?: string; locale?: Locale }[] = [
  { path: '/', locale: 'es' },
  // la portada en catalán e inglés, cada una con su dirección
  ...ENABLED_LOCALES.filter((l) => l !== 'es').map((l) => ({ path: LOCALE_PATH[l], locale: l, title: getDict(l).meta.title, description: getDict(l).meta.description, priority: '0.9' })),
  ...SEGMENTS.map((s) => ({ path: `/${s.slug}`, title: s.title, description: s.description, priority: '0.9', jsonLd: segmentJsonLd(s) })),
  {
    path: '/guia',
    title: `Guía de impresión y escaneo de hojas de respuestas — ${APP_NAME}`,
    description: 'Cómo imprimir las hojas de respuestas y escanear el taco en la fotocopiadora (Xerox y similares) para corregir exámenes tipo test con Korrige.',
  },
  {
    path: '/tutoriales',
    title: `Vídeos tutoriales: cómo corregir exámenes con ${APP_NAME}`,
    description: 'Ocho vídeos de menos de un minuto: crear el examen, la plantilla, subir las hojas, revisar, notas, estadísticas y publicar las respuestas.',
    priority: '0.8',
    jsonLd: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `Vídeos tutoriales de ${APP_NAME}`,
      itemListElement: TUTORIALS.map((t, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'VideoObject',
          name: `${t.title} ${t.kicker} — tutorial de ${APP_NAME}`,
          description: t.summary,
          inLanguage: 'es',
          duration: `PT${Math.floor(t.seconds / 60)}M${t.seconds % 60}S`,
          uploadDate: '2026-11-22',
          thumbnailUrl: USE_YOUTUBE && t.youtubeId ? `https://i.ytimg.com/vi/${t.youtubeId}/hqdefault.jpg` : `${APP_URL}/tutoriales/${t.slug}.jpg`,
          ...(USE_YOUTUBE && t.youtubeId ? { embedUrl: `https://www.youtube-nocookie.com/embed/${t.youtubeId}` } : { contentUrl: `${APP_URL}/tutoriales/${t.slug}.mp4` }),
          url: `${APP_URL}/tutoriales#${t.slug}`,
        },
      })),
    }),
  },
  {
    path: '/recursos',
    title: `Guías para corregir exámenes tipo test — ${APP_NAME}`,
    description: 'Métodos de corrección, fórmulas de penalización y consejos prácticos para corregir exámenes tipo test en universidades y academias.',
    priority: '0.7',
  },
  ...ARTICLES.map((a) => ({
    path: `/recursos/${a.slug}`,
    title: a.title,
    description: a.description,
    priority: '0.8',
    jsonLd: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: a.h1,
      description: a.description,
      inLanguage: 'es',
      dateModified: a.updated,
      datePublished: a.updated,
      mainEntityOfPage: `${APP_URL}/recursos/${a.slug}`,
      author: { '@type': 'Organization', name: APP_NAME, url: APP_URL },
      publisher: { '@type': 'Organization', name: APP_NAME, logo: { '@type': 'ImageObject', url: `${APP_URL}/icon-512.png` } },
    }),
  })),
  { path: '/legal/aviso-legal', title: `Aviso legal — ${APP_NAME}`, description: `Aviso legal y condiciones de uso de ${APP_NAME}.` },
  { path: '/legal/privacidad', title: `Política de privacidad — ${APP_NAME}`, description: `Cómo trata ${APP_NAME} los datos personales de profesores y alumnos.` },
  { path: '/legal/cookies', title: `Política de cookies — ${APP_NAME}`, description: `${APP_NAME} solo usa almacenamiento técnico del navegador, sin cookies publicitarias.` },
];

export function render(path = '/'): string {
  return renderToString(
    <StrictMode>
      <StaticRouter location={path}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/ca" element={<Landing locale="ca" />} />
          <Route path="/en" element={<Landing locale="en" />} />
          <Route path="/guia" element={<PublicGuide />} />
          <Route path="/tutoriales" element={<PublicTutorials />} />
          <Route path="/academias" element={<SegmentPage slug="academias" articles={ARTICLES} />} />
          <Route path="/universidades" element={<SegmentPage slug="universidades" articles={ARTICLES} />} />
          <Route path="/legal/:doc" element={<Legal />} />
          <Route path="/recursos" element={<ResourcePage />} />
          <Route path="/recursos/:slug" element={<ResourcePage />} />
        </Routes>
      </StaticRouter>
    </StrictMode>,
  );
}

/** Datos estructurados (FAQ) para buscadores. */
export function faqJsonLd(locale: Locale = 'es'): string {
  const t = getDict(locale);
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: t.faq.items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  });
}

/** Datos estructurados del sitio: organización, web y aplicación. */
export function siteJsonLd(locale: Locale = 'es'): string {
  const t = getDict(locale);
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': `${APP_URL}/#org`, name: APP_NAME, url: APP_URL, logo: `${APP_URL}/icon-512.png`, email: `ventas@${APP_DOMAIN}` },
      { '@type': 'WebSite', '@id': `${APP_URL}/#web`, name: APP_NAME, url: APP_URL, inLanguage: ['es', 'ca', 'en'], publisher: { '@id': `${APP_URL}/#org` } },
      {
        '@type': 'SoftwareApplication',
        name: APP_NAME,
        url: APP_URL,
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Web',
        inLanguage: locale,
        description: t.hero.subtitle,
        featureList: t.features.items.map(([title]) => title),
        screenshot: `${APP_URL}/shots/revision.jpg`,
        publisher: { '@id': `${APP_URL}/#org` },
      },
    ],
  });
}

/** Direcciones de la portada por idioma, para las etiquetas hreflang. */
export const landingAlternates: [string, string][] = ENABLED_LOCALES.map((l) => [l, `${APP_URL}${LOCALE_PATH[l] === '/' ? '/' : LOCALE_PATH[l]}`]);
