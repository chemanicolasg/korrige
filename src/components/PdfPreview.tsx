import { useEffect, useRef, useState } from 'react';
import { tr } from '../i18n/app';

/** Vista previa de un PDF (todas sus páginas) renderizado con pdf.js en un canvas. */
export function PdfPreview({ bytes, className }: { bytes: Uint8Array | null; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!bytes || !host.current) return;
    let alive = true;
    const el = host.current;
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        const workerUrl = (await import('pdfjs-dist/build/pdf.worker.mjs?url')).default;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        const task = pdfjs.getDocument({ data: bytes.slice() });
        const doc = await task.promise;
        const canvases: HTMLCanvasElement[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          canvas.className = 'w-full rounded border border-slate-200 bg-white shadow-sm';
          canvas.setAttribute('role', 'img');
          canvas.setAttribute('aria-label', tr('Vista previa de la hoja de respuestas, página {n}', { n: i }));
          await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport }).promise;
          canvases.push(canvas);
        }
        await task.destroy();
        if (alive) el.replaceChildren(...canvases);
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    })();
    return () => {
      alive = false;
    };
  }, [bytes]);
  return (
    <div className={className}>
      {error && <p className="text-sm text-red-700">{tr('No se pudo generar la vista previa: {error}', { error })}</p>}
      <div ref={host} className="space-y-4" data-testid="pdf-preview">
        <p className="p-8 text-center text-sm text-slate-500">{tr('Generando vista previa…')}</p>
      </div>
    </div>
  );
}
