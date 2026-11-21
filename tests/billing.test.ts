import { describe, expect, it } from 'vitest';
import { formEncode, signStripePayload, subscriptionRow, verifyStripeSignature } from '../supabase/functions/_shared/stripe';

describe('Stripe: firma del webhook', () => {
  const secret = 'whsec_prueba';
  const body = JSON.stringify({ id: 'evt_1', type: 'customer.subscription.updated' });
  const now = 1_800_000_000;

  it('acepta un evento firmado correctamente', async () => {
    expect(await verifyStripeSignature(body, await signStripePayload(body, secret, now), secret, 300, now + 10)).toBe(true);
  });
  it('rechaza cuerpo alterado, secreto distinto, cabecera ausente y eventos antiguos', async () => {
    const sig = await signStripePayload(body, secret, now);
    expect(await verifyStripeSignature(body.replace('evt_1', 'evt_2'), sig, secret, 300, now)).toBe(false);
    expect(await verifyStripeSignature(body, sig, 'whsec_otro', 300, now)).toBe(false);
    expect(await verifyStripeSignature(body, null, secret, 300, now)).toBe(false);
    expect(await verifyStripeSignature(body, 't=abc,v1=00', secret, 300, now)).toBe(false);
    expect(await verifyStripeSignature(body, sig, secret, 300, now + 3600)).toBe(false); // repetición
  });
});

describe('Stripe: utilidades', () => {
  it('codifica parámetros anidados como espera la API', () => {
    expect(decodeURIComponent(formEncode({ mode: 'subscription', line_items: { 0: { price: 'price_1', quantity: 1 } }, metadata: { user_id: 'u1' }, nada: undefined }))).toBe(
      'mode=subscription&line_items[0][price]=price_1&line_items[0][quantity]=1&metadata[user_id]=u1',
    );
  });
  it('convierte una suscripción de Stripe en la fila de la base de datos', () => {
    const row = subscriptionRow({ id: 'sub_1', customer: 'cus_1', status: 'active', cancel_at_period_end: true, items: { data: [{ current_period_end: 1_800_000_000, price: { recurring: { interval: 'year' } } }] } }, 'u1');
    expect(row).toMatchObject({ user_id: 'u1', plan: 'plus', status: 'active', billing_interval: 'year', stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1', cancel_at_period_end: true, current_period_end: '2027-01-15T08:00:00.000Z' });
  });
});
