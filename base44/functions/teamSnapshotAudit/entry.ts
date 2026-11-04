import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { buildTeamMap, normalizeMemberIds, snapshotDiffers } from '../../shared/teamMemberSnapshot.ts';

/**
 * Admin-only audit of team membership snapshots. Returns counts only — no ids,
 * titles or other record content.
 *
 * Per entity: how many rows carry a team_id, how many have an empty or absent
 * snapshot, how many differ from the team's current members, and how many point
 * at a team_id that is not a real team.
 */

const ENTITIES = [
  { entity: 'Task', field: 'team_member_ids' },
  { entity: 'TeamNotification', field: 'member_user_ids' },
  { entity: 'TeamMessage', field: 'member_user_ids' },
  { entity: 'CollaborativeFocusSession', field: 'member_user_ids' },
  { entity: 'TeamTemplate', field: 'member_user_ids' },
];

const MAX_PAGES = 40;
const PAGE_SIZE = 500;

const pageItems = (page) => (Array.isArray(page) ? page : (page?.items ?? []));
const pageHasMore = (page) => !Array.isArray(page) && (page?.has_more === true || Boolean(page?.next_cursor));

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const admin = base44.asServiceRole;
    const teamMap = buildTeamMap(pageItems(await admin.entities.Team.list({ limit: 500 })));

    const results = {};
    for (const { entity, field } of ENTITIES) {
      const rows = [];
      let cursor;
      for (let page = 0; page < MAX_PAGES; page += 1) {
        const result = await admin.entities[entity].list(cursor ? { limit: PAGE_SIZE, cursor } : { limit: PAGE_SIZE });
        rows.push(...pageItems(result));
        if (!pageHasMore(result)) break;
        cursor = result.next_cursor;
      }

      let withTeam = 0;
      let emptyOrMissing = 0;
      let differs = 0;
      let matches = 0;
      let unknownTeam = 0;

      for (const row of rows) {
        if (!row?.team_id) continue;
        withTeam += 1;
        const stored = normalizeMemberIds(row[field]);
        const current = teamMap[row.team_id];
        if (stored.length === 0) {
          emptyOrMissing += 1;
          continue;
        }
        if (!current) {
          unknownTeam += 1;
          continue;
        }
        if (snapshotDiffers(stored, current)) differs += 1;
        else matches += 1;
      }

      results[entity] = {
        snapshot_field: field,
        total_rows: rows.length,
        rows_with_team_id: withTeam,
        empty_or_missing_snapshot: emptyOrMissing,
        snapshot_differs_from_team: differs,
        snapshot_matches_team: matches,
        team_id_not_a_real_team: unknownTeam,
      };
    }

    return Response.json({ generated_at: new Date().toISOString(), entities: results });
  } catch (error) {
    console.log('teamSnapshotAudit failed:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}