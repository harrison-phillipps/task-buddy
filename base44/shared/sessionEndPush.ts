/**
 * The rules for the scheduled end-of-phase push: what input is acceptable, what
 * the message says, when it is due, and which session row may be touched.
 *
 * Pure functions only — the function handlers read and write, this file decides.
 * Keeping the decision here is what lets the boundaries, the ownership rule and
 * the copy be tested without sending anything.
 */

export const END_PUSH_KINDS = ['session', 'work_end', 'break_end'] as const;
export type EndPushKind = (typeof END_PUSH_KINDS)[number];

/** A push closer than this would race the request that schedules it. */
export const MIN_SECONDS_REMAINING = 5;

/** Four hours — far inside OneSignal's scheduling window, and longer than any focus interval. */
export const MAX_SECONDS_REMAINING = 14400;

export const END_PUSH_LIMIT = 30;
export const END_PUSH_WINDOW_MS = 60 * 60 * 1000;

/**
 * Fixed heading for every end-of-phase push. Deliberately generic: it carries no
 * task title, because a lock screen is not a private place.
 */
export const END_PUSH_TITLE = 'TaskBuddy';

const COPY: Record<EndPushKind, string> = {
  session: 'Your focus session is complete.',
  work_end: 'Focus interval complete. Time for a break.',
  break_end: "Break's over. Ready when you are.",
};

export function isEndPushKind(value: unknown): value is EndPushKind {
  return typeof value === 'string' && (END_PUSH_KINDS as readonly string[]).includes(value);
}

/**
 * The number of seconds a caller may ask for, or null when the request must be
 * rejected. Only a real finite number is accepted — a numeric string is not.
 */
export function parseSecondsRemaining(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value < MIN_SECONDS_REMAINING || value > MAX_SECONDS_REMAINING) return null;
  return value;
}

/** The message body for a kind. Never contains a task title. */
export function endPushBody(kind: EndPushKind): string {
  return COPY[kind];
}

/**
 * The `send_after` value: an ISO 8601 instant, computed from the server clock
 * plus the remaining seconds — never from a client-supplied timestamp.
 */
export function endPushSendAfter(serverNowMs: number, secondsRemaining: number): string {
  return new Date(serverNowMs + secondsRemaining * 1000).toISOString();
}

/**
 * The caller's own session row, or null. A row belonging to somebody else is
 * never returned, so an id can only ever come from the caller's own record.
 */
export function findOwnSessionRow(rows: unknown[], callerId: string): Record<string, any> | null {
  if (!callerId || !Array.isArray(rows)) return null;
  const row = rows.find((candidate) => {
    if (!candidate || typeof candidate !== 'object') return false;
    return (candidate as Record<string, any>).user_id === callerId;
  });
  return (row as Record<string, any>) ?? null;
}

export type CancelDecision =
  | { action: 'cancel'; sessionRowId: string; pushId: string }
  | { action: 'noop'; reason: 'no_session' | 'none_pending' };

/**
 * What cancelSessionEndPush should do. Anything without a pending push is a
 * no-op — and therefore a success, so calling it twice is harmless.
 */
export function cancelDecision(row: unknown, callerId: string): CancelDecision {
  if (!row || typeof row !== 'object') return { action: 'noop', reason: 'no_session' };
  const record = row as Record<string, any>;
  if (!callerId || record.user_id !== callerId) {
    return { action: 'noop', reason: 'no_session' };
  }
  const pushId = typeof record.end_push_id === 'string' ? record.end_push_id.trim() : '';
  if (!pushId) return { action: 'noop', reason: 'none_pending' };
  return { action: 'cancel', sessionRowId: String(record.id || ''), pushId };
}