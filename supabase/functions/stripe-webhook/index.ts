// Edge Function «stripe-webhook»: Stripe avisa aquí de altas, renovaciones y bajas de
// Korrige Plus, y se actualiza public.subscriptions. No exige sesión: se valida la firma.
//
// Secretos: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
// Eventos a activar en Stripe: checkout.session.completed, customer.subscription.created,
// customer.subscription.updated, customer.subscription.deleted.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { stripe, subscriptionRow, verifyStripeSignature } from '../_shared/stripe.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method', { status: 405 });
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
  const key = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
  const payload = await req.text();
  if (!(await verifyStripeSignature(payload, req.headers.get('stripe-signature'), secret))) return new Response('firma no válida', { status: 400 });

  const event = JSON.parse(payload);
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  try {
    // deno-lint-ignore no-explicit-any
    let sub: any = null;
    let userId: string | undefined;
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object;
      if (s.mode !== 'subscription' || !s.subscription) return new Response('ok');
      userId = s.client_reference_id ?? s.metadata?.user_id;
      sub = await stripe(key, 'GET', `subscriptions/${s.subscription}`);
    } else if (event.type.startsWith('customer.subscription.')) {
      sub = event.data.object;
      userId = sub.metadata?.user_id;
      if (!userId) {
        // suscripciones antiguas sin metadatos: se localiza por el id de Stripe
        const { data } = await db.from('subscriptions').select('user_id').eq('stripe_subscription_id', sub.id).maybeSingle();
        userId = data?.user_id;
      }
    } else {
      return new Response('ignorado');
    }
    if (!sub || !userId) {
      console.warn('stripe-webhook: evento sin usuario', event.type, event.id);
      return new Response('sin usuario');
    }
    const { error } = await db.from('subscriptions').upsert(subscriptionRow(sub, userId), { onConflict: 'user_id' });
    if (error) throw new Error(error.message);
    return new Response('ok');
  } catch (e) {
    console.error('stripe-webhook', event.type, e);
    // 500 → Stripe reintenta el evento
    return new Response('error', { status: 500 });
  }
});
