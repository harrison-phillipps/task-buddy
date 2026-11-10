import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { requireUser } from '../../shared/authGuard.ts';
import { asRows } from '../../shared/entityResults.ts';
import {
  scheduleOneSignal,
  cancelOneSignal,
  isInvalidPlayerIdError,
  isOverTestPushLimit,
} from '../../shared/oneSignal.ts';
import {
  parseSecondsRemaining,
  isEndPushKind,
  endPushBody,
  endPushSendAfter,
  findOwnSessionRow,
  END_PUSH_TITLE,
  END_PUSH_LIMIT,
  END_PUSH_WINDOW_MS,
} from '../../shared/sessionEndPush.ts';

const LOG_KIND = 'session_end_push';

/**
 * Schedules ONE push for the end of the phase the caller is currently running.
 *
 * The device is always the caller's own: the player id comes from their user
 * record, never from the body, and the session row is found by authenticated
 * user id. The send time is computed from the server clock, so a wrong device
 * clock cannot shift it. Scheduling a second time replaces the first.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const gate = await requireUser(base44);
    if (!gate.ok) return gate.response;
    const caller = gate.user;
    const client = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const seconds = parseSecondsRemaining(body?.seconds_remaining);
    const kind = body?.kind;

    if (seconds === null || !isEndPushKind(kind)) {
      return Response.json(
        {
          ok: false,
          error: 'invalid_input',
          message:
            'seconds_remaining must be a finite number between 5 and 14400, and kind must be one of session, work_end, break_end.',
        },
        { status: 400 },
      );
    }

    // Rate limit, same helper and same log table as sendTestPush — counted per
    // feature via `kind` so the two do not eat each other's budget.
    const recent = asRows(
      await client.entities.NotificationEmailLog.filter(
        { sender_user_id: caller.id, kind: LOG_KIND },
        '-created_date',
        50,
        0,
      ),
    );
    const attempts = recent.map((row) => row.sent_at || row.created_date);
    if (isOverTestPushLimit(attempts, new Date(), END_PUSH_LIMIT, END_PUSH_WINDOW_MS)) {
      console.log(`scheduleSessionEndPush rate limited for ${caller.id}`);
      return Response.json({ ok: false, reason: 'rate_limited' });
    }

    const users = asRows(await client.entities.User.filter({ id: caller.id }, null, 1, 0));
    const playerId = users?.[0]?.onesignal_player_id || null;
    // No device is a normal state, not an error — nothing to schedule.
    if (!playerId) return Response.json({ ok: false, reason: 'no_device' });

    // The caller's own row only. A row that already exists is reused so the
    // timer's cross-device sync state is left untouched.
    const rows = asRows(
      await client.entities.ActiveSession.filter({ user_id: caller.id }, '-created_date', 5, 0),
    );
    let row = findOwnSessionRow(rows, caller.id);
    if (!row) {
      row = await client.entities.ActiveSession.create({
        user_id: caller.id,
        task_id: '',
        is_active: false,
      });
    }

    // Replace any pending push; a failure here must not stop the new schedule.
    if (row?.end_push_id) {
      try {
        await cancelOneSignal(row.end_push_id);
      } catch (error) {
        console.warn(
          `scheduleSessionEndPush: could not cancel previous push ${row.end_push_id}:`,
          (error as Error).message,
        );
      }
    }

    // Counted before the send, so a failing id cannot be retried for free.
    await client.entities.NotificationEmailLog.create({
      sender_user_id: caller.id,
      recipient_user_id: caller.id,
      sent_at: new Date().toISOString(),
      kind: LOG_KIND,
    });

    const sendAfter = endPushSendAfter(Date.now(), seconds);
    const result = await scheduleOneSignal(
      playerId,
      { title: END_PUSH_TITLE, body: endPushBody(kind) },
      sendAfter,
    );

    let cleared = false;
    if (!result.ok && isInvalidPlayerIdError(result.errors)) {
      await client.entities.User.update(caller.id, { onesignal_player_id: null });
      cleared = true;
      console.log(`Cleared dead OneSignal player id for ${caller.id}`);
    }

    if (!result.ok) {
      console.log(
        `scheduleSessionEndPush failed for ${caller.id}: status=${result.status} errors=${JSON.stringify(result.errors)} cleared=${cleared}`,
      );
      return Response.json({
        ok: false,
        reason: cleared ? 'not_subscribed' : 'failed',
        status: result.status,
        errors: result.errors,
        cleared,
      });
    }

    await client.entities.ActiveSession.update(row.id, { end_push_id: result.id });
    console.log(
      `scheduleSessionEndPush: ${kind} for ${caller.id} scheduled as ${result.id} at ${sendAfter}`,
    );

    return Response.json({
      ok: true,
      id: result.id,
      kind,
      send_after: sendAfter,
      // Informational only — a scheduled message has delivered to nobody yet.
      recipients: result.recipients,
    });
  } catch (error) {
    console.error('scheduleSessionEndPush error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});