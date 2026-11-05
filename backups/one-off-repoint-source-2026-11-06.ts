import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { asRows, readAll } from '../../shared/entityResults.ts';

// One-off ownership repair. Two ops only, both dry-run by default.
//
//   op: 'team_owner'          team 693f5602 -> owner/member fields repointed off
//                             the deleted account 692cd428 onto 6a61816f.
//   op: 'task_assigned_to'    the 21 tasks assigned_to 692cd428 -> 6a61816f.
//
// Nothing is written unless the caller passes { confirm: true }. Per-row
// update() is used for the tasks: a stored timestamp read back without any
// update is already Z-less (2026-11-01T23:11:43.653000), and updating a row
// leaves that representation and the created_date value untouched, so a single
// update() is format-neutral here.
const HOTMAIL_USER_ID = '6a61816f1e6ed9f4008cdc78';
const DELETED_USER_ID = '692cd428acb61bd5d429cddb';
const TEAM_ID = '693f5602e5a97802369f6ba0';
// Rachel, harrison.phillipps, hotmail. Explicit - not derived from the current
// member_ids, which still carries the deleted id.
const TEAM_MEMBER_IDS = ['692eacef6775abca2ed5835c', '68ff06738f59128717455ed4', HOTMAIL_USER_ID];

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const op = body?.op;
    const apply = body?.confirm === true;

    if (op !== 'team_owner' && op !== 'task_assigned_to') {
      return Response.json({ error: 'op must be team_owner or task_assigned_to' }, { status: 400 });
    }

    const admin = base44.asServiceRole;

    // Display names come from the User records; never invented here, left empty
    // when the account has nothing set.
    const users = asRows(await admin.entities.User.list());
    const nameOf = (id: string) => {
      const u = users.find((x) => x.id === id);
      return u ? (u.display_name || u.full_name || null) : null;
    };
    const emailOf = (id: string) => {
      const u = users.find((x) => x.id === id);
      return u ? (u.email || null) : null;
    };

    if (op === 'team_owner') {
      const teams = asRows(await admin.entities.Team.filter({ id: TEAM_ID }));
      const team = teams[0];
      if (!team) return Response.json({ error: 'Team not found' }, { status: 404 });

      // members[] already carries good display names. The User record behind
      // 68ff0673 resolves to "Deleted User", so preferring the User record
      // blindly would replace "harrison.phillipps" with that placeholder -
      // keep whatever is stored in members[] when the User name is absent or
      // is a tombstone label.
      const storedMembers = Array.isArray((team as any).members) ? (team as any).members : [];
      const stored = (id: string) => storedMembers.find((m: any) => m?.user_id === id) || null;
      const memberName = (id: string) => {
        const n = nameOf(id);
        if (n && n.trim().toLowerCase() !== 'deleted user') return n;
        return stored(id)?.user_name ?? n ?? null;
      };
      const memberEmail = (id: string) => emailOf(id) || stored(id)?.user_email || null;

      const target = {
        owner_id: HOTMAIL_USER_ID,
        owner_name: nameOf(HOTMAIL_USER_ID),
        owner_email: emailOf(HOTMAIL_USER_ID),
        member_ids: TEAM_MEMBER_IDS,
        member_user_ids: TEAM_MEMBER_IDS,
        admin_user_ids: [HOTMAIL_USER_ID],
        members: TEAM_MEMBER_IDS.map((id) => ({
          user_id: id,
          user_name: memberName(id),
          user_email: memberEmail(id),
          role: id === HOTMAIL_USER_ID ? 'admin' : 'member',
        })),
      };

      const fields = Object.keys(target);
      const before: Record<string, unknown> = {};
      for (const f of fields) before[f] = (team as any)[f] ?? null;

      const changed = fields.filter((f) => JSON.stringify(before[f]) !== JSON.stringify((target as any)[f]));

      let after: Record<string, unknown> | null = null;
      let residue: number | null = null;
      if (apply) {
        await admin.entities.Team.update(TEAM_ID, target);
        const reread = asRows(await admin.entities.Team.filter({ id: TEAM_ID }))[0];
        after = {};
        for (const f of fields) after[f] = (reread as any)?.[f] ?? null;
        // Confirms the new field is actually readable through a query, not just
        // in the update echo.
        residue = asRows(await admin.entities.Team.filter({ id: TEAM_ID, member_user_ids: HOTMAIL_USER_ID })).length;
      }

      return Response.json({
        op,
        dry_run: !apply,
        team: { id: team.id, name: team.name },
        before,
        target,
        after,
        changed_fields: changed,
        residue_rows_readable_by_member_user_ids: residue,
      });
    }

    // op === 'task_assigned_to'
    const tasks = await readAll(admin.entities.Task, { assigned_to: DELETED_USER_ID }, { sort: '-created_date' });
    const newName = nameOf(HOTMAIL_USER_ID);

    const rows = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      team_id: t.team_id ?? null,
      created_by_id: t.created_by_id,
      before: { assigned_to: t.assigned_to, assigned_to_name: t.assigned_to_name ?? null },
      after: { assigned_to: HOTMAIL_USER_ID, assigned_to_name: newName },
    }));

    let applied: string[] = [];
    let residue: number | null = null;
    if (apply) {
      for (const r of rows) {
        await admin.entities.Task.update(r.id, {
          assigned_to: HOTMAIL_USER_ID,
          assigned_to_name: newName,
        });
        applied.push(r.id);
      }
      residue = asRows(await admin.entities.Task.filter({ assigned_to: DELETED_USER_ID })).length;
    }

    return Response.json({
      op,
      dry_run: !apply,
      row_count: rows.length,
      by_creator: rows.reduce((m, r) => { m[r.created_by_id] = (m[r.created_by_id] || 0) + 1; return m; }, {} as Record<string, number>),
      by_team: rows.reduce((m, r) => { const k = r.team_id || '(personal)'; m[k] = (m[k] || 0) + 1; return m; }, {} as Record<string, number>),
      by_status: rows.reduce((m, r) => { m[r.status] = (m[r.status] || 0) + 1; return m; }, {} as Record<string, number>),
      rows,
      applied_count: applied.length,
      rows_still_pointing_at_deleted_user: residue,
    });
  } catch (error) {
    console.error('[oneOffRepoint] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}