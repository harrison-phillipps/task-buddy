/**
 * Gentle focus nudge — the whole decision, kept pure.
 *
 * The sweep function and its dry run both call decideFocusNudge, so a dry run
 * can never disagree with what a real run would do. Nothing here reads or writes
 * a database, and nothing here holds copy: sendFocusNudges owns the title and
 * body so the lock-screen wording lives in exactly one place.
 *
 * Timing is always the user's own wall clock. `focus_nudge_time` is "HH:mm" read
 * in the row's IANA timezone, and the send window is the 15 minutes that start
 * there — the sweep runs every 15 minutes, so a minute that is skipped or
 * repeated by daylight saving can never silently drop a day's nudge: the window
 * is matched on minutes-of-day, and either occurrence of a repeated hour lands
 * inside it.
 */

import { isQuietNow } from './quietHours.ts';
import { isValidLocalClock, localClockParts, localDateString, localToUtc } from './localTime.ts';

/** How long after the chosen time a nudge may still go out. */
export const NUDGE_WINDOW_MINUTES = 15;
/** A nudge counts as ignored when no session starts inside this window. */
export const IGNORE_WINDOW_MINUTES = 180;
/** Consecutive ignored nudges before the feature pauses itself. */
export const MAX_CONSECUTIVE_IGNORED = 3;

export const NUDGE_TITLE = 'A short focus session?';
export const NUDGE_BODY = "Ten minutes, whenever you're ready.";

export type NudgeSkipReason =
  | 'not_enabled'
  | 'paused'
  | 'no_player_id'
  | 'no_timezone'
  | 'no_nudge_time'
  | 'outside_window'
  | 'already_sent_today'
  | 'quiet_hours'
  | 'no_open_tasks'
  | 'session_started_today';

export interface NudgeInput {
  /** The NotificationPreferences row. */
  prefs: Record<string, any>;
  now: Date;
  /** The user's stored OneSignal id, if any. */
  playerId?: string | null;
  /** Tasks that are not completed, owned by this user. */
  openTaskCount: number;
  /** Latest session activity in ms (ActiveSession.last_updated_at or a FocusSession created time). */
  lastSessionActivityMs?: number | null;
}

export interface NudgeDecision {
  send: boolean;
  /** null means this user would be nudged. */
  reason: NudgeSkipReason | null;
  timezone: string | null;
  local_date: string | null;
  local_minutes: number | null;
}

/** "HH:mm" (or "H:mm") → minutes since local midnight, or null when unusable. */
function parseClock(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * True when `localMinutes` falls in [nudgeTime, nudgeTime + window).
 * The modulo is what makes a window spanning midnight work.
 */
export function isInsideNudgeWindow(
  localMinutes: number,
  nudgeTime: string,
  windowMinutes: number = NUDGE_WINDOW_MINUTES,
): boolean {
  const start = parseClock(nudgeTime);
  if (start === null) return false;
  return ((localMinutes - start + 1440) % 1440) < windowMinutes;
}

/** The row's own timezone, but only when it is a real IANA name. */
export function validTimezone(value: unknown): string | null {
  const tz = typeof value === 'string' ? value.trim() : '';
  if (!tz) return null;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
    return tz;
  } catch {
    return null;
  }
}

/** The instant local midnight began on `localDate` in `timeZone`. */
export function localMidnightMs(localDate: string, timeZone: string): number | null {
  const midnight = localToUtc(localDate, '00:00', timeZone);
  return midnight ? midnight.getTime() : null;
}

