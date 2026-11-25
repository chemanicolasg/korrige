// Edge Function «create-checkout»: abre el pago de Korrige Plus en Stripe Checkout.
// Devuelve { url } para redirigir al usuario. Exige sesión (verify_jwt).
//
// Secretos: STRIPE_SECRET_KEY. Opcionales: STRIPE_PRICE_PLUS_MONTH, STRIPE_PRICE_PLUS_YEAR, STRIPE_TAX_RATE, APP_URL.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, stripe } from '../_shared/stripe.ts';

const APP_URL = (Deno.env.get('APP_URL') ?? 'https://korrige.es').replace(/\/$/, '');
const ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? 'https://korrige.es,https://www.korrige.es').split(',').map((s) => s.trim());

/**
 * Tipo de IVA (21 %, incluido en el precio) para que la factura lo muestre desglosado.
 * Se busca en la cuenta de Stripe y, si no existe, se crea una vez. STRIPE_TAX_RATE permite fijar otro.
 * Si falla, se cobra igual (mismo importe) pero sin desglose.
 */
async function vatRateId(key: string): Promise<string | null> {
  const fixed = Deno.env.get('STRIPE_TAX_RATE');
  if (fixed) return fixed;
  try {
    const list = await stripe<{ data: { id: string; percentage: number; inclusive: boolean; country: string | null }[] }>(key, 'GET', 'tax_rates?active=true&limit=100');
    const found = list.data.find((r) => r.inclusive && r.percentage === 21 && r.country === 'ES');
    if (found) return found.id;
    const created = await stripe<{ id: string }>(key, 'POST', 'tax_rates', { display_name: 'IVA', description: 'IVA España 21 %', percentage: 21, inclusive: true, country: 'ES', tax_type: 'vat' });
    return created.id;
  } catch (e) {
    console.error('create-checkout: no se pudo preparar el tipo de IVA', e);
    return null;
  }
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req, ORIGINS);
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'method' });

  const key = Deno.env.get('STRIPE_SECRET_KEY');
  const { interval, code } = await req.json().catch(() => ({ interval: 'month', code: undefined }));
  // los identificadores de precio no son secretos: valores de producción por defecto
  const price = interval === 'year'
    ? Deno.env.get('STRIPE_PRICE_PLUS_YEAR') ?? 'price_1UeDZSLzkykEzxyQakBeK7bh'
    : Deno.env.get('STRIPE_PRICE_PLUS_MONTH') ?? 'price_1UeDZALzkykEzxyQGKsx4wnV';
  if (!key || !price) return json(503, { error: 'billing_not_configured' });

  const auth = req.headers.get('authorization') ?? '';
  const userDb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: u } = await userDb.auth.getUser();
  if (!u?.user) return json(401, { error: 'auth' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: sub } = await admin.from('subscriptions').select('stripe_customer_id, status, current_period_end').eq('user_id', u.user.id).maybeSingle();
  if (sub && ['active', 'trialing'].includes(sub.status) && (!sub.current_period_end || new Date(sub.current_period_end) > new Date())) {
    return json(409, { error: 'already_subscribed' });
  }
  const vat = await vatRateId(key);
  // Código promocional introducido en Korrige: se busca en Stripe y el pago se abre con el descuento ya aplicado
  let promotion: string | null = null;
  if (typeof code === 'string' && code.trim()) {
    if (!/^[A-Za-z0-9_-]{3,40}$/.test(code.trim())) return json(400, { error: 'invalid_code' });
    try {
      const found = await stripe<{ data: { id: string }[] }>(key, 'GET', `promotion_codes?active=true&limit=1&code=${encodeURIComponent(code.trim())}`);
      promotion = found.data[0]?.id ?? null;
    } catch (e) {
      console.error('create-checkout: no se pudo comprobar el código', e);
    }
    if (!promotion) return json(400, { error: 'invalid_code' });
  }
  try {
    const session = await stripe<{ url: string }>(key, 'POST', 'checkout/sessions', {
      mode: 'subscription',
      line_items: { 0: { price, quantity: 1, ...(vat ? { tax_rates: { 0: vat } } : {}) } },
      success_url: `${APP_URL}/app/plan?pago=ok`,
      cancel_url: `${APP_URL}/app/plan?pago=cancelado`,
      client_reference_id: u.user.id,
      ...(sub?.stripe_customer_id ? { customer: sub.stripe_customer_id } : { customer_email: u.user.email }),
      subscription_data: { metadata: { user_id: u.user.id } },
      metadata: { user_id: u.user.id },
      // Stripe no admite a la vez un descuento ya aplicado y el campo para teclear códigos
      ...(promotion ? { discounts: { 0: { promotion_code: promotion } } } : { allow_promotion_codes: true }),
      // con un código que deja el primer cobro a 0 € no se pide tarjeta (el webhook programa el fin al acabar el periodo)
      payment_method_collection: 'if_required',
      // siempre en euros: con la conversión automática a la moneda del visitante, los códigos en euros no valen
      adaptive_pricing: { enabled: false },
      billing_address_collection: 'required',
      tax_id_collection: { enabled: true },
      ...(sub?.stripe_customer_id ? { customer_update: { name: 'auto', address: 'auto' } } : {}),
      locale: 'es',
    });
    return json(200, { url: session.url });
  } catch (e) {
    console.error('create-checkout', e);
    return json(502, { error: 'stripe_error' });
  }
});
