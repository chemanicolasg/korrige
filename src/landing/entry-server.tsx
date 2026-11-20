// Entrada para prerenderizar la landing en el build (scripts/prerender.mjs).
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { APP_DOMAIN, APP_NAME, APP_URL } from '../config';
import { getDict } from '../i18n';
import Landing from './Landing';

export const site = { APP_NAME, APP_DOMAIN, APP_URL };

export function render(): string {
  return renderToString(
    <StrictMode>
      <StaticRouter location="/">
        <Landing />
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
