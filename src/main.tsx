import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import './index.css';
import Landing from './landing/Landing';

// La landing va en el bundle principal (ligero); la app se carga bajo demanda.
const AppRoutes = lazy(() => import('./app/AppRoutes'));
const Legal = lazy(() => import('./landing/Legal'));
const PublicGuide = lazy(() => import('./landing/PublicGuide'));

const Loading = () => <div className="p-8 text-sm text-slate-500">Cargando…</div>;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          element={
            <Suspense fallback={<Loading />}>
              <Outlet />
            </Suspense>
          }
        >
          <Route path="/legal/:doc" element={<Legal />} />
          <Route path="/guia" element={<PublicGuide />} />
          <Route path="*" element={<AppRoutes />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
