import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

/** Copia los decodificadores wasm de pdf.js (JBIG2, JPEG 2000…) a public/pdfjs-wasm. */
function pdfjsWasm() {
  return {
    name: 'korrige-pdfjs-wasm',
    buildStart() {
      const src = path.resolve('node_modules/pdfjs-dist/wasm');
      const dst = path.resolve('public/pdfjs-wasm');
      fs.mkdirSync(dst, { recursive: true });
      for (const f of fs.readdirSync(src)) {
        if (/^(jbig2|openjpeg|qcms)/.test(f)) fs.copyFileSync(path.join(src, f), path.join(dst, f));
      }
    },
  };
}

/** La misma política de contenido que en producción (netlify.toml), para que los tests E2E la comprueben. */
function productionCsp(): Record<string, string> {
  const m = /Content-Security-Policy = "([^"]+)"/.exec(fs.readFileSync(path.resolve('netlify.toml'), 'utf8'));
  return m ? { 'Content-Security-Policy': m[1] } : {};
}

export default defineConfig({
  preview: { headers: productionCsp() },
  plugins: [react(), pdfjsWasm()],
  worker: { format: 'es' },
  build: { target: 'es2022', chunkSizeWarningLimit: 12000 },
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
