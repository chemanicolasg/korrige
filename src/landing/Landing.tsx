import { ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CONTACT_EMAIL, SALES_EMAIL } from '../config';
import { Logo } from '../components/ui';
import { ENABLED_LOCALES, LOCALE_NAMES, LOCALE_PATH, Locale, getDict, saveLocale } from '../i18n';
import { ARTICLES } from './articles';
import { SEGMENTS } from './segmentData';
import { PricingCards } from './Pricing';
import { SalesForm } from './SalesForm';

/**
 * Landing. El lenguaje visual sale del propio producto: papel blanco, azul de
 * bolígrafo, el rosa de las burbujas de la hoja y las marcas negras de esquina.
 * Las imágenes son capturas reales de la aplicación (scripts/capture-shots.mjs).
 */

/** Las cuatro marcas negras de esquina de la hoja, como marco. */
function CornerMarks({ size = 10, inset = 10 }: { size?: number; inset?: number }) {
  const s = { width: size, height: size };
  return (
    <span aria-hidden>
      {[
        { top: inset, left: inset },
        { top: inset, right: inset },
        { bottom: inset, left: inset },
        { bottom: inset, right: inset },
      ].map((pos, i) => (
        <span key={i} className="absolute bg-ink" style={{ ...s, ...pos }} />
      ))}
    </span>
  );
}

/** Fila de burbujas A–D con una marcada, como en la hoja de respuestas. */
function Bubbles({ marked, letters = 'ABCD' }: { marked: number; letters?: string }) {
  return (
    <span className="inline-flex gap-1.5" aria-hidden>
      {[...letters].map((l, i) => (
        <span
          key={l}
          className={`flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] font-mono text-[10px] ${
            i === marked ? 'border-brand-700 bg-brand-700 text-brand-700' : 'border-rose-500 text-rose-500'
          }`}
        >
          {l}
        </span>
      ))}
    </span>
  );
}

function Shot({ src, alt, className = '', width, height }: { src: string; alt: string; className?: string; width: number; height: number }) {
  return <img src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" className={`block h-auto w-full ${className}`} />;
}

function Eyebrow({ n, children }: { n: string; children: ReactNode }) {
  return (
    <p className="label-mono flex items-center gap-3 text-brand-700">
      <span className="text-rose-500">{n}</span>
      <span className="h-px w-8 bg-brand-700/40" aria-hidden />
      {children}
    </p>
  );
}

