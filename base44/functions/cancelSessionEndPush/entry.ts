import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { requireUser } from '../../shared/authGuard.ts';
import { asRows } from '../../shared/entityResults.ts';
import { cancelOneSignal } from '../../shared/oneSignal.ts';
import { findOwnSessionRow, cancelDecision } from '../../shared/sessionEndPush.ts';

/**
 * Cancels the caller's own pending end-of-phase push.
 *
 * No ids are accepted from the body: the message id is read from the caller's
 * own session row, so this cannot cancel anyone else's notification. Idempotent —
 * nothing pending is a success, so it is safe on every pause, reset and finish.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const gate = await requireUser(base44);
    if (!gate.ok) return gate.response;
    const caller = gate.user;
    const client = base44.asServiceRole;

    const rows = asRows(
      await client.entities.ActiveSession.filter({ user_id: caller.id }, '-created_date', 5, 0),
    );
    const row = findOwnSessionRow(rows, caller.id);
    const decision = cancelDecision(row, caller.id);

    if (decision.action === 'noop') {
      return Response.json({ ok: true, cancelled: false, reason: decision.reason });
    }

    const result = await cancelOneSignal(decision.pushId);

    // Cleared whenever nothing is pending any more — cancelled, or already gone.
    if (result.ok) {
      await client.entities.ActiveSession.update(decision.sessionRowId, { end_push_id: null });
      console.log(`cancelSessionEndPush: cleared ${decision.pushId} for ${caller.id}`);
      return Response.json({
        ok: true,
        cancelled: true,
        already_gone: result.notFound,
        status: result.status,
      });
    }

    console.log(
      `cancelSessionEndPush failed for ${caller.id}: status=${result.status} errors=${JSON.stringify(result.errors)}`,
    );
    return Response.json({
      ok: false,
      cancelled: false,
      reason: 'cancel_failed',
      status: result.status,
      errors: result.errors,
    });
  } catch (error) {
    console.error('cancelSessionEndPush error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});