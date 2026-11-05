import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * TEMPORARY — creates the sentinel ROWS used to probe ActiveSession, TeamNotification,
 * TeamMessage and Task, and registers each exact id in RlsProbeRecord.
 *
 * Admin only.
 *   ActiveSession / TeamNotification / TeamMessage:
 *     A = owner only             (must stay invisible to a non-member account)
 *     B = owner + extra members  (must be visible to those accounts)
 *   Task (proposed rule, not applied yet):
 *     A = personal, owner_user_id = the calling (outlook) account
 *     B = team task, team_member_ids = the two extra accounts (hotmail, schools)
 *     C = assigned_to = the first extra account (hotmail)
 *
 * The service-role write/touch probe refuses any id with no registry row, so a row a
 * user created themselves can never be aimed at.
 */

const PAIR_ENTITIES = ['ActiveSession', 'TeamNotification', 'TeamMessage'];
const SESSION_ENTITY = 'CollaborativeFocusSession';
const ALL_ENTITIES = [...PAIR_ENTITIES, 'Task', SESSION_ENTITY];
const PROBE_TEAM_ID = 'zzProbe-row';
const asRows = (page) => (Array.isArray(page) ? page : (page?.items || []));

const displayName = (u) => String(u?.display_name || u?.full_name || u?.email || '').slice(0, 120);

/**
 * Writes only the fields each entity's own schema carries today: ActiveSession is
 * owner-scoped (user_id), TeamNotification and TeamMessage are member-scoped
 * (member_user_ids). TeamMessage also requires a user_id for its sender.
 */
