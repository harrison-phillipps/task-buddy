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
  const base44 = createClientFromRequest(req);

  // Allow both scheduled (service role) and manual admin triggers
  // If a user token is present, they must be admin. Scheduler calls have no user token.
  try {
    const user = await base44.auth.me();
    if (user !== null && user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch (authErr) {
    // No user token present (scheduler context) — safe to proceed with service role
    console.log('[sendDeadlineReminders] No user context, running as scheduler');
  }

  const now = new Date();
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const todayStr = adelaideDateString(now);
  const in7dStr  = adelaideDateString(in7d);

  // Fetch all non-completed tasks with a due date within the next 7 days
  const tasks = await base44.asServiceRole.entities.Task.list('-due_date', 500);
  const upcoming = tasks.filter(t =>
    t.due_date &&
    t.status !== 'completed' &&
    t.due_date >= todayStr &&
    t.due_date <= in7dStr
  );

  if (upcoming.length === 0) {
    console.log('sendDeadlineReminders: no upcoming tasks');
    return Response.json({ message: 'No upcoming tasks', notified: 0 });
  }

  // Get all users and preferences
  const users = await base44.asServiceRole.entities.User.list();
  const allPrefs = await base44.asServiceRole.entities.NotificationPreferences.list();
  const prefsMap = Object.fromEntries(allPrefs.map(p => [p.user_id, p]));

  // Dedup: skip tasks already notified today (Adelaide-local day)
  const todayAdelaide = adelaideDateString(now);
  const recentNotifs = await base44.asServiceRole.entities.Notification.list('-created_date', 500);
  const alreadySentToday = new Set(
    recentNotifs
      .filter(n => n.type === 'task_due' && adelaideDateString(new Date(n.created_date)) === todayAdelaide)
      .map(n => `${n.user_id}:${n.related_id}`)
  );

  let notified = 0;

  for (const task of upcoming) {
    // Prefer owner_user_id (set on recurring instances), fall back to created_by_id
    const ownerId = task.owner_user_id || task.created_by_id;
    const user = users.find(u => u.id === ownerId);
    if (!user) continue;

    const prefs = prefsMap[user.id];
    if (prefs && prefs.task_reminders === false) continue;

    const dedupKey = `${user.id}:${task.id}`;
    if (alreadySentToday.has(dedupKey)) continue;

    // Calendar-day difference in Adelaide-local time: 0 = due today, 1 = tomorrow, etc.
    // Anchoring both dates to Adelaide noon avoids DST edge effects and the
    // Adelaide-morning blind spot where UTC date lags Adelaide date.
    const diffDays = Math.round(
      (adelaideLocalToUtc(task.due_date, '12:00').getTime() - adelaideLocalToUtc(adelaideDateString(now), '12:00').getTime()) / (24 * 60 * 60 * 1000)
    );

    let urgencyLabel, priority, sendEmail;
    // Only send emails to users who have opted in to email notifications AND
    // have email_digest set to 'daily' or 'weekly' (not 'none')
    const emailOptedIn = prefs?.email_notifications !== false && prefs?.email_digest !== 'none';
    if (diffDays <= 1) {
      urgencyLabel = 'due TODAY';
      priority = 'critical';
      sendEmail = emailOptedIn; // even critical respects opt-out
    } else if (diffDays <= 3) {
      urgencyLabel = `due in ${diffDays} days`;
      priority = 'high';
      sendEmail = emailOptedIn;
    } else {
      urgencyLabel = `due in ${diffDays} days`;
      priority = 'medium';
      sendEmail = false; // never email for 4-7 day tasks
    }

    const title = `⏰ Task ${urgencyLabel}: ${task.title}`;
    const message = `"${task.title}" is ${urgencyLabel}${task.priority === 'urgent' ? ' — marked URGENT' : ''}. Stay on track!`;

    await base44.asServiceRole.entities.Notification.create({
      user_id: user.id,
      type: 'task_due',
      title,
      message,
      related_id: task.id,
      related_type: 'task',
      priority,
      action_url: '/Tasks',
      is_read: false,
      sent_at: now.toISOString(),
    });

    if (sendEmail && user.email) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: user.email,
          subject: title,
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
              <div style="background: linear-gradient(135deg, #8B5CF6, #14B8A6); padding: 24px; border-radius: 12px; margin-bottom: 24px;">
                <h1 style="color: white; margin: 0; font-size: 22px;">TaskBuddy Reminder</h1>
                <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 14px;">You have a task coming up!</p>
              </div>
              <h2 style="color: #1F2937; font-size: 18px;">${task.title}</h2>
              <p style="color: #6B7280; font-size: 15px; margin-bottom: 8px;">📅 Due: <strong>${task.due_date}</strong></p>
              ${task.description ? `<p style="color: #6B7280; font-size: 14px;">${task.description}</p>` : ''}
              <div style="margin: 24px 0; padding: 16px; background: #FEF3C7; border-radius: 8px; border-left: 4px solid #F59E0B;">
                <p style="margin: 0; color: #92400E; font-size: 14px; font-weight: 600;">⚡ This task is ${urgencyLabel}. Time to focus!</p>
              </div>
              <p style="font-size: 12px; color: #9CA3AF; margin-top: 32px;">
                Manage your notification preferences in TaskBuddy Settings.
              </p>
            </div>
          `
        });
      } catch (emailErr) {
        console.error(`Email failed for ${user.email}:`, emailErr.message);
      }
    }

    notified++;
  }

  console.log(`sendDeadlineReminders: processed ${upcoming.length} tasks, sent ${notified} notifications`);
  return Response.json({ message: 'Done', upcoming: upcoming.length, notified });
});