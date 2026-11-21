// Edge Function «send-invite»: envía por correo (Resend) la invitación a un profesor.
// La llama la aplicación al crear la invitación o al pulsar «Reenviar correo».
// Solo puede usarla un administrador de la organización de esa invitación.
//
// Secretos: RESEND_API_KEY (obligatorio), SALES_FROM y APP_URL (opcionales).
// SUPABASE_URL y SUPABASE_ANON_KEY los inyecta Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2';

const APP_URL = (Deno.env.get('APP_URL') ?? 'https://korrige.es').replace(/\/$/, '');
const FROM = Deno.env.get('SALES_FROM') ?? 'Korrige <no-reply@korrige.es>';
const ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? 'https://korrige.es,https://www.korrige.es').split(',').map((s) => s.trim());

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const ok = ORIGINS.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) || /\.netlify\.app$/.test(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    Vary: 'Origin',
  };
}
const json = (req: Request, status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'content-type': 'application/json; charset=utf-8' } });
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function emailHtml(org: string, inviter: string, role: string, link: string, loginLink: string): string {
  const cell = "font-family:Arial,Helvetica,sans-serif;color:#3b4252;";
  return `<!doctype html><html lang="es"><body style="margin:0;padding:0;background:#f8f7f3;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7f3;padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1.5px solid #14161b;">
<tr><td style="padding:28px 32px 0 32px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:bold;letter-spacing:-0.5px;color:#14161b;">k<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:#2439b0;border:2px solid #d6336c;margin:0 1px;"></span>rrige</td></tr>
<tr><td style="padding:22px 32px 0 32px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.2;color:#14161b;">Te han invitado a ${esc(org)}</td></tr>
<tr><td style="padding:14px 32px 0 32px;${cell}font-size:15px;line-height:1.55;">${esc(inviter)} te ha invitado a unirte a <b style="color:#14161b;">${esc(org)}</b> en Korrige como ${role === 'admin' ? 'administrador' : 'profesor'}. Korrige corrige exámenes tipo test escaneando las hojas de respuestas en la fotocopiadora.</td></tr>
<tr><td style="padding:24px 32px 0 32px;"><a href="${link}" style="display:inline-block;background:#2439b0;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;padding:13px 22px;border-radius:6px;">Crear mi cuenta</a></td></tr>
<tr><td style="padding:18px 32px 0 32px;${cell}font-size:14px;line-height:1.55;">Regístrate con este mismo correo y entrarás directamente en la organización. Si ya tienes cuenta en Korrige, solo tienes que <a href="${loginLink}" style="color:#2439b0;">iniciar sesión</a>.</td></tr>
<tr><td style="padding:22px 32px 24px 32px;${cell}font-size:12px;line-height:1.5;color:#6b7280;">Si el botón no funciona, copia y pega esta dirección en tu navegador:<br /><a href="${link}" style="color:#2439b0;word-break:break-all;">${link}</a></td></tr>
<tr><td style="padding:18px 32px 26px 32px;${cell}font-size:12px;line-height:1.5;color:#6b7280;border-top:1px solid #ece9e1;">Si no esperabas esta invitación, puedes ignorar este mensaje.<br />Korrige · Corrección de exámenes tipo test · <a href="${APP_URL}" style="color:#6b7280;">korrige.es</a></td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, 405, { ok: false, error: 'method' });
  const auth = req.headers.get('authorization');
  if (!auth) return json(req, 401, { ok: false, error: 'auth' });

  let invitationId = '';
  try {
    invitationId = String((await req.json()).invitation_id ?? '');
  } catch {
    return json(req, 400, { ok: false, error: 'json' });
  }
  if (!/^[0-9a-f-]{36}$/i.test(invitationId)) return json(req, 400, { ok: false, error: 'invitation_id' });

  // todo se consulta con la sesión de quien llama: RLS decide qué puede ver
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: inv } = await db.from('invitations').select('id, email, role, org_id, accepted_at').eq('id', invitationId).maybeSingle();
  if (!inv) return json(req, 404, { ok: false, error: 'not_found' });
  const { data: isAdmin } = await db.rpc('is_org_admin', { p_org: inv.org_id });
  if (!isAdmin) return json(req, 403, { ok: false, error: 'forbidden' });
  if (inv.accepted_at) return json(req, 409, { ok: false, error: 'accepted' });

  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return json(req, 503, { ok: false, error: 'email_not_configured' });

  const [{ data: org }, { data: userData }] = await Promise.all([db.from('organizations').select('name').eq('id', inv.org_id).maybeSingle(), db.auth.getUser()]);
  const { data: me } = userData?.user ? await db.from('profiles').select('full_name, email').eq('id', userData.user.id).maybeSingle() : { data: null };
  const orgName = org?.name ?? 'tu organización';
  const inviter = me?.full_name || me?.email || 'Un administrador';
  const link = `${APP_URL}/acceso?modo=crear&email=${encodeURIComponent(inv.email)}`;
  const loginLink = `${APP_URL}/acceso?email=${encodeURIComponent(inv.email)}`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: [inv.email],
      ...(me?.email ? { reply_to: me.email } : {}),
      subject: `Te han invitado a ${orgName} en Korrige`.replace(/[\r\n]+/g, ' '),
      html: emailHtml(orgName, inviter, inv.role, link, loginLink),
      text: `${inviter} te ha invitado a unirte a ${orgName} en Korrige.\n\nCrea tu cuenta con este mismo correo: ${link}\n\nSi ya tienes cuenta, inicia sesión: ${loginLink}`,
    }),
  });
  if (!res.ok) {
    console.error('send-invite: Resend respondió', res.status, await res.text());
    return json(req, 502, { ok: false, error: 'email_failed' });
  }
  return json(req, 200, { ok: true });
});