/** Would this user be nudged right now, and if not, why? */
export function decideFocusNudge(input: NudgeInput): NudgeDecision {
  const { prefs, now, playerId, openTaskCount, lastSessionActivityMs } = input;
  const timezone = validTimezone(prefs?.timezone);
  const localDate = timezone ? localDateString(now, timezone) : null;
  const clock = timezone ? localClockParts(now, timezone) : null;
  const localMinutes = clock ? clock.hour * 60 + clock.minute : null;

  const base = { send: false, timezone, local_date: localDate, local_minutes: localMinutes };
  const skip = (reason: NudgeSkipReason): NudgeDecision => ({ ...base, reason });

  if (prefs?.focus_nudge_enabled !== true) return skip('not_enabled');
  if (prefs?.focus_nudge_paused === true) return skip('paused');
  if (!playerId) return skip('no_player_id');
  // A row with no usable timezone is skipped, never guessed: a nudge at the
  // wrong hour is worse than no nudge.
  if (!timezone || !localDate || localMinutes === null) return skip('no_timezone');
  if (!isValidLocalClock(prefs?.focus_nudge_time)) return skip('no_nudge_time');
  if (!isInsideNudgeWindow(localMinutes, prefs.focus_nudge_time)) return skip('outside_window');
  if (prefs?.focus_nudge_last_sent_local_date === localDate) return skip('already_sent_today');
  if (isQuietNow(prefs, now)) return skip('quiet_hours');
  if (!(openTaskCount > 0)) return skip('no_open_tasks');

  const midnight = localMidnightMs(localDate, timezone);
  const activeToday =
    typeof lastSessionActivityMs === 'number' &&
    midnight !== null &&
    lastSessionActivityMs >= midnight;
  if (activeToday) return skip('session_started_today');

  return { ...base, send: true, reason: null };
}

/* ── Ignored nudges and back-off ───────────────────────────────────────────────
 *
 * A nudge is judged exactly once, on the first sweep after its 3-hour window
 * closes. `evaluated_at` records that the judgement happened, so a later sweep
 * can never count the same nudge twice and a paused user stays paused.
 */

export interface NudgeLogRow {
  id?: string;
  user_id?: string;
  sent_at?: string;
  local_date?: string;
  session_started?: boolean;
  started_within_minutes?: number | null;
  evaluated_at?: string | null;
}

const parseDbDate = (value: unknown): Date | null => {
  if (typeof value !== 'string' || !value) return null;
  const parsed = new Date(value.includes('Z') || value.includes('+') ? value : `${value}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** Log rows whose 3-hour window has closed and that have not been judged yet. */
export function pendingEvaluations(
  rows: NudgeLogRow[],
  now: Date,
  windowMinutes: number = IGNORE_WINDOW_MINUTES,
): NudgeLogRow[] {
  const cutoff = now.getTime() - windowMinutes * 60 * 1000;
  return (rows ?? []).filter((row) => {
    if (!row || row.session_started === true || row.evaluated_at) return false;
    const sentAt = parseDbDate(row.sent_at);
    return !!sentAt && sentAt.getTime() <= cutoff;
  });
}

export interface IgnoredOutcome {
  started: boolean;
  started_within_minutes: number | null;
}

/**
 * Did a session start inside this nudge's window?
 * `lastSessionActivityMs` is the user's latest session activity; only activity
 * after the nudge (and inside the window) counts as a start.
 */
export function evaluateIgnored(
  row: NudgeLogRow,
  lastSessionActivityMs: number | null | undefined,
  now: Date,
  windowMinutes: number = IGNORE_WINDOW_MINUTES,
): IgnoredOutcome {
  const sentAt = parseDbDate(row?.sent_at);
  if (!sentAt || typeof lastSessionActivityMs !== 'number') {
    return { started: false, started_within_minutes: null };
  }
  const deltaMs = lastSessionActivityMs - sentAt.getTime();
  if (deltaMs < 0 || deltaMs > windowMinutes * 60 * 1000) {
    return { started: false, started_within_minutes: null };
  }
  return { started: true, started_within_minutes: Math.round(deltaMs / 60000) };
}

/** A session start clears the streak; an ignored nudge extends it. */
export function nextIgnoredCount(
  currentCount: unknown,
  outcome: IgnoredOutcome,
  max: number = MAX_CONSECUTIVE_IGNORED,
): number {
  const current = typeof currentCount === 'number' && Number.isFinite(currentCount) ? currentCount : 0;
  if (outcome.started) return 0;
  return Math.min(Math.max(0, current) + 1, max);
}

/** Three in a row is the point where the feature switches itself off. */
export function shouldPause(count: unknown, max: number = MAX_CONSECUTIVE_IGNORED): boolean {
  return typeof count === 'number' && count >= max;
}