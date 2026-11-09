import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { requireAdmin } from '../../shared/authGuard.ts';
import { resolveTimezone } from '../../shared/quietHours.ts';
import { localDateString } from '../../shared/localTime.ts';
import { isInvalidPlayerIdError } from '../../shared/oneSignal.ts';
import { reminderKey, selectDueReminders } from '../../shared/taskReminderSelection.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

const parseDbDate = (value: unknown): Date | null => {
  if (typeof value !== 'string' || !value) return null;
  const parsed = new Date(value.includes('Z') || value.includes('+') ? value : `${value}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const utcDateString = (date: Date) => date.toISOString().slice(0, 10);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Admin only: the scheduled workflow step calls this as its creator, an app admin.
    const gate = await requireAdmin(base44);
    if (!gate.ok) return gate.response;

    const client = base44.asServiceRole;
    const now = new Date();

    // One day either side of the old today..tomorrow window. The query is only
    // a coarse net — widening it means a task is never missed because the
    // server's calendar day differs from the owner's. selectDueReminders then
    // decides every task in its owner's own timezone.
    const fromDate = utcDateString(new Date(now.getTime() - DAY_MS));
    const toDate = utcDateString(new Date(now.getTime() + 2 * DAY_MS));
    console.log(`Checking tasks due ${fromDate}..${toDate}, now ${now.toISOString()}`);

    const tasks = await client.entities.Task.filter({
      due_date: { $gte: fromDate, $lte: toDate },
    });
    if (tasks.length === 0) {
      console.log('No tasks in the widened due window');
      return Response.json({ sent: 0, checked: 0 });
    }

    // A task-linked calendar event carries a start time for tasks that have no
    // due_time of their own (the second time source, unchanged).
    const calendarEvents = await client.entities.CalendarEvent.filter({
      start_date: { $gte: fromDate, $lte: toDate },
      source: 'task',
    });
    const taskEventTime: Record<string, string> = {};
    for (const event of calendarEvents) {
      if (event.task_id && event.start_time) taskEventTime[event.task_id] = event.start_time;
    }

    const users = await client.entities.User.list();
    const userById = Object.fromEntries(users.map((u: any) => [u.id, u]));
    const prefs = await client.entities.NotificationPreferences.list();
    const prefByUserId = Object.fromEntries(prefs.map((p: any) => [p.user_id, p]));

    // Already-reminded keys for the last two days, in one query rather than one
    // per task. Each row is keyed by the owner's own local date, so the
    // once-per-task-per-day rule follows the owner's calendar, not the server's.
    const recentNotifications = await client.entities.Notification.filter({
      type: 'task_due',
      created_date: { $gte: new Date(now.getTime() - 2 * DAY_MS).toISOString() },
    });
    const alreadyNotified = new Set<string>();
    for (const row of recentNotifications) {
      if (!row.user_id || !row.related_id) continue;
      const sentAt = parseDbDate(row.created_date);
      const localDate = sentAt
        ? localDateString(sentAt, resolveTimezone(prefByUserId[row.user_id]))
        : null;
      if (localDate) alreadyNotified.add(reminderKey(row.user_id, row.related_id, localDate));
    }

    const { selected, skipped } = selectDueReminders({
      tasks,
      calendarTimeByTaskId: taskEventTime,
      prefsByUserId,
      now,
      alreadyNotified,
    });

    if (selected.length === 0) {
      console.log(`No tasks matched the reminder window ${JSON.stringify(skipped)}`);
      return Response.json({ sent: 0, checked: 0, skipped });
    }

    let sent = 0;
    let quietSkipped = 0;

    for (const candidate of selected) {
      const { task, userId, dueTime, quiet, canPush } = candidate;
      const user = userById[userId];
      if (!user) continue;
      const pref = prefByUserId[userId] || null;

      // The time is the owner's own wall clock: due_time is stored that way, and
      // a calendar start_time is already local to them.
      const timeLabel = dueTime ? `at ${dueTime}` : 'today';
      const isMustDo = task.task_priority === 'must_do';
      const message = `"${task.title}" is due ${timeLabel}${task.estimated_minutes ? ` (~${task.estimated_minutes} min)` : ''}.`;

      // The in-app row is written for every reminder, quiet hours or not.
      await client.entities.Notification.create({
        user_id: user.id,
        type: 'task_due',
        title: 'Task reminder',
        message,
        related_id: task.id,
        related_type: 'task',
        priority: isMustDo ? 'critical' : task.priority === 'urgent' ? 'critical' : 'high',
        is_read: false,
        sent_at: now.toISOString(),
      });

      // Push only for a task with a real time, and never during quiet hours.
      // Untimed tasks stay in-app + email, which keeps them gentle.
      if (quiet) quietSkipped++;
      if (canPush) {
        try {
          const pushPayload = {
            // Lock-screen copy stays generic: the task title never appears here.
            title: `A task is due ${timeLabel}`,
            body: `${task.estimated_minutes ? `~${task.estimated_minutes} min. ` : ''}Open to view, or snooze.`,
            taskId: task.id,
            taskTitle: task.title,
            estimatedMinutes: task.estimated_minutes || null,
            dueDate: task.due_date,
            dueTime: dueTime,
          };

          // Native (OneSignal) takes precedence; fall back to VAPID web push.
          if (user.onesignal_player_id) {
            const res = await base44.asServiceRole.functions.invoke('sendPushNotification', {
              playerId: user.onesignal_player_id,
              payload: pushPayload,
            });
            const delivery = res?.data || {};
            if (delivery.ok) {
              console.log(`OneSignal push sent to ${user.email} (recipients=${delivery.recipients})`);
            } else {
              console.log(`push failed for ${user.email}: status=${delivery.status} recipients=${delivery.recipients} errors=${JSON.stringify(delivery.errors || [])}`);
              // Only a dead id is cleared, so the app can register a fresh one.
              if (isInvalidPlayerIdError(delivery.errors || [])) {
                await base44.asServiceRole.entities.User.update(user.id, { onesignal_player_id: null });
                console.log(`Cleared dead OneSignal player id for ${user.email}; it re-registers on next launch.`);
              }
            }
          } else {
            const pushSubRaw = user.push_subscription;
            if (pushSubRaw) {
              const pushSub = typeof pushSubRaw === 'string' ? JSON.parse(pushSubRaw) : pushSubRaw;
              const res = await base44.asServiceRole.functions.invoke('sendPushNotification', {
                subscription: pushSub,
                payload: pushPayload,
              });
              const delivery = res?.data || {};
              if (delivery.ok) {
                console.log(`VAPID push sent to ${user.email}`);
              } else {
                console.log(`push failed for ${user.email} (VAPID): status=${delivery.status} errors=${JSON.stringify(delivery.errors || [])}`);
              }
            }
          }
        } catch (pushErr) {
          console.error(`Push failed for ${user.email}:`, pushErr.message);
        }
      }

      // Email if enabled, and silenced by quiet hours like push.
      if (!quiet && pref?.email_notifications !== false) {
        try {
          await client.integrations.Core.SendEmail({
            to: user.email,
            // Email subjects show on lock screens, so no task title here.
            subject: 'Your task reminder',
            body: `
              <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 24px;">
                <h2 style="color: #8B5CF6;">Task Reminder</h2>
                <p>Hi ${user.full_name || 'there'},</p>
                <p>${message}</p>
                ${task.description ? `<p style="color: #666;">${task.description}</p>` : ''}
                <a href="https://taskbuddyapp.online" style="background: #8B5CF6; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 12px;">
                  Open TaskBuddy
                </a>
                <p style="font-size: 12px; color: #999; margin-top: 24px;">
                  You can manage notification preferences in your TaskBuddy settings.
                </p>
              </div>
            `,
          });
          console.log(`Email sent to ${user.email}`);
        } catch (emailErr) {
          console.error(`Failed to send email to ${user.email}:`, emailErr.message);
        }
      }

      sent++;
      console.log(`Notified ${user.email} (${candidate.timeSource}, due ${timeLabel} ${candidate.timezone})`);
    }

    return Response.json({ sent, checked: selected.length, quiet_skipped: quietSkipped, skipped });
  } catch (error) {
    console.error('sendUpcomingTaskReminders error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});