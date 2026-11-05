import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  buildTeamMap,
  snapshotDiffers,
  taskCreatorId,
  resolveTaskTeamStamp,
} from '../../shared/teamMemberSnapshot.ts';

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
 * notifyTeammate only ever counts the last rolling hour of NotificationEmailLog
 * rows, so anything older than a day is dead weight. Deleted by the six-hourly
 * sweep; a 24-hour cut-off leaves three hours of slack if a run is missed.
 */
const EMAIL_LOG_RETENTION_MS = 24 * 60 * 60 * 1000;

async function pruneEmailLog(admin) {
  const stale = { sent_at: { $lt: new Date(Date.now() - EMAIL_LOG_RETENTION_MS).toISOString() } };
  const found = await admin.entities.NotificationEmailLog.count(stale);
  if (!found) return 0;
  await admin.entities.NotificationEmailLog.deleteMany(stale);
  return found;
}

/**
 * creator id -> "is that account an app admin?". Cached per run: a sweep touches
 * many rows written by the same few people.
 */
function makeAdminLookup(admin) {
  const cache = new Map();
  return async (userId) => {
    if (cache.has(userId)) return cache.get(userId);
    const [found] = await admin.entities.User.filter({ id: userId });
    const isAdmin = found?.role === 'admin';
    cache.set(userId, isAdmin);
    return isAdmin;
  };
}

const REJECTED_TITLE = "Task addressed to a team its creator isn't in";
const MAX_REJECTED_NOTICES = 25;

/**
 * One notice per task that points at a team its creator has nothing to do with,
 * naming the task id and the team id. Silent when there is nothing to report.
 */
async function notifyRejectedTasks(admin, rejected, path) {
  if (!Array.isArray(rejected) || rejected.length === 0) return 0;
  const [owner] = await admin.entities.User.filter({ role: 'admin' }, 'created_date', 1, 0);
  if (!owner) return 0;
  const rows = rejected.slice(0, MAX_REJECTED_NOTICES).map((r) => {
    const why = r.reason === 'missing_creator'
      ? 'its creator is a service identity with no owner_user_id'
      : 'its creator is not a member of that team';
    return {
      user_id: owner.id,
      type: 'general',
      title: REJECTED_TITLE,
      message: `Task ${r.task_id} is addressed to team ${r.team_id}, but ${why}. team_member_ids was cleared by the ${path} run, so that team's members are not given access to it.`,
      priority: 'high',
      related_id: r.task_id,
      related_type: 'task',
    };
  });
  await admin.entities.Notification.bulkCreate(rows);
  return rows.length;
}

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
async function sweepEntity(admin, target, teamMap, presetRows, ctx) {
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
  const rejected = [];
  let skippedNoTeam = 0;
  let skippedUnknownTeam = 0;
  let alreadyOk = 0;
  let clearedNotMember = 0;
  let leftAsIs = 0;

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

    // A team task may only carry the team's members when the person it is
    // addressed to (creator, or owner_user_id for a service identity) belongs to
    // the team or is an admin. Otherwise the snapshot is cleared instead of
    // stamped, so a stray team_id cannot share the task with strangers.
    if (target.entity === 'Task') {
      const creatorId = taskCreatorId(row);
      const creatorIsAdmin = creatorId && !current.includes(creatorId)
        ? await ctx.isCreatorAdmin(creatorId)
        : false;
      const decision = resolveTaskTeamStamp({ task: row, members: current, creatorIsAdmin });

      if (decision.action === 'clear') {
        // Not on the team, not an admin, and not in the row's own snapshot: the
        // team_id is stray. Noticed every time the decision is clear; written
        // only when there is something to empty.
        rejected.push({ task_id: row.id, team_id: row.team_id, reason: decision.reason });
        if (snapshotDiffers(row[target.field], [])) {
          updates.push({ id: row.id, [target.field]: [] });
          clearedNotMember += 1;
        }
        continue;
      }

      if (decision.action === 'leave') {
        // Stamped while its creator was still on the team, so the row keeps the
        // audience it was given: not cleared, and not re-stamped either.
        leftAsIs += 1;
        continue;
      }
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
    cleared_not_member: clearedNotMember,
    left_former_member: leftAsIs,
    repaired_ids: updates.map((u) => u.id),
    rejected,
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
    const ctx = { isCreatorAdmin: makeAdminLookup(admin) };

    if (sweep) {
      const perEntity = {};
      const repaired = [];
      const rejected = [];
      let scanned = 0;
      let stamped = 0;
      let cleared = 0;

      for (const target of TARGETS) {
        const outcome = await sweepEntity(admin, target, teamMap, undefined, ctx);
        perEntity[target.entity] = {
          snapshot_field: target.field,
          scanned: outcome.scanned,
          stamped: outcome.stamped,
          already_ok: outcome.already_ok,
          skipped_no_team: outcome.skipped_no_team,
          skipped_unknown_team: outcome.skipped_unknown_team,
          cleared_not_member: outcome.cleared_not_member,
          left_former_member: outcome.left_former_member,
        };
        scanned += outcome.scanned;
        stamped += outcome.stamped;
        cleared += outcome.cleared_not_member;
        rejected.push(...outcome.rejected);
        repaired.push(...outcome.repaired_ids.map((id) => `${target.entity}:${id}`));
      }

      // Housekeeping that rides along with the sweep: drop day-old email log rows.
      const emailLogPruned = await pruneEmailLog(admin);

      // Never notify when nothing was written: a no-op run stays silent.
      if (stamped > 0 || cleared > 0) {
        const breakdown = TARGETS.map((t) => `${t.entity} ${perEntity[t.entity].stamped}`).join(' · ')
          + (cleared > 0 ? ` · cleared ${cleared}` : '');
        await notifyAdmin(admin, 'sweep', repaired, breakdown);
      }
      const rejectedNotified = await notifyRejectedTasks(admin, rejected, 'sweep');

      return Response.json({
        mode: 'sweep',
        scanned,
        stamped,
        cleared_not_member: cleared,
        rejected_notified: rejectedNotified,
        entities: perEntity,
        email_log_pruned: emailLogPruned,
      });
    }

    // Single-task mode: the entity trigger's path, unchanged in behaviour.
    const task = await admin.entities.Task.get(taskId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

    const outcome = await sweepEntity(admin, TARGETS[0], teamMap, [task], ctx);
    if (outcome.stamped > 0 || outcome.cleared_not_member > 0) {
      const breakdown = outcome.cleared_not_member > 0
        ? `Task ${outcome.stamped} · cleared ${outcome.cleared_not_member}`
        : 'Task 1';
      await notifyAdmin(admin, 'trigger', outcome.repaired_ids.map((id) => `Task:${id}`), breakdown);
    }
    const rejectedNotified = await notifyRejectedTasks(admin, outcome.rejected, 'trigger');

    return Response.json({
      mode: 'single',
      scanned: 1,
      stamped: outcome.stamped,
      cleared_not_member: outcome.cleared_not_member,
      left_former_member: outcome.left_former_member,
      rejected_notified: rejectedNotified,
      already_ok: outcome.already_ok,
      skipped_no_team: outcome.skipped_no_team,
      skipped_unknown_team: outcome.skipped_unknown_team,
    });
  } catch (error) {
    console.log('stampTaskTeamMembers failed:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}