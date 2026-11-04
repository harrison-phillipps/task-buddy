import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { buildTeamMap, snapshotDiffers } from '../../shared/teamMemberSnapshot.ts';

/**
 * Keeps every team-scoped row's member snapshot in step with its team:
 *   Task         → team_member_ids   (the field Task's read rule anchors on)
 *   TaskComment  → member_user_ids
 *   TaskActivity → member_user_ids
 *
 * Two modes:
 *   { task_id } — one task, called from the entity trigger on Task create/update.
 *   { sweep: true } — every row of every target, called from the six-hourly sweep.
 *
 * Writes ONLY when the stored list differs from the team's current members, so
 * the update it makes cannot trigger itself again: the next run compares equal
 * and stops. An empty array counts as unstamped.
 */

const TARGETS = [
  { entity: 'Task', field: 'team_member_ids' },
  { entity: 'TaskComment', field: 'member_user_ids' },
  { entity: 'TaskActivity', field: 'member_user_ids' },
];

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
async function notifyAdmin(admin, path, repaired, breakdown) {
  const [owner] = await admin.entities.User.filter({ role: 'admin' }, 'created_date', 1, 0);
  if (!owner) return null;
  const shown = repaired.slice(0, MAX_LISTED_IDS).join(', ');
  const more = repaired.length > MAX_LISTED_IDS ? ` (+${repaired.length - MAX_LISTED_IDS} more)` : '';
  const row = await admin.entities.Notification.create({
    user_id: owner.id,
    type: 'general',
    title: `Team snapshot repaired by ${path}`,
    message: `${repaired.length} row${repaired.length === 1 ? '' : 's'} re-stamped by the ${path} run (${breakdown}). Row ids: ${shown}${more}`,
    priority: 'low',
  });
  return row?.id ?? null;
}

/**
 * Re-stamps one entity. Returns counts plus the ids it repaired.
 * Pass `presetRows` for the single-record path; omit it to scan the whole entity.
 */
async function sweepEntity(admin, target, teamMap, presetRows) {
  const rows = Array.isArray(presetRows) ? [...presetRows] : [];
  if (!Array.isArray(presetRows)) {
    let cursor;
    for (let page = 0; page < MAX_PAGES; page += 1) {
      // Scan every row and skip the unstamped ones below: a filter on team_id
      // cannot be relied on to find rows whose snapshot is an empty array.
      const result = await admin.entities[target.entity].filter(
        {},
        cursor ? { limit: PAGE_SIZE, cursor } : { limit: PAGE_SIZE }
      );
      rows.push(...pageItems(result));
      if (!pageHasMore(result)) break;
      cursor = result.next_cursor;
    }
  }

  const updates = [];
  let skippedNoTeam = 0;
  let skippedUnknownTeam = 0;
  let alreadyOk = 0;

  for (const row of rows) {
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
    if (!snapshotDiffers(row[target.field], current)) {
      alreadyOk += 1;
      continue;
    }
    updates.push({ id: row.id, [target.field]: current });
  }

  let stamped = 0;
  for (let i = 0; i < updates.length; i += UPDATE_CHUNK) {
    const chunk = updates.slice(i, i + UPDATE_CHUNK);
    await admin.entities[target.entity].bulkUpdate(chunk);
    stamped += chunk.length;
  }

  return {
    scanned: rows.length,
    stamped,
    already_ok: alreadyOk,
    skipped_no_team: skippedNoTeam,
    skipped_unknown_team: skippedUnknownTeam,
    repaired_ids: updates.map((u) => u.id),
  };
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

    if (sweep) {
      const perEntity = {};
      const repaired = [];
      let scanned = 0;
      let stamped = 0;

      for (const target of TARGETS) {
        const outcome = await sweepEntity(admin, target, teamMap);
        perEntity[target.entity] = {
          snapshot_field: target.field,
          scanned: outcome.scanned,
          stamped: outcome.stamped,
          already_ok: outcome.already_ok,
          skipped_no_team: outcome.skipped_no_team,
          skipped_unknown_team: outcome.skipped_unknown_team,
        };
        scanned += outcome.scanned;
        stamped += outcome.stamped;
        repaired.push(...outcome.repaired_ids.map((id) => `${target.entity}:${id}`));
      }

      // Never notify when nothing was written: a no-op run stays silent.
      if (stamped > 0) {
        const breakdown = TARGETS.map((t) => `${t.entity} ${perEntity[t.entity].stamped}`).join(' · ');
        await notifyAdmin(admin, 'sweep', repaired, breakdown);
      }

      return Response.json({ mode: 'sweep', scanned, stamped, entities: perEntity });
    }

    // Single-task mode: the entity trigger's path, unchanged in behaviour.
    const task = await admin.entities.Task.get(taskId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

    const outcome = await sweepEntity(admin, TARGETS[0], teamMap, [task]);
    if (outcome.stamped > 0) {
      await notifyAdmin(admin, 'trigger', outcome.repaired_ids.map((id) => `Task:${id}`), 'Task 1');
    }

    return Response.json({
      mode: 'single',
      scanned: 1,
      stamped: outcome.stamped,
      already_ok: outcome.already_ok,
      skipped_no_team: outcome.skipped_no_team,
      skipped_unknown_team: outcome.skipped_unknown_team,
    });
  } catch (error) {
    console.log('stampTaskTeamMembers failed:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}