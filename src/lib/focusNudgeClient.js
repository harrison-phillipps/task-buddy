/**
 * Gentle focus nudge — client-side helpers for the opt-in.
 *
 * Three jobs: is this account in the beta, has the one-time prompt already been
 * answered or snoozed, and is the time the person picked inside their own quiet
 * hours. The rules that decide whether a nudge is sent live on the server
 * (base44/shared/focusNudge.ts); nothing here can send anything.
 */
import { quietWindow } from "@/lib/quietHours";
import { FOCUS_NUDGE_BETA_EMAILS } from "@/lib/featureFlags";

export {
  clockToMinutes,
  buildNudgeOptInPayload,
  buildNewPreferencesRow,
} from "@/lib/focusNudgeOptIn";

/** "Not now" hides the prompt for this long. */
export const NUDGE_PROMPT_SNOOZE_DAYS = 14;
const SNOOZE_KEY = "focusNudgePromptSnoozedUntil";

/** Is this email on the beta list? Case-insensitive. */
export function isFocusNudgeBeta(email) {
  if (typeof email !== "string") return false;
  const normalised = email.trim().toLowerCase();
  return FOCUS_NUDGE_BETA_EMAILS.some((entry) => entry.toLowerCase() === normalised);
}

/**
 * True when `clock` falls inside this user's quiet window — the same window,
 * and the same explicit opt-out, the server applies.
 */
export function isTimeInQuietHours(prefs, clock) {
  if (typeof clock !== "string") return false;
  const match = clock.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return false;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return false;
  const chosen = hours * 60 + minutes;

  if (prefs?.quiet_hours_user_set === true && prefs?.quiet_hours_enabled === false) return false;
  const { start, end } = quietWindow(prefs);
  if (start === end) return false;
  if (start < end) return chosen >= start && chosen < end;
  return chosen >= start || chosen < end;
}

/** The quiet window as readable "HH:mm" strings, for the picker's message. */
export function quietWindowLabel(prefs) {
  const toClock = (minutes) =>
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  const { start, end } = quietWindow(prefs);
  return `${toClock(start)} and ${toClock(end)}`;
}

export function isNudgePromptSnoozed(now = new Date()) {
  try {
    const raw = window.localStorage.getItem(SNOOZE_KEY);
    if (!raw) return false;
    const until = new Date(raw);
    return !Number.isNaN(until.getTime()) && until.getTime() > now.getTime();
  } catch {
    return false;
  }
}

export function snoozeNudgePrompt(days = NUDGE_PROMPT_SNOOZE_DAYS, now = new Date()) {
  try {
    const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    window.localStorage.setItem(SNOOZE_KEY, until.toISOString());
  } catch {
    // A browser with storage blocked simply sees the prompt again later.
  }
}

/**
 * Show the one-time prompt? Only for a beta account, only after they have
 * actually finished something, and only if they have never chosen a time.
 * A row that already holds a time means they answered once — switching the
 * nudge off later must never bring the prompt back.
 */
export function shouldOfferNudgePrompt({
  user,
  prefs,
  hasCompletedTask,
  hasCompletedSession,
  now = new Date(),
}) {
  if (!isFocusNudgeBeta(user?.email)) return false;
  if (!hasCompletedTask && !hasCompletedSession) return false;
  if (prefs?.focus_nudge_enabled === true) return false;
  if (prefs?.focus_nudge_time) return false;
  return !isNudgePromptSnoozed(now);
}

/** The browser's own IANA timezone, or null when it cannot be read. */
export function browserTimezone() {
  try {
    return Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone || null;
  } catch {
    return null;
  }
}