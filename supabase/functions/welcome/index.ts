// Edge Function «welcome»: envía el correo de bienvenida la primera vez que un usuario
// entra con su email confirmado. La llama la aplicación; es idempotente (una vez por cuenta).
//
// Secretos: RESEND_API_KEY (obligatorio), SALES_FROM y APP_URL (opcionales).
import { createClient } from 'npm:@supabase/supabase-js@2';

const APP_URL = (Deno.env.get('APP_URL') ?? 'https://korrige.es').replace(/\/$/, '');
const FROM = Deno.env.get('SALES_FROM') ?? 'Korrige <no-reply@korrige.es>';
const ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? 'https://korrige.es,https://www.korrige.es').split(',').map((s) => s.trim());
function corsHeaders(req: Request, origins: string[]): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const ok = origins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) || /\.netlify\.app$/.test(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : origins[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    Vary: 'Origin',
  };
}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function html(name: string): string {
  const sans = 'font-family:Arial,Helvetica,sans-serif;';
  const step = (n: number, title: string, text: string) =>
    `<tr><td style="padding:10px 0;${sans}font-size:15px;line-height:1.5;color:#3b4252;border-top:1px solid #ece9e1;"><span style="font-family:Georgia,serif;font-size:20px;color:#14161b;">${n}</span>&nbsp;&nbsp;<b style="color:#14161b;">${title}</b><br />${text}</td></tr>`;
  return `<!doctype html><html lang="es"><body style="margin:0;padding:0;background:#f8f7f3;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7f3;padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1.5px solid #14161b;">
<tr><td style="padding:28px 32px 0 32px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:bold;letter-spacing:-0.5px;color:#14161b;">k<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:#2439b0;border:2px solid #d6336c;margin:0 1px;"></span>rrige</td></tr>
<tr><td style="padding:22px 32px 0 32px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.2;color:#14161b;">${name ? `Hola, ${esc(name)}. ` : ''}Te damos la bienvenida a Korrige</td></tr>
<tr><td style="padding:14px 32px 0 32px;${sans}font-size:15px;line-height:1.55;color:#3b4252;">Ya puedes corregir tu primer examen tipo test. Es gratis y completo, sin tarjeta. Así funciona:</td></tr>
<tr><td style="padding:14px 32px 0 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${step(1, 'Crea el examen y descarga la hoja', 'Eliges el número de preguntas, las opciones y los modelos.')}
${step(2, 'Imprime al 100 % y examina', 'En papel normal. Los alumnos marcan con bolígrafo azul o negro.')}
${step(3, 'Escanea todo el taco', 'En el alimentador de la fotocopiadora, enviado a tu correo como un único PDF.')}
${step(4, 'Sube el PDF', 'En segundos tienes las notas, lo que hay que revisar y las estadísticas.')}
</table></td></tr>
<tr><td style="padding:24px 32px 0 32px;"><a href="${APP_URL}/app" style="display:inline-block;background:#2439b0;color:#ffffff;${sans}font-size:15px;font-weight:bold;text-decoration:none;padding:13px 22px;border-radius:6px;">Crear mi primer examen</a></td></tr>
<tr><td style="padding:18px 32px 24px 32px;${sans}font-size:14px;line-height:1.55;color:#3b4252;">Antes de imprimir, echa un vistazo a la <a href="${APP_URL}/guia" style="color:#2439b0;">guía de impresión y escaneo</a>. Si tienes cualquier duda, responde a este correo.</td></tr>
<tr><td style="padding:18px 32px 26px 32px;${sans}font-size:12px;line-height:1.5;color:#6b7280;border-top:1px solid #ece9e1;">Recibes este mensaje porque has creado una cuenta en Korrige.<br />Korrige · Corrección de exámenes tipo test · <a href="${APP_URL}" style="color:#6b7280;">korrige.es</a></td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req, ORIGINS);
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'method' });

  const userDb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('authorization') ?? '' } }, auth: { persistSession: false } });
  const { data: u } = await userDb.auth.getUser();
  if (!u?.user?.email) return json(401, { error: 'auth' });
  if (!u.user.email_confirmed_at) return json(200, { ok: true, skipped: 'email_sin_confirmar' });
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return json(503, { error: 'email_not_configured' });

  // se "reserva" el envío antes de mandar: dos pestañas a la vez no envían dos correos
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: claimed } = await admin.from('profiles').update({ welcomed_at: new Date().toISOString() }).eq('id', u.user.id).is('welcomed_at', null).select('full_name');
  if (!claimed?.length) return json(200, { ok: true, skipped: 'ya_enviado' });

  const name = (claimed[0].full_name ?? '').trim().split(/\s+/)[0] ?? '';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: [u.user.email],
      reply_to: 'hola@korrige.es',
      subject: 'Te damos la bienvenida a Korrige',
      html: html(name),
      text: `Te damos la bienvenida a Korrige. Tu primer examen es gratis.\n\n1. Crea el examen y descarga la hoja.\n2. Imprime al 100 % y examina.\n3. Escanea todo el taco en la fotocopiadora.\n4. Sube el PDF y obtén las notas.\n\nEmpieza aquí: ${APP_URL}/app\nGuía de impresión y escaneo: ${APP_URL}/guia`,
    }),
  });
  if (!res.ok) {
    console.error('welcome: Resend respondió', res.status, await res.text());
    // se libera la reserva para reintentarlo en la próxima visita
    await admin.from('profiles').update({ welcomed_at: null }).eq('id', u.user.id);
    return json(502, { error: 'email_failed' });
  }
  return json(200, { ok: true });
});
