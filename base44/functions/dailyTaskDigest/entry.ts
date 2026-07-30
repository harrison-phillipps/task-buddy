import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduler context (no token) or admin users only
    try {
      const user = await base44.auth.me();
      if (user !== null && user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (authErr) {
      // No user token present (scheduler context) — safe to proceed
      console.log('[dailyTaskDigest] No user context, running as scheduler');
    }

    const client = base44.asServiceRole;

    const now = new Date();
    const today = now.toLocaleDateString('en-CA');

    // Calculate yesterday and next 7 days for overdue/upcoming
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA');

    const in7Days = new Date(now);
    in7Days.setDate(in7Days.getDate() + 7);
    const in7DaysStr = in7Days.toLocaleDateString('en-CA');

    console.log(`[dailyTaskDigest] Running for date: ${today}`);

    // Fetch all active (non-completed) tasks
    const allTasks = await client.entities.Task.list('-due_date');
    const activeTasks = allTasks.filter(t => t.status !== 'completed');

    if (activeTasks.length === 0) {
      console.log('[dailyTaskDigest] No active tasks found');
      return Response.json({ sent: 0 });
    }

    // Group tasks by owner
    const tasksByUser = {};
    for (const task of activeTasks) {
      const ownerId = task.created_by_id;
      if (!ownerId) continue;
      if (!tasksByUser[ownerId]) tasksByUser[ownerId] = [];
      tasksByUser[ownerId].push(task);
    }

    // Fetch users and preferences
    const [users, prefs] = await Promise.all([
      client.entities.User.list(),
      client.entities.NotificationPreferences.list(),
    ]);
    const userById = Object.fromEntries(users.map(u => [u.id, u]));
    const prefByUserId = Object.fromEntries(prefs.map(p => [p.user_id, p]));

    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

    let sent = 0;

    for (const [ownerId, tasks] of Object.entries(tasksByUser)) {
      const user = userById[ownerId];
      if (!user) continue;

      // Only send digest to paid users (Pro/Premium) — free tier would be 1 credit/user/day at scale
      const tier = user.subscription_tier || 'free';
      if (tier === 'free') continue;

      const pref = prefByUserId[user.id];
      // If no pref record exists, user hasn't opted in — skip (avoids default-on behaviour)
      if (!pref) continue;
      // Respect task_reminders preference
      if (pref.task_reminders === false) continue;
      // Respect email_notifications and email_digest preferences
      if (pref.email_notifications === false) continue;
      if (pref.email_digest === 'none') continue;

      // Categorise tasks
      const overdue = tasks.filter(t => t.due_date && t.due_date < today)
        .sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2));

      const dueToday = tasks.filter(t => t.due_date === today)
        .sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2));

      const upcoming = tasks.filter(t => t.due_date && t.due_date > today && t.due_date <= in7DaysStr)
        .sort((a, b) => {
          if (a.due_date !== b.due_date) return a.due_date < b.due_date ? -1 : 1;
          return (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
        });

      // Skip users with nothing urgent
      if (overdue.length === 0 && dueToday.length === 0 && upcoming.length === 0) continue;

      const firstName = user.full_name?.split(' ')[0] || 'there';

      // Build summary title
      let summaryTitle = '☀️ Your Daily Task Digest';
      if (overdue.length > 0) summaryTitle = `🚨 ${overdue.length} Overdue Task${overdue.length > 1 ? 's' : ''} Need Attention`;
      else if (dueToday.length > 0) summaryTitle = `📋 ${dueToday.length} Task${dueToday.length > 1 ? 's' : ''} Due Today`;

      // --- In-app notification (one per day) ---
      const alreadyNotified = await client.entities.Notification.filter({
        user_id: user.id,
        type: 'general',
        title: summaryTitle,
      });
      const alreadySentToday = alreadyNotified.some(n => {
        const sentDate = new Date(n.created_date + (n.created_date?.includes('Z') ? '' : 'Z')).toLocaleDateString('en-CA');
        return sentDate === today;
      });

      if (!alreadySentToday) {
        const topPriority = [...overdue, ...dueToday][0];
        await client.entities.Notification.create({
          user_id: user.id,
          type: 'general',
          title: summaryTitle,
          message: overdue.length > 0
            ? `You have ${overdue.length} overdue and ${dueToday.length} tasks due today. Check your task list!`
            : `You have ${dueToday.length} task${dueToday.length > 1 ? 's' : ''} due today. Stay on track!`,
          priority: overdue.length > 0 ? 'critical' : dueToday.length > 0 ? 'high' : 'medium',
          is_read: false,
          sent_at: now.toISOString(),
          related_type: 'task',
          related_id: topPriority?.id,
        });
      }

      // --- Summary email ---
      const taskRow = (task, badge = '') => {
        const priorityColors = { urgent: '#EF4444', high: '#F97316', medium: '#8B5CF6', low: '#6B7280' };
        const color = priorityColors[task.priority] || '#8B5CF6';
        const dueLabel = task.due_date ? new Date(task.due_date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
        return `
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #F3F4F6;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="background:${color}22; color:${color}; border-radius:4px; padding:2px 7px; font-size:11px; font-weight:600; text-transform:uppercase;">${task.priority || 'medium'}${badge}</span>
                <span style="font-weight:600; color:#111;">${task.title}</span>
              </div>
              ${task.description ? `<div style="color:#666; font-size:13px; margin-top:3px; padding-left:2px;">${task.description.slice(0, 80)}${task.description.length > 80 ? '…' : ''}</div>` : ''}
              ${dueLabel ? `<div style="color:#9CA3AF; font-size:12px; margin-top:2px;">📅 ${dueLabel}</div>` : ''}
            </td>
          </tr>
        `;
      };

      const overdueSection = overdue.length > 0 ? `
        <h3 style="color:#EF4444; margin:24px 0 8px;">🚨 Overdue (${overdue.length})</h3>
        <table style="width:100%; border-collapse:collapse;">${overdue.slice(0, 5).map(t => taskRow(t)).join('')}</table>
        ${overdue.length > 5 ? `<p style="color:#9CA3AF; font-size:13px;">+ ${overdue.length - 5} more overdue tasks</p>` : ''}
      ` : '';

      const todaySection = dueToday.length > 0 ? `
        <h3 style="color:#F97316; margin:24px 0 8px;">📋 Due Today (${dueToday.length})</h3>
        <table style="width:100%; border-collapse:collapse;">${dueToday.slice(0, 5).map(t => taskRow(t)).join('')}</table>
        ${dueToday.length > 5 ? `<p style="color:#9CA3AF; font-size:13px;">+ ${dueToday.length - 5} more tasks due today</p>` : ''}
      ` : '';

      const upcomingSection = upcoming.length > 0 ? `
        <h3 style="color:#8B5CF6; margin:24px 0 8px;">🗓️ Coming Up This Week (${upcoming.length})</h3>
        <table style="width:100%; border-collapse:collapse;">${upcoming.slice(0, 5).map(t => taskRow(t)).join('')}</table>
        ${upcoming.length > 5 ? `<p style="color:#9CA3AF; font-size:13px;">+ ${upcoming.length - 5} more upcoming tasks</p>` : ''}
      ` : '';

      const subject = overdue.length > 0
        ? `🚨 TaskBuddy: ${overdue.length} overdue task${overdue.length > 1 ? 's' : ''} need your attention`
        : dueToday.length > 0
          ? `☀️ TaskBuddy: ${dueToday.length} task${dueToday.length > 1 ? 's' : ''} due today`
          : `☀️ TaskBuddy: Your morning task digest`;

      try {
        await client.integrations.Core.SendEmail({
          to: user.email,
          subject,
          body: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: auto; padding: 32px 24px; background:#fff;">
              <div style="text-align:center; margin-bottom:28px;">
                <div style="background: linear-gradient(135deg, #8B5CF6, #14B8A6); width:56px; height:56px; border-radius:16px; display:inline-flex; align-items:center; justify-content:center; margin-bottom:12px;">
                  <span style="font-size:28px;">✅</span>
                </div>
                <h1 style="font-size:22px; font-weight:700; color:#111; margin:0;">Good morning, ${firstName}!</h1>
                <p style="color:#6B7280; margin:6px 0 0;">Here's your task summary for ${new Date(today).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              </div>

              ${overdueSection}
              ${todaySection}
              ${upcomingSection}

              <div style="text-align:center; margin-top:32px;">
                <a href="https://taskbuddy.app/Tasks" style="background: linear-gradient(135deg, #8B5CF6, #14B8A6); color:white; padding:12px 28px; border-radius:10px; text-decoration:none; display:inline-block; font-weight:600;">
                  Open My Tasks →
                </a>
              </div>

              <p style="font-size:12px; color:#9CA3AF; margin-top:28px; text-align:center;">
                Manage notification preferences in <a href="https://taskbuddy.app/Settings" style="color:#8B5CF6;">Settings</a>
              </p>
            </div>
          `,
        });
        console.log(`[dailyTaskDigest] Email sent to ${user.email}: ${overdue.length} overdue, ${dueToday.length} due today, ${upcoming.length} upcoming`);
        sent++;
      } catch (emailErr) {
        console.error(`[dailyTaskDigest] Failed to email ${user.email}:`, emailErr.message);
      }
    }

    console.log(`[dailyTaskDigest] Done. Sent: ${sent}`);
    return Response.json({ sent, date: today });
  } catch (error) {
    console.error('[dailyTaskDigest] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});