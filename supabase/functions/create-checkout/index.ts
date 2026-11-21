// Edge Function «create-checkout»: abre el pago de Korrige Plus en Stripe Checkout.
// Devuelve { url } para redirigir al usuario. Exige sesión (verify_jwt).
//
// Secretos: STRIPE_SECRET_KEY, STRIPE_PRICE_PLUS_MONTH, STRIPE_PRICE_PLUS_YEAR, APP_URL (opcional).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, stripe } from '../_shared/stripe.ts';

const APP_URL = (Deno.env.get('APP_URL') ?? 'https://korrige.es').replace(/\/$/, '');
const ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? 'https://korrige.es,https://www.korrige.es').split(',').map((s) => s.trim());

Deno.serve(async (req) => {
  const cors = corsHeaders(req, ORIGINS);
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'method' });

  const key = Deno.env.get('STRIPE_SECRET_KEY');
  const { interval } = await req.json().catch(() => ({ interval: 'month' }));
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
  try {
    const session = await stripe<{ url: string }>(key, 'POST', 'checkout/sessions', {
      mode: 'subscription',
      line_items: { 0: { price, quantity: 1 } },
      success_url: `${APP_URL}/app/plan?pago=ok`,
      cancel_url: `${APP_URL}/app/plan?pago=cancelado`,
      client_reference_id: u.user.id,
      ...(sub?.stripe_customer_id ? { customer: sub.stripe_customer_id } : { customer_email: u.user.email }),
      subscription_data: { metadata: { user_id: u.user.id } },
      metadata: { user_id: u.user.id },
      allow_promotion_codes: true,
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
