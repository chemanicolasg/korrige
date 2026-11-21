import { describe, expect, it } from 'vitest';
import { leadEmail, validateLead } from '../supabase/functions/sales-lead/validate';
import { getDict } from '../src/i18n';

const ok = { name: ' Ana Pérez ', email: 'Ana@Uni.ES', institution: 'Facultad de Medicina', job_title: 'Vicedecana', n_teachers: '11–50', phone: '', message: 'Hola', privacy_accepted: true, website: '', elapsed_ms: 9000 };

describe('formulario de ventas', () => {
  it('normaliza y acepta un lead válido', () => {
    const v = validateLead(ok);
    expect(v).toMatchObject({ ok: true, lead: { name: 'Ana Pérez', email: 'ana@uni.es', locale: 'es' } });
  });
  it('exige nombre, email, institución y privacidad', () => {
    expect(validateLead({ ...ok, privacy_accepted: false })).toEqual({ ok: false, spam: false, error: 'required' });
    expect(validateLead({ ...ok, institution: '  ' })).toEqual({ ok: false, spam: false, error: 'required' });
    expect(validateLead({ ...ok, email: 'no-es-un-email' })).toEqual({ ok: false, spam: false, error: 'email' });
  });
  it('anti-spam: honeypot, envío instantáneo y mensajes llenos de enlaces', () => {
    expect(validateLead({ ...ok, website: 'http://spam' })).toEqual({ ok: false, spam: true });
    expect(validateLead({ ...ok, elapsed_ms: 300 })).toEqual({ ok: false, spam: true });
    expect(validateLead({ ...ok, message: 'http://a http://b https://c http://d' })).toEqual({ ok: false, spam: true });
  });
  it('el email de aviso escapa el HTML y no admite saltos de línea en el asunto', () => {
    const v = validateLead({ ...ok, name: 'Eva <script>', institution: 'Uni\nBcc: x@x.es', message: 'a < b\nsegunda línea' });
    if (!v.ok) throw new Error('debería ser válido');
    const mail = leadEmail(v.lead, 'Korrige');
    expect(mail.html).toContain('Eva &lt;script&gt;');
    expect(mail.html).toContain('a &lt; b<br>segunda línea');
    expect(mail.subject).not.toMatch(/[\r\n]/);
  });
});

describe('i18n de la landing', () => {
  it('catalán e inglés están completos: misma estructura y mismo número de elementos que el español', () => {
    expect(getDict('ca').nav.sales).toBe('Parlar amb vendes');
    expect(getDict('en').faq.title).toBe('Frequently asked questions');
    const shape = (v: unknown): unknown => (Array.isArray(v) ? v.map(shape) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x)])) : typeof v);
    for (const l of ['ca', 'en'] as const) {
      expect(shape(getDict(l)), l).toEqual(shape(getDict('es')));
      // títulos y descripciones dentro de lo que muestra Google
      expect(getDict(l).meta.title.length).toBeLessThanOrEqual(60);
      expect(getDict(l).meta.description.length).toBeLessThanOrEqual(155);
    }
  });
});
