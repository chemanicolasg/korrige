import Tutorials from '../app/Tutorials';
import { Shell } from './Resources';

/** Página pública /tutoriales: los vídeos de la serie, sin necesidad de cuenta. */
export default function PublicTutorials() {
  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-5 py-14">
        <Tutorials />
      </div>
    </Shell>
  );
}
