// Edge Function «retention-purge»: borra de Storage las imágenes de las hojas de
// los exámenes cerrados que han superado el plazo de conservación de su
// organización (organizations.retention_months). Las notas se mantienen.
//
// Prográmala una vez al día (Dashboard → Integrations → Cron, o pg_cron + pg_net)
// con la cabecera  Authorization: Bearer <SERVICE_ROLE_KEY>  o  x-cron-secret: <CRON_SECRET>.
import { createClient } from 'npm:@supabase/supabase-js@2';

const BUCKET = 'sheets';

Deno.serve(async (req) => {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const cronSecret = Deno.env.get('CRON_SECRET');
  const bearer = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const authorized = bearer === serviceKey || (!!cronSecret && req.headers.get('x-cron-secret') === cronSecret);
  if (!authorized) return new Response('forbidden', { status: 403 });

  const db = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, { auth: { persistSession: false } });
  const { data: due, error } = await db.rpc('exams_due_for_purge');
  if (error) return new Response(error.message, { status: 500 });

  const report: { exam_id: string; images: number }[] = [];
  for (const { exam_id, org_id } of (due ?? []) as { exam_id: string; org_id: string }[]) {
    // rutas: <org>/<examen>/<subida>/<n>.jpg
    const prefix = `${org_id}/${exam_id}`;
    const { data: uploads } = await db.storage.from(BUCKET).list(prefix, { limit: 1000 });
    let images = 0;
    for (const up of uploads ?? []) {
      for (;;) {
        const { data: files } = await db.storage.from(BUCKET).list(`${prefix}/${up.name}`, { limit: 1000 });
        if (!files?.length) break;
        const { error: rmError } = await db.storage.from(BUCKET).remove(files.map((f) => `${prefix}/${up.name}/${f.name}`));
        if (rmError) return new Response(rmError.message, { status: 500 });
        images += files.length;
        if (files.length < 1000) break;
      }
    }
    const { error: markError } = await db.rpc('mark_images_purged', { p_exam: exam_id });
    if (markError) return new Response(markError.message, { status: 500 });
    report.push({ exam_id, images });
  }
  return new Response(JSON.stringify({ ok: true, purged: report }), { headers: { 'content-type': 'application/json' } });
});
