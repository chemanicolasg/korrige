import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { idCrop, modelCrop, questionCrop, scoreColor } from '../../components/SheetOverlay';
import { Empty } from '../../components/ui';
import { tr, trn } from '../../i18n/app';
import { Resolution, isStudentSheet, resolveItem } from '../../lib/service';
import { INVALID, KIND_LABEL, ReviewItem, ReviewKind, Sheet } from '../../lib/types';
import { modelLetters, optionLetters } from '../../omr/layout';
import { useExam } from '../ExamPage';
import { SheetImage, pageOfQuestion } from '../SheetImage';

const KIND_ORDER: ReviewKind[] = ['ilegible', 'en_blanco', 'qr', 'pagina_faltante', 'id_dudoso', 'id_duplicado', 'id_no_en_lista', 'modelo', 'doble', 'floja'];
const isIdKind = (k: ReviewKind) => k === 'id_dudoso' || k === 'id_duplicado' || k === 'id_no_en_lista';
const isQKind = (k: ReviewKind) => k === 'doble' || k === 'floja';

// Valores que se guardan en castellano en la base de datos y se traducen al mostrarlos
const RESOLUTION_TEXT: Record<string, string> = {
  respuesta: tr('respuesta'),
  modelo: tr('modelo'),
  identificador: tr('identificador'),
  aceptar: tr('aceptar'),
  excluir: tr('excluir'),
  auto: tr('auto'),
};
const MODEL_STATE_TEXT: Record<string, string> = { 'sin marcar': tr('sin marcar'), blanco: tr('blanco'), doble: tr('doble'), floja: tr('floja') };

function Kbd({ children }: { children: string }) {
  return <kbd className="kbd">{children}</kbd>;
}

