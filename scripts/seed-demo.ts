/**
 * Datos de demo en un proyecto de Supabase: organización demo, profesor demo y
 * un examen de ejemplo con hojas leídas, incidencias y notas.
 *
 *   SUPABASE_URL=...  SUPABASE_ANON_KEY=...  SUPABASE_SERVICE_ROLE_KEY=...  \
 *   DEMO_EMAIL=demo@korrige.es  DEMO_PASSWORD=...  npm run seed:demo
 *
 * La clave service_role solo se usa para crear el usuario; todo lo demás se hace
 * con la sesión del profesor demo, es decir, pasando por las políticas RLS (sirve
 * también como prueba de humo del despliegue).
 */
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { createSupabaseDb } from '../src/lib/dbSupabase';
import { seedDemo } from '../src/lib/demo';
import { processPdfsNode } from './node-omr';

const env = (k: string) => process.env[k] ?? process.env[`VITE_${k}`] ?? '';
const url = env('SUPABASE_URL');
const anon = env('SUPABASE_ANON_KEY');
const service = env('SUPABASE_SERVICE_ROLE_KEY');
const email = (process.env.DEMO_EMAIL ?? 'demo@korrige.es').toLowerCase();
const password = process.env.DEMO_PASSWORD ?? randomBytes(9).toString('base64url');
const orgName = process.env.DEMO_ORG ?? 'Facultad de Demostración';

if (!url || !anon || !service) {
  console.error('Faltan variables: SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
const { error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: 'Profesor Demo' } });
if (createError && !/already|registered|exists/i.test(createError.message)) throw createError;
if (createError) {
  if (!process.env.DEMO_PASSWORD) {
    console.error(`El usuario ${email} ya existe: indica su contraseña con DEMO_PASSWORD.`);
    process.exit(1);
  }
  console.log(`· el usuario ${email} ya existía`);
} else console.log(`· usuario creado: ${email}`);

const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: session, error: signError } = await client.auth.signInWithPassword({ email, password });
if (signError || !session.user) throw signError ?? new Error('No se pudo iniciar sesión con el usuario demo');
const db = createSupabaseDb(client);
const userId = session.user.id;

const memberships = await db.select<{ org_id: string }>('memberships', { user_id: userId });
const orgId = memberships[0]?.org_id ?? (await db.rpc<string>('create_organization', { p_name: orgName }));
console.log(`· organización: ${orgId}`);

const examId = await seedDemo(db, orgId, userId, (files, layout) => processPdfsNode(files, layout, { images: true }), (m) => console.log(`· ${m}`));
const [results, items] = await Promise.all([db.select('results', { exam_id: examId }), db.select('review_items', { exam_id: examId, status: 'pendiente' })]);
console.log(`\n✓ Examen de ejemplo creado: ${results.length} notas y ${items.length} incidencias por revisar.`);
console.log(`  Entra con ${email}${process.env.DEMO_PASSWORD ? '' : ` / ${password}`} → /app/examenes/${examId}`);
process.exit(0);
