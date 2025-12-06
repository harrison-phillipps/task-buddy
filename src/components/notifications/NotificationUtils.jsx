import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

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
        
        if (preferences.length > 0 && preferences[0].email_notifications) {
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

export async function scheduleTaskReminder(task, userId) {
  if (!task.due_date) return;

  const preferences = await base44.entities.NotificationPreferences.filter({ user_id: userId });
  if (preferences.length === 0 || !preferences[0].task_reminders) return;

  const reminderMinutes = preferences[0].task_reminder_minutes || 60;
  const dueDate = new Date(task.due_date);
  const reminderTime = new Date(dueDate.getTime() - reminderMinutes * 60000);

  if (reminderTime > new Date()) {
    await createNotification({
      userId,
      type: 'task_due',
      title: `Task Due Soon: ${task.title}`,
      message: `Your task "${task.title}" is due in ${reminderMinutes} minutes.`,
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
      title: `Goal Deadline Approaching: ${goal.title}`,
      message: `Your goal "${goal.title}" is due in ${reminderDays} days.`,
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
    title: `Time for your habit: ${habit.title}`,
    message: `Don't forget to complete "${habit.title}" today!`,
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
    title: `🎉 Achievement Unlocked: ${achievement.title}`,
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