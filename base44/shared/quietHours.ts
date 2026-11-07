/**
 * Quiet-hours evaluation for push and email suppression.
 *
 * Quiet hours NEVER suppress an in-app notification row: every caller writes the
 * row first and uses this only to decide whether a push or an email goes out.
 *
 * The window is read in the user's own IANA timezone from base44/entities/
 * NotificationPreferences. Comparison is on local minutes-of-day, so:
 *   - a window that crosses midnight works without a special case;
 *   - daylight saving needs no offset arithmetic: Intl resolves the offset for
 *     the given instant, so on a spring-forward day the skipped hour simply never
 *     occurs, and on a fall-back day both occurrences of the repeated hour fall
 *     inside the window when the wall clock says they should.
 *
 * Window source: the row's own quiet_hours_start/quiet_hours_end when both parse
 * as HH:mm, otherwise 21:00-07:30 local.
 *
 * The default window only covers rows the user has never touched. Once they have
 * saved the Quiet Hours card (quiet_hours_user_set) and left it switched off,
 * that is an explicit opt-out and no window applies at all.
 */

export const DEFAULT_TIMEZONE = 'Australia/Adelaide';
export const DEFAULT_QUIET_START = '21:00';
export const DEFAULT_QUIET_END = '07:30';

/** The row's timezone, or the Adelaide fallback when absent or not a real IANA name. */
export function resolveTimezone(prefs: any): string {
  const tz = typeof prefs?.timezone === 'string' ? prefs.timezone.trim() : '';
  if (!tz) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
    return tz;
  } catch {
    // Unknown name: fall back rather than throw inside a scheduled run.
    return DEFAULT_TIMEZONE;
  }
}

/** "HH:mm" (or "H:mm") → minutes since local midnight, or null when unusable. */
function parseClock(value: any): number | null {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** The quiet window as local minutes-of-day, preferring the row's own times. */
export function quietWindow(prefs: any): { start: number; end: number } {
  const start = parseClock(prefs?.quiet_hours_start);
  const end = parseClock(prefs?.quiet_hours_end);
  if (start === null || end === null || start === end) {
    return { start: parseClock(DEFAULT_QUIET_START) as number, end: parseClock(DEFAULT_QUIET_END) as number };
  }
  return { start, end };
}

/** Local minutes-of-day for `now` in `timeZone`, resolved by Intl (DST-safe). */
export function localMinutesOfDay(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0') % 24; // some engines render midnight as "24"
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return hour * 60 + minute;
}

/**
 * True when `now` falls inside the user's quiet window.
 * `prefs` may be null/partial: a missing row means the default window applies.
 */
export function isQuietNow(prefs: any, now: Date = new Date()): boolean {
  // Explicit opt-out: the user has been to the card and switched quiet hours off.
  if (prefs?.quiet_hours_user_set === true && prefs?.quiet_hours_enabled === false) return false;
  const timeZone = resolveTimezone(prefs);
  const { start, end } = quietWindow(prefs);
  const local = localMinutesOfDay(now, timeZone);
  if (start < end) return local >= start && local < end; // same-day window
  return local >= start || local < end; // crosses midnight
}