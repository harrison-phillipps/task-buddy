import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { asRows } from '../../shared/entityResults.ts';

/**
 * Delivers a notification to ANOTHER app user on the caller's behalf.
 *
 * Why this exists: the browser used to create the Notification row for any
 * user_id it liked, read that user's NotificationPreferences (an open table),
 * and — when sendEmail was set — hand the recipient's address to
 * integrations.Core.SendEmail. That let any signed-in user look at and drive
 * someone else's notification settings, and mail them.
 *
 * Here the caller is authorised, the recipient's preferences are applied
 * without ever leaving the server, and the response says only whether
 * something was delivered and emailed — never how the recipient is configured.
 */

const NOTIFICATION_TYPES = ['task_due', 'goal_deadline', 'habit_reminder', 'achievement', 'team_mention', 'general'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

const memberIdsOf = (team) => {
  const primary = Array.isArray(team?.member_user_ids) ? team.member_user_ids : [];
  const fallback = Array.isArray(team?.member_ids) ? team.member_ids : [];
  return primary.length ? primary : fallback;
};

/** Self, the task's creator/assignee, or someone who shares a team with the recipient. */
async function callerMayNotify(admin, callerId, recipientId, taskId) {
  if (callerId === recipientId) return true;

  if (taskId) {
    const task = await admin.entities.Task.get(taskId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (task) {
      const assignees = (Array.isArray(task.assigned_to_users) ? task.assigned_to_users : [])
        .map((entry) => entry?.user_id)
        .filter(Boolean);
      const owners = [task.created_by_id, task.owner_user_id, task.assigned_to, ...assignees];
      if (owners.includes(callerId)) return true;
    }
  }

  const myTeams = [
    ...asRows(await admin.entities.Team.filter({ member_user_ids: callerId })),
    ...asRows(await admin.entities.Team.filter({ member_ids: callerId })),
  ];
  return myTeams.some((team) => memberIdsOf(team).includes(recipientId));
}

function emailBody(title, message, link) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #8B5CF6;">${title}</h2>
      <p style="font-size: 16px; color: #4B5563;">${message}</p>
      ${link ? `
        <a href="${link}"
           style="display: inline-block; padding: 12px 24px; background: linear-gradient(to right, #8B5CF6, #14B8A6); color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">
          View in App
        </a>
      ` : ''}
      <p style="margin-top: 32px; font-size: 12px; color: #9CA3AF;">
        This is an automated notification from TaskBuddy.
        You can manage your notification preferences in your settings.
      </p>
    </div>
  `;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const recipientId = typeof body?.recipient_user_id === 'string' ? body.recipient_user_id.trim() : '';
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!recipientId || !title || !message) {
      return Response.json({ error: 'recipient_user_id, title and message are required' }, { status: 400 });
    }

    const type = NOTIFICATION_TYPES.includes(body?.type) ? body.type : 'general';
    const priority = PRIORITIES.includes(body?.priority) ? body.priority : 'medium';
    const relatedId = typeof body?.related_id === 'string' ? body.related_id : null;
    const relatedType = typeof body?.related_type === 'string' ? body.related_type : null;
    const taskId = typeof body?.task_id === 'string' ? body.task_id.trim() : '';
    // An action_url is only ever an in-app path; never an absolute URL from the caller.
    const actionUrl = typeof body?.action_url === 'string' && body.action_url.startsWith('/') ? body.action_url : null;
    const wantsEmail = body?.send_email === true;

    const admin = base44.asServiceRole;

    const allowed = await callerMayNotify(admin, caller.id, recipientId, taskId);
    if (!allowed) {
      return Response.json({ error: 'Not allowed to notify this user' }, { status: 403 });
    }

    // The recipient's own preferences, read server-side and never returned.
    const prefRows = asRows(await admin.entities.NotificationPreferences.filter({ user_id: recipientId }));
    const prefs = prefRows[0] ?? null;
    const teamEnabled = prefs ? prefs.team_notifications !== false : true;
    const emailEnabled = prefs ? prefs.email_notifications === true : false;

    if (!teamEnabled) {
      return Response.json({ delivered: false, emailed: false });
    }

    await admin.entities.Notification.create({
      user_id: recipientId,
      type,
      title,
      message,
      related_id: relatedId,
      related_type: relatedType,
      priority,
      action_url: actionUrl,
      is_read: false,
      sent_at: new Date().toISOString(),
    });

    let emailed = false;
    if (wantsEmail && emailEnabled) {
      const recipients = asRows(await admin.entities.User.filter({ id: recipientId }));
      const address = recipients[0]?.email;
      if (address) {
        const origin = req.headers.get('X-Base44-App-Url') || '';
        const link = actionUrl && origin ? `${origin}${actionUrl}` : null;
        await admin.integrations.Core.SendEmail({
          to: address,
          subject: title,
          body: emailBody(title, message, link),
        });
        emailed = true;
      }
    }

    return Response.json({ delivered: true, emailed });
  } catch (error) {
    console.log('notifyTeammate failed:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}