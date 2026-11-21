import { Link, useParams } from 'react-router-dom';
import { Logo } from '../components/ui';
import { ARTICLES, articleBySlug } from './articles';

const PROSE =
  'text-[17px] leading-[1.7] text-slate-700 [&_h2]:display [&_h2]:mt-12 [&_h2]:mb-3 [&_h2]:text-[1.7rem] [&_h2]:leading-tight [&_h2]:text-ink [&_h3]:mt-7 [&_h3]:mb-1 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-ink [&_p]:my-4 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_b]:text-ink [&_table]:my-6 [&_table]:w-full [&_table]:border-collapse [&_table]:text-[15px] [&_th]:border-b-[1.5px] [&_th]:border-ink [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-ink [&_td]:border-b [&_td]:border-bone-300 [&_td]:px-3 [&_td]:py-2.5 [&_td]:align-top';

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white">
      <header className="border-b border-bone-200">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-5 py-3.5">
          <Link to="/" className="text-[1.6rem] leading-none">
            <Logo />
          </Link>
          <nav className="ml-auto flex items-center gap-5 text-sm">
            <Link to="/academias" className="hidden text-slate-600 underline-offset-4 hover:text-ink hover:underline md:inline">
              Academias
            </Link>
            <Link to="/universidades" className="hidden text-slate-600 underline-offset-4 hover:text-ink hover:underline md:inline">
              Universidades
            </Link>
            <Link to="/recursos" className="text-slate-600 underline-offset-4 hover:text-ink hover:underline">
              Recursos
            </Link>
            <Link to="/demo" className="hidden text-slate-600 underline-offset-4 hover:text-ink hover:underline sm:inline">
              Probar la demo
            </Link>
            <a href="/#ventas" className="rounded-md bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800">
              Hablar con ventas
            </a>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t-[1.5px] border-ink">
        <div className="label-mono mx-auto flex max-w-5xl flex-wrap gap-x-6 gap-y-2 px-5 py-6 text-slate-500">
          <Link to="/">Korrige</Link>
          <Link to="/academias">Para academias</Link>
          <Link to="/universidades">Para universidades</Link>
          <Link to="/recursos">Recursos</Link>
          <Link to="/guia">Guía de impresión y escaneo</Link>
          <Link to="/legal/privacidad">Privacidad</Link>
        </div>
      </footer>
    </div>
  );
}

export function ResourceIndex() {
  return (
    <Shell>
      <div className="mx-auto max-w-5xl px-5 py-14">
        <p className="label-mono text-brand-700">Recursos</p>
        <h1 className="display mt-4 text-[2.4rem] leading-[1.08] text-ink sm:text-5xl">Guías para corregir exámenes tipo test</h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-600">Métodos de corrección, fórmulas de penalización y consejos prácticos para profesores de universidad y academias.</p>
        <ul className="mt-10 border-t-[1.5px] border-ink">
          {ARTICLES.map((a, i) => (
            <li key={a.slug} className="border-b border-bone-300">
              <Link to={`/recursos/${a.slug}`} className="group grid gap-x-6 gap-y-1 py-6 sm:grid-cols-[3rem_1fr]">
                <span className="label-mono pt-2 text-rose-500">{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <span className="display block text-2xl text-ink underline-offset-4 group-hover:underline">{a.h1}</span>
                  <span className="mt-1.5 block text-slate-600">{a.description}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Shell>
  );
}

export default function ResourcePage() {
  const { slug } = useParams();
  const a = articleBySlug(slug);
  if (!a) return <ResourceIndex />;
  const others = ARTICLES.filter((x) => x.slug !== a.slug);
  return (
    <Shell>
      <article className="mx-auto max-w-3xl px-5 py-14">
        <p className="label-mono text-brand-700">
          <Link to="/recursos" className="hover:underline">
            Recursos
          </Link>
        </p>
        <h1 className="display mt-4 text-[2.3rem] leading-[1.08] text-ink sm:text-[3rem]">{a.h1}</h1>
        <p className="mt-5 text-xl leading-relaxed text-slate-600">{a.intro}</p>
        <div className={`mt-4 ${PROSE}`}>{a.body}</div>

        <aside className="sheet-shadow relative mt-14 border-[1.5px] border-ink bg-white p-7">
          <h2 className="display text-2xl text-ink">Pruébalo con uno de tus exámenes</h2>
          <p className="mt-2 text-slate-600">Korrige corrige cientos de exámenes tipo test en minutos con la fotocopiadora que ya tienes. La demo funciona en tu navegador, sin registrarte.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/demo" className="rounded-md bg-brand-700 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-800">
              Probar la demo
            </Link>
            <a href="/#ventas" className="rounded-md border-[1.5px] border-ink px-5 py-3 text-sm font-semibold text-ink hover:bg-ink hover:text-white">
              Hablar con ventas
            </a>
          </div>
        </aside>

        <nav className="mt-14" aria-label="Más recursos">
          <h2 className="label-mono text-slate-500">Sigue leyendo</h2>
          <ul className="mt-3 border-t border-bone-300">
            {others.map((o) => (
              <li key={o.slug} className="border-b border-bone-300">
                <Link to={`/recursos/${o.slug}`} className="display block py-4 text-xl text-ink underline-offset-4 hover:underline">
                  {o.h1}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </article>
    </Shell>
  );
}
