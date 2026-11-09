/**
 * Which tasks are due a reminder right now. Pure: no database, no clock, no
 * network. sendUpcomingTaskReminders feeds it rows and then does the writing,
 * which keeps the decision itself testable.
 *
 * Time source order — first one that exists wins:
 *   1. task.due_time            the owner's wall clock, "HH:mm"
 *   2. CalendarEvent.start_time a task-linked event's local start time
 *   3. nothing                  untimed: the 08:00 local fallback
 *
 * Every comparison happens in the task owner's own timezone (their
 * NotificationPreferences.timezone, Adelaide when absent), so a task due at
 * 14:00 means 14:00 where the owner lives, and "today" is their today — not the
 * server's.
 *
 * Quiet hours never drop a reminder: the in-app row is always written. They
 * only take the push and the email away. Untimed tasks never push either.
 */
import { localClockParts, localDateString, localToUtc, isValidLocalClock } from './localTime.ts';
import { isQuietNow, resolveTimezone } from './quietHours.ts';

export const DEFAULT_REMINDER_MINUTES = 60;
/** Half-width of the reminder window, in minutes. Must be >= the cron cadence. */
export const TOLERANCE_MIN = 5;
/** Local hour of the untimed fallback reminder. */
export const UNTIMED_HOUR = 8;
/** How long after UNTIMED_HOUR the fallback stays open to a 5-minute sweep. */
export const UNTIMED_WINDOW_MIN = 5;

export type ReminderTimeSource = 'task_due_time' | 'calendar_start_time' | 'untimed';

export interface ReminderCandidate {
  task: any;
  userId: string;
  timezone: string;
  timeSource: ReminderTimeSource;
  /** "HH:mm" in the owner's timezone, or null for an untimed task. */
  dueTime: string | null;
  /** UTC instant of the due time, or null for an untimed task. */
  dueAt: string | null;
  quiet: boolean;
  /** Only tasks with a real time may push, and never during quiet hours. */
  canPush: boolean;
}

export interface ReminderSelectionInput {
  tasks: any[];
  /** task_id → CalendarEvent.start_time ("HH:mm"). */
  calendarTimeByTaskId?: Record<string, string>;
  /** user_id → NotificationPreferences row. */
  prefsByUserId?: Record<string, any>;
  now?: Date;
  /** Keys from reminderKey() for reminders already written today. */
  alreadyNotified?: Set<string>;
}

export interface ReminderSelectionResult {
  selected: ReminderCandidate[];
  skipped: {
    completed: number;
    no_owner: number;
    disabled: number;
    bad_date: number;
    outside_window: number;
    already_notified: number;
  };
}

/** One reminder per task per owner per local day. */
export function reminderKey(userId: string, taskId: string, localDate: string): string {
  return `${userId}:${taskId}:${localDate}`;
}

export function selectDueReminders(input: ReminderSelectionInput): ReminderSelectionResult {
  const now = input.now ?? new Date();
  const calendarTimeByTaskId = input.calendarTimeByTaskId ?? {};
  const prefsByUserId = input.prefsByUserId ?? {};
  const alreadyNotified = input.alreadyNotified ?? new Set<string>();

  const selected: ReminderCandidate[] = [];
  const skipped: ReminderSelectionResult['skipped'] = {
    completed: 0,
    no_owner: 0,
    disabled: 0,
    bad_date: 0,
    outside_window: 0,
    already_notified: 0,
  };

  for (const task of input.tasks ?? []) {
    if (!task) continue;
    if (task.status === 'completed') {
      skipped.completed++;
      continue;
    }

    const userId = task.owner_user_id || task.created_by_id;
    if (!userId) {
      skipped.no_owner++;
      continue;
    }

    const pref = prefsByUserId[userId] ?? null;
    if (pref && pref.task_reminders === false) {
      skipped.disabled++;
      continue;
    }

    const timezone = resolveTimezone(pref);
    const localToday = localDateString(now, timezone);
    if (!localToday) {
      skipped.bad_date++;
      continue;
    }

    // Time source order: the task's own due_time, then its calendar event.
    let dueTime: string | null = isValidLocalClock(task.due_time) ? task.due_time : null;
    let timeSource: ReminderTimeSource = 'task_due_time';
    if (!dueTime) {
      const calendarTime = calendarTimeByTaskId[task.id];
      if (isValidLocalClock(calendarTime)) {
        dueTime = calendarTime;
        timeSource = 'calendar_start_time';
      }
    }

    let dueAt: Date | null = null;
    if (dueTime) {
      dueAt = localToUtc(task.due_date, dueTime, timezone);
      if (!dueAt) {
        skipped.bad_date++;
        continue;
      }
      const reminderMinutes = Number.isFinite(pref?.task_reminder_minutes)
        ? Number(pref.task_reminder_minutes)
        : DEFAULT_REMINDER_MINUTES;
      const leadMinutes = (dueAt.getTime() - now.getTime()) / 60000;
      if (leadMinutes < reminderMinutes - TOLERANCE_MIN || leadMinutes > reminderMinutes + TOLERANCE_MIN) {
        skipped.outside_window++;
        continue;
      }
    } else {
      timeSource = 'untimed';
      // Untimed: a single 08:00 local reminder, and only on the owner's own
      // due day, so a task due tomorrow waits for its own morning.
      const localNow = localClockParts(now, timezone);
      const isFallbackWindow =
        !!localNow &&
        task.due_date === localToday &&
        localNow.hour === UNTIMED_HOUR &&
        localNow.minute < UNTIMED_WINDOW_MIN;
      if (!isFallbackWindow) {
        skipped.outside_window++;
        continue;
      }
    }

    if (alreadyNotified.has(reminderKey(userId, task.id, localToday))) {
      skipped.already_notified++;
      continue;
    }

    const quiet = isQuietNow(pref, now);
    selected.push({
      task,
      userId,
      timezone,
      timeSource,
      dueTime,
      dueAt: dueAt ? dueAt.toISOString() : null,
      quiet,
      canPush: !!dueTime && !quiet,
    });
  }

  return { selected, skipped };
}