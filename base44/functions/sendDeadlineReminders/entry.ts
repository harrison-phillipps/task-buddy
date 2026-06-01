import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Allow both scheduled (service role) and manual admin triggers
  try {
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch {
    // Called by scheduler without user context — use service role only
  }

  const now = new Date();
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const todayStr = now.toISOString().split('T')[0];
  const in7dStr  = in7d.toISOString().split('T')[0];

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

  // Dedup: skip tasks already notified today
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const recentNotifs = await base44.asServiceRole.entities.Notification.list('-created_date', 500);
  const alreadySentToday = new Set(
    recentNotifs
      .filter(n => n.type === 'task_due' && new Date(n.created_date) >= todayStart)
      .map(n => `${n.user_id}:${n.related_id}`)
  );

  let notified = 0;

  for (const task of upcoming) {
    // Match user by email (created_by stores email) or id
    const user = users.find(u => u.email === task.created_by) || users.find(u => u.id === task.created_by);
    if (!user) continue;

    const prefs = prefsMap[user.id];
    if (prefs && prefs.task_reminders === false) continue;

    const dedupKey = `${user.id}:${task.id}`;
    if (alreadySentToday.has(dedupKey)) continue;

    const dueDate = new Date(task.due_date);
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

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