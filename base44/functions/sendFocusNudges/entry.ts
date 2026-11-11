import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireAdmin } from '../../shared/authGuard.ts';
import { isInvalidPlayerIdError, sendOneSignal } from '../../shared/oneSignal.ts';
import {
  NUDGE_BODY,
  NUDGE_TITLE,
  decideFocusNudge,
  evaluateIgnored,
  nextIgnoredCount,
  pendingEvaluations,
  shouldPause,
} from '../../shared/focusNudge.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Server-side allowlist for the beta. A preference row is only acted on when its
 * owner's email is listed here, matched case-insensitively — so an enabled row
 * belonging to anyone else can never receive a nudge, whatever the client allows.
 * Add an address here (and to FOCUS_NUDGE_BETA_EMAILS) to widen the beta.
 */
const NUDGE_ALLOWED_EMAILS = new Set(['harrison.phillipps@hotmail.com']);

const parseDbDate = (value: unknown): Date | null => {
  if (typeof value !== 'string' || !value) return null;
  const parsed = new Date(value.includes('Z') || value.includes('+') ? value : `${value}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * The gentle focus nudge sweep.
 *
 * Runs every 15 minutes from its own workflow. For each opted-in user it sends at
 * most one push per local day, inside the 15-minute window they chose, never in
 * quiet hours, and only when there is something open to work on. It also closes
 * out nudges whose 3-hour window has passed: a nudge with no session after it
 * counts as ignored, and three ignored in a row pauses the feature for that user.
 *
 * Lock-screen copy is generic and holds no task text — task titles stay in the app.
 * A dry run ({ "dry_run": true }, admin only) reports what would happen and
 * returns before anything is written or sent.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Admin only: the scheduled workflow step calls this as its creator, an app admin.
    const gate = await requireAdmin(base44);
    if (!gate.ok) return gate.response;

    // dry_run is opt-in and never implied: the scheduled step sends no body.
    let payload: any = {};
    try {
      payload = await req.json();
    } catch {
      payload = {};
    }
    const dryRun = payload?.dry_run === true;

    const client = base44.asServiceRole;
    const now = new Date();

    const prefsRows = await client.entities.NotificationPreferences.list();

    const users = await client.entities.User.list();
    const userById: Record<string, any> = Object.fromEntries(users.map((u: any) => [u.id, u]));
    const userIdByEmail: Record<string, string> = Object.fromEntries(
      users.filter((u: any) => u.email).map((u: any) => [u.email, u.id]),
    );

    const enabledRows = prefsRows.filter((row: any) => row?.focus_nudge_enabled === true);
    const candidates = enabledRows.filter((row: any) =>
      NUDGE_ALLOWED_EMAILS.has(String(userById[row.user_id]?.email || '').toLowerCase()),
    );
    console.log(
      `Focus nudge sweep: ${candidates.length} eligible of ${enabledRows.length} opted in, ${prefsRows.length} preference rows (dry_run=${dryRun})`,
    );

    // One "latest session activity" instant per user, from two sources:
    // ActiveSession is created when a session starts and re-stamped on every
    // transition (start, pause, resume, end), so its last_updated_at is the most
    // recent activity; a FocusSession row is written when a session finishes, which
    // covers a completed session whose ActiveSession row was cleared.
    const lastActivityMs: Record<string, number> = {};
    const noteActivity = (userId: string | undefined, value: unknown) => {
      if (!userId) return;
      const parsed = value instanceof Date ? value : parseDbDate(value);
      if (!parsed) return;
      const ms = parsed.getTime();
      if (!(lastActivityMs[userId] >= ms)) lastActivityMs[userId] = ms;
    };

    const activeSessions = await client.entities.ActiveSession.list();
    for (const row of activeSessions) noteActivity(row.user_id, row.last_updated_at || row.created_date);

    const recentFocusSessions = await client.entities.FocusSession.filter({
      created_date: { $gte: new Date(now.getTime() - 2 * DAY_MS).toISOString() },
    });
    for (const row of recentFocusSessions) {
      noteActivity(row.user_id || userIdByEmail[row.created_by], row.created_date);
    }

    /** Incomplete tasks this user owns, whichever field carries the ownership. */
    const countOpenTasks = async (userId: string): Promise<number> => {
      const [created, owned] = await Promise.all([
        client.entities.Task.filter({ created_by_id: userId, status: { $ne: 'completed' } }),
        client.entities.Task.filter({ owner_user_id: userId, status: { $ne: 'completed' } }),
      ]);
      const ids = new Set<string>([...created, ...owned].map((task: any) => task.id));
      return ids.size;
    };

    // Log rows whose 3-hour window has closed and that have not been judged yet.
    const logRows = await client.entities.NudgeLog.list();
    const dueForEvaluation = pendingEvaluations(logRows, now);

    // ── Dry run: the real decision against live data, reported instead of acted
    // on. It returns here, before any preference write, log write, push or
    // player-id cleanup can happen.
    if (dryRun) {
      const skipped: { user_id: string; reason: string }[] = [];
      const wouldNotify: any[] = [];

      for (const prefs of candidates) {
        const userId = prefs.user_id;
        const user = userById[userId];
        const decision = decideFocusNudge({
          prefs,
          now,
          playerId: user?.onesignal_player_id || null,
          openTaskCount: await countOpenTasks(userId),
          lastSessionActivityMs: lastActivityMs[userId] ?? null,
        });
        if (decision.send) {
          wouldNotify.push({
            user_id: userId,
            timezone: decision.timezone,
            local_date: decision.local_date,
            local_minutes: decision.local_minutes,
          });
        } else {
          skipped.push({ user_id: userId, reason: decision.reason as string });
        }
      }

      console.log(
        `Focus nudge dry run: ${wouldNotify.length} would be nudged, ${skipped.length} skipped, ${dueForEvaluation.length} awaiting back-off`,
      );
      return Response.json({
        dry_run: true,
        now: now.toISOString(),
        checked: candidates.length,
        would_notify: wouldNotify,
        skipped,
        back_off_pending: dueForEvaluation.map((row) => ({
          log_id: row.id,
          user_id: row.user_id,
          sent_at: row.sent_at,
        })),
      });
    }

    // ── Back-off pass: judge every nudge whose window has closed, exactly once.
    const prefsByUserId: Record<string, any> = Object.fromEntries(
      prefsRows.map((row: any) => [row.user_id, row]),
    );
    let evaluated = 0;
    let sessionStarted = 0;
    let ignored = 0;
    let pausedNow = 0;

    for (const row of dueForEvaluation) {
      const outcome = evaluateIgnored(row, lastActivityMs[row.user_id as string] ?? null, now);

      // Record the judgement first, so a failed preference write can never lead
      // to the same nudge being counted twice on a later sweep.
      await client.entities.NudgeLog.update(row.id as string, {
        session_started: outcome.started,
        started_within_minutes: outcome.started_within_minutes,
        evaluated_at: now.toISOString(),
      });
      evaluated++;

      const prefs = prefsByUserId[row.user_id as string];
      if (!prefs) continue; // preferences were deleted with the account

      const count = nextIgnoredCount(prefs.focus_nudge_ignored_count, outcome);
      const patch: Record<string, unknown> = { focus_nudge_ignored_count: count };
      if (shouldPause(count)) patch.focus_nudge_paused = true;

      await client.entities.NotificationPreferences.update(prefs.id, patch);
      // Keep the in-memory row in step so the send pass below honours the pause.
      prefs.focus_nudge_ignored_count = count;
      if (patch.focus_nudge_paused) prefs.focus_nudge_paused = true;

      if (outcome.started) {
        sessionStarted++;
      } else {
        ignored++;
        if (patch.focus_nudge_paused) {
          pausedNow++;
          console.log(`Focus nudge paused for ${row.user_id} after ${count} ignored nudges`);
        }
      }
    }

    // ── Send pass: one nudge per user, never in quiet hours, never twice a day.
    const sentUserIds: string[] = [];
    const skipped: { user_id: string; reason: string }[] = [];
    const failures: any[] = [];

    for (const prefs of candidates) {
      const userId = prefs.user_id;
      const user = userById[userId];
      const playerId = user?.onesignal_player_id || null;

      const decision = decideFocusNudge({
        prefs,
        now,
        playerId,
        openTaskCount: await countOpenTasks(userId),
        lastSessionActivityMs: lastActivityMs[userId] ?? null,
      });
      if (!decision.send) {
        skipped.push({ user_id: userId, reason: decision.reason as string });
        continue;
      }

      const result = await sendOneSignal(playerId as string, { title: NUDGE_TITLE, body: NUDGE_BODY });
      if (!result.ok) {
        // A failed delivery is a failure: no last-sent fields, no log row, so the
        // day is not consumed and the next sweep inside the window can retry.
        console.log(
          `Focus nudge failed for ${userId}: status=${result.status} recipients=${result.recipients} errors=${JSON.stringify(result.errors)}`,
        );
        failures.push({
          user_id: userId,
          status: result.status,
          recipients: result.recipients,
          errors: result.errors,
        });
        if (isInvalidPlayerIdError(result.errors)) {
          await client.entities.User.update(userId, { onesignal_player_id: null });
          console.log(`Cleared dead OneSignal player id for ${userId}; it re-registers on next launch.`);
        }
        continue;
      }

      await client.entities.NotificationPreferences.update(prefs.id, {
        focus_nudge_last_sent_local_date: decision.local_date,
        focus_nudge_last_sent_at: now.toISOString(),
      });
      await client.entities.NudgeLog.create({
        user_id: userId,
        sent_at: now.toISOString(),
        local_date: decision.local_date,
        session_started: false,
        started_within_minutes: null,
      });

      sentUserIds.push(userId);
      console.log(
        `Focus nudge sent to ${userId} (${decision.local_date} ${decision.local_minutes}m ${decision.timezone}, recipients=${result.recipients})`,
      );
    }

    return Response.json({
      sent: sentUserIds.length,
      sent_user_ids: sentUserIds,
      checked: candidates.length,
      skipped,
      failures,
      back_off: { evaluated, session_started: sessionStarted, ignored, paused: pausedNow },
    });
  } catch (error) {
    console.error('sendFocusNudges error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});