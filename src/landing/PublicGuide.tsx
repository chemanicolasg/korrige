import { Link } from 'react-router-dom';
import Guide from '../app/Guide';
import { Logo } from '../components/ui';

export default function PublicGuide() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/" className="text-lg">
        <Logo />
      </Link>
      <div className="mt-8">
        <Guide />
      </div>
    </div>
  );
}
