/**
 * Membership snapshots on team-scoped records.
 *
 * Records that belong to a team carry a copy of the team's member user ids, so a
 * read rule can scope the row without joining Team. Every writer stamps it; a row
 * written without it is visible only to its author once the read rules go live.
 */

/** Plain user-id list from a team row, ignoring legacy email entries. */
export const teamMemberIds = (team) => {
  if (!Array.isArray(team?.member_user_ids)) {
    // Fail loudly: a snapshot built from anything other than a full Team row is
    // empty or partial, and the read rule will hide the row from its members.
    console.error(
      '[teamStamp] teamMemberIds received an input with no member_user_ids array — the member snapshot will be incomplete and RLS will hide the row. Pass a full Team row.',
      team
    );
  }
  const primary = Array.isArray(team?.member_user_ids) ? team.member_user_ids : [];
  const source = primary.length ? primary : (Array.isArray(team?.member_ids) ? team.member_ids : []);
  return source.filter((id) => typeof id === 'string' && id.trim() && !id.includes('@'));
};

/** TeamNotification / TeamMessage / TeamTemplate / CollaborativeFocusSession. */
export const stampMembers = (payload, team) => ({
  ...payload,
  member_user_ids: teamMemberIds(team),
});

/** Task rows that belong to a team. */
export const stampTaskMembers = (payload, team) => ({
  ...payload,
  team_member_ids: teamMemberIds(team),
});