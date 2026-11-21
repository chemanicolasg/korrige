import { ARTICLES } from './articles';
import { Segment } from './segmentData';
import SegmentPage from './segments';

/** Ruta del navegador para /academias y /universidades (carga los artículos para los enlaces). */
export default function SegmentRoute({ slug }: { slug: Segment['slug'] }) {
  return <SegmentPage slug={slug} articles={ARTICLES} />;
}
