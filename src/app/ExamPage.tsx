import { ReactNode, Suspense, createContext, lazy, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { ErrorBox, Spinner, StatusBadge } from '../components/ui';
import { Db } from '../lib/db';
import { ExamData, isStudentSheet, loadExam } from '../lib/service';
import { tr, trn } from '../i18n/app';
import { useSession } from './AuthContext';

const TabSummary = lazy(() => import('./tabs/TabSummary'));
const TabSheet = lazy(() => import('./tabs/TabSheet'));
const TabKeys = lazy(() => import('./tabs/TabKeys'));
const TabStudents = lazy(() => import('./tabs/TabStudents'));
const TabUpload = lazy(() => import('./tabs/TabUpload'));
const TabReview = lazy(() => import('./tabs/TabReview'));
const TabGrades = lazy(() => import('./tabs/TabGrades'));
const TabStats = lazy(() => import('./tabs/TabStats'));
const TabAudit = lazy(() => import('./tabs/TabAudit'));

interface ExamCtx {
  db: Db;
  userId: string;
  data: ExamData;
  setData: (d: ExamData) => void;
  /** Examen cerrado: solo lectura. */
  readOnly: boolean;
  busy: boolean;
  /** Ejecuta una operación que devuelve los datos actualizados, con control de errores. */
  run: (fn: (data: ExamData) => Promise<ExamData | void>) => Promise<boolean>;
  reload: () => Promise<void>;
  error: string;
  setError: (e: string) => void;
}
const Ctx = createContext<ExamCtx | null>(null);
export function useExam(): ExamCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useExam fuera de ExamPage');
  return v;
}

/** URL (firmada o local) de la imagen de una hoja; null mientras carga o si no existe. */
export function useImageUrl(path: string | null | undefined): string | null {
  const { db } = useExam();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setUrl(null);
    if (path) void db.imageUrl(path).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [db, path]);
  return url;
}

export default function ExamPage() {
  const { id } = useParams();
  const { db, user, org, orgs, setOrgId } = useSession();
  const [data, setData] = useState<ExamData | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const dataRef = useRef<ExamData | null>(null);
  dataRef.current = data;

  const reload = useCallback(async () => {
    try {
      const d = await loadExam(db, id!);
      if (!d) setMissing(true);
      else setData(d);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [db, id]);

  useEffect(() => {
    setData(null);
    setMissing(false);
    setError('');
    void reload();
  }, [reload]);

  // si el examen es de otra de mis organizaciones (enlace directo), esa pasa a ser la activa: el rol depende de ella
  const examOrg = data?.exam.org_id;
  useEffect(() => {
    if (examOrg && examOrg !== org.id && orgs.some((o) => o.id === examOrg)) setOrgId(examOrg);
  }, [examOrg, org.id, orgs, setOrgId]);

  const run = useCallback<ExamCtx['run']>(
    async (fn) => {
      setBusy(true);
      setError('');
      try {
        const next = await fn(dataRef.current!);
        if (next) setData(next);
        return true;
      } catch (e) {
        setError((e as Error).message);
        // tras un fallo a medias, lo guardado en el servidor manda
        void reload();
        return false;
      } finally {
        setBusy(false);
      }
    },
    [reload],
  );

  const ctx = useMemo<ExamCtx | null>(
    () => (data ? { db, userId: user.id, data, setData, readOnly: data.exam.status === 'cerrado', busy, run, reload, error, setError } : null),
    [db, user.id, data, busy, run, reload, error],
  );

  if (missing) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-xl font-semibold">{tr('Examen no encontrado')}</h1>
        <p className="mt-2 text-sm text-slate-600">{tr('Puede que se haya eliminado o que no tengas acceso.')}</p>
        <Link to="/app" className="btn mt-4">
          {tr('Volver a exámenes')}
        </Link>
      </div>
    );
  }
  if (!ctx || !data) return error ? <ErrorBox error={error} onRetry={reload} /> : <Spinner label={tr('Cargando examen…')} />;

  const pending = data.items.filter((i) => i.status === 'pendiente').length;
  const nSheets = data.sheets.filter(isStudentSheet).length;
  const tabs: [string, ReactNode][] = [
    ['resumen', tr('Resumen')],
    ['hoja', tr('Hoja')],
    ['plantillas', tr('Plantillas')],
    ['alumnos', tr('Alumnos')],
    ['subir', tr('Subir hojas')],
    [
      'revision',
      <>
        {tr('Revisión')}
        {pending > 0 && <span className="badge ml-1.5 bg-amber-100 text-amber-800">{pending}</span>}
      </>,
    ],
    ['notas', <>{tr('Notas')}{nSheets > 0 && <span className="ml-1.5 text-xs text-slate-400">{nSheets}</span>}</>],
    ['estadisticas', tr('Estadísticas')],
    ['actividad', tr('Actividad')],
  ];
  const { exam } = data;
  return (
    <Ctx.Provider value={ctx}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Link to="/app" className="text-sm text-slate-500 hover:underline">
          {tr('Exámenes')}
        </Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-xl font-semibold">{exam.title}</h1>
        <StatusBadge status={exam.status} />
        <span className="font-mono text-xs text-slate-400">{exam.code}</span>
        {busy && <span className="text-xs text-slate-500">{tr('Guardando…')}</span>}
      </div>
      <nav className="mt-4 flex gap-1 overflow-x-auto border-b border-slate-200" aria-label={tr('Secciones del examen')}>
        {tabs.map(([path, label]) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${isActive ? 'border-brand-600 text-brand-800' : 'border-transparent text-slate-600 hover:text-slate-900'}`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      {ctx.readOnly && (
        <div className="mt-4 rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm text-slate-700">
          {trn('Examen cerrado: está en solo lectura. Puedes reabrirlo desde {link} (queda registrado).', {
            link: (
              <Link className="underline" to="resumen">
                {tr('Resumen')}
              </Link>
            ),
          })}
        </div>
      )}
      <div className="mt-4 space-y-4">
        <ErrorBox error={error} />
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route index element={<Navigate to="resumen" replace />} />
            <Route path="resumen" element={<TabSummary />} />
            <Route path="hoja" element={<TabSheet />} />
            <Route path="plantillas" element={<TabKeys />} />
            <Route path="alumnos" element={<TabStudents />} />
            <Route path="subir" element={<TabUpload />} />
            <Route path="revision" element={<TabReview />} />
            <Route path="notas" element={<TabGrades />} />
            <Route path="estadisticas" element={<TabStats />} />
            <Route path="actividad" element={<TabAudit />} />
          </Routes>
        </Suspense>
      </div>
    </Ctx.Provider>
  );
}
