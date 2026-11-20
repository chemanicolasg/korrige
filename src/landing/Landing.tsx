import { ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { APP_NAME, CONTACT_EMAIL, SALES_EMAIL } from '../config';
import { ENABLED_LOCALES, LOCALE_NAMES, Locale, detectLocale, getDict } from '../i18n';
import { SalesForm } from './SalesForm';

const Mark = () => (
  <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
    <rect width="32" height="32" rx="7" fill="#1d36bd" />
    <circle cx="10" cy="16" r="4" fill="none" stroke="#fff" strokeWidth="2" />
    <circle cx="22" cy="16" r="5" fill="#fff" />
  </svg>
);

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);
const ICONS = {
  sheet: icon('M7 3h8l4 4v14H7zM15 3v4h4M10 12h.01M13 12h.01M16 12h.01M10 16h.01M13 16h.01M16 16h.01'),
  print: icon('M7 8V3h10v5M7 17H4v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7h-3M7 14h10v7H7z'),
  scan: icon('M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M4 12h16'),
  chart: icon('M4 20V10M10 20V4M16 20v-7M21 20H3'),
  models: icon('M8 4h11v13M5 7h11v13H5z'),
  minus: icon('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M8 12h8'),
  eye: icon('M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6'),
  export: icon('M12 3v12M8 11l4 4 4-4M5 21h14'),
  log: icon('M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01'),
  team: icon('M16 19v-1a4 4 0 0 0-8 0v1M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6M21 19v-1a3 3 0 0 0-3-3M3 19v-1a3 3 0 0 1 3-3'),
  hash: icon('M5 9h14M5 15h14M10 4 8 20M16 4l-2 16'),
  laptop: icon('M5 5h14v10H5zM3 19h18'),
  eu: icon('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18'),
  lock: icon('M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z'),
  shield: icon('M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6zM9 12l2 2 4-4'),
};

/** Ilustración del hero: la hoja de respuestas y lo que sale de ella. */
function HeroArt() {
  const rows = Array.from({ length: 9 }, (_, r) => r);
  const marks = [1, 2, 3, 0, 1, 3, 2, 1, 0];
  return (
    <svg viewBox="0 0 520 400" className="w-full" role="img" aria-label="Una hoja de respuestas escaneada se convierte en una tabla de notas">
      <defs>
        <filter id="sh" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#0f172a" floodOpacity="0.14" />
        </filter>
      </defs>
      <g filter="url(#sh)" transform="rotate(-4 150 200)">
        <rect x="30" y="26" width="236" height="334" rx="6" fill="#fff" />
        {[
          [44, 40],
          [240, 40],
          [44, 334],
          [240, 334],
        ].map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="12" height="12" fill="#0f172a" />
        ))}
        <rect x="66" y="42" width="96" height="7" rx="2" fill="#0f172a" />
        <rect x="66" y="55" width="70" height="4" rx="2" fill="#cbd5e1" />
        <g transform="translate(196 62)" fill="#0f172a">
          <rect width="32" height="32" fill="#fff" />
          {[0, 1, 2, 3, 4, 5, 6, 7].flatMap((i) => [0, 1, 2, 3, 4, 5, 6, 7].map((j) => ((i * 7 + j * 5 + i * j) % 3 === 0 ? <rect key={`${i}${j}`} x={i * 4} y={j * 4} width="4" height="4" /> : null)))}
        </g>
        <rect x="52" y="106" width="192" height="1" fill="#0f172a" />
        {rows.map((r) => (
          <g key={r} transform={`translate(58 ${124 + r * 22})`}>
            <text x="0" y="5" fontSize="9" fontWeight="700" fill="#0f172a">
              {r + 1}
            </text>
            {[0, 1, 2, 3].map((c) => (
              <circle key={c} cx={24 + c * 20} cy="2" r="7" fill={marks[r] === c ? '#1e3a8a' : '#fff'} stroke="#cc3359" strokeWidth="1.2" />
            ))}
            {[0, 1, 2, 3].map((c) => (
              <circle key={c} cx={128 + c * 20} cy="2" r="7" fill={marks[(r + 4) % 9] === c ? '#1e3a8a' : '#fff'} stroke="#cc3359" strokeWidth="1.2" />
            ))}
          </g>
        ))}
      </g>
      <path d="M286 200 h44" stroke="#2546e0" strokeWidth="3" strokeLinecap="round" />
      <path d="m322 190 12 10-12 10" fill="none" stroke="#2546e0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <g filter="url(#sh)">
        <rect x="346" y="70" width="160" height="250" rx="12" fill="#fff" />
        <rect x="346" y="70" width="160" height="38" rx="12" fill="#1d36bd" />
        <rect x="346" y="96" width="160" height="12" fill="#1d36bd" />
        <text x="360" y="94" fontSize="12" fontWeight="700" fill="#fff">
          Notas · 148 alumnos
        </text>
        {[
          ['García, L.', '8,75', '#16a34a'],
          ['Martí, P.', '6,50', '#16a34a'],
          ['Roca, A.', '4,25', '#94a3b8'],
          ['Soler, M.', '9,25', '#16a34a'],
          ['Vidal, J.', '7,00', '#16a34a'],
        ].map(([n, g, c], i) => (
          <g key={n} transform={`translate(360 ${130 + i * 26})`}>
            <text fontSize="11" fill="#334155">
              {n}
            </text>
            <text x="132" textAnchor="end" fontSize="11" fontWeight="700" fill="#0f172a">
              {g}
            </text>
            <rect y="7" width="132" height="1" fill="#e2e8f0" />
            <circle cx="96" cy="-4" r="3" fill={c} />
          </g>
        ))}
        <g transform="translate(360 268)">
          {[10, 16, 24, 34, 28, 18, 9].map((h, i) => (
            <rect key={i} x={i * 19} y={36 - h} width="15" height={h} rx="2" fill={i < 2 ? '#94a3b8' : '#2546e0'} />
          ))}
        </g>
      </g>
      <g transform="translate(268 300)">
        <rect width="150" height="34" rx="17" fill="#fef3c7" stroke="#f59e0b" />
        <text x="75" y="21" textAnchor="middle" fontSize="11" fontWeight="600" fill="#92400e">
          3 marcas por revisar
        </text>
      </g>
    </svg>
  );
}

