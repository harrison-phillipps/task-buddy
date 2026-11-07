/**
 * Frontend copy of the quiet-hours rule in base44/shared/quietHours.ts.
 *
 * The client bundle cannot import from base44/ (server-side only), yet the optional
 * email step in createNotification runs in the browser and must apply exactly the
 * same rule as every backend sender. This is a straight mirror of that module —
 * change both together: tests/quietHours.test.mjs asserts the two agree across a
 * grid of windows and times, so a drift shows up as a failing test.
 *
 * Quiet hours never suppress an in-app notification row; callers write the row
 * first and use this only to decide whether an email goes out.
 *
 * Window source: the row's own quiet_hours_start/quiet_hours_end when both parse as
 * HH:mm, otherwise 21:00-07:30 local. A row the user has saved with quiet hours
 * switched off (quiet_hours_user_set) is an explicit opt-out: never quiet.
 */

export const DEFAULT_TIMEZONE = 'Australia/Adelaide';
export const DEFAULT_QUIET_START = '21:00';
export const DEFAULT_QUIET_END = '07:30';

/** The row's timezone, or the Adelaide fallback when absent or not a real IANA name. */
export function resolveTimezone(prefs) {
  const tz = typeof prefs?.timezone === 'string' ? prefs.timezone.trim() : '';
  if (!tz) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
    return tz;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/** "HH:mm" (or "H:mm") → minutes since local midnight, or null when unusable. */
function parseClock(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** The quiet window as local minutes-of-day, preferring the row's own times. */
export function quietWindow(prefs) {
  const start = parseClock(prefs?.quiet_hours_start);
  const end = parseClock(prefs?.quiet_hours_end);
  if (start === null || end === null || start === end) {
    return { start: parseClock(DEFAULT_QUIET_START), end: parseClock(DEFAULT_QUIET_END) };
  }
  return { start, end };
}

/** Local minutes-of-day for `now` in `timeZone`, resolved by Intl (DST-safe). */
export function localMinutesOfDay(now, timeZone) {
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

/** True when `now` falls inside the user's quiet window. */
export function isQuietNow(prefs, now = new Date()) {
  // Explicit opt-out: the user has been to the card and switched quiet hours off.
  if (prefs?.quiet_hours_user_set === true && prefs?.quiet_hours_enabled === false) return false;
  const timeZone = resolveTimezone(prefs);
  const { start, end } = quietWindow(prefs);
  const local = localMinutesOfDay(now, timeZone);
  if (start < end) return local >= start && local < end; // same-day window
  return local >= start || local < end; // crosses midnight
}