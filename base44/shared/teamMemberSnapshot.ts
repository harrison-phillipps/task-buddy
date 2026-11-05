/**
 * Team membership snapshots, shared by the stamping function and the audit.
 *
 * A team-scoped row must carry a copy of the team's member ids: a read rule can
 * only see fields on the row, so a row without the snapshot is visible to its
 * author alone. The platform stores an EMPTY ARRAY (not an absent field) when a
 * writer sets team_id and omits the snapshot, so [] counts as unstamped.
 */

/** Ids only: strings, trimmed, no legacy email entries, de-duplicated, sorted. */
export function normalizeMemberIds(value) {
  const list = Array.isArray(value) ? value : [];
  const ids = list
    .filter((id) => typeof id === 'string')
    .map((id) => id.trim())
    .filter((id) => id.length > 0 && !id.includes('@'));
  return [...new Set(ids)].sort();
}

/** A team row's members: member_user_ids, falling back to legacy member_ids. */
export function teamMembers(team) {
  const primary = Array.isArray(team?.member_user_ids) ? team.member_user_ids : [];
  const fallback = Array.isArray(team?.member_ids) ? team.member_ids : [];
  return normalizeMemberIds(primary.length ? primary : fallback);
}

/** team_id -> current member ids. */
export function buildTeamMap(teams) {
  const map = {};
  for (const team of Array.isArray(teams) ? teams : []) {
    if (team?.id) map[team.id] = teamMembers(team);
  }
  return map;
}

/**
 * True when the stored snapshot is not this team's current member list.
 * Order-insensitive; an absent or empty snapshot always differs.
 */
export function snapshotDiffers(stored, current) {
  const have = normalizeMemberIds(stored);
  if (have.length !== current.length) return true;
  return have.some((id, index) => id !== current[index]);
}

/** Service identities (webhooks, workflows, recurring spawns) are not users. */
const SERVICE_PREFIX = 'service_';

/**
 * The user a team task is really addressed to.
 *
 * Normally the creator. A task written by a service identity has no usable
 * created_by_id, so its owner_user_id stands in. Returns null when there is no
 * one to check at all — a service-created task with no owner.
 */
export function taskCreatorId(task) {
  const created = typeof task?.created_by_id === 'string' ? task.created_by_id.trim() : '';
  if (created.startsWith(SERVICE_PREFIX)) {
    const owner = typeof task?.owner_user_id === 'string' ? task.owner_user_id.trim() : '';
    return owner.length > 0 ? owner : null;
  }
  return created.length > 0 ? created : null;
}

/**
 * What to do with a team task's member snapshot.
 *
 *   stamp — the user it is addressed to (see taskCreatorId) is on the team, or is
 *           an app admin: carry the team's current members.
 *   leave — that user is not on the team now, but the row's own snapshot already
 *           includes them: it was stamped while they were still a member (they
 *           have since left, or the account was deleted). The row keeps the
 *           audience it was given — not cleared, not re-stamped.
 *   clear — neither on the team, nor an admin, nor in the snapshot: the team_id
 *           is stray, so the snapshot is emptied and the admin is told.
 *
 * `members` is the team's current member ids (teamMembers(team)); `creatorIsAdmin`
 * is the answer to "is that account an app admin?", looked up by the caller so
 * this stays a pure decision.
 */
export function resolveTaskTeamStamp({ task, members, creatorIsAdmin = false }) {
  const creator_id = taskCreatorId(task);
  if (!creator_id) return { action: 'clear', reason: 'missing_creator', creator_id: null };
  const team = normalizeMemberIds(members);
  if (team.includes(creator_id)) return { action: 'stamp', reason: 'member', creator_id };
  if (creatorIsAdmin) return { action: 'stamp', reason: 'admin', creator_id };
  if (normalizeMemberIds(task?.team_member_ids).includes(creator_id)) {
    return { action: 'leave', reason: 'former_member', creator_id };
  }
  return { action: 'clear', reason: 'not_member', creator_id };
}