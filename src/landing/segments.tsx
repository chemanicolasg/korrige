/**
 * Páginas por tipo de centro (/academias y /universidades): responden a las búsquedas
 * de cada segmento y sirven de destino para las campañas. Se prerenderizan en el build.
 * title ≤ 60 caracteres y description ≤ 155 (lo comprueba scripts/prerender.mjs).
 */
import { Link } from 'react-router-dom';
import { Shell } from './Resources';
import { SEGMENTS, Segment, segmentBySlug } from './segmentData';

export default function SegmentPage({ slug, articles }: { slug: Segment['slug']; articles: { slug: string; h1: string }[] }) {
  const s = segmentBySlug(slug)!;
  const other = SEGMENTS.find((x) => x.slug !== slug)!;
  const wrap = 'mx-auto max-w-5xl px-5';
  return (
    <Shell>
      <section className="border-b border-bone-200">
        <div className={`${wrap} py-16`}>
          <p className="label-mono text-brand-700">{s.label}</p>
          <h1 className="display mt-4 max-w-3xl text-[2.4rem] leading-[1.06] text-ink sm:text-[3.4rem]">{s.h1}</h1>
          <p className="mt-6 max-w-2xl text-xl leading-relaxed text-slate-600">{s.intro}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/#ventas" className="rounded-md bg-brand-700 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-800">
              {s.cta}
            </a>
            <Link to="/demo" className="rounded-md border-[1.5px] border-ink px-5 py-3 text-sm font-semibold text-ink hover:bg-ink hover:text-white">
              Probar la demo sin registrarte
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-500">El primer examen es gratis y completo, sin tarjeta.</p>
        </div>
      </section>

      <section className="border-b border-bone-200 bg-bone-100">
        <div className={`${wrap} grid gap-10 py-14 md:grid-cols-[1fr_1.1fr] md:items-center`}>
          <div>
            <h2 className="display text-[1.9rem] leading-tight text-ink">Lo que cambia</h2>
            <dl className="mt-6 space-y-6">
              {s.problems.map(([t, d]) => (
                <div key={t}>
                  <dt className="font-semibold text-ink">{t}</dt>
                  <dd className="mt-1 leading-relaxed text-slate-600">{d}</dd>
                </div>
              ))}
            </dl>
          </div>
          <img
            src={slug === 'academias' ? '/shots/notas.jpg' : '/shots/estadisticas.jpg'}
            alt={slug === 'academias' ? 'Tabla de notas de un examen tipo test corregido con Korrige' : 'Estadísticas por pregunta de un examen tipo test en Korrige'}
            loading="lazy"
            className="sheet-shadow w-full border-[1.5px] border-ink bg-white"
          />
        </div>
      </section>

      <section className="border-b border-bone-200">
        <div className={`${wrap} py-14`}>
          <h2 className="display text-[1.9rem] leading-tight text-ink">Cómo funciona</h2>
          <ol className="mt-8 grid gap-x-8 gap-y-8 border-t-[1.5px] border-ink pt-8 sm:grid-cols-2 lg:grid-cols-4">
            {s.steps.map(([t, d], i) => (
              <li key={t}>
                <span className="label-mono text-rose-500">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="mt-2 font-semibold text-ink">{t}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-bone-200">
        <div className={`${wrap} py-14`}>
          <h2 className="display text-[1.9rem] leading-tight text-ink">Pensado para {slug === 'academias' ? 'preparadores' : 'el profesorado'}</h2>
          <ul className="mt-8 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {s.features.map(([t, d]) => (
              <li key={t} className="border-t border-bone-300 pt-4">
                <h3 className="font-semibold text-ink">{t}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-b border-bone-200 bg-bone-100">
        <div className={`${wrap} py-14`}>
          <h2 className="display text-[1.9rem] leading-tight text-ink">Preguntas frecuentes</h2>
          <dl className="mt-6 max-w-3xl divide-y divide-bone-300 border-y border-bone-300">
            {s.faq.map(([q, a]) => (
              <div key={q} className="py-5">
                <dt className="font-semibold text-ink">{q}</dt>
                <dd className="mt-2 leading-relaxed text-slate-600">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section>
        <div className={`${wrap} grid gap-10 py-14 md:grid-cols-2`}>
          <aside className="sheet-shadow relative border-[1.5px] border-ink bg-white p-7">
            <h2 className="display text-2xl text-ink">{s.cta}</h2>
            <p className="mt-2 text-slate-600">
              Cuéntanos cuántos alumnos y exámenes tenéis y te enseñamos Korrige con uno de vuestros exámenes. También puedes empezar por tu cuenta: el primero es gratis.
            </p>
            <p className="mt-3 text-sm text-slate-600">
              ¿Necesitáis integrarlo con vuestro Moodle, intranet o sistema de gestión? Lo hacemos a medida: cuéntanoslo en el formulario.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href="/#ventas" className="rounded-md bg-brand-700 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-800">
                Hablar con ventas
              </a>
              <a href="/#precios" className="rounded-md border-[1.5px] border-ink px-5 py-3 text-sm font-semibold text-ink hover:bg-ink hover:text-white">
                Ver precios
              </a>
            </div>
          </aside>
          <nav aria-label="Guías relacionadas">
            <h2 className="label-mono text-slate-500">Guías relacionadas</h2>
            <ul className="mt-3 border-t border-bone-300">
              {s.related
                .map((r) => articles.find((a) => a.slug === r))
                .filter((a): a is { slug: string; h1: string } => !!a)
                .map((a) => (
                  <li key={a.slug} className="border-b border-bone-300">
                    <Link to={`/recursos/${a.slug}`} className="display block py-3.5 text-lg text-ink underline-offset-4 hover:underline">
                      {a.h1}
                    </Link>
                  </li>
                ))}
              <li className="border-b border-bone-300">
                <Link to={`/${other.slug}`} className="display block py-3.5 text-lg text-ink underline-offset-4 hover:underline">
                  Korrige {other.label.toLowerCase()}
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </section>
    </Shell>
  );
}
