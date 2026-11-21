// Utilidades mínimas de Stripe para las Edge Functions (sin SDK: fetch + WebCrypto).
// Sin dependencias de Deno para poder probarlas con Vitest.

/** Codifica un objeto anidado como application/x-www-form-urlencoded al estilo de Stripe. */
export function formEncode(obj: Record<string, unknown>, prefix = ''): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object') parts.push(formEncode(v as Record<string, unknown>, key));
    else parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return parts.filter(Boolean).join('&');
}

export async function stripe<T = Record<string, unknown>>(secret: string, method: 'GET' | 'POST', path: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: { Authorization: `Bearer ${secret}`, ...(body ? { 'content-type': 'application/x-www-form-urlencoded' } : {}) },
    body: body ? formEncode(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${data?.error?.message ?? 'error'}`);
  return data as T;
}

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

async function hmacSha256(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Verifica la cabecera Stripe-Signature (t=…,v1=…) de un webhook.
 * Rechaza firmas incorrectas y eventos de más de `toleranceSec` segundos (anti-repetición).
 */
export async function verifyStripeSignature(payload: string, header: string | null, secret: string, toleranceSec = 300, nowSec = Math.floor(Date.now() / 1000)): Promise<boolean> {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=').map((x) => x.trim()) as [string, string]).filter((p) => p.length === 2 && p[0] !== 'v1'));
  const sigs = header.split(',').map((p) => p.trim()).filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  const t = Number(parts.t);
  if (!Number.isFinite(t) || !sigs.length || Math.abs(nowSec - t) > toleranceSec) return false;
  const expected = await hmacSha256(secret, `${t}.${payload}`);
  return sigs.some((s) => safeEqual(s, expected));
}

/** Para los tests: firma un cuerpo como lo haría Stripe. */
export async function signStripePayload(payload: string, secret: string, t: number): Promise<string> {
  return `t=${t},v1=${await hmacSha256(secret, `${t}.${payload}`)}`;
}

export interface SubscriptionRow {
  user_id: string;
  plan: 'plus';
  status: string;
  billing_interval: 'month' | 'year' | null;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  updated_at: string;
}

/** Convierte un objeto Subscription de Stripe en la fila de public.subscriptions. */
// deno-lint-ignore no-explicit-any
export function subscriptionRow(sub: any, userId: string): SubscriptionRow {
  const item = sub.items?.data?.[0];
  const end = sub.current_period_end ?? item?.current_period_end ?? null;
  const interval = item?.price?.recurring?.interval ?? item?.plan?.interval ?? null;
  return {
    user_id: userId,
    plan: 'plus',
    status: String(sub.status),
    billing_interval: interval === 'year' ? 'year' : interval === 'month' ? 'month' : null,
    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id,
    stripe_subscription_id: sub.id,
    current_period_end: end ? new Date(end * 1000).toISOString() : null,
    cancel_at_period_end: !!sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };
}

export function corsHeaders(req: Request, origins: string[]): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const ok = origins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) || /\.netlify\.app$/.test(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : origins[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    Vary: 'Origin',
  };
}
