import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './index.css';

const DevOmr = lazy(() => import('./app/DevOmr'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={<div className="p-8 text-slate-500">Cargando…</div>}>
        <Routes>
          <Route path="/dev/omr" element={<DevOmr />} />
          <Route path="*" element={<div className="p-8">Korrige</div>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
);
