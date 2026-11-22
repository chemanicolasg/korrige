import { useEffect, useRef, useState } from 'react';
import { appLocale, tr } from '../i18n/app';
import { TUTORIALS, TUTORIALS_PLAYLIST, Tutorial, fmtDuration } from '../tutorials';

const poster = (t: Tutorial) => (t.youtubeId ? `https://i.ytimg.com/vi/${t.youtubeId}/hqdefault.jpg` : `/tutoriales/${t.slug}.jpg`);

function Player({ t }: { t: Tutorial }) {
  if (t.youtubeId)
    return (
      <iframe
        key={t.slug}
        className="h-full w-full"
        src={`https://www.youtube-nocookie.com/embed/${t.youtubeId}?rel=0&cc_load_policy=1&hl=es`}
        title={t.title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  return (
    <video key={t.slug} className="h-full w-full bg-ink" controls preload="metadata" poster={poster(t)} data-testid="tutorial-video">
      <source src={`/tutoriales/${t.slug}.mp4`} type="video/mp4" />
      {/* los subtítulos ya van dentro del vídeo; la pista queda para lectores de pantalla y para quien quiera activarla */}
      <track kind="captions" srcLang="es" label="Español" src={`/tutoriales/${t.slug}.vtt`} />
    </video>
  );
}

/** Vídeos tutoriales: reproductor arriba y la serie completa debajo. Se usa en /tutoriales y en /app/tutoriales. */
export default function Tutorials({ heading = 'h1' }: { heading?: 'h1' | 'h2' }) {
  const [sel, setSel] = useState(0);
  const top = useRef<HTMLDivElement>(null);
  // enlace directo a un vídeo: /tutoriales#03-subir-hojas
  useEffect(() => {
    const i = TUTORIALS.findIndex((t) => t.slug === location.hash.slice(1));
    if (i >= 0) setSel(i);
  }, []);
  const pick = (i: number) => {
    setSel(i);
    history.replaceState(null, '', `#${TUTORIALS[i].slug}`);
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const t = TUTORIALS[sel];
  const H = heading;
  const total = TUTORIALS.reduce((a, x) => a + x.seconds, 0);
  return (
    <div data-testid="tutorials">
      <p className="label-mono text-brand-700">{tr('Vídeos tutoriales')}</p>
      <H className="display mt-3 text-[2.2rem] leading-[1.08] text-ink sm:text-[2.6rem]">{tr('Aprende Korrige en {n} vídeos cortos', { n: TUTORIALS.length })}</H>
      <p className="mt-3 max-w-2xl text-[17px] text-slate-600">
        {tr('Del examen en blanco a las notas en Moodle, paso a paso. Menos de un minuto cada uno; {total} en total.', { total: fmtDuration(total) })}
      </p>
      {appLocale() !== 'es' && <p className="mt-2 text-sm text-slate-500">{tr('Los vídeos están en castellano, con subtítulos.')}</p>}

      <div ref={top} className="mt-8 scroll-mt-6 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="aspect-video overflow-hidden rounded-xl border-[1.5px] border-ink bg-ink sheet-shadow">
          <Player t={t} />
        </div>
        <div>
          <p className="label-mono text-slate-500">{tr('Tutorial {n} de {total} · {dur}', { n: sel + 1, total: TUTORIALS.length, dur: fmtDuration(t.seconds) })}</p>
          <h3 className="display mt-2 text-[1.9rem] leading-tight text-ink">{t.title}</h3>
          <p className="font-serif text-xl italic text-brand-700">{t.kicker}</p>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-700">{t.summary}</p>
          <ol className="mt-4 space-y-1.5 text-sm text-slate-700">
            {t.steps.map((s, i) => (
              <li key={s} className="flex items-center gap-2.5">
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-rose-500 font-mono text-[10px] font-semibold text-brand-800">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap gap-2">
            {sel > 0 && (
              <button className="btn btn-sm" onClick={() => pick(sel - 1)}>
                {tr('← Anterior')}
              </button>
            )}
            {sel < TUTORIALS.length - 1 && (
              <button className="btn-primary btn-sm" onClick={() => pick(sel + 1)}>
                {tr('Siguiente vídeo →')}
              </button>
            )}
          </div>
        </div>
      </div>

      <h2 className="mt-14 text-lg font-semibold text-ink">{tr('La serie completa')}</h2>
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-4">
        {TUTORIALS.map((x, i) => (
          <li key={x.slug}>
            <button
              className={`group block w-full text-left ${i === sel ? '' : 'opacity-90 hover:opacity-100'}`}
              onClick={() => pick(i)}
              aria-current={i === sel ? 'true' : undefined}
              aria-label={tr('Ver el tutorial {n}: {title}', { n: i + 1, title: x.title })}
            >
              <span className={`relative block aspect-video overflow-hidden rounded-lg border-[1.5px] ${i === sel ? 'border-brand-700 ring-2 ring-brand-700' : 'border-bone-300 group-hover:border-ink'}`}>
                <img src={poster(x)} alt="" loading="lazy" className="h-full w-full object-cover" />
                <span className="absolute bottom-1.5 right-1.5 rounded bg-ink/85 px-1.5 py-0.5 font-mono text-[11px] text-white">{fmtDuration(x.seconds)}</span>
              </span>
              <span className="mt-2 block font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">{tr('Tutorial {n}', { n: i + 1 })}</span>
              <span className="block font-semibold text-ink group-hover:underline">{x.title}</span>
              <span className="block text-sm text-slate-500">{x.kicker}</span>
            </button>
          </li>
        ))}
      </ul>
      {TUTORIALS_PLAYLIST && (
        <p className="mt-8 text-sm">
          <a className="font-semibold text-brand-700 underline underline-offset-4" href={`https://www.youtube.com/playlist?list=${TUTORIALS_PLAYLIST}`} target="_blank" rel="noreferrer">
            {tr('Ver la lista completa en YouTube')}
          </a>
        </p>
      )}
    </div>
  );
}
