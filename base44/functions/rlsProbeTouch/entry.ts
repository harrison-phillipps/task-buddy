import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * TEMPORARY — performs one service-role write to a sentinel team, so the probe
 * page can see whether that write reaches a subscribing client.
 * The name check is the guard: anything not named zzProbe-* is refused.
 */

const SENTINEL_PREFIX = 'zzProbe-';
const asRows = (page) => (Array.isArray(page) ? page : (page?.items || []));

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const teamId = typeof body?.team_id === 'string' ? body.team_id.trim() : '';
    if (!teamId) return Response.json({ error: 'team_id is required' }, { status: 400 });

    const admin = base44.asServiceRole;
    const team = asRows(await admin.entities.Team.filter({ id: teamId }))[0] || null;
    if (!team) return Response.json({ error: 'Not found' }, { status: 404 });
    if (!String(team.name || '').startsWith(SENTINEL_PREFIX)) {
      return Response.json({ error: 'Refusing to touch a non-sentinel team' }, { status: 403 });
    }

    const marker = `probe touch ${new Date().toISOString()}`;
    await admin.entities.Team.update(team.id, { description: marker });

    return Response.json({ ok: true, team_id: team.id, team_name: team.name, description: marker });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}