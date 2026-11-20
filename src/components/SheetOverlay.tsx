import type { PageLayout, Pt } from '../omr/layout';
import { DUDOSA, MARCADA } from '../omr/thresholds';

export interface OverlayData {
  scores?: Record<string, number[]>;
  idScores?: number[][];
  modelScores?: number[];
  keyScore?: number;
}

/** Color según el relleno: verde = marcada, naranja = floja, gris = vacía. */
export function scoreColor(s: number): string {
  return s >= MARCADA ? '#16a34a' : s >= DUDOSA ? '#f97316' : '#94a3b8';
}

/**
 * Imagen de la hoja enderezada con la lectura superpuesta. La imagen es un A4
 * canónico, así que el SVG trabaja directamente en mm (eje Y invertido).
 * `crop` = [x, y, ancho, alto] en mm con origen arriba-izquierda.
 */
export function SheetOverlay({
  imageUrl,
  layout,
  data,
  crop,
  highlight,
  className,
  showOverlay = true,
}: {
  imageUrl?: string | null;
  layout: PageLayout;
  data: OverlayData;
  crop?: [number, number, number, number];
  highlight?: string;
  className?: string;
  showOverlay?: boolean;
}) {
  const [W, H] = layout.page_mm;
  const vb = crop ?? [0, 0, W, H];
  const ring = layout.radius_mm + 0.55;
  const circles: { p: Pt; s: number; k: string }[] = [];
  if (showOverlay) {
    const ops = [...layout.opciones];
    for (const [q, opts] of Object.entries(layout.preguntas)) {
      const sc = data.scores?.[q];
      if (!sc) continue;
      ops.forEach((o, j) => circles.push({ p: opts[o], s: sc[j] ?? 0, k: `q${q}${o}` }));
    }
    layout.nia.forEach((col, i) => col.forEach((p, d) => data.idScores?.[i] && circles.push({ p, s: data.idScores[i][d] ?? 0, k: `n${i}-${d}` })));
    Object.keys(layout.modelo).forEach((m, i) => data.modelScores?.length && circles.push({ p: layout.modelo[m], s: data.modelScores[i] ?? 0, k: `m${m}` }));
    if (layout.plantilla && data.keyScore != null) circles.push({ p: layout.plantilla, s: data.keyScore, k: 'key' });
  }
  const hl = highlight ? layout.preguntas[highlight] : undefined;
  const hlPts = hl ? Object.values(hl) : [];
  return (
    <svg viewBox={vb.join(' ')} className={className} role="img" aria-label="Imagen de la hoja con la lectura superpuesta" preserveAspectRatio="xMidYMid meet">
      <rect x={0} y={0} width={W} height={H} fill="#f8fafc" />
      {imageUrl ? (
        <image href={imageUrl} x={0} y={0} width={W} height={H} preserveAspectRatio="none" />
      ) : (
        <text x={vb[0] + vb[2] / 2} y={vb[1] + vb[3] / 2} textAnchor="middle" fontSize={Math.max(2.5, vb[3] / 12)} fill="#94a3b8">
          Imagen no disponible
        </text>
      )}
      {hlPts.length > 0 && (
        <rect
          x={hlPts[0][0] - 9}
          y={H - hlPts[0][1] - 2.8}
          width={hlPts[hlPts.length - 1][0] - hlPts[0][0] + 12.5}
          height={5.6}
          fill="none"
          stroke="#2439b0"
          strokeWidth={0.4}
          rx={1}
        />
      )}
      {circles.map(({ p, s, k }) => (
        <circle key={k} cx={p[0]} cy={H - p[1]} r={ring} fill="none" stroke={scoreColor(s)} strokeWidth={s >= DUDOSA ? 0.4 : 0.25} opacity={s >= DUDOSA ? 0.95 : 0.7} />
      ))}
    </svg>
  );
}

/** Recorte (mm) de la fila de una pregunta, con algo de contexto. */
export function questionCrop(layout: PageLayout, q: string): [number, number, number, number] | undefined {
  const opts = layout.preguntas[q];
  if (!opts) return undefined;
  const pts = Object.values(opts);
  const H = layout.page_mm[1];
  return [pts[0][0] - 10, H - pts[0][1] - 8.4, 40, 16.8];
}

/** Recorte (mm) del bloque de identificador (casillas manuscritas incluidas). */
export function idCrop(layout: PageLayout): [number, number, number, number] {
  const H = layout.page_mm[1];
  const x0 = layout.nia[0][0][0] - 5;
  const x1 = layout.nia[layout.nia.length - 1][0][0] + 5;
  const yTop = H - layout.nia[0][0][1] - 13;
  const yBot = H - layout.nia[0][9][1] + 4;
  return [x0, yTop, x1 - x0, yBot - yTop];
}

/** Recorte (mm) del bloque de modelo y plantilla. */
export function modelCrop(layout: PageLayout): [number, number, number, number] {
  const H = layout.page_mm[1];
  const pts = Object.values(layout.modelo);
  const first = pts[0] ?? layout.plantilla ?? [93, 227];
  return [first[0] - 6, H - first[1] - 10, 50, 34];
}
