import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * TEMPORARY — creates the sentinel ROWS used to probe ActiveSession, TeamNotification
 * and TeamMessage, and registers each exact id in RlsProbeRecord.
 *
 * Admin only. Every row carries `member_user_ids` and `user_id`, so both branches are
 * testable from one account set:
 *   A = owner only             (must stay invisible to a non-member account)
 *   B = owner + extra members  (must be visible to those accounts)
 *
 * The service-role write/touch probe refuses any id with no registry row, so a row a
 * user created themselves can never be aimed at.
 */

const ENTITIES = ['ActiveSession', 'TeamNotification', 'TeamMessage'];
const PROBE_TEAM_ID = 'zzProbe-row';
const asRows = (page) => (Array.isArray(page) ? page : (page?.items || []));

const displayName = (u) => String(u?.display_name || u?.full_name || u?.email || '').slice(0, 120);

const createRow = (admin, entityName, owner, memberIds, tag) => {
  const common = { user_id: owner.id, member_user_ids: memberIds };

  if (entityName === 'ActiveSession') {
    return admin.entities.ActiveSession.create({
      ...common,
      task_id: `zzProbe-task-${tag}`,
      task_title: `RLS probe ${tag} — safe to delete`,
      is_active: false,
      is_break_time: false,
      time_left: 0,
      device_id: `zzProbe-${tag}`,
      last_updated_at: new Date().toISOString(),
    });
  }

  if (entityName === 'TeamNotification') {
    return admin.entities.TeamNotification.create({
      ...common,
      team_id: PROBE_TEAM_ID,
      type: 'general',
      title: `RLS probe ${tag} — safe to delete`,
      message: 'RLS probe sentinel row.',
      priority: 'low',
    });
  }

  return admin.entities.TeamMessage.create({
    ...common,
    team_id: PROBE_TEAM_ID,
    user_name: displayName(owner),
    content: `RLS probe ${tag} — safe to delete`,
  });
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const rawEmails = Array.isArray(body?.member_emails) ? body.member_emails : String(body?.member_emails || '').split(',');
    const admin = base44.asServiceRole;

    const extras = [];
    for (const raw of rawEmails) {
      const email = String(raw || '').trim().toLowerCase();
      if (!email || email === String(user.email || '').toLowerCase()) continue;
      const found = asRows(await admin.entities.User.filter({ email }))[0] || null;
      if (!found) return Response.json({ error: `No app user with email ${email}` }, { status: 400 });
      if (!extras.some((e) => e.id === found.id)) extras.push({ id: found.id, email: found.email });
    }

    const aMembers = [user.id];
    const bMembers = [user.id, ...extras.map((e) => e.id)];
    const sentinels = {};

    for (const entityName of ENTITIES) {
      // Clean start for this entity: drop whatever was registered before.
      const existing = asRows(await admin.entities.RlsProbeRecord.filter({ entity_name: entityName }));
      for (const row of existing) {
        await admin.entities[entityName].delete(row.record_id).catch(() => null);
        await admin.entities.RlsProbeRecord.delete(row.id).catch(() => null);
      }

      const owner = { id: user.id, email: user.email, full_name: user.full_name };
      const a = await createRow(admin, entityName, owner, aMembers, 'A');
      const b = await createRow(admin, entityName, owner, bMembers, 'B');

      await admin.entities.RlsProbeRecord.create({
        entity_name: entityName,
        record_id: a.id,
        role: 'A',
        label: `${entityName}-A`,
      });
      await admin.entities.RlsProbeRecord.create({
        entity_name: entityName,
        record_id: b.id,
        role: 'B',
        label: `${entityName}-B`,
      });

      const readA = asRows(await admin.entities[entityName].filter({ id: a.id }))[0] || null;
      const readB = asRows(await admin.entities[entityName].filter({ id: b.id }))[0] || null;

      sentinels[entityName] = {
        a: a.id,
        b: b.id,
        a_user_id: readA?.user_id ?? null,
        a_member_user_ids: readA?.member_user_ids ?? [],
        b_member_user_ids: readB?.member_user_ids ?? [],
        verified: Boolean(readA) && Boolean(readB),
      };
    }

    return Response.json({
      ok: true,
      owner: { id: user.id, email: user.email },
      extra_members: extras,
      sentinels,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}