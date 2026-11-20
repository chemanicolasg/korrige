/** API del hilo principal para el worker de lectura. */
import type { LayoutDoc } from './layout';
import type { ScannedPage } from './group';
import type { ProcessRequest, WorkerOut } from './worker';

export interface Progress {
  phase: 'motor' | 'pdf' | 'hoja';
  done: number;
  total: number;
  fileName?: string;
}

export interface ProcessHandle {
  promise: Promise<ScannedPage[]>;
  cancel: () => void;
}

let worker: Worker | null = null;
let nextId = 1;

function getWorker(): Worker {
  worker ??= new Worker(new URL('./worker.ts', import.meta.url), { type: 'module', name: 'korrige-omr' });
  return worker;
}

/**
 * Lee uno o varios PDF escaneados. Devuelve una página por hoja escaneada,
 * en el orden de los archivos.
 */
export function processPdfs(
  files: File[],
  layout: LayoutDoc,
  opts: { jpegQuality?: number; onProgress?: (p: Progress) => void; onPage?: (p: ScannedPage) => void } = {},
): ProcessHandle {
  const id = nextId++;
  const w = getWorker();
  const pages: ScannedPage[] = [];
  let finish: (() => void) | null = null;
  const promise = (async () => {
    const data = await Promise.all(files.map(async (f) => ({ name: f.name, data: await f.arrayBuffer() })));
    return new Promise<ScannedPage[]>((resolve, reject) => {
      const onMsg = (ev: MessageEvent) => {
        const m = ev.data as WorkerOut;
        if (!m || m.src !== 'korrige-omr' || m.id !== id) return;
        if (m.type === 'progress') opts.onProgress?.({ phase: m.phase, done: m.done, total: m.total, fileName: m.fileName });
        if (m.type === 'page') {
          const page: ScannedPage = {
            read: m.read,
            fileIndex: m.fileIndex,
            fileName: m.fileName,
            image: m.jpeg ? new Blob([m.jpeg], { type: 'image/jpeg' }) : undefined,
          };
          pages.push(page);
          opts.onPage?.(page);
          opts.onProgress?.({ phase: 'hoja', done: m.done, total: m.total, fileName: m.fileName });
        }
        if (m.type === 'done') {
          cleanup();
          resolve(pages);
        }
        if (m.type === 'error') {
          cleanup();
          reject(new Error(m.message));
        }
      };
      const onErr = (e: ErrorEvent) => {
        cleanup();
        // un worker roto no se reutiliza
        worker?.terminate();
        worker = null;
        reject(new Error(e.message || 'Error en el lector de hojas'));
      };
      const cleanup = () => {
        w.removeEventListener('message', onMsg);
        w.removeEventListener('error', onErr);
      };
      finish = () => {
        cleanup();
        resolve(pages);
      };
      w.addEventListener('message', onMsg);
      w.addEventListener('error', onErr);
      const req: ProcessRequest = { type: 'process', id, files: data, layout, jpegQuality: opts.jpegQuality ?? 0.6 };
      w.postMessage(
        req,
        data.map((d) => d.data),
      );
    });
  })();
  return {
    promise,
    cancel: () => {
      w.postMessage({ type: 'cancel', id });
      // el worker termina la página en curso y envía "done"; por si acaso, resolvemos ya
      setTimeout(() => finish?.(), 3000);
    },
  };
}
