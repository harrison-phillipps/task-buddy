import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const client = base44.asServiceRole;

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    console.log(`Checking tasks due today (${today}), current time ${currentHour}:${String(currentMinute).padStart(2,'0')}`);

    // Fetch incomplete tasks due today
    const allTasks = await client.entities.Task.filter({ due_date: today });
    const tasksInWindow = allTasks.filter(t => t.status !== 'completed');

    if (tasksInWindow.length === 0) {
      console.log('No tasks due today');
      return Response.json({ sent: 0 });
    }

    // Check calendar events for time-specific due times
    const calendarEvents = await client.entities.CalendarEvent.filter({
      start_date: today,
      source: 'task'
    });

    // Build map: task_id -> event time
    const taskEventTime = {};
    for (const event of calendarEvents) {
      if (event.task_id && event.start_time) {
        taskEventTime[event.task_id] = event.start_time; // "HH:mm"
      }
    }

    // Determine which tasks are due in the 30-min window
    const tasksToNotify = [];
    for (const task of tasksInWindow) {
      const eventTime = taskEventTime[task.id];
      if (eventTime) {
        // Has a calendar event with a specific time — check 30-min window
        const [h, m] = eventTime.split(':').map(Number);
        const taskMinutes = h * 60 + m;
        const nowMinutes = currentHour * 60 + currentMinute;
        if (taskMinutes - nowMinutes >= 25 && taskMinutes - nowMinutes <= 35) {
          tasksToNotify.push({ task, dueTime: eventTime });
        }
      } else {
        // No specific time — send reminder at 8am for tasks due today
        if (currentHour === 8 && currentMinute < 5) {
          tasksToNotify.push({ task, dueTime: 'end of day' });
        }
      }
    }

    if (tasksToNotify.length === 0) {
      console.log('No tasks matched the 30-min window');
      return Response.json({ sent: 0 });
    }

    // Group by user (created_by email)
    const byUser = {};
    for (const item of tasksToNotify) {
      const email = item.task.created_by;
      if (!email) continue;
      if (!byUser[email]) byUser[email] = [];
      byUser[email].push(item);
    }

    // Fetch all users
    const users = await client.entities.User.list();
    const userByEmail = Object.fromEntries(users.map(u => [u.email, u]));

    // Fetch notification preferences
    const prefs = await client.entities.NotificationPreferences.list();
    const prefByUserId = Object.fromEntries(prefs.map(p => [p.user_id, p]));

    let sent = 0;

    for (const [email, items] of Object.entries(byUser)) {
      const user = userByEmail[email];
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
          const sentDate = n.created_date?.split('T')[0];
          return sentDate === today;
        });

        if (alreadySentToday) {
          console.log(`Already notified user ${email} for task ${task.id} today`);
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

        // Send browser push notification if user has a push subscription (must_do tasks always, others only if urgent)
        if (isMustDo || task.priority === 'urgent') {
          try {
            const pushSubRaw = user.push_subscription;
            if (pushSubRaw) {
              const pushSub = typeof pushSubRaw === 'string' ? JSON.parse(pushSubRaw) : pushSubRaw;
              await base44.asServiceRole.functions.invoke('sendPushNotification', {
                subscription: pushSub,
                payload: {
                  title: isMustDo ? `🔴 Must Do: ${task.title}` : `⏰ ${task.title}`,
                  body: `Due ${timeLabel}${task.estimated_minutes ? ` · ~${task.estimated_minutes} min` : ''}. Tap to open or snooze.`,
                  taskId: task.id,
                  taskTitle: task.title,
                  estimatedMinutes: task.estimated_minutes || null,
                  dueDate: task.due_date,
                },
              });
              console.log(`Push notification sent to ${email} for task "${task.title}"`);
            }
          } catch (pushErr) {
            console.error(`Push failed for ${email}:`, pushErr.message);
          }
        }

        // Send email if enabled
        if (pref?.email_notifications !== false) {
          try {
            await client.integrations.Core.SendEmail({
              to: email,
              subject: `⏰ Reminder: "${task.title}" is due soon`,
              body: `
                <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 24px;">
                  <h2 style="color: #8B5CF6;">Task Reminder</h2>
                  <p>Hi ${user.full_name || 'there'},</p>
                  <p>${message}</p>
                  ${task.description ? `<p style="color: #666;">${task.description}</p>` : ''}
                  <a href="https://app.base44.com" style="background: #8B5CF6; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 12px;">
                    Open TaskBuddy
                  </a>
                  <p style="font-size: 12px; color: #999; margin-top: 24px;">
                    You can manage notification preferences in your TaskBuddy settings.
                  </p>
                </div>
              `,
            });
            console.log(`Email sent to ${email} for task "${task.title}"`);
          } catch (emailErr) {
            console.error(`Failed to send email to ${email}:`, emailErr.message);
          }
        }

        sent++;
        console.log(`Notified ${email} for task "${task.title}" due ${timeLabel}`);
      }
    }

    return Response.json({ sent, checked: tasksToNotify.length });
  } catch (error) {
    console.error('sendUpcomingTaskReminders error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});