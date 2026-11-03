import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * TEMPORARY — deletes every registered sentinel (by exact id from RlsProbeSentinel)
 * and nothing else. A team that merely carries a zzProbe- name but has no registry
 * row was not created by setup, so it is reported and left untouched.
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
    const registry = asRows(await admin.entities.RlsProbeSentinel.list());

    const deleted = [];
    for (const row of registry) {
      const team = asRows(await admin.entities.Team.filter({ id: row.team_id }))[0] || null;
      if (team) {
        await admin.entities.Team.delete(team.id);
        deleted.push({ id: team.id, name: team.name, label: row.label ?? null });
      }
      await admin.entities.RlsProbeSentinel.delete(row.id);
    }

    const remainingTeams = asRows(await admin.entities.Team.list());
    const remainingRegistry = asRows(await admin.entities.RlsProbeSentinel.list());
    const unregistered = remainingTeams
      .filter((t) => typeof t.name === 'string' && t.name.startsWith(SENTINEL_PREFIX))
      .map((t) => ({ id: t.id, name: t.name, owner_id: t.owner_id ?? null }));

    return Response.json({
      ok: true,
      registry_rows: registry.length,
      deleted,
      remaining_count: remainingTeams.length,
      remaining_names: remainingTeams.map((t) => t.name),
      unregistered_zzProbe_named_teams: unregistered,
      unregistered_note: unregistered.length
        ? 'Left untouched: these have no registry row, so setup did not create them.'
        : 'None.',
      sentinels_left: remainingRegistry.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}