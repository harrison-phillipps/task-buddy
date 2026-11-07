import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { isQuietNow } from "@/lib/quietHours";

export async function createNotification({ 
  userId, 
  type, 
  title, 
  message, 
  relatedId = null, 
  relatedType = null,
  priority = 'medium',
  actionUrl = null,
  sendEmail = false
}) {
  // A notification addressed to someone else is delivered by the server, which
  // checks the caller may notify that person and applies their preferences
  // without exposing them to this page.
  //
  // Fail closed: without a confirmed signed-in user we cannot tell whether `userId`
  // is the caller or someone else, so nothing is written and no email is sent —
  // otherwise a failed auth check would fall through to a direct write for another
  // user.
  let me = null;
  try {
    me = await base44.auth.me();
  } catch (error) {
    console.error("createNotification: auth.me() failed, not creating the notification:", error);
  }
  if (!me?.id) {
    console.error("createNotification: no signed-in user, not creating the notification for", userId);
    return null;
  }
  if (me.id !== userId) {
    const res = await base44.functions.invoke('notifyTeammate', {
      recipient_user_id: userId,
      type,
      title,
      message,
      related_id: relatedId,
      related_type: relatedType,
      priority,
      action_url: actionUrl,
      send_email: sendEmail,
      task_id: relatedType === 'task' ? relatedId : null,
    });
    return res.data;
  }

  try {
    // Create in-app notification
    const notification = await base44.entities.Notification.create({
      user_id: userId,
      type,
      title,
      message,
      related_id: relatedId,
      related_type: relatedType,
      priority,
      action_url: actionUrl,
      is_read: false,
      sent_at: new Date().toISOString()
    });

    // Send email if requested and user has email notifications enabled
    if (sendEmail) {
      try {
        const preferences = await base44.entities.NotificationPreferences.filter({ 
          user_id: userId 
        });
        
        // Quiet hours silence the email only — the in-app row above is already written.
        if (
          preferences.length > 0 &&
          preferences[0].email_notifications &&
          !isQuietNow(preferences[0], new Date())
        ) {
          const user = await base44.entities.User.filter({ id: userId });
          if (user.length > 0 && user[0].email) {
            await base44.integrations.Core.SendEmail({
              to: user[0].email,
              subject: title,
              body: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #8B5CF6;">${title}</h2>
                  <p style="font-size: 16px; color: #4B5563;">${message}</p>
                  ${actionUrl ? `
                    <a href="${window.location.origin}${actionUrl}" 
                       style="display: inline-block; padding: 12px 24px; background: linear-gradient(to right, #8B5CF6, #14B8A6); color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">
                      View in App
                    </a>
                  ` : ''}
                  <p style="margin-top: 32px; font-size: 12px; color: #9CA3AF;">
                    This is an automated notification from TaskBuddy. 
                    You can manage your notification preferences in your settings.
                  </p>
                </div>
              `
            });
          }
        }
      } catch (emailError) {
        console.error("Error sending email notification:", emailError);
      }
    }

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

/**
 * Per-assignee notification for an assignment write that already succeeded.
 * Fire-and-forget: never awaited, errors are logged and never surface to the UI.
 * `team_mention` is the Notification type the existing assign path uses
 * (`task_assigned` is not in the entity enum and would be stored as `general`).
 */
export function notifyAssignees({ task, assignedUsers = [], currentUser }) {
  assignedUsers
    .filter((member) => member?.user_id && member.user_id !== currentUser?.id)
    .forEach((member) => {
      createNotification({
        userId: member.user_id,
        type: 'team_mention',
        title: "You've been assigned a task",
        message: `${currentUser?.display_name || currentUser?.full_name || 'Someone'} assigned you: "${task.title}"`,
        relatedId: task.id,
        relatedType: 'task',
        priority: task.priority === 'urgent' ? 'critical' : 'high',
        actionUrl: createPageUrl('Tasks'),
        sendEmail: true,
      }).catch((err) => console.error('Assignment notification failed:', err));
    });
}

export async function scheduleTaskReminder(task, userId) {
  if (!task.due_date) return;

  const preferences = await base44.entities.NotificationPreferences.filter({ user_id: userId });
  if (preferences.length === 0 || !preferences[0].task_reminders) return;

  const reminderMinutes = preferences[0].task_reminder_minutes || 60;
  const dueDate = new Date(task.due_date);
  const reminderTime = new Date(dueDate.getTime() - reminderMinutes * 60000);
  const leadLabel = reminderMinutes === 1440
    ? 'about a day'
    : reminderMinutes % 60 === 0
      ? `about ${reminderMinutes / 60} hour${reminderMinutes === 60 ? '' : 's'}`
      : `about ${reminderMinutes} minutes`;

  if (reminderTime > new Date()) {
    await createNotification({
      userId,
      type: 'task_due',
      title: 'Task reminder',
      message: `"${task.title}" is due in ${leadLabel}.`,
      relatedId: task.id,
      relatedType: 'task',
      priority: task.priority === 'urgent' ? 'critical' : 'high',
      actionUrl: createPageUrl("Tasks"),
      sendEmail: task.priority === 'urgent'
    });
  }
}

export async function scheduleGoalReminder(goal, userId) {
  if (!goal.target_date) return;

  const preferences = await base44.entities.NotificationPreferences.filter({ user_id: userId });
  if (preferences.length === 0 || !preferences[0].goal_reminders) return;

  const reminderDays = preferences[0].goal_reminder_days || 7;
  const targetDate = new Date(goal.target_date);
  const reminderDate = new Date(targetDate.getTime() - reminderDays * 24 * 60 * 60 * 1000);

  if (reminderDate > new Date()) {
    await createNotification({
      userId,
      type: 'goal_deadline',
      title: `Goal check-in: ${goal.title}`,
      message: `"${goal.title}" has a target date in ${reminderDays} days.`,
      relatedId: goal.id,
      relatedType: 'goal',
      priority: goal.priority === 'critical' ? 'critical' : 'high',
      actionUrl: createPageUrl("Goals"),
      sendEmail: true
    });
  }
}

export async function sendHabitReminder(habit, userId) {
  const preferences = await base44.entities.NotificationPreferences.filter({ user_id: userId });
  if (preferences.length === 0 || !preferences[0].habit_reminders) return;

  await createNotification({
    userId,
    type: 'habit_reminder',
    title: `${habit.title} — whenever you're ready`,
    message: `A gentle nudge for "${habit.title}".`,
    relatedId: habit.id,
    relatedType: 'habit',
    priority: 'medium',
    actionUrl: createPageUrl("Habits"),
    sendEmail: false
  });
}

export async function sendAchievementNotification(achievement, userId) {
  const preferences = await base44.entities.NotificationPreferences.filter({ user_id: userId });
  if (preferences.length === 0 || !preferences[0].achievement_notifications) return;

  await createNotification({
    userId,
    type: 'achievement',
    title: `Achievement unlocked: ${achievement.title}`,
    message: `Congratulations! You've earned "${achievement.title}"!`,
    relatedId: achievement.id,
    relatedType: 'achievement',
    priority: 'medium',
    actionUrl: createPageUrl("Achievements"),
    sendEmail: false
  });
}

export async function sendTeamNotification(teamId, title, message, userId, actionUrl = null) {
  const preferences = await base44.entities.NotificationPreferences.filter({ user_id: userId });
  if (preferences.length === 0 || !preferences[0].team_notifications) return;

  await createNotification({
    userId,
    type: 'team_mention',
    title,
    message,
    relatedId: teamId,
    relatedType: 'team',
    priority: 'medium',
    actionUrl: actionUrl || createPageUrl("Teams"),
    sendEmail: false
  });
}