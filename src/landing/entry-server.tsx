// Entrada para prerenderizar las páginas públicas en el build (scripts/prerender.mjs).
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { Route, Routes } from 'react-router-dom';
import { StaticRouter } from 'react-router-dom/server';
import { APP_DOMAIN, APP_NAME, APP_URL } from '../config';
import { getDict } from '../i18n';
import Landing from './Landing';
import Legal from './Legal';
import PublicGuide from './PublicGuide';

export const site = { APP_NAME, APP_DOMAIN, APP_URL };

/** Páginas públicas indexables, con sus metadatos. La portada conserva los de index.html. */
export const pages: { path: string; title?: string; description?: string }[] = [
  { path: '/' },
  {
    path: '/guia',
    title: `Guía de impresión y escaneo de hojas de respuestas — ${APP_NAME}`,
    description: 'Cómo imprimir las hojas de respuestas y escanear el taco en la fotocopiadora (Xerox y similares) para corregir exámenes tipo test con Korrige.',
  },
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
          <Route path="/guia" element={<PublicGuide />} />
          <Route path="/legal/:doc" element={<Legal />} />
        </Routes>
      </StaticRouter>
    </StrictMode>,
  );
}

/** Datos estructurados (FAQ) para buscadores. */
export function faqJsonLd(): string {
  const t = getDict('es');
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: t.faq.items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  });
}

/** Datos estructurados del sitio: organización, web y aplicación. */
export function siteJsonLd(): string {
  const t = getDict('es');
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': `${APP_URL}/#org`, name: APP_NAME, url: APP_URL, logo: `${APP_URL}/og.png`, email: `ventas@${APP_DOMAIN}` },
      { '@type': 'WebSite', '@id': `${APP_URL}/#web`, name: APP_NAME, url: APP_URL, inLanguage: 'es', publisher: { '@id': `${APP_URL}/#org` } },
      {
        '@type': 'SoftwareApplication',
        name: APP_NAME,
        url: APP_URL,
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Web',
        inLanguage: 'es',
        description: t.hero.subtitle,
        featureList: t.features.items.map(([title]) => title),
        screenshot: `${APP_URL}/shots/revision.jpg`,
        publisher: { '@id': `${APP_URL}/#org` },
      },
    ],
  });
}
