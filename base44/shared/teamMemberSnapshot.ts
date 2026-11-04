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