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
 *
 * decideTaskReminder is the single per-task verdict. selectDueReminders (the
 * live sweep) and the dry-run report both read it, so they cannot disagree.
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

/** The first rule that skipped a task. `null` means it would be notified. */
export type ReminderSkipReason =
  | 'completed'
  | 'no_owner'
  | 'disabled'
  | 'bad_date'
  | 'outside_window'
  | 'already_notified';

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

export interface ReminderDecision {
  userId: string | null;
  timezone: string;
  timeSource: ReminderTimeSource;
  dueTime: string | null;
  dueAt: string | null;
  /** Minutes from `now` until the due instant. Negative once it has passed. */
  diffMinutes: number | null;
  quiet: boolean;
  canPush: boolean;
  reason: ReminderSkipReason | null;
}

export interface ReminderContext {
  /** task_id → CalendarEvent.start_time ("HH:mm"). */
  calendarTimeByTaskId?: Record<string, string>;
  /** user_id → NotificationPreferences row. */
  prefsByUserId?: Record<string, any>;
  now?: Date;
  /** Keys from reminderKey() for reminders already written today. */
  alreadyNotified?: Set<string>;
}

export interface ReminderSelectionInput extends ReminderContext {
  tasks: any[];
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

/**
 * The verdict for one task at one instant. Pure, so a dry run can ask the same
 * question the live sweep asks without any of its consequences.
 */
export function decideTaskReminder(task: any, ctx: ReminderContext = {}): ReminderDecision {
  const now = ctx.now ?? new Date();
  const calendarTimeByTaskId = ctx.calendarTimeByTaskId ?? {};
  const prefsByUserId = ctx.prefsByUserId ?? {};
  const alreadyNotified = ctx.alreadyNotified ?? new Set<string>();

  const userId: string | null = task?.owner_user_id || task?.created_by_id || null;
  const pref = userId ? prefsByUserId[userId] ?? null : null;
  const timezone = resolveTimezone(pref);

  const base: ReminderDecision = {
    userId,
    timezone,
    timeSource: 'task_due_time',
    dueTime: null,
    dueAt: null,
    diffMinutes: null,
    quiet: false,
    canPush: false,
    reason: null,
  };

  if (!task) return { ...base, reason: 'no_owner' };
  if (task.status === 'completed') return { ...base, reason: 'completed' };
  if (!userId) return { ...base, reason: 'no_owner' };
  if (pref && pref.task_reminders === false) return { ...base, reason: 'disabled' };

  const localToday = localDateString(now, timezone);
  if (!localToday) return { ...base, reason: 'bad_date' };

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
    if (!dueAt) return { ...base, dueTime, timeSource, reason: 'bad_date' };
  } else {
    timeSource = 'untimed';
  }

  const dueAtIso = dueAt ? dueAt.toISOString() : null;
  const diffMinutes = dueAt ? (dueAt.getTime() - now.getTime()) / 60000 : null;
  const timed = { ...base, timeSource, dueTime, dueAt: dueAtIso, diffMinutes };

  if (dueAt && diffMinutes !== null) {
    const reminderMinutes = Number.isFinite(pref?.task_reminder_minutes)
      ? Number(pref.task_reminder_minutes)
      : DEFAULT_REMINDER_MINUTES;
    if (diffMinutes < reminderMinutes - TOLERANCE_MIN || diffMinutes > reminderMinutes + TOLERANCE_MIN) {
      return { ...timed, reason: 'outside_window' };
    }
  } else {
    // Untimed: a single 08:00 local reminder, and only on the owner's own due
    // day, so a task due tomorrow waits for its own morning.
    const localNow = localClockParts(now, timezone);
    const isFallbackWindow =
      !!localNow &&
      task.due_date === localToday &&
      localNow.hour === UNTIMED_HOUR &&
      localNow.minute < UNTIMED_WINDOW_MIN;
    if (!isFallbackWindow) return { ...timed, reason: 'outside_window' };
  }

  if (alreadyNotified.has(reminderKey(userId, task.id, localToday))) {
    return { ...timed, reason: 'already_notified' };
  }

  const quiet = isQuietNow(pref, now);
  return { ...timed, quiet, canPush: !!dueTime && !quiet, reason: null };
}

export function selectDueReminders(input: ReminderSelectionInput): ReminderSelectionResult {
  const ctx: ReminderContext = {
    calendarTimeByTaskId: input.calendarTimeByTaskId,
    prefsByUserId: input.prefsByUserId,
    now: input.now,
    alreadyNotified: input.alreadyNotified,
  };

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
    const decision = decideTaskReminder(task, ctx);
    if (decision.reason) {
      skipped[decision.reason]++;
      continue;
    }
    selected.push({
      task,
      userId: decision.userId as string,
      timezone: decision.timezone,
      timeSource: decision.timeSource,
      dueTime: decision.dueTime,
      dueAt: decision.dueAt,
      quiet: decision.quiet,
      canPush: decision.canPush,
    });
  }

  return { selected, skipped };
}