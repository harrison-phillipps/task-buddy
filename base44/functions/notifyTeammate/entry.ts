import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { asRows } from '../../shared/entityResults.ts';

/**
 * Delivers a notification to ANOTHER app user on the caller's behalf.
 *
 * The browser used to create the Notification row for any user_id it liked,
 * read that user's NotificationPreferences (an open table), and — when sendEmail
 * was set — hand the recipient's address to integrations.Core.SendEmail.
 *
 * Here the caller is authorised, the recipient's preferences are applied without
 * ever leaving the server, and the response says only whether something was
 * delivered and emailed — never how the recipient is configured.
 *
 * The EMAIL is server-built: one fixed sentence plus the task title read from
 * the task itself. No caller-supplied message, link or HTML reaches the inbox,
 * so the page cannot use this function to post arbitrary content to someone
 * else's mail. The in-app notification keeps the caller's text.
 */

const NOTIFICATION_TYPES = ['task_due', 'goal_deadline', 'habit_reminder', 'achievement', 'team_mention', 'general'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

/** At most 10 emails per sender per recipient in any rolling hour. */
const EMAIL_HOURLY_LIMIT = 10;
const TITLE_MAX = 200;

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);

const memberIdsOf = (team) => {
  const primary = Array.isArray(team?.member_user_ids) ? team.member_user_ids : [];
  const fallback = Array.isArray(team?.member_ids) ? team.member_ids : [];
  return primary.length ? primary : fallback;
};

const loadTask = async (admin, taskId) =>
  taskId
    ? admin.entities.Task.get(taskId).catch((e) => (e.status === 404 ? null : Promise.reject(e)))
    : null;

const callerOwnsTask = (task, callerId) => {
  if (!task) return false;
  const assignees = (Array.isArray(task.assigned_to_users) ? task.assigned_to_users : [])
    .map((entry) => entry?.user_id)
    .filter(Boolean);
  const owners = [task.created_by_id, task.owner_user_id, task.assigned_to, ...assignees];
  return owners.includes(callerId);
};

/** Self, the task's creator/assignee, or someone who shares a team with the recipient. */
async function callerMayNotify(admin, callerId, recipientId, task) {
  if (callerId === recipientId) return true;
  if (callerOwnsTask(task, callerId)) return true;

  const myTeams = [
    ...asRows(await admin.entities.Team.filter({ member_user_ids: callerId })),
    ...asRows(await admin.entities.Team.filter({ member_ids: callerId })),
  ];
  return myTeams.some((team) => memberIdsOf(team).includes(recipientId));
}

/** The whole email, assembled here from server data only. */
function taskEmail(taskTitle) {
  const safe = escapeHtml(String(taskTitle).slice(0, TITLE_MAX));
  return {
    subject: 'New task activity in TaskBuddy',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p style="font-size: 16px; color: #4B5563;">You have a new task activity notification in TaskBuddy.</p>
        <p style="font-size: 16px; color: #0A0A0A; font-weight: bold;">Task: ${safe}</p>
        <p style="margin-top: 32px; font-size: 12px; color: #9CA3AF;">
          This is an automated notification from TaskBuddy.
          You can manage your notification preferences in your settings.
        </p>
      </div>
    `,
  };
}

async function emailsSentThisHour(admin, senderId, recipientId) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const total = await admin.entities.NotificationEmailLog.count({
    sender_user_id: senderId,
    recipient_user_id: recipientId,
    sent_at: { $gte: since },
  });
  return typeof total === 'number' ? total : 0;
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
    // An action_url is only ever an in-app path, and it is used for the in-app
    // notification only — the email carries no caller-supplied link.
    const actionUrl = typeof body?.action_url === 'string' && body.action_url.startsWith('/') ? body.action_url : null;
    const wantsEmail = body?.send_email === true;

    const admin = base44.asServiceRole;

    const task = await loadTask(admin, taskId);

    const allowed = await callerMayNotify(admin, caller.id, recipientId, task);
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

    // The email needs a server-read task title; without one nothing is mailed.
    const taskTitle = typeof task?.title === 'string' ? task.title.trim() : '';
    const intendsEmail = wantsEmail && emailEnabled && taskTitle.length > 0;

    // At the hourly cap the in-app notification still goes out — only the email
    // is dropped, so the recipient is never left uninformed.
    const limited =
      intendsEmail && (await emailsSentThisHour(admin, caller.id, recipientId)) >= EMAIL_HOURLY_LIMIT;

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
    if (intendsEmail && !limited) {
      const recipients = asRows(await admin.entities.User.filter({ id: recipientId }));
      const address = recipients[0]?.email;
      if (address) {
        const mail = taskEmail(taskTitle);
        await admin.integrations.Core.SendEmail({ to: address, subject: mail.subject, body: mail.body });
        await admin.entities.NotificationEmailLog.create({
          sender_user_id: caller.id,
          recipient_user_id: recipientId,
          sent_at: new Date().toISOString(),
        });
        emailed = true;
      }
    }

    return Response.json(limited ? { delivered: true, emailed, limited: true } : { delivered: true, emailed });
  } catch (error) {
    console.log('notifyTeammate failed:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}