// Edge Function «billing-portal»: abre el portal de cliente de Stripe (cambiar tarjeta,
// descargar facturas, cancelar). Devuelve { url }. Exige sesión (verify_jwt).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, stripe } from '../_shared/stripe.ts';

const APP_URL = (Deno.env.get('APP_URL') ?? 'https://korrige.es').replace(/\/$/, '');
const ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? 'https://korrige.es,https://www.korrige.es').split(',').map((s) => s.trim());

Deno.serve(async (req) => {
  const cors = corsHeaders(req, ORIGINS);
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) return json(503, { error: 'billing_not_configured' });

  const userDb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('authorization') ?? '' } }, auth: { persistSession: false } });
  const { data: u } = await userDb.auth.getUser();
  if (!u?.user) return json(401, { error: 'auth' });
  // la política RLS solo deja ver la suscripción propia
  const { data: sub } = await userDb.from('subscriptions').select('stripe_customer_id').eq('user_id', u.user.id).maybeSingle();
  if (!sub?.stripe_customer_id) return json(404, { error: 'no_subscription' });
  try {
    const session = await stripe<{ url: string }>(key, 'POST', 'billing_portal/sessions', { customer: sub.stripe_customer_id, return_url: `${APP_URL}/app/plan` });
    return json(200, { url: session.url });
  } catch (e) {
    console.error('billing-portal', e);
    return json(502, { error: 'stripe_error' });
  }
});
