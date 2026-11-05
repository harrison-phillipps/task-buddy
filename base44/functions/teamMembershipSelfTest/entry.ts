import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  currentUser,
  runCreateTeam,
  runJoinTeamByCode,
  runLeaveTeam,
  runInviteMember,
  runRemoveMember,
  runSetMemberRole,
  runCreateTeamTask,
} from '../../shared/teamCore.ts';

/**
 * Throwaway-data suite for the membership engine. Every actor is a synthetic id
 * that matches the engine's id rule; every record it creates is deleted at the
 * end, so no real user or team is touched.
 *
 * Run with an admin session: it exercises the real run* paths, not copies.
 */

const asRows = (page) => (Array.isArray(page) ? page : (page?.items || []));
const has = (arr, value) => Array.isArray(arr) && arr.includes(value);
const sameSet = (a, b) => {
  const left = [...(Array.isArray(a) ? a : [])].sort();
  const right = [...(Array.isArray(b) ? b : [])].sort();
  return left.length === right.length && left.every((v, i) => v === right[i]);
};

export default async function (req) {
  // A request with no session must answer 401. Resolving the caller throws rather
  // than returning null, so the guard below only fires if that throw is caught.
  let base44;
  let caller = null;
  try {
    base44 = createClientFromRequest(req);
    caller = await currentUser(base44);
  } catch {
    caller = null;
  }
  if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (caller.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

  const admin = base44.asServiceRole;
  const ctx = { base44: admin, admin };
  const stamp = Date.now().toString(36);

  const owner = { id: `zzStOwner${stamp}`, full_name: 'Self Test Owner', email: `zz-st-owner-${stamp}@example.invalid` };
  const memberB = { id: `zzStMemB${stamp}`, full_name: 'Self Test Member B', email: `zz-st-b-${stamp}@example.invalid` };
  const memberC = { id: `zzStMemC${stamp}`, full_name: 'Self Test Member C', email: `zz-st-c-${stamp}@example.invalid` };
  const pendingEmail = `zz-nobody-${stamp}@example.invalid`;

  const checks: Array<{ name: string; pass: boolean; detail?: unknown }> = [];
  const check = (name: string, pass: boolean, detail: unknown = null) =>
    checks.push({ name, pass: Boolean(pass), detail: pass ? undefined : detail });

  let teamId: string | null = null;
  const taskIds: string[] = [];

  const readTeam = async (id: string) => asRows(await admin.entities.Team.filter({ id }))[0] || null;
  const taskSnapshots = async () =>
    (asRows(await admin.entities.Task.filter({ team_id: teamId }, { limit: 100 })))
      .map((r: any) => ({ id: r.id, title: r.title, ids: Array.isArray(r.team_member_ids) ? r.team_member_ids : null }));
  const everyTaskHas = (snaps: any[], id: string) =>
    snaps.length > 0 && snaps.every((s) => Array.isArray(s.ids) && s.ids.includes(id));

  try {
    /* 1 — create */
    const created = await runCreateTeam(ctx, owner, { name: `zz-self-test-${stamp}` });
    teamId = created.json?.team?.id || null;
    const code = created.json?.invite_code;
    check('createTeam returns 201', created.status === 201, created.json);
    check('owner is the only member', sameSet(created.json?.team?.member_user_ids, [owner.id]), created.json?.team?.member_user_ids);
    check('owner is the only admin', sameSet(created.json?.team?.admin_user_ids, [owner.id]), created.json?.team?.admin_user_ids);
    check('invite code is 10 characters', String(code || '').length === 10, code);
    if (!teamId) throw new Error('team not created — later checks cannot run');

    /* 2 — seed three stamped team tasks */
    for (let i = 0; i < 3; i += 1) {
      const row = await admin.entities.Task.create({
        title: `zz-self-test-task-${i}`,
        team_id: teamId,
        team_member_ids: [owner.id],
      });
      taskIds.push(row.id);
    }
    let snaps = await taskSnapshots();
    check('seed tasks carry the snapshot', snaps.length === 3 && everyTaskHas(snaps, owner.id), snaps);

    /* 3 — join syncs the task snapshots */
    const joined = await runJoinTeamByCode(ctx, memberB, { code });
    check('joinTeamByCode joins', joined.status === 200 && joined.json?.joined === true, joined.json);
    const afterJoin = await readTeam(teamId);
    check('join adds the member under their real id', has(afterJoin?.member_user_ids, memberB.id), afterJoin?.member_user_ids);
    check('join keeps the owner as admin', has(afterJoin?.admin_user_ids, owner.id), afterJoin?.admin_user_ids);
    check('join reports the task sync', joined.json?.task_sync?.synced === 3, joined.json?.task_sync);
    snaps = await taskSnapshots();
    check('every team task now lists the new member', everyTaskHas(snaps, memberB.id), snaps);

    /* 4 — role changes keep both admin fields in step */
    const promoted = await runSetMemberRole(ctx, owner, { team_id: teamId, user_id: memberB.id, role: 'admin' });
    check('setMemberRole promotes', promoted.status === 200 && has(promoted.json?.admin_user_ids, memberB.id), promoted.json);
    const demoted = await runSetMemberRole(ctx, owner, { team_id: teamId, user_id: memberB.id, role: 'member' });
    check('setMemberRole demotes', demoted.status === 200 && !has(demoted.json?.admin_user_ids, memberB.id), demoted.json);

    /* 5 — a member creates a team task: it must arrive stamped */
    const teamTask = await runCreateTeamTask(ctx, memberB, { team_id: teamId, title: 'zz-self-test-team-task' });
    if (teamTask.json?.task?.id) taskIds.push(teamTask.json.task.id);
    check('createTeamTask returns 201', teamTask.status === 201, teamTask.json);
    const createdTaskRow = asRows(await admin.entities.Task.filter({ id: teamTask.json?.task?.id }))[0] || null;
    check(
      'createTeamTask stamps the snapshot',
      Array.isArray(createdTaskRow?.team_member_ids)
        && createdTaskRow.team_member_ids.includes(owner.id)
        && createdTaskRow.team_member_ids.includes(memberB.id),
      createdTaskRow?.team_member_ids,
    );

    /* 6 — a non-member cannot create a team task */
    const outsiderTask = await runCreateTeamTask(ctx, memberC, { team_id: teamId, title: 'zz-self-test-outsider' });
    check('non-member is refused (403)', outsiderTask.status === 403, outsiderTask.json);

    /* 7 — leave removes them from the team and from the task snapshots */
    const left = await runLeaveTeam(ctx, memberB, { team_id: teamId });
    check('leaveTeam succeeds', left.status === 200 && left.json?.left === true, left.json);
    check('leave reports the task sync', left.json?.task_sync?.synced === 4, left.json?.task_sync);
    const afterLeave = await readTeam(teamId);
    check('left member is gone from member_user_ids', !has(afterLeave?.member_user_ids, memberB.id), afterLeave?.member_user_ids);
    snaps = await taskSnapshots();
    check('no task snapshot still lists the left member', snaps.every((s) => !s.ids || !s.ids.includes(memberB.id)), snaps);

    /* 8 — remove syncs too */
    const joinedC = await runJoinTeamByCode(ctx, memberC, { code });
    check('second join succeeds', joinedC.status === 200 && joinedC.json?.joined === true, joinedC.json);
    const removed = await runRemoveMember(ctx, owner, { team_id: teamId, user_id: memberC.id });
    check('removeMember succeeds', removed.status === 200, removed.json);
    check('remove reports the task sync', removed.json?.task_sync?.synced === 4, removed.json?.task_sync);
    const afterRemove = await readTeam(teamId);
    check('removed member is gone', !has(afterRemove?.member_user_ids, memberC.id), afterRemove?.member_user_ids);
    snaps = await taskSnapshots();
    check('no task snapshot still lists the removed member', snaps.every((s) => !s.ids || !s.ids.includes(memberC.id)), snaps);

    /* 9 — the owner and the last admin are protected */
    const ownerLeave = await runLeaveTeam(ctx, owner, { team_id: teamId });
    check('owner cannot leave (409)', ownerLeave.status === 409, ownerLeave.json);
    const ownerRemove = await runRemoveMember(ctx, owner, { team_id: teamId, user_id: owner.id });
    check('owner cannot be removed (409)', ownerRemove.status === 409, ownerRemove.json);

    /* 10 — an email with no account becomes a pending invite, never a member */
    const invite = await runInviteMember(ctx, owner, { team_id: teamId, email: pendingEmail });
    check('unknown email is recorded as pending (202)', invite.status === 202 && invite.json?.pending === true, invite.json);
    const afterInvite = await readTeam(teamId);
    check('pending invite is on the row', (afterInvite?.pending_invites || []).some((p: any) => p?.email === pendingEmail), afterInvite?.pending_invites);
    check('pending invite grants no membership', !has(afterInvite?.member_user_ids, pendingEmail), afterInvite?.member_user_ids);
    check(
      'no email reached an id array',
      (afterInvite?.member_ids || []).every((x: string) => !String(x).includes('@'))
        && (afterInvite?.member_user_ids || []).every((x: string) => !String(x).includes('@')),
      afterInvite?.member_ids,
    );

    /* 11 — an email with an account is added under the real user id */
    const registered = await runInviteMember(ctx, owner, { team_id: teamId, email: caller.email });
    check('registered email is added (201)', registered.status === 201 && registered.json?.joined === true, registered.json);
    check('registered invite uses the real user id', registered.json?.user_id === caller.id, registered.json?.user_id);
    const afterRegistered = await readTeam(teamId);
    check('registered invite lands in member_user_ids', has(afterRegistered?.member_user_ids, caller.id), afterRegistered?.member_user_ids);
    check(
      'registered invite syncs task snapshots',
      everyTaskHas(await taskSnapshots(), caller.id),
      await taskSnapshots(),
    );

    /* 12 — a wrong code is refused and the attempt is counted */
    const badCode = await runJoinTeamByCode(ctx, memberB, { code: 'ZZZZZZZZZZ' });
    check('invalid code is refused (400)', badCode.status === 400, badCode.json);
  } catch (error: any) {
    check('suite ran to completion', false, error?.message);
  } finally {
    /* cleanup — every record this suite touched */
    if (taskIds.length) {
      const deletions = await Promise.allSettled(taskIds.map((id) => admin.entities.Task.delete(id)));
      const failedDeletes = deletions.filter((d) => d.status === 'rejected').length;
      check('cleanup deleted the test tasks', failedDeletes === 0, { failedDeletes });
    }
    try {
      if (teamId) await admin.entities.Team.delete(teamId);
    } catch (e: any) {
      check('cleanup deleted the team', false, e?.message);
    }
  }

  const leftovers = {
    tasks: taskIds.length ? asRows(await admin.entities.Task.filter({ team_id: teamId || 'none' }, { limit: 100 })).length : 0,
    team: teamId ? Boolean(await readTeam(teamId)) : false,
  };
  check('no leftover test rows', leftovers.tasks === 0 && leftovers.team === false, leftovers);

  const failed = checks.filter((c) => !c.pass);
  return Response.json({
    ok: failed.length === 0,
    total: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length,
    results: checks,
  });
}