function Section({ id, title, subtitle, children, tone = 'white' }: { id?: string; title: string; subtitle?: string; children: ReactNode; tone?: 'white' | 'soft' }) {
  return (
    <section id={id} className={`scroll-mt-20 py-16 sm:py-20 ${tone === 'soft' ? 'bg-slate-50' : 'bg-white'}`}>
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="max-w-3xl text-3xl font-semibold text-slate-900 sm:text-4xl">{title}</h2>
        {subtitle && <p className="mt-3 max-w-2xl text-lg text-slate-600">{subtitle}</p>}
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

export default function Landing() {
  const [locale, setLocale] = useState<Locale>('es');
  const [menu, setMenu] = useState(false);
  // el idioma guardado se aplica tras montar (el HTML prerenderizado va en español)
  useEffect(() => setLocale(detectLocale()), []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const t = getDict(locale);
  const featureIcons = [ICONS.models, ICONS.minus, ICONS.eye, ICONS.chart, ICONS.export, ICONS.log, ICONS.team, ICONS.hash];
  const stepIcons = [ICONS.sheet, ICONS.print, ICONS.scan, ICONS.chart];
  const privacyIcons = [ICONS.laptop, ICONS.eu, ICONS.lock, ICONS.shield];
  const links: [string, string][] = [
    ['#como-funciona', t.nav.how],
    ['#funcionalidades', t.nav.features],
    ['#privacidad', t.nav.privacy],
    ['#faq', t.nav.faq],
  ];
  const primary = 'inline-flex items-center justify-center rounded-lg bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800';
  const secondary = 'inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50';

  return (
    <div className="bg-white text-slate-800">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-3">
          <a href="#top" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900">
            <Mark /> {APP_NAME}
          </a>
          <nav className="hidden items-center gap-5 text-sm font-medium text-slate-600 lg:flex" aria-label="Secciones">
            {links.map(([href, label]) => (
              <a key={href} href={href} className="hover:text-slate-900">
                {label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {ENABLED_LOCALES.length > 1 && (
              <select
                aria-label="Idioma"
                className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
                value={locale}
                onChange={(e) => {
                  localStorage.setItem('korrige-lang', e.target.value);
                  setLocale(e.target.value as Locale);
                }}
              >
                {ENABLED_LOCALES.map((l) => (
                  <option key={l} value={l}>
                    {LOCALE_NAMES[l]}
                  </option>
                ))}
              </select>
            )}
            <Link to="/acceso" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:inline-flex">
              {t.nav.login}
            </Link>
            <a href="#ventas" className="inline-flex rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-800">
              {t.nav.sales}
            </a>
            <button className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden" aria-label="Menú" aria-expanded={menu} onClick={() => setMenu(!menu)}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
        </div>
        {menu && (
          <nav className="border-t border-slate-200 bg-white px-5 py-3 lg:hidden" aria-label="Secciones (móvil)">
            {[...links, ['/acceso', t.nav.login] as [string, string]].map(([href, label]) => (
              <a key={href} href={href} className="block py-2 text-sm font-medium text-slate-700" onClick={() => setMenu(false)}>
                {label}
              </a>
            ))}
          </nav>
        )}
      </header>

      <main id="contenido">
        {/* 1. Hero */}
        <section id="top" className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-14 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-20">
            <div>
              <p className="inline-flex rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-800">{t.hero.kicker}</p>
              <h1 className="mt-5 text-4xl font-semibold leading-[1.1] text-slate-900 sm:text-5xl">{t.hero.title}</h1>
              <p className="mt-5 max-w-xl text-lg text-slate-600">{t.hero.subtitle}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#ventas" className={primary}>
                  {t.nav.sales}
                </a>
                <Link to="/acceso" className={secondary}>
                  {t.nav.login}
                </Link>
                <Link to="/demo" className="inline-flex items-center px-3 py-3 text-sm font-semibold text-brand-700 hover:underline">
                  {t.nav.demo} →
                </Link>
              </div>
              <p className="mt-4 text-sm text-slate-500">{t.hero.note}</p>
              <dl className="mt-10 grid max-w-md grid-cols-3 gap-6">
                {t.hero.stats.map(([v, l]) => (
                  <div key={l}>
                    <dt className="sr-only">{l}</dt>
                    <dd className="text-2xl font-semibold text-slate-900">{v}</dd>
                    <dd className="text-xs text-slate-500">{l}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <HeroArt />
          </div>
        </section>

        {/* 2. El problema */}
        <Section title={t.problem.title} subtitle={t.problem.intro} tone="soft">
          <div className="grid gap-5 md:grid-cols-3">
            {t.problem.cards.map(([title, text]) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 max-w-3xl border-l-4 border-brand-600 pl-4 text-lg font-medium text-slate-800">{t.problem.after}</p>
        </Section>

        {/* 3. Cómo funciona */}
        <Section id="como-funciona" title={t.how.title} subtitle={t.how.subtitle}>
          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {t.how.steps.map(([title, text], i) => (
              <li key={title} className="relative rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">{stepIcons[i]}</span>
                  <span className="text-sm font-semibold text-brand-700">Paso {i + 1}</span>
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p>
              </li>
            ))}
          </ol>
        </Section>

        {/* 4. Funcionalidades */}
        <Section id="funcionalidades" title={t.features.title} tone="soft">
          <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {t.features.items.map(([title, text], i) => (
              <div key={title}>
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-brand-700 shadow-sm ring-1 ring-slate-200">{featureIcons[i]}</span>
                <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* 5. Privacidad */}
        <Section id="privacidad" title={t.privacy.title} subtitle={t.privacy.subtitle}>
          <div className="grid gap-5 sm:grid-cols-2">
            {t.privacy.items.map(([title, text], i) => (
              <div key={title} className="flex gap-4 rounded-2xl border border-slate-200 p-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">{privacyIcons[i]}</span>
                <div>
                  <h3 className="font-semibold text-slate-900">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* 6. FAQ */}
        <Section id="faq" title={t.faq.title} tone="soft">
          <div className="max-w-3xl divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {t.faq.items.map(([q, a]) => (
              <details key={q} className="group px-6 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900">
                  {q}
                  <span className="text-xl font-normal text-slate-400 transition group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{a}</p>
              </details>
            ))}
          </div>
        </Section>

        {/* 7. Hablar con ventas */}
        <section id="ventas" className="scroll-mt-16 bg-brand-950 py-16 text-white sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <h2 className="text-3xl font-semibold sm:text-4xl">{t.sales.title}</h2>
              <p className="mt-4 text-lg text-brand-100">{t.sales.subtitle}</p>
              <ul className="mt-6 space-y-3">
                {t.sales.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-3 text-brand-50">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-sm" aria-hidden>
                      ✓
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-sm text-brand-200">
                ¿Prefieres escribirnos?{' '}
                <a className="font-semibold text-white underline" href={`mailto:${SALES_EMAIL}`}>
                  {SALES_EMAIL}
                </a>
              </p>
            </div>
            <SalesForm t={t.sales} locale={locale} />
          </div>
        </section>

        <section className="bg-white py-14">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-5">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">{t.cta.title}</h2>
              <p className="mt-1 text-slate-600">{t.cta.text}</p>
            </div>
            <div className="flex gap-3">
              <Link to="/demo" className={primary}>
                {t.nav.demo}
              </Link>
              <Link to="/acceso" className={secondary}>
                {t.nav.login}
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 8. Pie */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Mark /> {APP_NAME}
            </div>
            <p className="mt-2 text-sm text-slate-600">{t.footer.tagline}</p>
          </div>
          <div className="text-sm">
            <h3 className="font-semibold text-slate-900">{t.footer.contact}</h3>
            <ul className="mt-2 space-y-1.5 text-slate-600">
              <li>
                <a className="hover:underline" href={`mailto:${SALES_EMAIL}`}>
                  {SALES_EMAIL}
                </a>
              </li>
              <li>
                <a className="hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li>
                <Link className="hover:underline" to="/guia">
                  {t.footer.guide}
                </Link>
              </li>
            </ul>
          </div>
          <div className="text-sm">
            <h3 className="font-semibold text-slate-900">{t.footer.legal}</h3>
            <ul className="mt-2 space-y-1.5 text-slate-600">
              <li>
                <Link className="hover:underline" to="/legal/aviso-legal">
                  {t.footer.legalNotice}
                </Link>
              </li>
              <li>
                <Link className="hover:underline" to="/legal/privacidad">
                  {t.footer.privacy}
                </Link>
              </li>
              <li>
                <Link className="hover:underline" to="/legal/cookies">
                  {t.footer.cookies}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-200 py-4 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} {APP_NAME}. {t.footer.rights}
        </div>
      </footer>
    </div>
  );
}
