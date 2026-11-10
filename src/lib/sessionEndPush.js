import { base44 } from "@/api/base44Client";
import { isNativeShell } from "@/lib/nativelyNative";
import { getNotifPrefs } from "@/components/focus/FocusNotificationSettings";

/**
 * Server-scheduled end-of-phase push. Both calls are fire-and-forget on purpose:
 * the timer is anchored to the clock and must never wait on the network, so a
 * slow or failing call only ever produces a console warning.
 */

/** Native push is on, and the user still wants session-end notifications. */
export function endPushReady(currentUser) {
  if (!isNativeShell()) return false;
  if (!currentUser?.onesignal_player_id) return false;
  return getNotifPrefs().sessionEnd !== false;
}

/**
 * Schedules the push for the phase that just started or resumed.
 * `kind`: "session" | "work_end" | "break_end".
 */
export function scheduleEndPush(currentUser, kind, remainingSec) {
  if (!endPushReady(currentUser)) return;
  const seconds = Math.round(Number(remainingSec));
  if (!Number.isFinite(seconds) || seconds < 5) return;

  base44.functions
    .invoke("scheduleSessionEndPush", { seconds_remaining: seconds, kind })
    .catch((err) => console.warn("End-of-session push not scheduled:", err?.message || err));
}

/** Cancels whatever is pending. Safe when nothing is — the server treats it as success. */
export function cancelEndPush() {
  if (!isNativeShell()) return;
  base44.functions
    .invoke("cancelSessionEndPush", {})
    .catch((err) => console.warn("End-of-session push not cancelled:", err?.message || err));
}