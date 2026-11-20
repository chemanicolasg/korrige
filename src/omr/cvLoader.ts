/**
 * Carga de OpenCV.js. Vive en su propio módulo para que el bundle (≈10 MB) solo
 * se descargue desde el worker de lectura. Se devuelve envuelto en un objeto
 * porque el módulo de Emscripten puede ser "thenable".
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import cvModule from '@techstark/opencv-js';

export async function initCv(): Promise<{ cv: any }> {
  let cv: any = cvModule;
  if (cv instanceof Promise) {
    cv = await cv;
  } else if (!cv.Mat) {
    await new Promise<void>((resolve) => {
      cv.onRuntimeInitialized = () => resolve();
    });
  }
  return { cv };
}
