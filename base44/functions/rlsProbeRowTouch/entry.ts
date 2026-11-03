import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * TEMPORARY — one service-role write to an entity sentinel row, so the probe page can
 * see whether that write reaches a subscribing client.
 *
 * The guard is the RlsProbeRecord row for the exact (entity, record id) pair, written
 * only by rlsProbeRowSetup. No registry row, no write.
 */

const TOUCH_FIELD = {
  ActiveSession: 'task_title',
  TeamNotification: 'title',
  TeamMessage: 'content',
};

const asRows = (page) => (Array.isArray(page) ? page : (page?.items || []));

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const entityName = typeof body?.entity_name === 'string' ? body.entity_name.trim() : '';
    const recordId = typeof body?.record_id === 'string' ? body.record_id.trim() : '';

    if (!TOUCH_FIELD[entityName]) {
      return Response.json({ error: 'Unsupported entity for a row touch' }, { status: 400 });
    }
    if (!recordId) return Response.json({ error: 'record_id is required' }, { status: 400 });

    const admin = base44.asServiceRole;

    const row = asRows(await admin.entities.RlsProbeRecord.filter({ entity_name: entityName, record_id: recordId }))[0] || null;
    if (!row) return Response.json({ error: 'Not a registered sentinel record' }, { status: 403 });

    const record = asRows(await admin.entities[entityName].filter({ id: recordId }))[0] || null;
    if (!record) return Response.json({ error: 'Not found' }, { status: 404 });

    const field = TOUCH_FIELD[entityName];
    const marker = `probe touch ${new Date().toISOString()}`;
    await admin.entities[entityName].update(recordId, { [field]: marker });

    return Response.json({ ok: true, entity_name: entityName, record_id: recordId, field, marker });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}