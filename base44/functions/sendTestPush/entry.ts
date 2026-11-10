import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { requireUser } from '../../shared/authGuard.ts';
import {
  sendOneSignal,
  isInvalidPlayerIdError,
  isOverTestPushLimit,
} from '../../shared/oneSignal.ts';

/**
 * Sends one test push to the caller's own device.
 *
 * The player id always comes from the caller's user record — never from the
 * request body — so this cannot be used to push to anyone else. Rate limited to
 * three attempts per hour per user, counted in NotificationEmailLog (an
 * admin-only log, service-role writes) so the limit survives cold starts.
 * Rows are tagged kind: 'test_push' so the scheduled session-end push, which
 * counts in the same table, keeps its own budget.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const gate = await requireUser(base44);
    if (!gate.ok) return gate.response;
    const caller = gate.user;
    const client = base44.asServiceRole;

    const recent = await client.entities.NotificationEmailLog.filter(
      { sender_user_id: caller.id, kind: 'test_push' },
      '-created_date',
      50,
      0,
    );
    const attempts = (recent || []).map((row) => row.sent_at || row.created_date);
    if (isOverTestPushLimit(attempts, new Date())) {
      console.log(`sendTestPush rate limited for ${caller.id}`);
      return Response.json({
        success: false,
        reason: 'rate_limited',
        message: 'That is three test notifications in the last hour. Please try again later.',
      });
    }

    const records = await client.entities.User.filter({ id: caller.id }, null, 1, 0);
    const playerId = records?.[0]?.onesignal_player_id || null;
    if (!playerId) {
      return Response.json({
        success: false,
        reason: 'no_device',
        message: 'No device registered yet. Turn notifications on from your phone first.',
      });
    }

    // Count the attempt before sending, so a failing id cannot be retried freely.
    await client.entities.NotificationEmailLog.create({
      sender_user_id: caller.id,
      recipient_user_id: caller.id,
      sent_at: new Date().toISOString(),
      kind: 'test_push',
    });

    const result = await sendOneSignal(playerId, {
      title: 'TaskBuddy',
      body: 'TaskBuddy test: notifications are working.',
    });

    let cleared = false;
    if (!result.ok && isInvalidPlayerIdError(result.errors)) {
      await client.entities.User.update(caller.id, { onesignal_player_id: null });
      cleared = true;
      console.log(`Cleared dead OneSignal player id for ${caller.id}`);
    }

    if (!result.ok) {
      console.log(
        `push failed (test) for ${caller.id}: status=${result.status} recipients=${result.recipients} errors=${JSON.stringify(result.errors)} cleared=${cleared}`,
      );
    }

    return Response.json({
      success: result.ok,
      ok: result.ok,
      status: result.status,
      recipients: result.recipients,
      errors: result.errors,
      cleared,
      reason: result.ok ? null : cleared ? 'not_subscribed' : 'failed',
      message: result.ok
        ? 'TaskBuddy test: notifications are working.'
        : cleared
          ? 'This phone is no longer subscribed. Turn notifications off, then on again.'
          : 'Notifications are on, but the test notification could not be delivered.',
    });
  } catch (error) {
    console.error('sendTestPush error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});