// Validación del formulario "Hablar con ventas". Sin dependencias: se usa en la
// Edge Function (Deno) y en los tests (Vitest).

export interface LeadInput {
  name?: unknown;
  email?: unknown;
  institution?: unknown;
  job_title?: unknown;
  n_teachers?: unknown;
  phone?: unknown;
  message?: unknown;
  privacy_accepted?: unknown;
  locale?: unknown;
  /** Honeypot: campo oculto que una persona nunca rellena. */
  website?: unknown;
  /** Milisegundos entre que se pintó el formulario y se envió. */
  elapsed_ms?: unknown;
}

export interface Lead {
  name: string;
  email: string;
  institution: string;
  job_title: string;
  n_teachers: string;
  phone: string;
  message: string;
  privacy_accepted: true;
  locale: string;
}

export type Validation = { ok: true; lead: Lead } | { ok: false; spam: true } | { ok: false; spam: false; error: 'required' | 'email' };

const clean = (v: unknown, max: number) =>
  String(v ?? '')
    // deno-lint-ignore no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .trim()
    .slice(0, max);

export const EMAIL_RE = /^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/i;

export function validateLead(input: LeadInput): Validation {
  // anti-spam silencioso: honeypot relleno o envío "instantáneo"
  if (clean(input.website, 200) !== '') return { ok: false, spam: true };
  const elapsed = Number(input.elapsed_ms);
  if (Number.isFinite(elapsed) && elapsed < 2500) return { ok: false, spam: true };

  const lead: Lead = {
    name: clean(input.name, 120),
    email: clean(input.email, 200).toLowerCase(),
    institution: clean(input.institution, 160),
    job_title: clean(input.job_title, 120),
    n_teachers: clean(input.n_teachers, 40),
    phone: clean(input.phone, 40),
    message: clean(input.message, 4000),
    privacy_accepted: true,
    locale: clean(input.locale, 5) || 'es',
  };
  if (!lead.name || !lead.email || !lead.institution || input.privacy_accepted !== true) return { ok: false, spam: false, error: 'required' };
  if (!EMAIL_RE.test(lead.email)) return { ok: false, spam: false, error: 'email' };
  // demasiados enlaces en el mensaje = spam
  if ((lead.message.match(/https?:\/\//gi) ?? []).length > 3) return { ok: false, spam: true };
  return { ok: true, lead };
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function leadEmail(lead: Lead, appName: string): { subject: string; html: string; text: string } {
  const rows: [string, string][] = [
    ['Nombre', lead.name],
    ['Email', lead.email],
    ['Institución', lead.institution],
    ['Cargo', lead.job_title],
    ['Nº de profesores', lead.n_teachers],
    ['Teléfono', lead.phone],
    ['Mensaje', lead.message],
  ];
  const subject = `[${appName}] Nuevo contacto de ventas: ${lead.institution} (${lead.name})`.replace(/[\r\n]+/g, ' ');
  const html = `<h2>Nuevo contacto desde el formulario «Hablar con ventas»</h2><table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">${rows
    .map(([k, v]) => `<tr><td style="color:#64748b;vertical-align:top"><b>${k}</b></td><td>${escapeHtml(v || '—').replace(/\n/g, '<br>')}</td></tr>`)
    .join('')}</table><p style="font-family:sans-serif;font-size:12px;color:#64748b">Responde a este correo para contestar directamente a ${escapeHtml(lead.name)}.</p>`;
  const text = rows.map(([k, v]) => `${k}: ${v || '—'}`).join('\n');
  return { subject, html, text };
}
