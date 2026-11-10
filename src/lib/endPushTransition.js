/**
 * When to (re)schedule or cancel the server-scheduled end-of-phase push.
 *
 * The page effect that drives this runs whenever any of the timer's own state
 * changes — more often than the clock actually starts, resumes or stops. So the
 * next action is keyed on the exact thing being scheduled (the deadline plus the
 * phase kind), not on "the effect ran". A re-render, a background/foreground
 * round trip, or a tick that changes nothing about the schedule therefore
 * produces no call at all, and stopping is keyed on there being something armed,
 * so a stop is announced exactly once.
 *
 * Pure and import-free on purpose: the same file is the unit under test.
 */

/** Matches MIN_SECONDS_REMAINING in base44/shared/sessionEndPush.ts (asserted in tests). */
export const MIN_SECONDS = 5;

/**
 * @param {string|null} prevKey  the key this effect last armed, or null
 * @param {{sessionStarted:boolean,isActive:boolean,targetEndMs:number|null,
 *          isBreakTime:boolean,focusTechnique:string|null,remainingSec:number}} state
 * @returns {{action:'none'}|{action:'schedule',key:string,kind:string,remainingSec:number}
 *          |{action:'cancel',key:null}}
 */
export function endPushActionFor(prevKey, state) {
  const running = state.sessionStarted && state.isActive && state.targetEndMs != null;

  if (!running) {
    // Nothing is running: cancel only what this effect itself armed last time.
    return prevKey == null ? { action: "none" } : { action: "cancel", key: null };
  }

  // Too close to the end to be worth a push. Leave anything already armed alone.
  if (!(state.remainingSec >= MIN_SECONDS)) return { action: "none" };

  const kind = state.isBreakTime
    ? "break_end"
    : state.focusTechnique === "pomodoro"
      ? "work_end"
      : "session";

  const key = `${state.targetEndMs}:${kind}`;
  if (key === prevKey) return { action: "none" };

  return { action: "schedule", key, kind, remainingSec: Math.round(state.remainingSec) };
}