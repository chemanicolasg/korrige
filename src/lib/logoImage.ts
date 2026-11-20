/** Prepara el logotipo para la hoja: lo reduce y lo convierte a un data URL PNG o JPEG pequeño. */
import { MAX_LOGO_CHARS } from '../omr/layout';

const MAX_SIDE = 600;

export async function fileToLogo(file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) throw new Error('El logotipo debe ser una imagen PNG, JPG, WebP o SVG.');
  if (file.size > 8 * 1024 * 1024) throw new Error('La imagen es demasiado grande (máximo 8 MB).');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('No se ha podido leer la imagen.'));
      el.src = url;
    });
    const w0 = img.naturalWidth || 600;
    const h0 = img.naturalHeight || 240;
    const k = Math.min(1, MAX_SIDE / Math.max(w0, h0));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w0 * k));
    canvas.height = Math.max(1, Math.round(h0 * k));
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    // PNG conserva la transparencia; si pesa demasiado, JPEG sobre fondo blanco
    let out = canvas.toDataURL('image/png');
    if (out.length > MAX_LOGO_CHARS) {
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      out = canvas.toDataURL('image/jpeg', 0.85);
    }
    if (out.length > MAX_LOGO_CHARS) throw new Error('El logotipo es demasiado complejo. Prueba con una versión más sencilla o más pequeña.');
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}