/** Portada. Cada idioma tiene su dirección (/, /ca, /en) y se prerenderiza por separado. */
export default function Landing({ locale = 'es' }: { locale?: Locale }) {
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    document.documentElement.lang = locale;
    saveLocale(locale); // la página de alumnos (/comprobar) lo recuerda
  }, [locale]);
  const t = getDict(locale);
  const links: [string, string][] = [
    ['#como-funciona', t.nav.how],
    ['#funcionalidades', t.nav.features],
    ['#precios', t.pricing.nav],
    ['#privacidad', t.nav.privacy],
    ['#faq', t.nav.faq],
  ];
  const primary = 'inline-flex items-center justify-center rounded-md bg-brand-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-800';
  const secondary = 'inline-flex items-center justify-center rounded-md border-[1.5px] border-ink px-5 py-3 text-sm font-semibold text-ink transition hover:bg-ink hover:text-white';
  const wrap = 'mx-auto max-w-6xl px-5 sm:px-8';
  const h2 = 'display mt-4 max-w-3xl text-[2rem] leading-[1.1] text-ink sm:text-[2.6rem]';

  return (
    <div className="bg-white text-slate-700">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        {t.ui.skip}
      </a>

      <header className="sticky top-0 z-40 border-b border-bone-200 bg-white/95 backdrop-blur">
        <div className={`${wrap} flex items-center gap-8 py-3.5`}>
          <a href="#top" className="text-[1.7rem] leading-none">
            <Logo />
          </a>
          <nav className="hidden items-center gap-6 text-sm text-slate-600 lg:flex" aria-label={t.ui.sections}>
            {links.map(([href, label]) => (
              <a key={href} href={href} className="underline-offset-4 hover:text-ink hover:underline">
                {label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {ENABLED_LOCALES.length > 1 && (
              <select
                aria-label={t.ui.language}
                className="rounded-md border border-bone-300 bg-white px-2 py-1.5 text-sm"
                value={locale}
                onChange={(e) => {
                  // cada idioma es una página propia: se navega a su dirección
                  const next = e.target.value as Locale;
                  saveLocale(next);
                  location.href = LOCALE_PATH[next];
                }}
              >
                {ENABLED_LOCALES.map((l) => (
                  <option key={l} value={l}>
                    {LOCALE_NAMES[l]}
                  </option>
                ))}
              </select>
            )}
            <Link to="/acceso" className="hidden px-3 py-2 text-sm font-semibold text-ink underline-offset-4 hover:underline sm:inline-flex">
              {t.nav.login}
            </Link>
            <a href="#ventas" className="inline-flex rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800">
              {t.nav.sales}
            </a>
            <button className="rounded-md p-2 text-ink hover:bg-bone-100 lg:hidden" aria-label={t.ui.menu} aria-expanded={menu} onClick={() => setMenu(!menu)}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
        </div>
        {menu && (
          <nav className="border-t border-bone-200 bg-white px-5 py-3 lg:hidden" aria-label={t.ui.sections}>
            {[...links, ['/acceso', t.nav.login] as [string, string]].map(([href, label]) => (
              <a key={href} href={href} className="block py-2 text-sm font-medium text-ink" onClick={() => setMenu(false)}>
                {label}
              </a>
            ))}
          </nav>
        )}
      </header>

      <main id="contenido">
        {/* 1. Hero */}
        <section id="top" className="overflow-hidden border-b border-bone-200">
          <div className={`${wrap} grid items-center gap-12 pb-16 pt-12 lg:grid-cols-[1fr_1.05fr] lg:pb-24 lg:pt-20`}>
            <div>
              <p className="label-mono text-slate-500">{t.hero.kicker}</p>
              <h1 className="display mt-5 text-[2.6rem] leading-[1.04] text-ink sm:text-[3.6rem]">{t.hero.title}</h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">{t.hero.subtitle}</p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a href="#ventas" className={primary}>
                  {t.nav.sales}
                </a>
                <Link to="/acceso" className={secondary}>
                  {t.nav.login}
                </Link>
                <Link to="/demo" className="px-2 py-3 text-sm font-semibold text-brand-700 underline decoration-rose-500 decoration-2 underline-offset-4 hover:text-brand-900">
                  {t.nav.demo}
                </Link>
              </div>
              <p className="mt-5 text-sm text-slate-500">{t.hero.note}</p>
            </div>
            <figure className="relative lg:-mr-24">
              <div className="sheet-shadow relative border-[1.5px] border-ink bg-white p-7 sm:p-9">
                <CornerMarks />
                <Shot src="/shots/revision.jpg" width={1824} height={1104} alt={t.ui.heroAlt} />
              </div>
              <figcaption className="label-mono mt-5 flex items-center gap-3 text-slate-500">
                <Bubbles marked={0} />
                {t.ui.heroCaption}
              </figcaption>
            </figure>
          </div>
          <dl className={`${wrap} grid grid-cols-3 border-t border-bone-200`}>
            {t.hero.stats.map(([v, l], i) => (
              <div key={l} className={`py-6 ${i ? 'border-l border-bone-200 pl-5 sm:pl-8' : ''}`}>
                <dd className="display text-3xl text-ink sm:text-4xl">{v}</dd>
                <dt className="label-mono mt-1 text-slate-500">{l}</dt>
              </div>
            ))}
          </dl>
        </section>

        {/* 2. El problema: comparación */}
        <section className="border-b border-bone-200 bg-bone-100 py-16 sm:py-24">
          <div className={wrap}>
            <Eyebrow n="01">{t.ui.problem}</Eyebrow>
            <h2 className={h2}>{t.problem.title}</h2>
            <p className="mt-4 max-w-2xl text-lg text-slate-600">{t.problem.intro}</p>
            <div className="mt-10 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr>
                    {t.problem.table.head.map((h, i) => (
                      <th key={i} scope="col" className={`border-b-[1.5px] border-ink px-4 py-3 align-bottom ${i === 4 ? 'bg-white' : ''} ${i ? 'display text-lg text-ink' : ''}`}>
                        {i === 4 ? <Logo className="text-xl" /> : h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {t.problem.table.rows.map((row) => (
                    <tr key={row[0]}>
                      {row.map((cell, i) =>
                        i === 0 ? (
                          <th key={i} scope="row" className="label-mono border-b border-bone-300 px-4 py-4 align-top font-medium text-slate-500">
                            {cell}
                          </th>
                        ) : (
                          <td key={i} className={`border-b border-bone-300 px-4 py-4 align-top ${i === 4 ? 'bg-white font-semibold text-brand-800' : 'text-slate-600'}`}>
                            {cell}
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="display mt-10 max-w-3xl text-2xl leading-snug text-ink">{t.problem.after}</p>
          </div>
        </section>

        {/* 3. Cómo funciona: los pasos como preguntas de la hoja */}
        <section id="como-funciona" className="scroll-mt-20 border-b border-bone-200 py-16 sm:py-24">
          <div className={`${wrap} grid gap-12 lg:grid-cols-[0.8fr_1.2fr]`}>
            <div className="lg:sticky lg:top-24 lg:self-start">
              <Eyebrow n="02">{t.how.title}</Eyebrow>
              <h2 className={h2}>{t.how.subtitle}</h2>
              <figure className="relative mt-8 hidden max-w-sm rotate-[-1.5deg] border border-bone-300 bg-white shadow-[0_18px_40px_-18px_rgba(20,22,27,0.35)] lg:block">
                <Shot src="/shots/hoja.jpg" width={1232} height={1742} alt={t.ui.sheetAlt} />
              </figure>
            </div>
            <ol className="border-t-[1.5px] border-ink">
              {t.how.steps.map(([title, text], i) => (
                <li key={title} className="grid grid-cols-[2.5rem_1fr] gap-x-4 border-b border-bone-300 py-7 sm:grid-cols-[3rem_auto_1fr] sm:gap-x-6">
                  <span className="display text-3xl leading-none text-ink">{i + 1}</span>
                  <span className="hidden pt-1 sm:block">
                    <Bubbles marked={i} />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-ink">{title}</h3>
                    <p className="mt-1.5 max-w-xl leading-relaxed text-slate-600">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 4. Funcionalidades */}
        <section id="funcionalidades" className="scroll-mt-20 border-b border-bone-200 py-16 sm:py-24">
          <div className={wrap}>
            <Eyebrow n="03">{t.nav.features}</Eyebrow>
            <h2 className={h2}>{t.features.title}</h2>
            <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1fr]">
              <dl className="grid content-start gap-x-8 sm:grid-cols-2">
                {t.features.items.map(([title, text], i) => (
                  <div key={title} className="border-t border-bone-300 py-5">
                    <dt className="flex items-baseline gap-3 font-semibold text-ink">
                      <span className="label-mono text-rose-500">{String(i + 1).padStart(2, '0')}</span>
                      {title}
                    </dt>
                    <dd className="mt-1.5 pl-8 text-sm leading-relaxed text-slate-600">{text}</dd>
                  </div>
                ))}
              </dl>
              <div className="space-y-6 lg:pl-6">
                <figure className="border border-bone-300 bg-white p-2 shadow-[0_18px_40px_-22px_rgba(20,22,27,0.4)]">
                  <Shot src="/shots/notas.jpg" width={2492} height={840} alt={t.ui.gradesAlt} />
                  <figcaption className="label-mono px-2 pb-1 pt-3 text-slate-500">{t.ui.gradesCaption}</figcaption>
                </figure>
                <figure className="border border-bone-300 bg-white p-2 shadow-[0_18px_40px_-22px_rgba(20,22,27,0.4)]">
                  <Shot src="/shots/estadisticas.jpg" width={2496} height={724} alt={t.ui.statsAlt} />
                  <figcaption className="label-mono px-2 pb-1 pt-3 text-slate-500">{t.ui.statsCaption}</figcaption>
                </figure>
              </div>
            </div>
          </div>
        </section>

        {/* Precios */}
        <section id="precios" className="scroll-mt-20 border-b border-bone-200 bg-bone-100 py-16 sm:py-24">
          <div className={wrap}>
            <Eyebrow n="04">{t.pricing.nav}</Eyebrow>
            <h2 className={h2}>{t.pricing.title}</h2>
            <p className="mt-4 max-w-2xl text-lg text-slate-600">{t.pricing.subtitle}</p>
            <div className="mt-12">
              <PricingCards
                t={t.pricing}
                actions={{
                  free: (
                    <Link to="/acceso?modo=crear" className={`${secondary} w-full`}>
                      {t.pricing.free.cta}
                    </Link>
                  ),
                  plus: (
                    <Link to="/acceso?modo=crear&plan=plus" className={`${primary} w-full`}>
                      {t.pricing.plus.cta}
                    </Link>
                  ),
                  academy: (
                    <a href="#ventas" className={`${secondary} w-full`}>
                      {t.pricing.academy.cta}
                    </a>
                  ),
                }}
              />
            </div>
            <p className="mt-6 text-sm text-slate-500">{t.pricing.vat}</p>
          </div>
        </section>

        {/* 5. Privacidad */}
        <section id="privacidad" className="scroll-mt-20 border-b border-bone-200 bg-brand-50 py-16 sm:py-24">
          <div className={`${wrap} grid gap-10 lg:grid-cols-[0.8fr_1.2fr]`}>
            <div>
              <Eyebrow n="05">{t.nav.privacy}</Eyebrow>
              <h2 className={h2}>{t.privacy.title}</h2>
              <p className="mt-4 text-lg text-slate-600">{t.privacy.subtitle}</p>
            </div>
            <ul className="grid gap-x-10 sm:grid-cols-2">
              {t.privacy.items.map(([title, text]) => (
                <li key={title} className="border-t-[1.5px] border-brand-700 py-5">
                  <h3 className="font-semibold text-ink">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 6. Preguntas frecuentes */}
        <section id="faq" className="scroll-mt-20 border-b border-bone-200 py-16 sm:py-24">
          <div className={`${wrap} grid gap-10 lg:grid-cols-[0.8fr_1.2fr]`}>
            <div>
              <Eyebrow n="06">{t.nav.faq}</Eyebrow>
              <h2 className={h2}>{t.faq.title}</h2>
            </div>
            <div className="border-t-[1.5px] border-ink">
              {t.faq.items.map(([q, a]) => (
                <details key={q} className="group border-b border-bone-300 py-5">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-lg font-semibold text-ink [&::-webkit-details-marker]:hidden">
                    {q}
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] border-rose-500 font-mono text-sm leading-none text-rose-500 transition group-open:border-brand-700 group-open:bg-brand-700 group-open:text-white" aria-hidden>
                      +
                    </span>
                  </summary>
                  <p className="mt-3 max-w-2xl leading-relaxed text-slate-600">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Por tipo de centro y guías: páginas que solo existen en castellano */}
        {locale === 'es' && (
        <>
        <section className="border-b border-bone-200 py-14">
          <div className={wrap}>
            <h2 className="display text-2xl text-ink">Korrige para tu centro</h2>
            <ul className="mt-6 grid gap-6 md:grid-cols-2">
              {SEGMENTS.map((s) => (
                <li key={s.slug}>
                  <Link to={`/${s.slug}`} className="group block h-full border-[1.5px] border-ink bg-white p-6 hover:bg-bone-100">
                    <span className="label-mono text-brand-700">{s.label}</span>
                    <span className="display mt-2 block text-2xl text-ink underline-offset-4 group-hover:underline">{s.h1}</span>
                    <span className="mt-2 block text-slate-600">{s.teaser}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Recursos (enlaces internos a las guías) */}
        <section className="border-b border-bone-200 py-14">
          <div className={wrap}>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="display text-2xl text-ink">Guías para profesores</h2>
              <Link to="/recursos" className="text-sm font-semibold text-brand-700 underline underline-offset-4">
                Ver todas
              </Link>
            </div>
            <ul className="mt-6 grid gap-x-8 border-t-[1.5px] border-ink md:grid-cols-3">
              {ARTICLES.slice(0, 3).map((a) => (
                <li key={a.slug} className="border-b border-bone-300 py-5 md:border-b-0">
                  <Link to={`/recursos/${a.slug}`} className="font-semibold text-ink underline-offset-4 hover:underline">
                    {a.h1}
                  </Link>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{a.intro}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        </>
        )}

        {/* 7. Hablar con ventas */}
        <section id="ventas" className="scroll-mt-16 bg-bone-100 py-16 sm:py-24">
          <div className={`${wrap} grid gap-12 lg:grid-cols-[0.85fr_1.15fr]`}>
            <div>
              <Eyebrow n="07">{t.sales.title}</Eyebrow>
              <h2 className={h2}>{t.cta.title}</h2>
              <p className="mt-4 text-lg text-slate-600">{t.sales.subtitle}</p>
              <ul className="mt-7 space-y-3">
                {t.sales.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-3 text-ink">
                    <span className="h-4 w-4 shrink-0 rounded-full border-[1.5px] border-brand-700 bg-brand-700" aria-hidden />
                    {b}
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-sm text-slate-600">
                {t.ui.writeUs}{' '}
                <a className="font-semibold text-brand-700 underline underline-offset-4" href={`mailto:${SALES_EMAIL}`}>
                  {SALES_EMAIL}
                </a>
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {t.cta.text}{' '}
                <Link className="font-semibold text-brand-700 underline decoration-rose-500 decoration-2 underline-offset-4" to="/demo">
                  {t.nav.demo}
                </Link>
              </p>
            </div>
            <div className="sheet-shadow relative border-[1.5px] border-ink bg-white p-3 sm:p-5">
              <CornerMarks size={9} inset={8} />
              <SalesForm t={t.sales} locale={locale} />
            </div>
          </div>
        </section>
      </main>

      {/* 8. Pie */}
      <footer className="border-t-[1.5px] border-ink bg-white">
        <div className={`${wrap} grid gap-8 py-12 sm:grid-cols-[1.4fr_1fr_1fr]`}>
          <div>
            <Logo className="text-3xl" />
            <p className="mt-3 max-w-xs text-sm text-slate-600">{t.footer.tagline}</p>
            {t.ui.appNote && <p className="mt-3 max-w-xs text-xs text-slate-500">{t.ui.appNote}</p>}
          </div>
          <div className="text-sm">
            <h3 className="label-mono text-slate-500">{t.footer.contact}</h3>
            <ul className="mt-3 space-y-2 text-ink">
              <li>
                <a className="underline-offset-4 hover:underline" href={`mailto:${SALES_EMAIL}`}>
                  {SALES_EMAIL}
                </a>
              </li>
              <li>
                <a className="underline-offset-4 hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li>
                <Link className="underline-offset-4 hover:underline" to="/guia">
                  {t.footer.guide}
                </Link>
              </li>
              <li>
                <a className="underline-offset-4 hover:underline" href="/comprobar">
                  {t.ui.student}
                </a>
              </li>
              {locale === 'es' && (
                <>
              <li>
                <Link className="underline-offset-4 hover:underline" to="/academias">
                  Para academias de oposiciones
                </Link>
              </li>
              <li>
                <Link className="underline-offset-4 hover:underline" to="/universidades">
                  Para universidades
                </Link>
              </li>
              <li>
                <Link className="underline-offset-4 hover:underline" to="/recursos">
                  Recursos para profesores
                </Link>
              </li>
              <li>
                <Link className="underline-offset-4 hover:underline" to="/tutoriales">
                  Vídeos tutoriales
                </Link>
              </li>
                </>
              )}
            </ul>
          </div>
          <div className="text-sm">
            <h3 className="label-mono text-slate-500">{t.footer.legal}</h3>
            <ul className="mt-3 space-y-2 text-ink">
              <li>
                <Link className="underline-offset-4 hover:underline" to="/legal/aviso-legal">
                  {t.footer.legalNotice}
                </Link>
              </li>
              <li>
                <Link className="underline-offset-4 hover:underline" to="/legal/privacidad">
                  {t.footer.privacy}
                </Link>
              </li>
              <li>
                <Link className="underline-offset-4 hover:underline" to="/legal/cookies">
                  {t.footer.cookies}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className={`${wrap} label-mono border-t border-bone-200 py-5 text-slate-500`}>
          © {new Date().getFullYear()} Korrige · {t.footer.rights}
        </div>
      </footer>
    </div>
  );
}
