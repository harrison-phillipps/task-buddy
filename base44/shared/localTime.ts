/**
 * Wall-clock ("YYYY-MM-DD" + "HH:mm") → true UTC instant, and back again.
 *
 * The offset is always read from Intl for the instant in question, so daylight
 * saving is handled by construction: no offset table and no hand-written DST
 * rules. That also fixes what happens at a transition, which is otherwise
 * ambiguous or missing:
 *   - spring forward (the local hour does not exist): the result lands one gap
 *     later, so 02:30 becomes 03:30 local.
 *   - fall back (the local hour happens twice): the later, standard-time
 *     occurrence wins.
 *
 * Invalid input returns null rather than throwing, because these run inside
 * scheduled jobs where one malformed row must not fail the whole sweep.
 */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const CLOCK_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
/** Widest daylight-saving gap worth correcting for; a timezone shift, not a DST jump, is left as-is. */
const MAX_GAP_MS = 2 * 60 * 60 * 1000;

/** A real calendar day in "YYYY-MM-DD" form (2026-02-30 is rejected). */
export function isValidLocalDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === value;
}

/** 24-hour "HH:mm" exactly as the Task.due_time pattern requires. */
export function isValidLocalClock(value: unknown): value is string {
  return typeof value === 'string' && CLOCK_RE.test(value);
}

function formatterFor(timeZone: string): Intl.DateTimeFormat | null {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    // Not a usable IANA name.
    return null;
  }
}

/**
 * A wall clock in `timeZone` as a UTC instant, or null when any input is
 * unusable (bad date, bad clock, unknown timezone).
 */
export function localToUtc(dateStr: string, timeStr: string, timeZone: string): Date | null {
  if (!isValidLocalDate(dateStr) || !isValidLocalClock(timeStr) || !timeZone) return null;
  const formatter = formatterFor(timeZone);
  if (!formatter) return null;

  // Read the wall clock as if it were UTC, then ask Intl what that instant
  // looks like in the target zone. The gap between the two is the offset.
  const naive = new Date(`${dateStr}T${timeStr}:00Z`);
  if (Number.isNaN(naive.getTime())) return null;

  const wallClockAsIfUtc = (instant: Date): number => {
    const parts = Object.fromEntries(
      formatter.formatToParts(instant).map((part) => [part.type, part.value]),
    );
    return Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour) % 24, // some engines render midnight as "24"
      Number(parts.minute),
      Number(parts.second),
    );
  };

  const candidate = new Date(naive.getTime() + (naive.getTime() - wallClockAsIfUtc(naive)));

  // If the requested wall clock does not exist (the hour a spring-forward skips),
  // the candidate lands before the gap. Shift it by the gap so 02:30 becomes
  // 03:30 local — the first moment that could mean what was asked. Anything
  // else (a fall-back overlap resolves to the later occurrence) is left alone.
  const miss = naive.getTime() - wallClockAsIfUtc(candidate);
  if (miss !== 0 && Math.abs(miss) <= MAX_GAP_MS) {
    return new Date(candidate.getTime() + miss);
  }

  return candidate;
}

/** The calendar day `date` falls on in `timeZone`, as "YYYY-MM-DD". */
export function localDateString(date: Date, timeZone: string): string | null {
  const formatter = formatterFor(timeZone);
  if (!formatter || !(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** The wall-clock hour and minute in `timeZone`. */
export function localClockParts(date: Date, timeZone: string): { hour: number; minute: number } | null {
  const formatter = formatterFor(timeZone);
  if (!formatter || !(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return { hour: Number(parts.hour) % 24, minute: Number(parts.minute) };
}