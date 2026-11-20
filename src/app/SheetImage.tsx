import { SheetOverlay } from '../components/SheetOverlay';
import { Sheet } from '../lib/types';
import { LayoutDoc } from '../omr/layout';
import { useImageUrl } from './ExamPage';

/** Página (1 o 2) de la hoja en la que está una pregunta. */
export function pageOfQuestion(layout: LayoutDoc, q: number | string): number {
  const i = layout.pages.findIndex((p) => p.preguntas[String(q)]);
  return i < 0 ? 1 : i + 1;
}

/** Imagen de una hoja guardada (o un recorte) con la lectura superpuesta. */
export function SheetImage({
  sheet,
  layout,
  page = 1,
  crop,
  highlight,
  className,
  showOverlay = true,
}: {
  sheet: Sheet;
  layout: LayoutDoc;
  page?: number;
  crop?: [number, number, number, number];
  highlight?: string;
  className?: string;
  showOverlay?: boolean;
}) {
  const sp = sheet.pages.find((p) => p.hoja_pagina === page) ?? sheet.pages[0];
  const url = useImageUrl(sp?.image_path);
  const lay = layout.pages[page - 1] ?? layout.pages[0];
  return (
    <SheetOverlay
      className={className}
      imageUrl={url}
      layout={lay}
      crop={crop}
      highlight={highlight}
      showOverlay={showOverlay && !!sp?.legible}
      data={{ scores: sheet.scores, idScores: page === 1 || sheet.pages.length === 1 ? sheet.id_scores : undefined, modelScores: sheet.model_scores }}
    />
  );
}
