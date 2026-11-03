import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * TEMPORARY — deletes every throwaway sentinel team (name starts with zzProbe-)
 * and nothing else. Reports exactly what it considered and what it removed.
 */

const SENTINEL_PREFIX = 'zzProbe-';
const asRows = (page) => (Array.isArray(page) ? page : (page?.items || []));

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const admin = base44.asServiceRole;
    const all = asRows(await admin.entities.Team.list());
    const targets = all.filter((t) => typeof t.name === 'string' && t.name.startsWith(SENTINEL_PREFIX));

    const deleted = [];
    for (const team of targets) {
      // Re-check the name immediately before deleting: the prefix is the only guard.
      if (!String(team.name || '').startsWith(SENTINEL_PREFIX)) continue;
      await admin.entities.Team.delete(team.id);
      deleted.push({ id: team.id, name: team.name });
    }

    const remaining = asRows(await admin.entities.Team.list());

    return Response.json({
      ok: true,
      considered: all.map((t) => t.name),
      deleted,
      remaining_count: remaining.length,
      remaining_names: remaining.map((t) => t.name),
      sentinels_left: remaining.filter((t) => String(t.name || '').startsWith(SENTINEL_PREFIX)).length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}