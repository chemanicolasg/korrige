// Edge Function «sales-lead»: recibe el formulario "Hablar con ventas" de la
// landing, guarda el lead en public.sales_leads y avisa por email con Resend.
//
// Secretos (supabase secrets set ...):
//   RESEND_API_KEY   clave de Resend (obligatoria para enviar el aviso)
//   SALES_EMAIL      destinatario del aviso        (por defecto ventas@korrige.es)
//   SALES_FROM       remitente verificado en Resend (por defecto Korrige <no-reply@korrige.es>)
//   ALLOWED_ORIGINS  orígenes permitidos, separados por comas (por defecto https://korrige.es,https://www.korrige.es)
//   LEAD_SALT        sal para anonimizar la IP en el límite de envíos (opcional)
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { leadEmail, validateLead } from './validate.ts';

const APP_NAME = 'Korrige';
const SALES_EMAIL = Deno.env.get('SALES_EMAIL') ?? 'ventas@korrige.es';
const SALES_FROM = Deno.env.get('SALES_FROM') ?? 'Korrige <no-reply@korrige.es>';
const ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? 'https://korrige.es,https://www.korrige.es').split(',').map((s) => s.trim()).filter(Boolean);
const MAX_PER_IP_HOUR = 5;

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allowed = ORIGINS.includes('*') || ORIGINS.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return {
    'Access-Control-Allow-Origin': allowed ? origin || '*' : ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info',
    Vary: 'Origin',
  };
}

const json = (req: Request, status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'content-type': 'application/json; charset=utf-8' } });

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, 405, { ok: false, error: 'method' });

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 20_000) return json(req, 413, { ok: false, error: 'too_large' });
    body = JSON.parse(raw);
  } catch {
    return json(req, 400, { ok: false, error: 'json' });
  }

  const v = validateLead(body);
  // a los bots se les responde "ok" para no darles pistas
  if (!v.ok && v.spam) return json(req, 200, { ok: true });
  if (!v.ok) return json(req, 422, { ok: false, error: v.error });
  const lead = v.lead;

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'desconocida';
  const ipHash = await sha256(`${Deno.env.get('LEAD_SALT') ?? 'korrige'}|${ip}`);

  // límite de envíos: por IP (1 h) y por email (10 min, para dobles clics)
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await db.from('sales_leads').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', hourAgo);
  if ((count ?? 0) >= MAX_PER_IP_HOUR) return json(req, 429, { ok: false, error: 'rate' });
  const tenMin = new Date(Date.now() - 600_000).toISOString();
  const { count: same } = await db.from('sales_leads').select('id', { count: 'exact', head: true }).eq('email', lead.email).gte('created_at', tenMin);
  if ((same ?? 0) > 0) return json(req, 200, { ok: true, duplicate: true });

  const { data: row, error } = await db
    .from('sales_leads')
    .insert({ ...lead, ip_hash: ipHash, user_agent: (req.headers.get('user-agent') ?? '').slice(0, 300) })
    .select('id')
    .single();
  if (error) {
    console.error('sales-lead: no se pudo guardar', error.message);
    return json(req, 500, { ok: false, error: 'db' });
  }

  // aviso por email (si falla, el lead ya está guardado: no se le muestra error al visitante)
  const key = Deno.env.get('RESEND_API_KEY');
  if (key) {
    const mail = leadEmail(lead, APP_NAME);
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from: SALES_FROM, to: [SALES_EMAIL], reply_to: lead.email, subject: mail.subject, html: mail.html, text: mail.text }),
      });
      if (res.ok) await db.from('sales_leads').update({ email_sent: true }).eq('id', row.id);
      else console.error('sales-lead: Resend respondió', res.status, await res.text());
    } catch (e) {
      console.error('sales-lead: error enviando el aviso', e);
    }
  } else {
    console.warn('sales-lead: falta RESEND_API_KEY; el lead se ha guardado sin enviar aviso');
  }
  return json(req, 200, { ok: true });
});
