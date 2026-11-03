import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * TEMPORARY — deletes every entity sentinel row registered in RlsProbeRecord and then
 * the registry rows themselves. Only exact registered ids are touched.
 */

const ENTITIES = ['ActiveSession', 'TeamNotification', 'TeamMessage'];
const asRows = (page) => (Array.isArray(page) ? page : (page?.items || []));

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const admin = base44.asServiceRole;
    const registry = asRows(await admin.entities.RlsProbeRecord.list());

    const deleted = [];
    for (const row of registry) {
      if (ENTITIES.includes(row.entity_name)) {
        await admin.entities[row.entity_name].delete(row.record_id).catch(() => null);
      }
      await admin.entities.RlsProbeRecord.delete(row.id);
      deleted.push({ entity_name: row.entity_name, record_id: row.record_id, role: row.role ?? null });
    }

    const remaining = asRows(await admin.entities.RlsProbeRecord.list());

    return Response.json({
      ok: true,
      registry_rows: registry.length,
      deleted,
      remaining_registry_rows: remaining.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}