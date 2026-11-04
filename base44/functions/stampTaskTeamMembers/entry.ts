import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { buildTeamMap, snapshotDiffers } from '../../shared/teamMemberSnapshot.ts';

/**
 * Keeps Task.team_member_ids in step with the owning team's current members.
 *
 * Two modes:
 *   { task_id } — one task, called from the entity trigger on Task create/update.
 *   { sweep: true } — every team task, called from the six-hourly sweep.
 *
 * Writes ONLY when the stored list differs from the team's current members, so
 * the update it makes cannot trigger itself again: the next run compares equal
 * and stops. An empty array counts as unstamped.
 */

const MAX_PAGES = 40;
const PAGE_SIZE = 500;
const UPDATE_CHUNK = 400;

const pageItems = (page) => (Array.isArray(page) ? page : (page?.items ?? []));
const pageHasMore = (page) => !Array.isArray(page) && (page?.has_more === true || Boolean(page?.next_cursor));

const MAX_LISTED_IDS = 25;

/**
 * Tells the admin account which rows a run repaired and which path caught them.
 * Resolves the admin at run time (oldest admin = app owner) rather than storing an id.
 */
async function notifyAdmin(admin, path, ids) {
  const [owner] = await admin.entities.User.filter({ role: 'admin' }, 'created_date', 1, 0);
  if (!owner) return null;
  const shown = ids.slice(0, MAX_LISTED_IDS).join(', ');
  const more = ids.length > MAX_LISTED_IDS ? ` (+${ids.length - MAX_LISTED_IDS} more)` : '';
  const row = await admin.entities.Notification.create({
    user_id: owner.id,
    type: 'general',
    title: `Team snapshot repaired by ${path}`,
    message: `${ids.length} task${ids.length === 1 ? '' : 's'} re-stamped by the ${path} run. Task ids: ${shown}${more}`,
    priority: 'low',
  });
  return row?.id ?? null;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const sweep = body?.sweep === true;
    const taskId = typeof body?.task_id === 'string' ? body.task_id.trim() : '';
    if (!sweep && !taskId) {
      return Response.json({ error: 'task_id or sweep is required' }, { status: 400 });
    }

    const admin = base44.asServiceRole;
    const teamMap = buildTeamMap(pageItems(await admin.entities.Team.list({ limit: 500 })));

    const targets = [];
    if (sweep) {
      let cursor;
      for (let page = 0; page < MAX_PAGES; page += 1) {
        // Scan every task and skip the untammped ones below: a filter on team_id
        // cannot be relied on to find rows whose snapshot is an empty array.
        const result = await admin.entities.Task.filter(
          {},
          cursor ? { limit: PAGE_SIZE, cursor } : { limit: PAGE_SIZE }
        );
        targets.push(...pageItems(result));
        if (!pageHasMore(result)) break;
        cursor = result.next_cursor;
      }
    } else {
      const row = await admin.entities.Task.get(taskId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      if (!row) return Response.json({ error: 'Task not found' }, { status: 404 });
      targets.push(row);
    }

    const updates = [];
    let skippedNoTeam = 0;
    let skippedUnknownTeam = 0;
    let alreadyOk = 0;

    for (const row of targets) {
      if (!row?.team_id) {
        skippedNoTeam += 1;
        continue;
      }
      const current = teamMap[row.team_id];
      if (!current || current.length === 0) {
        // No such team, or a team with no members: nothing to stamp with.
        skippedUnknownTeam += 1;
        continue;
      }
      if (!snapshotDiffers(row.team_member_ids, current)) {
        alreadyOk += 1;
        continue;
      }
      updates.push({ id: row.id, team_member_ids: current });
    }

    let stamped = 0;
    for (let i = 0; i < updates.length; i += UPDATE_CHUNK) {
      const chunk = updates.slice(i, i + UPDATE_CHUNK);
      await admin.entities.Task.bulkUpdate(chunk);
      stamped += chunk.length;
    }

    // Never notify when nothing was written: a no-op run stays silent.
    if (stamped > 0) {
      await notifyAdmin(admin, sweep ? 'sweep' : 'trigger', updates.map((u) => u.id));
    }

    return Response.json({
      mode: sweep ? 'sweep' : 'single',
      scanned: targets.length,
      stamped,
      already_ok: alreadyOk,
      skipped_no_team: skippedNoTeam,
      skipped_unknown_team: skippedUnknownTeam,
    });
  } catch (error) {
    console.log('stampTaskTeamMembers failed:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}