import { Suspense, lazy } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { Spinner } from '../components/ui';
import AppShell from './AppShell';
import { AuthProvider } from './AuthContext';
import { ExamList, ExamNew } from './ExamList';
import Guide from './Guide';
import Login from './Login';

const ExamPage = lazy(() => import('./ExamPage'));
const OrgPage = lazy(() => import('./OrgPage'));
const PlanPage = lazy(() => import('./PlanPage'));
const Demo = lazy(() => import('./Demo'));
const DevOmr = lazy(() => import('./DevOmr'));

function NotFound() {
  return (
    <div className="p-16 text-center">
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <Link to="/" className="btn mt-4">
        Ir al inicio
      </Link>
    </div>
  );
}

function Private() {
  return (
    <AuthProvider fallback={<Spinner label="Conectando…" />}>
      <Routes>
        <Route path="/acceso" element={<Login />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<ExamList />} />
          <Route path="examenes/nuevo" element={<ExamNew />} />
          <Route path="examenes/:id/*" element={<ExamPage />} />
          <Route path="organizacion" element={<OrgPage />} />
          <Route path="plan" element={<PlanPage />} />
          <Route path="guia" element={<Guide />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}

/** Rutas de la aplicación (todo lo que no es la landing). */
export default function AppRoutes() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/demo" element={<Demo />} />
        <Route path="/dev/omr" element={<DevOmr />} />
        <Route path="*" element={<Private />} />
      </Routes>
    </Suspense>
  );
}
