import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Parses a date+time as wall-clock Adelaide local and returns the true UTC
// instant. Intl resolves the actual IANA offset (ACST +09:30 / ACDT +10:30),
// so this stays correct across daylight-saving transitions.
function adelaideLocalToUtc(dateStr, timeStr, timeZone = 'Australia/Adelaide') {
  const naiveUtc = new Date(`${dateStr}T${timeStr}:00Z`);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = Object.fromEntries(formatter.formatToParts(naiveUtc).map(p => [p.type, p.value]));
  const asIfLocal = new Date(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
  const offsetMs = naiveUtc.getTime() - asIfLocal.getTime();
  return new Date(naiveUtc.getTime() + offsetMs);
}

// Returns the Adelaide-local hour and minute for a given Date, so time-of-day
// gates fire at wall-clock Adelaide time, not the server's UTC clock.
function adelaideHourMinute(date, timeZone = 'Australia/Adelaide') {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    hour: '2-digit', minute: '2-digit',
  }).formatToParts(date);
  return {
    hour: Number(parts.find(p => p.type === 'hour').value),
    minute: Number(parts.find(p => p.type === 'minute').value),
  };
}

// Returns the Adelaide-local YYYY-MM-DD for a given Date, so date-window
// boundaries align with Adelaide wall-clock days, not the server's UTC day.
function adelaideDateString(date, timeZone = 'Australia/Adelaide') {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const y = parts.find(p => p.type === 'year').value;
  const m = parts.find(p => p.type === 'month').value;
  const d = parts.find(p => p.type === 'day').value;
  return `${y}-${m}-${d}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const client = base44.asServiceRole;

    const now = new Date();
    const today = adelaideDateString(now); // Adelaide-local YYYY-MM-DD
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = adelaideDateString(tomorrow);
    const { hour: currentHour, minute: currentMinute } = adelaideHourMinute(now);

    console.log(`Checking tasks due ${today}..${tomorrowStr}, current time ${currentHour}:${String(currentMinute).padStart(2,'0')}`);

    // Fetch incomplete tasks due today or tomorrow (tomorrow covers the max
    // supported task_reminder_minutes value of 1440 = 1 day lead time).
    const allTasks = await client.entities.Task.filter({
      due_date: { $gte: today, $lte: tomorrowStr }
    });
    const tasksInWindow = allTasks.filter(t => t.status !== 'completed');

    if (tasksInWindow.length === 0) {
      console.log('No tasks due today or tomorrow');
      return Response.json({ sent: 0 });
    }

    // Check calendar events for time-specific due times (today + tomorrow,
    // so a task due tomorrow with a start_time is still matched)
    const calendarEvents = await client.entities.CalendarEvent.filter({
      start_date: { $gte: today, $lte: tomorrowStr },
      source: 'task'
    });

    // Build map: task_id -> event time
    const taskEventTime = {};
    for (const event of calendarEvents) {
      if (event.task_id && event.start_time) {
        taskEventTime[event.task_id] = event.start_time; // "HH:mm"
      }
    }

    // Fetch users + notification preferences up front so each owner's
    // task_reminder_minutes can drive the per-task reminder window.
    const users = await client.entities.User.list();
    const userById = Object.fromEntries(users.map(u => [u.id, u]));
    const prefs = await client.entities.NotificationPreferences.list();
    const prefByUserId = Object.fromEntries(prefs.map(p => [p.user_id, p]));

    const DEFAULT_REMINDER_MINUTES = 60;
    const TOLERANCE_MIN = 5; // matches the 5-minute cron cadence

    // Determine which tasks fall within each user's chosen reminder window.
    const tasksToNotify = [];
    for (const task of tasksInWindow) {
      const eventTime = taskEventTime[task.id];
      if (eventTime) {
        // Specific due time — parse due_date + start_time as Adelaide
        // local and convert to a true UTC instant, then compare absolutely
        // so day boundaries are handled.
        const ownerId = task.owner_user_id || task.created_by_id;
        const owner = ownerId ? userById[ownerId] : null;
        const pref = owner ? prefByUserId[owner.id] : null;
        const leadMinutes = pref?.task_reminder_minutes ?? DEFAULT_REMINDER_MINUTES;

        const dueTimestamp = adelaideLocalToUtc(task.due_date, eventTime);
        const diffMinutes = (dueTimestamp.getTime() - now.getTime()) / 60000;
        if (diffMinutes >= leadMinutes - TOLERANCE_MIN && diffMinutes <= leadMinutes + TOLERANCE_MIN) {
          tasksToNotify.push({ task, dueTime: eventTime });
        }
      } else {
        // No specific time — send reminder at 8am, but only for tasks
        // actually due today (untimed tomorrow tasks wait for their own 8am).
        if (task.due_date === today && currentHour === 8 && currentMinute < 5) {
          tasksToNotify.push({ task, dueTime: 'end of day' });
        }
      }
    }

    if (tasksToNotify.length === 0) {
      console.log('No tasks matched the reminder window');
      return Response.json({ sent: 0 });
    }

    // Group by user (created_by_id)
    const byUser = {};
    for (const item of tasksToNotify) {
      const ownerId = item.task.owner_user_id || item.task.created_by_id;
      if (!ownerId) continue;
      if (!byUser[ownerId]) byUser[ownerId] = [];
      byUser[ownerId].push(item);
    }

    let sent = 0;

    for (const [ownerId, items] of Object.entries(byUser)) {
      const user = userById[ownerId];
      if (!user) continue;

      const pref = prefByUserId[user.id];
      // Respect task_reminders preference (default true)
      if (pref && pref.task_reminders === false) continue;

      for (const { task, dueTime } of items) {
        // Dedup: check if we already sent this notification today
        const existing = await client.entities.Notification.filter({
          user_id: user.id,
          related_id: task.id,
          type: 'task_due'
        });

        const alreadySentToday = existing.some(n => {
          const sentDate = new Date(
            n.created_date + (n.created_date?.includes('Z') ? '' : 'Z')
          ).toLocaleDateString('en-CA');
          return sentDate === today;
        });

        if (alreadySentToday) {
          console.log(`Already notified user ${user.email} for task ${task.id} today`);
          continue;
        }

        const timeLabel = dueTime === 'end of day' ? 'today' : `at ${dueTime}`;
        const isMustDo = task.task_priority === 'must_do';
        const urgencyPrefix = isMustDo ? '🔴 Must Do: ' : '';
        const message = `${urgencyPrefix}"${task.title}" is due ${timeLabel}.${task.estimated_minutes ? ` (~${task.estimated_minutes} min)` : ''}`;

        // Create in-app notification
        await client.entities.Notification.create({
          user_id: user.id,
          type: 'task_due',
          title: isMustDo ? '🔴 Must Do Task Due Soon' : '⏰ Task Due Soon',
          message,
          related_id: task.id,
          related_type: 'task',
          priority: isMustDo ? 'critical' : task.priority === 'urgent' ? 'critical' : 'high',
          is_read: false,
          sent_at: now.toISOString(),
        });

        // Send push for any task with a specific scheduled time (a linked
        // CalendarEvent with a start_time). Untimed tasks (8am fallback path,
        // dueTime === 'end of day') get in-app + email only — gentle, not aggressive.
        const hasSpecificTime = dueTime !== 'end of day';
        if (hasSpecificTime) {
          try {
            const pushPayload = {
              title: isMustDo ? `🔴 Must Do: ${task.title}` : `⏰ ${task.title}`,
              body: `Due ${timeLabel}${task.estimated_minutes ? ` · ~${task.estimated_minutes} min` : ''}. Tap to open or snooze.`,
              taskId: task.id,
              taskTitle: task.title,
              estimatedMinutes: task.estimated_minutes || null,
              dueDate: task.due_date,
            };

            // Native (OneSignal) takes precedence; fall back to VAPID web push
            if (user.onesignal_player_id) {
              await base44.asServiceRole.functions.invoke('sendPushNotification', {
                playerId: user.onesignal_player_id,
                payload: pushPayload,
              });
              console.log(`OneSignal push sent to ${user.email} for task "${task.title}"`);
            } else {
              const pushSubRaw = user.push_subscription;
              if (pushSubRaw) {
                const pushSub = typeof pushSubRaw === 'string' ? JSON.parse(pushSubRaw) : pushSubRaw;
                await base44.asServiceRole.functions.invoke('sendPushNotification', {
                  subscription: pushSub,
                  payload: pushPayload,
                });
                console.log(`VAPID push sent to ${user.email} for task "${task.title}"`);
              }
            }
          } catch (pushErr) {
            console.error(`Push failed for ${user.email}:`, pushErr.message);
          }
        }

        // Send email if enabled
        if (pref?.email_notifications !== false) {
          try {
            await client.integrations.Core.SendEmail({
              to: user.email,
              subject: `⏰ Reminder: "${task.title}" is due soon`,
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
            console.log(`Email sent to ${user.email} for task "${task.title}"`);
          } catch (emailErr) {
            console.error(`Failed to send email to ${user.email}:`, emailErr.message);
          }
        }

        sent++;
        console.log(`Notified ${user.email} for task "${task.title}" due ${timeLabel}`);
      }
    }

    return Response.json({ sent, checked: tasksToNotify.length });
  } catch (error) {
    console.error('sendUpcomingTaskReminders error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});