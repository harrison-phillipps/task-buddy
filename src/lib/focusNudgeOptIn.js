/**
 * The preference fields written when someone opts in.
 *
 * Kept free of imports (and of the @/ alias) so the payload shape can be tested
 * directly in node, without a bundler.
 */

/** "HH:mm" → minutes since midnight, or null. */
export function clockToMinutes(clock) {
  if (typeof clock !== "string") return null;
  const match = clock.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** The fields an existing preference row gets when someone opts in. */
export function buildNudgeOptInPayload({ userId, time, timezone }) {
  return {
    user_id: userId,
    focus_nudge_enabled: true,
    focus_nudge_time: time,
    focus_nudge_paused: false,
    focus_nudge_ignored_count: 0,
    ...(timezone ? { timezone } : {}),
  };
}

/**
 * The row created when the user has none.
 *
 * Every other notification flag is explicitly OFF. A missing row is not a
 * configured row, and opting in to one gentle nudge must never switch on email,
 * a digest, or the reminder types this person never chose.
 */
export function buildNewPreferencesRow({ userId, time, timezone }) {
  return {
    ...buildNudgeOptInPayload({ userId, time, timezone }),
    task_reminders: false,
    goal_reminders: false,
    habit_reminders: false,
    achievement_notifications: false,
    team_notifications: false,
    email_notifications: false,
    email_digest: "none",
  };
}