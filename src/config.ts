/**
 * Constantes de producto. Cambia aquí el nombre o el dominio y se propagan a
 * la app, la landing y los metadatos (el script de build regenera sitemap y robots).
 */
export const APP_NAME = 'Korrige';
export const APP_DOMAIN = 'korrige.es';
export const APP_URL = `https://${APP_DOMAIN}`;
export const SALES_EMAIL = `ventas@${APP_DOMAIN}`;
export const NO_REPLY_EMAIL = `no-reply@${APP_DOMAIN}`;
export const CONTACT_EMAIL = `hola@${APP_DOMAIN}`;

/** Prefijo del texto del QR de las hojas: `UICOMR|<código examen>|v1[|pN]`. */
export const QR_PREFIX = 'UICOMR';
export const QR_VERSION = 'v1';

export const SUPABASE_URL = (import.meta.env?.VITE_SUPABASE_URL as string | undefined) ?? '';
export const SUPABASE_ANON_KEY = (import.meta.env?.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';
export const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
/** URL de la Edge Function del formulario de ventas. */
export const SALES_ENDPOINT =
  (import.meta.env?.VITE_SALES_ENDPOINT as string | undefined) ||
  (SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/sales-lead` : '');

/**
 * Planes y precios (IVA incluido). Los límites de exámenes se imponen en la base de
 * datos (supabase/migrations/20261121100000_billing.sql): si cambian aquí, cámbialos allí.
 * Los precios reales se cobran con los «prices» de Stripe; estos son los que se muestran.
 */
/**
 * Pago con tarjeta activado (Stripe configurado y funciones desplegadas). Mientras no lo
 * esté, Korrige Plus se solicita por correo. Se activa con VITE_BILLING_ENABLED=1 en Netlify.
 */
export const BILLING_ENABLED = (import.meta.env?.VITE_BILLING_ENABLED as string | undefined) === '1';

export const PLAN = {
  freeExams: 1,
  plusExamsPerMonth: 5,
  plusMonthly: 9.9,
  plusYearly: 89,
  /** Días durante los que un examen admite subir hojas, desde la primera subida (Academy: sin plazo). */
  uploadWindowDays: 30,
} as const;
