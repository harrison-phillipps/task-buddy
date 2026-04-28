import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Returns ISO strings for the next N hours window
function getTimeWindow(fromNow = 0, windowMinutes = 60) {
  const start = new Date(Date.now() + fromNow * 60000);
  const end = new Date(start.getTime() + windowMinutes * 60000);
  return { start, end };
}

function toISO(d) { return d.toISOString(); }

// Check if the current time falls inside a busy block
function isCurrentlyBusy(events, nowMs) {
  for (const ev of events) {
    const s = ev.start?.dateTime ? new Date(ev.start.dateTime).getTime() : null;
    const e = ev.end?.dateTime ? new Date(ev.end.dateTime).getTime() : null;
    if (s && e && nowMs >= s && nowMs < e) return true;
  }
  return false;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const client = base44.asServiceRole;

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentHour = now.getUTCHours();
    const nudgeType = req.headers.get('x-nudge-type') || 'free_slot'; // 'free_slot' or 'daily'

    console.log(`[smartTaskNudge] type=${nudgeType} time=${now.toISOString()}`);

    // --- 1. Fetch high-priority / urgent incomplete tasks ---
    const allTasks = await client.entities.Task.list();
    const highPriorityTasks = allTasks.filter(t =>
      t.status !== 'completed' &&
      (t.priority === 'high' || t.priority === 'urgent')
    );

    if (highPriorityTasks.length === 0) {
      console.log('[smartTaskNudge] No high-priority tasks found');
      return Response.json({ sent: 0, reason: 'no_high_priority_tasks' });
    }

    // --- 2. Check if user is currently free using calendar integrations ---
    let isFree = true; // default assume free
    const nowMs = now.getTime();

    if (nudgeType === 'free_slot') {
      // Try Google Calendar
      try {
        const { accessToken: gcalToken } = await client.connectors.getConnection('googlecalendar');
        const { start, end } = getTimeWindow(0, 60);
        const gcalUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${toISO(start)}&timeMax=${toISO(end)}&singleEvents=true&orderBy=startTime`;
        const gcalRes = await fetch(gcalUrl, {
          headers: { Authorization: `Bearer ${gcalToken}` }
        });
        if (gcalRes.ok) {
          const gcalData = await gcalRes.json();
          const events = gcalData.items || [];
          if (isCurrentlyBusy(events, nowMs)) {
            isFree = false;
            console.log('[smartTaskNudge] User is busy per Google Calendar — skipping nudge');
          } else {
            console.log(`[smartTaskNudge] Google Calendar: ${events.length} events in window, user is free`);
          }
        }
      } catch (gcalErr) {
        console.log('[smartTaskNudge] Google Calendar check skipped:', gcalErr.message);
      }

      // Try Outlook Calendar (only if still seems free)
      if (isFree) {
        try {
          const { accessToken: outlookToken } = await client.connectors.getConnection('outlook');
          const { start, end } = getTimeWindow(0, 60);
          const outlookUrl = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${toISO(start)}&endDateTime=${toISO(end)}`;
          const outlookRes = await fetch(outlookUrl, {
            headers: { Authorization: `Bearer ${outlookToken}` }
          });
          if (outlookRes.ok) {
            const outlookData = await outlookRes.json();
            const events = outlookData.value || [];
            if (isCurrentlyBusy(events, nowMs)) {
              isFree = false;
              console.log('[smartTaskNudge] User is busy per Outlook — skipping nudge');
            } else {
              console.log(`[smartTaskNudge] Outlook: ${events.length} events in window, user is free`);
            }
          }
        } catch (outlookErr) {
          console.log('[smartTaskNudge] Outlook check skipped:', outlookErr.message);
        }
      }

      if (!isFree) {
        return Response.json({ sent: 0, reason: 'user_is_busy' });
      }
    }

    // --- 3. Fetch users and notification prefs ---
    const users = await client.entities.User.list();
    const prefs = await client.entities.NotificationPreferences.list();
    const prefByUserId = Object.fromEntries(prefs.map(p => [p.user_id, p]));

    // Group tasks by owner
    const tasksByEmail = {};
    for (const task of highPriorityTasks) {
      const email = task.created_by;
      if (!email) continue;
      if (!tasksByEmail[email]) tasksByEmail[email] = [];
      tasksByEmail[email].push(task);
    }

    const userByEmail = Object.fromEntries(users.map(u => [u.email, u]));
    let sent = 0;

    for (const [email, tasks] of Object.entries(tasksByEmail)) {
      const user = userByEmail[email];
      if (!user) continue;

      const pref = prefByUserId[user.id];
      if (pref && pref.task_reminders === false) continue;

      // Dedup: only send one nudge per user per hour
      const recentNotifs = await client.entities.Notification.filter({
        user_id: user.id,
        type: 'task_due'
      });
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const recentlySent = recentNotifs.some(n => {
        const sentAt = n.sent_at ? new Date(n.sent_at).getTime() : 0;
        return sentAt > oneHourAgo && n.title?.includes('free');
      });

      if (nudgeType === 'free_slot' && recentlySent) {
        console.log(`[smartTaskNudge] Already nudged ${email} recently — skipping`);
        continue;
      }

      // Pick up to 2 most urgent tasks to show
      const sortedTasks = tasks.sort((a, b) => {
        const urgency = { urgent: 0, high: 1 };
        return (urgency[a.priority] ?? 2) - (urgency[b.priority] ?? 2);
      }).slice(0, 2);

      const taskList = sortedTasks.map(t => `"${t.title}"`).join(' and ');
      const isUrgent = sortedTasks.some(t => t.priority === 'urgent');

      let title, message;
      if (nudgeType === 'daily') {
        title = '🌅 Good morning! High-priority tasks await';
        message = `You have ${tasks.length} high-priority task${tasks.length > 1 ? 's' : ''} to tackle today. Start with ${taskList}.`;
      } else {
        title = '⚡ You\'re free — perfect time to focus!';
        message = `Your calendar is clear right now. Use this time to work on ${taskList}${tasks.length > 2 ? ` and ${tasks.length - 2} more` : ''}.`;
      }

      await client.entities.Notification.create({
        user_id: user.id,
        type: 'task_due',
        title,
        message,
        related_id: sortedTasks[0]?.id,
        related_type: 'task',
        priority: isUrgent ? 'critical' : 'high',
        is_read: false,
        sent_at: now.toISOString(),
        action_url: '/Tasks',
      });

      sent++;
      console.log(`[smartTaskNudge] Notified ${email}: ${message}`);
    }

    return Response.json({ sent, nudgeType, tasksChecked: highPriorityTasks.length });
  } catch (error) {
    console.error('[smartTaskNudge] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});