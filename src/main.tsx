import { StrictMode, Suspense, lazy } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import './index.css';
import Landing from './landing/Landing';

// La landing va en el bundle principal (ligero); la app se carga bajo demanda.
const AppRoutes = lazy(() => import('./app/AppRoutes'));
const Legal = lazy(() => import('./landing/Legal'));
const PublicGuide = lazy(() => import('./landing/PublicGuide'));
const ResourcePage = lazy(() => import('./landing/Resources'));
const SegmentPage = lazy(() => import('./landing/SegmentRoutes'));
const PublicTutorials = lazy(() => import('./landing/PublicTutorials'));

const Loading = () => <div className="p-8 text-sm text-slate-500">Cargando…</div>;

const app = (
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/ca" element={<Landing locale="ca" />} />
        <Route path="/en" element={<Landing locale="en" />} />
        <Route
          element={
            <Suspense fallback={<Loading />}>
              <Outlet />
            </Suspense>
          }
        >
          <Route path="/legal/:doc" element={<Legal />} />
          <Route path="/guia" element={<PublicGuide />} />
          <Route path="/tutoriales" element={<PublicTutorials />} />
          <Route path="/academias" element={<SegmentPage slug="academias" />} />
          <Route path="/universidades" element={<SegmentPage slug="universidades" />} />
          <Route path="/recursos" element={<ResourcePage />} />
          <Route path="/recursos/:slug" element={<ResourcePage />} />
          <Route path="*" element={<AppRoutes />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);

const root = document.getElementById('root')!;
// La portada (en sus tres idiomas) llega prerenderizada (scripts/prerender.mjs): se hidrata; el resto se monta de cero.
if (['/', '/ca', '/en'].includes(location.pathname.replace(/\/$/, '') || '/') && root.firstElementChild) hydrateRoot(root, app);
else createRoot(root).render(app);