export default function TabReview() {
  const { data, db, run, readOnly, busy, userId } = useExam();
  const [kind, setKind] = useState<ReviewKind | 'todas'>('todas');
  const [showDone, setShowDone] = useState(false);
  const [selId, setSelId] = useState<string | null>(null);
  const [idValue, setIdValue] = useState('');
  const idInput = useRef<HTMLInputElement>(null);

  const sheets = useMemo(() => new Map(data.sheets.map((s) => [s.id, s])), [data.sheets]);
  const students = useMemo(() => new Map(data.students.map((s) => [s.identifier, s])), [data.students]);
  const sorted = useMemo(
    () =>
      [...data.items].sort(
        (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || (sheets.get(a.sheet_id)?.seq ?? 0) - (sheets.get(b.sheet_id)?.seq ?? 0) || (a.question ?? 0) - (b.question ?? 0),
      ),
    [data.items, sheets],
  );
  const pendingAll = sorted.filter((i) => i.status === 'pendiente');
  const list = sorted.filter((i) => (showDone ? true : i.status === 'pendiente') && (kind === 'todas' || i.kind === kind));
  const cur = list.find((i) => i.id === selId) ?? list.find((i) => i.status === 'pendiente') ?? list[0] ?? null;
  const sheet = cur ? sheets.get(cur.sheet_id) : undefined;
  const counts = useMemo(() => {
    const c: Partial<Record<ReviewKind, number>> = {};
    for (const i of pendingAll) c[i.kind] = (c[i.kind] ?? 0) + 1;
    return c;
  }, [pendingAll]);

  useEffect(() => {
    if (cur && sheet && isIdKind(cur.kind)) setIdValue(sheet.identifier.replace(/\?/g, ''));
  }, [cur?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const move = useCallback(
    (d: number) => {
      if (!list.length) return;
      const i = Math.max(0, list.findIndex((x) => x.id === cur?.id));
      setSelId(list[Math.min(list.length - 1, Math.max(0, i + d))].id);
    },
    [list, cur?.id],
  );

  const resolve = useCallback(
    async (res: Resolution) => {
      if (!cur || readOnly || busy || cur.status !== 'pendiente') return;
      // la siguiente incidencia pendiente pasa a ser la actual
      const i = list.findIndex((x) => x.id === cur.id);
      const next = list.slice(i + 1).find((x) => x.status === 'pendiente') ?? list.slice(0, i).find((x) => x.status === 'pendiente');
      const ok = await run((d) => resolveItem(db, d, userId, cur.id, res));
      if (ok) setSelId(next?.id ?? null);
    },
    [cur, readOnly, busy, list, run, db, userId],
  );

  const options = optionLetters(data.exam.sheet_config);
  const models = modelLetters(data.exam.sheet_config);
  const suggestion = cur && cur.kind === 'floja' && String(cur.detail.leido ?? '').length === 1 ? String(cur.detail.leido) : null;

  // Atajos de teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      const typing = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT';
      if (typing) return;
      const k = e.key.toUpperCase();
      if (k === 'ARROWDOWN' || k === 'J') return e.preventDefault(), move(1);
      if (k === 'ARROWUP' || k === 'K') return e.preventDefault(), move(-1);
      if (!cur || cur.status !== 'pendiente' || readOnly) return;
      if (isQKind(cur.kind)) {
        if (options.includes(k)) return void resolve({ type: 'respuesta', value: k });
        if (k === '0' || k === 'BACKSPACE') return e.preventDefault(), void resolve({ type: 'respuesta', value: '' });
        if (k === 'X') return void resolve({ type: 'respuesta', value: INVALID });
        if (k === 'ENTER' && suggestion) return void resolve({ type: 'respuesta', value: suggestion });
      } else if (cur.kind === 'modelo') {
        if (models.includes(k)) return void resolve({ type: 'modelo', value: k });
      } else if (isIdKind(cur.kind)) {
        if (k === 'ENTER' || k === 'I') return e.preventDefault(), idInput.current?.focus();
      } else if (k === 'ENTER') return void resolve({ type: 'aceptar' });
      if (k === 'DELETE') void resolve({ type: 'excluir' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cur, move, resolve, options, models, readOnly, suggestion]);

  if (!data.sheets.length) {
    return (
      <Empty
        title={tr('Todavía no hay nada que revisar')}
        action={
          <Link className="btn-primary" to="../subir">
            {tr('Subir hojas')}
          </Link>
        }
      >
        {tr('Cuando subas el PDF escaneado, aquí aparecerá todo lo dudoso: dobles marcas, marcas flojas, identificadores incompletos, hojas en blanco…')}
      </Empty>
    );
  }
  if (!data.items.length) return <Empty title={tr('Sin incidencias')}>{tr('Todas las hojas se han leído sin dudas. Puedes ir directamente a Notas.')}</Empty>;

  const describe = (it: ReviewItem, s?: Sheet) => {
    const who = s ? (students.get(s.identifier) ? `${students.get(s.identifier)!.last_name}, ${students.get(s.identifier)!.first_name}` : s.identifier) : '';
    return tr('{tipo}{pregunta} — hoja {n} ({quien})', { tipo: KIND_LABEL[it.kind], pregunta: it.question ? tr(' · P{q}', { q: it.question }) : '', n: s?.seq ?? '?', quien: who });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button className={`badge px-3 py-1 ${kind === 'todas' ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-700'}`} onClick={() => setKind('todas')}>
          {tr('Todas ({n})', { n: pendingAll.length })}
        </button>
        {KIND_ORDER.filter((k) => counts[k]).map((k) => (
          <button key={k} className={`badge px-3 py-1 ${kind === k ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-700'}`} onClick={() => setKind(k)}>
            {KIND_LABEL[k]} ({counts[k]})
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> {tr('Ver también las resueltas')}
        </label>
      </div>

      {pendingAll.length === 0 && !showDone ? (
        <Empty
          title={tr('¡Revisión terminada!')}
          action={
            <Link className="btn-primary" to="../notas">
              {tr('Ver notas')}
            </Link>
          }
        >
          {tr('No quedan incidencias pendientes. Todas las correcciones han quedado registradas en Actividad.')}
        </Empty>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <ol className="card max-h-[70vh] divide-y divide-slate-100 overflow-y-auto" aria-label={tr('Cola de revisión')}>
            {list.map((it) => {
              const s = sheets.get(it.sheet_id);
              return (
                <li key={it.id}>
                  <button
                    aria-current={it.id === cur?.id}
                    onClick={() => setSelId(it.id)}
                    className={`block w-full px-3 py-2 text-left text-sm ${it.id === cur?.id ? 'bg-brand-50' : 'hover:bg-slate-50'} ${it.status === 'resuelta' ? 'text-slate-400' : ''}`}
                  >
                    <span className="font-medium">
                      {it.status === 'resuelta' && '✓ '}
                      {KIND_LABEL[it.kind]}
                      {it.question ? tr(' · pregunta {q}', { q: it.question }) : ''}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {tr('Hoja {n} · {id}', { n: s?.seq ?? '', id: s?.identifier ?? '' })}
                      {s && students.get(s.identifier) ? ` · ${students.get(s.identifier)!.last_name}` : ''}
                    </span>
                  </button>
                </li>
              );
            })}
            {list.length === 0 && <li className="p-4 text-sm text-slate-500">{tr('Nada pendiente de este tipo.')}</li>}
          </ol>

          {cur && sheet && (
            <section className="card p-5" aria-live="polite" data-testid="review-panel">
              <h2 className="text-base font-semibold">{describe(cur, sheet)}</h2>
              <p className="text-xs text-slate-500">
                {tr('{archivo}, página {n} del PDF', { archivo: sheet.pages[0]?.archivo ?? '', n: sheet.pages[0]?.pdf_pagina ?? '' })}
                {cur.status === 'resuelta' &&
                  tr(' · resuelta ({detalle})', {
                    detalle: `${RESOLUTION_TEXT[String(cur.resolution?.tipo ?? '')] ?? String(cur.resolution?.tipo ?? '')}${cur.resolution?.valor !== undefined ? `: ${String(cur.resolution.valor) || tr('en blanco')}` : ''}`,
                  })}
              </p>

              {/* Pregunta con doble marca o marca floja */}
              {isQKind(cur.kind) && cur.question != null && (
                <div className="mt-4">
                  <SheetImage
                    sheet={sheet}
                    layout={data.layout}
                    page={pageOfQuestion(data.layout, cur.question)}
                    crop={questionCrop(data.layout.pages[pageOfQuestion(data.layout, cur.question) - 1], String(cur.question))}
                    highlight={String(cur.question)}
                    className="w-full max-w-2xl rounded-lg border border-slate-200"
                  />
                  <p className="mt-3 text-sm text-slate-700">
                    {trn('El sistema ha leído {leido}. Respuesta actual: {actual}. ¿Qué respuesta cuenta?', {
                      leido: <b>{cur.kind === 'doble' ? tr('varias marcas ({v})', { v: String(cur.detail.leido) }) : tr('una marca floja ({v})', { v: String(cur.detail.leido) })}</b>,
                      actual: <b>{sheet.answers[String(cur.question)] === INVALID ? tr('nula') : sheet.answers[String(cur.question)] || tr('en blanco')}</b>,
                    })}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {options.map((o, j) => {
                      const sc = sheet.scores[String(cur.question)]?.[j] ?? 0;
                      return (
                        <button key={o} className="btn min-w-16 flex-col !gap-0 py-1.5" disabled={readOnly || busy || cur.status !== 'pendiente'} onClick={() => void resolve({ type: 'respuesta', value: o })}>
                          <span className="text-base font-semibold">{o}</span>
                          <span className="text-[10px] font-normal" style={{ color: scoreColor(sc) }}>
                            {tr('relleno {n} %', { n: Math.round(sc * 100) })}
                          </span>
                        </button>
                      );
                    })}
                    <button className="btn" disabled={readOnly || busy || cur.status !== 'pendiente'} onClick={() => void resolve({ type: 'respuesta', value: '' })}>
                      {tr('En blanco')}
                    </button>
                    <button className="btn" disabled={readOnly || busy || cur.status !== 'pendiente'} onClick={() => void resolve({ type: 'respuesta', value: INVALID })}>
                      {tr('Nula (cuenta como error)')}
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    {trn('Atajos: {opciones} elegir · {cero} en blanco · {x} nula{sugerencia} · {arriba}{abajo} moverse', {
                      opciones: options.map((o) => <Kbd key={o}>{o}</Kbd>).reduce<React.ReactNode[]>((a, x) => [...a, ' ', x], []),
                      cero: <Kbd>0</Kbd>,
                      x: <Kbd>X</Kbd>,
                      sugerencia: suggestion ? trn(' · {enter} aceptar {letra}', { enter: <Kbd>Enter</Kbd>, letra: suggestion }) : null,
                      arriba: <Kbd>↑</Kbd>,
                      abajo: <Kbd>↓</Kbd>,
                    })}
                  </p>
                </div>
              )}

              {/* Identificador */}
              {isIdKind(cur.kind) && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <SheetImage sheet={sheet} layout={data.layout} crop={idCrop(data.layout.pages[0])} className="w-full rounded-lg border border-slate-200" />
                  <div>
                    <p className="text-sm text-slate-700">
                      {cur.kind === 'id_dudoso' &&
                        trn('El sistema ha leído {id} (cada «?» es una columna sin marcar o con dos marcas). Mira los dígitos escritos a mano y complétalo.', {
                          id: <b className="font-mono">{sheet.identifier}</b>,
                        })}
                      {cur.kind === 'id_no_en_lista' &&
                        trn('{id} no está en la lista de alumnos. Corrígelo si el alumno se equivocó al marcarlo, o acéptalo tal cual.', {
                          id: <b className="font-mono">{sheet.identifier}</b>,
                        })}
                      {cur.kind === 'id_duplicado' &&
                        trn('Hay más de una hoja con {id}: {hojas}. Corrige el identificador, excluye la hoja que sobre o acepta que haya dos.', {
                          id: <b className="font-mono">{sheet.identifier}</b>,
                          hojas: data.sheets
                            .filter((s) => isStudentSheet(s) && s.identifier === sheet.identifier)
                            .map((s) => tr('hoja {n} ({archivo})', { n: s.seq, archivo: String(s.pages[0]?.archivo) }))
                            .join(', '),
                        })}
                    </p>
                    <form
                      className="mt-3 flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void resolve({ type: 'identificador', value: idValue });
                      }}
                    >
                      <input
                        ref={idInput}
                        className="input font-mono text-lg tracking-widest"
                        inputMode="numeric"
                        aria-label={tr('{etiqueta} corregido', { etiqueta: data.exam.sheet_config.idLabel })}
                        maxLength={data.exam.sheet_config.idDigits}
                        value={idValue}
                        disabled={readOnly || cur.status !== 'pendiente'}
                        onChange={(e) => setIdValue(e.target.value.replace(/\D/g, ''))}
                        onKeyDown={(e) => e.key === 'Escape' && (e.target as HTMLInputElement).blur()}
                      />
                      <button className="btn-primary shrink-0" disabled={readOnly || busy || cur.status !== 'pendiente' || !idValue || idValue === sheet.identifier}>
                        {tr('Guardar')}
                      </button>
                    </form>
                    <p className="mt-1 text-sm">
                      {students.get(idValue) ? (
                        <span className="text-emerald-700">
                          ✓ {students.get(idValue)!.last_name}, {students.get(idValue)!.first_name}
                        </span>
                      ) : data.students.length > 0 && idValue.length === data.exam.sheet_config.idDigits ? (
                        <span className="text-amber-700">{tr('No está en la lista de alumnos')}</span>
                      ) : null}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {cur.kind !== 'id_dudoso' && (
                        <button className="btn" disabled={readOnly || busy || cur.status !== 'pendiente'} onClick={() => void resolve({ type: 'aceptar' })}>
                          {tr('Aceptar tal cual')}
                        </button>
                      )}
                      <button className="btn text-red-700" disabled={readOnly || busy || cur.status !== 'pendiente'} onClick={() => void resolve({ type: 'excluir' })}>
                        {tr('Excluir esta hoja')}
                      </button>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      {trn('Atajos: {enter} escribir el identificador · {supr} excluir la hoja · {arriba}{abajo} moverse', {
                        enter: <Kbd>Enter</Kbd>,
                        supr: <Kbd>{tr('Supr')}</Kbd>,
                        arriba: <Kbd>↑</Kbd>,
                        abajo: <Kbd>↓</Kbd>,
                      })}
                    </p>
                  </div>
                </div>
              )}

              {/* Modelo */}
              {cur.kind === 'modelo' && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <SheetImage sheet={sheet} layout={data.layout} crop={modelCrop(data.layout.pages[0])} className="w-full rounded-lg border border-slate-200" />
                  <div>
                    <p className="text-sm text-slate-700">
                      {tr('No se ha podido leer el modelo de examen ({detalle}). Sin modelo la hoja no se puede corregir. ¿Qué modelo es?', {
                        detalle: `${MODEL_STATE_TEXT[String(cur.detail.estado ?? 'sin marcar')] ?? String(cur.detail.estado ?? 'sin marcar')}${cur.detail.leido ? `: ${String(cur.detail.leido)}` : ''}`,
                      })}
                    </p>
                    <div className="mt-3 flex gap-2">
                      {models.map((m) => (
                        <button key={m} className="btn min-w-14 text-base font-semibold" disabled={readOnly || busy || cur.status !== 'pendiente'} onClick={() => void resolve({ type: 'modelo', value: m })}>
                          {m}
                        </button>
                      ))}
                      <button className="btn text-red-700" disabled={readOnly || busy || cur.status !== 'pendiente'} onClick={() => void resolve({ type: 'excluir' })}>
                        {tr('Excluir hoja')}
                      </button>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      {trn('Atajos: {modelos} elegir modelo', { modelos: models.map((m) => <Kbd key={m}>{m}</Kbd>).reduce<React.ReactNode[]>((a, x) => [...a, ' ', x], []) })}
                    </p>
                  </div>
                </div>
              )}

              {/* Hoja entera: en blanco, QR, página que falta, ilegible */}
              {!isQKind(cur.kind) && !isIdKind(cur.kind) && cur.kind !== 'modelo' && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <SheetImage sheet={sheet} layout={data.layout} className="w-full rounded-lg border border-slate-200" />
                  <div>
                    <p className="text-sm text-slate-700">
                      {cur.kind === 'en_blanco' && tr('La hoja no tiene ninguna marca (ni identificador ni respuestas). Lo normal es excluirla.')}
                      {cur.kind === 'qr' && tr('No se ha podido leer el código QR, así que no se ha comprobado que la hoja sea de este examen. Si lo es, acéptala.')}
                      {cur.kind === 'pagina_faltante' && tr('Falta la página {n} de esta hoja. Puedes aceptarla (sus preguntas quedan en blanco), o excluirla y volver a escanear.', { n: String(cur.detail.pagina) })}
                      {cur.kind === 'ilegible' && tr('No se encuentran las 4 marcas negras de las esquinas (hoja doblada, cortada o mal escaneada). Exclúyela y vuelve a escanearla.')}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button className={cur.kind === 'en_blanco' || cur.kind === 'ilegible' ? 'btn-primary' : 'btn text-red-700'} disabled={readOnly || busy || cur.status !== 'pendiente'} onClick={() => void resolve({ type: 'excluir' })}>
                        {tr('Excluir hoja')}
                      </button>
                      {cur.kind !== 'ilegible' && (
                        <button className={cur.kind === 'en_blanco' ? 'btn' : 'btn-primary'} disabled={readOnly || busy || cur.status !== 'pendiente'} onClick={() => void resolve({ type: 'aceptar' })}>
                          {cur.kind === 'en_blanco' ? tr('Mantenerla') : tr('Aceptar la hoja')}
                        </button>
                      )}
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      {trn('Atajos: {enter} aceptar · {supr} excluir', { enter: <Kbd>Enter</Kbd>, supr: <Kbd>{tr('Supr')}</Kbd> })}
                    </p>
                  </div>
                </div>
              )}

              <details className="mt-5">
                <summary className="cursor-pointer text-sm text-brand-700">{tr('Ver la hoja completa')}</summary>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {sheet.pages.map((p) => (
                    <SheetImage key={p.hoja_pagina} sheet={sheet} layout={data.layout} page={p.hoja_pagina} className="w-full rounded-lg border border-slate-200" />
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {trn('{verde} = marcada · {naranja} = floja · {gris} = vacía', {
                    verde: <span style={{ color: scoreColor(1) }}>{tr('● verde')}</span>,
                    naranja: <span style={{ color: scoreColor(0.3) }}>{tr('● naranja')}</span>,
                    gris: <span style={{ color: scoreColor(0) }}>{tr('● gris')}</span>,
                  })}
                </p>
              </details>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
