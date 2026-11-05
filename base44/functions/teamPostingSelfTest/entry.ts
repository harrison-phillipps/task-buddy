import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { asRows } from '../../shared/entityResults.ts';
import {
  postTeamMessageCore,
  postTeamNotificationCore,
  postTeamMessageHandler,
  postTeamNotificationHandler,
  sameIds,
  MESSAGE_BODY_MAX,
  NOTIFICATION_TITLE_MAX,
  NOTIFICATION_MESSAGE_MAX,
} from '../../shared/teamPosting.ts';

/**
 * Synthetic suite for the team posting guards. Every actor is a fake id and
 * every row it creates is deleted at the end, so no real user or team is
 * touched. Admin session required.
 *
 * Exercises the real cores the two functions call, not copies of them.
 */
export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const caller = await base44.auth.me().catch((e: any) => (e.status === 401 ? null : Promise.reject(e)));
  if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (caller.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

  const admin = base44.asServiceRole;
  const stamp = Date.now().toString(36);
  const teamMembers = [1, 2].map((n) => `zzpost${n}${stamp}`);

  const owner = { id: teamMembers[0], full_name: 'zz Posting Owner', email: `zz-post-owner-${stamp}@example.invalid` };
  const member = { id: teamMembers[1], full_name: 'zz Posting Member', email: `zz-post-member-${stamp}@example.invalid` };
  const outsider = { id: `zzpostOut${stamp}`, full_name: 'zz Posting Outsider', email: `zz-post-out-${stamp}@example.invalid` };

  const checks: Array<{ name: string; pass: boolean; detail?: unknown }> = [];
  const check = (name: string, pass: boolean, detail: unknown = null) =>
    checks.push({ name, pass: Boolean(pass), detail: pass ? undefined : detail });

  let teamId: string | null = null;

  try {
    const team = await admin.entities.Team.create({
      name: `zz-posting-test-${stamp}`,
      owner_id: owner.id,
      owner_name: owner.full_name,
      member_user_ids: teamMembers,
      member_ids: teamMembers,
      admin_user_ids: [owner.id],
    });
    teamId = team.id;
    check('test team created', Boolean(teamId), team);

    /* 1 — a member posts */
    const posted = await postTeamMessageCore({ admin, actor: member, payload: { team_id: teamId, content: 'hello team' } });
    check('member can post (201)', posted.status === 201, posted.json);
    const firstRow = asRows(await admin.entities.TeamMessage.filter({ team_id: teamId, content: 'hello team' }))[0] || null;
    check('message carries the team snapshot', sameIds(firstRow?.member_user_ids, teamMembers), firstRow?.member_user_ids);
    check('message carries the caller as user_id', firstRow?.user_id === member.id, firstRow?.user_id);
    check('message carries the caller name', firstRow?.user_name === member.full_name, firstRow?.user_name);

    /* 2 — a non-member is refused */
    const outsiderPost = await postTeamMessageCore({
      admin, actor: outsider, payload: { team_id: teamId, content: 'outsider attempt' },
    });
    check('non-member is refused (403)', outsiderPost.status === 403, outsiderPost.json);
    const outsiderRows = asRows(await admin.entities.TeamMessage.filter({ team_id: teamId, content: 'outsider attempt' }));
    check('non-member wrote nothing', outsiderRows.length === 0, outsiderRows.length);

    /* 3 — a team that does not exist */
    const missing = await postTeamMessageCore({
      admin, actor: member, payload: { team_id: `zzpost-missing-${stamp}`, content: 'nowhere' },
    });
    check('missing team is refused (404)', missing.status === 404, missing.json);

    /* 4 — body length */
    const oversized = await postTeamMessageCore({
      admin, actor: member, payload: { team_id: teamId, content: 'x'.repeat(MESSAGE_BODY_MAX + 1) },
    });
    check(`oversized body is refused (400)`, oversized.status === 400, oversized.json);
    const atLimit = await postTeamMessageCore({
      admin, actor: member, payload: { team_id: teamId, content: 'y'.repeat(MESSAGE_BODY_MAX) },
    });
    check('body at the limit is accepted (201)', atLimit.status === 201, atLimit.json);

    /* 5 — a payload member list / author must be ignored */
    const spoof = await postTeamMessageCore({
      admin,
      actor: member,
      payload: {
        team_id: teamId,
        content: 'spoof attempt',
        member_user_ids: [outsider.id],
        user_id: owner.id,
        user_name: 'Spoofed Name',
      },
    });
    check('spoofed post is accepted as the caller (201)', spoof.status === 201, spoof.json);
    const spoofRow = asRows(await admin.entities.TeamMessage.filter({ team_id: teamId, content: 'spoof attempt' }))[0] || null;
    check('payload member list is ignored', Boolean(spoofRow) && !spoofRow.member_user_ids.includes(outsider.id), spoofRow?.member_user_ids);
    check('payload user_id is ignored', spoofRow?.user_id === member.id, spoofRow?.user_id);
    check('payload user_name is ignored', spoofRow?.user_name === member.full_name, spoofRow?.user_name);

    /* 6 — notifications: caps, snapshot, refusal */
    const note = await postTeamNotificationCore({
      admin,
      actor: owner,
      payload: {
        team_id: teamId,
        type: 'general',
        title: 'T'.repeat(NOTIFICATION_TITLE_MAX + 100),
        message: 'M'.repeat(NOTIFICATION_MESSAGE_MAX + 500),
        priority: 'low',
        member_user_ids: [outsider.id],
        created_by: outsider.id,
      },
    });
    check('member can post a notification (201)', note.status === 201, note.json);
    const noteRow = asRows(await admin.entities.TeamNotification.filter({ team_id: teamId }))[0] || null;
    check(`notification title capped at ${NOTIFICATION_TITLE_MAX}`, noteRow?.title?.length === NOTIFICATION_TITLE_MAX, noteRow?.title?.length);
    check(`notification message capped at ${NOTIFICATION_MESSAGE_MAX}`, noteRow?.message?.length === NOTIFICATION_MESSAGE_MAX, noteRow?.message?.length);
    check('notification carries the team snapshot', sameIds(noteRow?.member_user_ids, teamMembers), noteRow?.member_user_ids);
    check('notification created_by is the caller', noteRow?.created_by === owner.id, noteRow?.created_by);

    const noteOutsider = await postTeamNotificationCore({
      admin, actor: outsider, payload: { team_id: teamId, type: 'general', title: 'nope', message: 'nope' },
    });
    check('non-member notification is refused (403)', noteOutsider.status === 403, noteOutsider.json);

    const noteMissing = await postTeamNotificationCore({
      admin, actor: owner, payload: { team_id: `zzpost-missing-${stamp}`, title: 'x', message: 'y' },
    });
    check('notification with missing team is refused (404)', noteMissing.status === 404, noteMissing.json);

    /* 7 — the handlers the entrypoints serve refuse a call with no token */
    const entrypoints: Array<[string, any]> = [
      ['postTeamMessage', postTeamMessageHandler],
      ['postTeamNotification', postTeamNotificationHandler],
    ];
    for (const [name, handler] of entrypoints) {
      const res = await handler(
        new Request(`https://example.invalid/functions/${name}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // The platform adds this on every real invocation; only the
            // Authorization header is deliberately left off.
            'Base44-App-Id': Deno.env.get('BASE44_APP_ID') ?? '',
          },
          body: JSON.stringify({ team_id: teamId, content: 'no token' }),
        }),
        createClientFromRequest,
      );
      const body = await res.text().catch(() => '');
      check(`${name} returns 401 with no token`, res.status === 401, {
        status: res.status,
        body: body.slice(0, 120),
      });
    }

    /* 8 — account deletion can find a service-written notice by its author field */
    const authored = asRows(await admin.entities.TeamNotification.filter({ team_id: teamId, author_user_id: owner.id }));
    check('service-written notice carries author_user_id', authored.length >= 1, authored.length);
    const byCreatedBy = asRows(await admin.entities.TeamNotification.filter({ team_id: teamId, created_by: owner.id }));
    check('created_by is not queryable, so deletes key on author_user_id', byCreatedBy.length === 0, byCreatedBy.length);
    await admin.entities.TeamNotification.deleteMany({ author_user_id: owner.id });
    const authoredLeft = asRows(await admin.entities.TeamNotification.filter({ team_id: teamId, author_user_id: owner.id })).length;
    check('deleting by author_user_id removes the author rows', authoredLeft === 0, authoredLeft);
  } catch (error: any) {
    check('suite ran to completion', false, error?.message);
  } finally {
    if (teamId) {
      const cleanup = await Promise.allSettled([
        admin.entities.TeamMessage.deleteMany({ team_id: teamId }),
        admin.entities.TeamNotification.deleteMany({ team_id: teamId }),
      ]);
      const failedCleanup = cleanup.filter((r) => r.status === 'rejected').length;
      check('test rows deleted', failedCleanup === 0, { failedCleanup });
      try {
        await admin.entities.Team.delete(teamId);
      } catch (e: any) {
        check('test team deleted', false, e?.message);
      }
    }
  }

  const leftovers = teamId
    ? asRows(await admin.entities.TeamMessage.filter({ team_id: teamId })).length +
      asRows(await admin.entities.TeamNotification.filter({ team_id: teamId })).length
    : 0;
  check('no leftover test rows', leftovers === 0, leftovers);

  const failed = checks.filter((c) => !c.pass);
  return Response.json({
    ok: failed.length === 0,
    total: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length,
    problems: failed.map((c) => `${c.name} → ${JSON.stringify(c.detail ?? null).slice(0, 300)}`),
    results: checks,
  });
}