const createRow = (admin, entityName, owner, memberIds, tag) => {
  if (entityName === 'ActiveSession') {
    return admin.entities.ActiveSession.create({
      user_id: owner.id,
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
      member_user_ids: memberIds,
      team_id: PROBE_TEAM_ID,
      type: 'general',
      title: `RLS probe ${tag} — safe to delete`,
      message: 'RLS probe sentinel row.',
      priority: 'low',
    });
  }

  return admin.entities.TeamMessage.create({
    user_id: owner.id,
    member_user_ids: memberIds,
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

    const sentinels = {};

    // ── Pair sentinels: A owner-only, B owner + extras ──────────────────────
    for (const entityName of PAIR_ENTITIES) {
      const existing = asRows(await admin.entities.RlsProbeRecord.filter({ entity_name: entityName }));
      for (const row of existing) {
        await admin.entities[entityName].delete(row.record_id).catch(() => null);
        await admin.entities.RlsProbeRecord.delete(row.id).catch(() => null);
      }

      const owner = { id: user.id, email: user.email, full_name: user.full_name };
      const a = await createRow(admin, entityName, owner, [user.id], 'A');
      const b = await createRow(admin, entityName, owner, [user.id, ...extras.map((e) => e.id)], 'B');

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

    // ── Task sentinels: one per branch of the proposed rule ─────────────────
    const existingTaskRows = asRows(await admin.entities.RlsProbeRecord.filter({ entity_name: 'Task' }));
    for (const row of existingTaskRows) {
      await admin.entities.Task.delete(row.record_id).catch(() => null);
      await admin.entities.RlsProbeRecord.delete(row.id).catch(() => null);
    }

    const hotmail = extras[0] || null;
    const schools = extras[1] || null;
    if (!hotmail || !schools) {
      return Response.json(
        { error: 'Task sentinels need two extra member emails (hotmail and schools).', sentinels },
        { status: 400 },
      );
    }

    // ── CollaborativeFocusSession: A host-only, B host + extras, C another host ──
    const existingSessions = asRows(
      await admin.entities.RlsProbeRecord.filter({ entity_name: SESSION_ENTITY }),
    );
    for (const row of existingSessions) {
      await admin.entities[SESSION_ENTITY].delete(row.record_id).catch(() => null);
      await admin.entities.RlsProbeRecord.delete(row.id).catch(() => null);
    }

    const nowIso = new Date().toISOString();
    const sessionRow = (host, memberIds, tag) =>
      admin.entities[SESSION_ENTITY].create({
        team_id: PROBE_TEAM_ID,
        task_id: `zzProbe-task-${tag}`,
        task_title: `RLS probe ${tag} — safe to delete`,
        host_id: host.id,
        host_name: host.email,
        member_user_ids: memberIds,
        participants: [{ user_id: host.id, user_name: host.email, joined_at: nowIso }],
        duration_minutes: 25,
        started_at: nowIso,
        ends_at: new Date(Date.now() + 25 * 60000).toISOString(),
        status: 'active',
      });

    const hostSelf = { id: user.id, email: user.email };
    const sessionA = await sessionRow(hostSelf, [user.id], 'A');
    const sessionB = await sessionRow(hostSelf, [user.id, hotmail.id, schools.id], 'B');
    const sessionC = await sessionRow({ id: hotmail.id, email: hotmail.email }, [hotmail.id], 'C');

    for (const [row, role] of [[sessionA, 'A'], [sessionB, 'B'], [sessionC, 'C']]) {
      await admin.entities.RlsProbeRecord.create({
        entity_name: SESSION_ENTITY,
        record_id: row.id,
        role,
        label: `${SESSION_ENTITY}-${role}`,
      });
    }

    const readSessionA =
      asRows(await admin.entities[SESSION_ENTITY].filter({ id: sessionA.id }))[0] || null;
    const readSessionC =
      asRows(await admin.entities[SESSION_ENTITY].filter({ id: sessionC.id }))[0] || null;

    sentinels[SESSION_ENTITY] = {
      a: sessionA.id,
      b: sessionB.id,
      c: sessionC.id,
      a_host_email: user.email,
      b_host_email: user.email,
      b_member_emails: [hotmail.email, schools.email],
      c_host_email: hotmail.email,
      a_member_user_ids: readSessionA?.member_user_ids ?? [],
      c_member_user_ids: readSessionC?.member_user_ids ?? [],
      verified: Boolean(sessionA?.id && sessionB?.id && sessionC?.id),
    };

    const taskA = await admin.entities.Task.create({
      title: 'zzProbe Task A — safe to delete',
      description: 'RLS probe Task sentinel A (personal)',
      status: 'not_started',
      owner_user_id: user.id,
    });
    const taskB = await admin.entities.Task.create({
      title: 'zzProbe Task B — safe to delete',
      description: 'RLS probe Task sentinel B (team)',
      status: 'not_started',
      team_id: PROBE_TEAM_ID,
      team_member_ids: [hotmail.id, schools.id],
    });
    const taskC = await admin.entities.Task.create({
      title: 'zzProbe Task C — safe to delete',
      description: 'RLS probe Task sentinel C (assigned)',
      status: 'not_started',
      assigned_to: hotmail.id,
      assigned_to_name: hotmail.email,
    });

    for (const [row, role] of [[taskA, 'A'], [taskB, 'B'], [taskC, 'C']]) {
      await admin.entities.RlsProbeRecord.create({
        entity_name: 'Task',
        record_id: row.id,
        role,
        label: `Task-${role}`,
      });
    }

    sentinels.Task = {
      a: taskA.id,
      b: taskB.id,
      c: taskC.id,
      owner_email: user.email,
      b_member_emails: [hotmail.email, schools.email],
      c_assignee_email: hotmail.email,
      verified: Boolean(taskA?.id && taskB?.id && taskC?.id),
    };

    // ── Seven-entity sentinel sets ──────────────────────────────────────────
    // A = hotmail's own row, B = schools' own row, C = a row neither owns
    // (the admin account's, or a member snapshot listing both probe accounts).
    // NotificationPreferences and Leaderboard deliberately avoid the admin
    // account: a second prefs row for a real account would change which row
    // notifyTeammate reads as that account's preferences.
    const PROBE_DATE = new Date().toISOString().slice(0, 10);
    const mark = (entityName: string, role: string) => `zzProbe ${entityName} ${role} — safe to delete`;

    type SentinelRow = [string, Record<string, unknown>];
    const seededSets: { entity: string; rows: SentinelRow[] }[] = [
      {
        entity: 'CalendarEvent',
        rows: [
          ['A', { title: mark('CalendarEvent', 'A'), start_date: PROBE_DATE, created_by_id: hotmail.id }],
          ['B', { title: mark('CalendarEvent', 'B'), start_date: PROBE_DATE, created_by_id: schools.id }],
          ['C', { title: mark('CalendarEvent', 'C'), start_date: PROBE_DATE, created_by_id: user.id }],
        ],
      },
      {
        entity: 'NotificationPreferences',
        rows: [
          ['A', { user_id: hotmail.id }],
          ['B', { user_id: schools.id }],
        ],
      },
      {
        entity: 'TeamTemplate',
        rows: [
          [
            'A',
            {
              team_id: PROBE_TEAM_ID,
              member_user_ids: [hotmail.id],
              name: mark('TeamTemplate', 'A'),
              template_data: { title: 'zzProbe template' },
            },
          ],
          [
            'B',
            {
              team_id: PROBE_TEAM_ID,
              member_user_ids: [schools.id],
              name: mark('TeamTemplate', 'B'),
              template_data: { title: 'zzProbe template' },
            },
          ],
          [
            'C',
            {
              team_id: PROBE_TEAM_ID,
              member_user_ids: [hotmail.id, schools.id],
              name: mark('TeamTemplate', 'C'),
              template_data: { title: 'zzProbe template' },
            },
          ],
        ],
      },
      {
        entity: 'Leaderboard',
        rows: [
          ['A', { user_id: hotmail.id, user_name: mark('Leaderboard', 'A') }],
          ['B', { user_id: schools.id, user_name: mark('Leaderboard', 'B') }],
        ],
      },
      {
        entity: 'TaskComment',
        rows: [
          [
            'A',
            { task_id: 'zzProbe-task-A', user_id: hotmail.id, user_name: 'zzProbe', content: mark('TaskComment', 'A'), member_user_ids: [] },
          ],
          [
            'B',
            { task_id: 'zzProbe-task-B', user_id: schools.id, user_name: 'zzProbe', content: mark('TaskComment', 'B'), member_user_ids: [] },
          ],
          [
            'C',
            {
              task_id: 'zzProbe-task-C',
              user_id: user.id,
              user_name: 'zzProbe',
              content: mark('TaskComment', 'C'),
              member_user_ids: [hotmail.id, schools.id],
            },
          ],
        ],
      },
      {
        entity: 'TaskActivity',
        rows: [
          [
            'A',
            { task_id: 'zzProbe-task-A', user_id: hotmail.id, action_type: 'created', description: mark('TaskActivity', 'A'), member_user_ids: [] },
          ],
          [
            'B',
            { task_id: 'zzProbe-task-B', user_id: schools.id, action_type: 'created', description: mark('TaskActivity', 'B'), member_user_ids: [] },
          ],
          [
            'C',
            {
              task_id: 'zzProbe-task-C',
              user_id: user.id,
              action_type: 'created',
              description: mark('TaskActivity', 'C'),
              member_user_ids: [hotmail.id, schools.id],
            },
          ],
        ],
      },
    ];

    for (const set of seededSets) {
      const prior = asRows(await admin.entities.RlsProbeRecord.filter({ entity_name: set.entity }));
      for (const row of prior) {
        await admin.entities[set.entity].delete(row.record_id).catch(() => null);
        await admin.entities.RlsProbeRecord.delete(row.id).catch(() => null);
      }

      const written: { role: string; id: string; created_by_id: string | null; user_id: string | null; member_user_ids: string[] }[] = [];
      for (const [role, payload] of set.rows) {
        const created = await admin.entities[set.entity].create(payload);
        await admin.entities.RlsProbeRecord.create({
          entity_name: set.entity,
          record_id: created.id,
          role,
          label: `${set.entity}-${role}`,
        });
        const readBack = asRows(await admin.entities[set.entity].filter({ id: created.id }))[0] || null;
        written.push({
          role,
          id: created.id,
          created_by_id: readBack?.created_by_id ?? null,
          user_id: readBack?.user_id ?? null,
          member_user_ids: readBack?.member_user_ids ?? [],
        });
      }

      const entry: Record<string, unknown> = {
        verified: written.length === set.rows.length && written.every((w) => Boolean(w.id)),
      };
      for (const w of written) {
        entry[w.role.toLowerCase()] = w.id;
        entry[`${w.role.toLowerCase()}_created_by_id`] = w.created_by_id;
      }
      if (set.entity === 'CalendarEvent') {
        entry.created_by_id_writable = written.find((w) => w.role === 'A')?.created_by_id === hotmail.id;
      }
      sentinels[set.entity] = entry;
    }

    return Response.json({
      ok: true,
      entities: ALL_ENTITIES,
      owner: { id: user.id, email: user.email },
      extra_members: extras,
      sentinels,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}