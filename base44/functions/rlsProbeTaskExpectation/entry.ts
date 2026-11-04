import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * TEMPORARY — supplies the Task sentinel emails a probe link needs to derive its
 * expectation, because RLS hides the sentinel rows from exactly the accounts the
 * probe is testing (a non-owner cannot read A, a non-member cannot read B).
 *
 * Read-only. Any signed-in user. Every id must be a registered probe sentinel, so
 * this cannot be pointed at another user's task to harvest an email address.
 *
 * It returns only emails and ids — no rule, no sentinel field, nothing is written.
 */

const asRows = (page) => (Array.isArray(page) ? page : (page?.items || []));

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const ids = { A: String(body?.a || ''), B: String(body?.b || ''), C: String(body?.c || '') };

    const admin = base44.asServiceRole;
    const registry = asRows(await admin.entities.RlsProbeRecord.filter({ entity_name: 'Task' }));
    const registered = new Set(registry.map((r) => r.record_id));

    for (const [role, id] of Object.entries(ids)) {
      if (!id) return Response.json({ error: `No ${role} id supplied` }, { status: 400 });
      if (!registered.has(id)) {
        return Response.json({ error: `${role} id is not a registered probe sentinel` }, { status: 403 });
      }
    }

    const rowA = asRows(await admin.entities.Task.filter({ id: ids.A }))[0] || null;
    const rowB = asRows(await admin.entities.Task.filter({ id: ids.B }))[0] || null;
    const rowC = asRows(await admin.entities.Task.filter({ id: ids.C }))[0] || null;
    if (!rowA || !rowB || !rowC) {
      return Response.json({ error: 'A Task sentinel row is missing — re-create the sentinels.' }, { status: 404 });
    }

    const users = asRows(await admin.entities.User.list());
    const emailOf = (id) => {
      const found = users.find((u) => u.id === id);
      return found?.email ? String(found.email).toLowerCase() : null;
    };

    const ownerEmail = emailOf(rowA.owner_user_id) || emailOf(rowA.created_by_id);
    const bMemberEmails = (rowB.team_member_ids || []).map(emailOf).filter(Boolean);
    const assigneeEmail = emailOf(rowC.assigned_to);

    return Response.json({
      ok: true,
      Task: {
        a: ids.A,
        b: ids.B,
        c: ids.C,
        owner_email: ownerEmail,
        b_member_emails: bMemberEmails,
        c_assignee_email: assigneeEmail,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}