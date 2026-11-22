import { Suspense, lazy } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { Spinner } from '../components/ui';
import { tr } from '../i18n/app';
import AppShell from './AppShell';
import { AuthProvider } from './AuthContext';
import { ExamList, ExamNew } from './ExamList';
import Guide from './Guide';
import Login from './Login';

const ExamPage = lazy(() => import('./ExamPage'));
const OrgPage = lazy(() => import('./OrgPage'));
const AccountPage = lazy(() => import('./AccountPage'));
const PlanPage = lazy(() => import('./PlanPage'));
const CheckAnswers = lazy(() => import('./CheckAnswers'));
const Demo = lazy(() => import('./Demo'));
const DevOmr = lazy(() => import('./DevOmr'));
const Tutorials = lazy(() => import('./Tutorials'));

function NotFound() {
  return (
    <div className="p-16 text-center">
      <h1 className="text-2xl font-semibold">{tr('Página no encontrada')}</h1>
      <Link to="/" className="btn mt-4">
        {tr('Ir al inicio')}
      </Link>
    </div>
  );
}

function Private() {
  return (
    <AuthProvider fallback={<Spinner label={tr('Conectando…')} />}>
      <Routes>
        <Route path="/acceso" element={<Login />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<ExamList />} />
          <Route path="examenes/nuevo" element={<ExamNew />} />
          <Route path="examenes/:id/*" element={<ExamPage />} />
          <Route path="organizacion" element={<OrgPage />} />
          <Route path="plan" element={<PlanPage />} />
          <Route path="cuenta" element={<AccountPage />} />
          <Route path="guia" element={<Guide />} />
          <Route path="tutoriales" element={<Tutorials />} />
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
        {/* pública, sin sesión: respuestas correctas de un examen publicado */}
        <Route path="/comprobar" element={<CheckAnswers />} />
        <Route path="/comprobar/:code" element={<CheckAnswers />} />
        <Route path="/dev/omr" element={<DevOmr />} />
        <Route path="*" element={<Private />} />
      </Routes>
    </Suspense>
  );
}
