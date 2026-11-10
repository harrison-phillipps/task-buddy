/**
 * Unit tests for the end-of-phase push transition rule: exactly one call per
 * real transition, and none for a re-render, a foreground round trip or a tick.
 *
 * Run: node --test tests/*.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { endPushActionFor, MIN_SECONDS } from "../src/lib/endPushTransition.js";
import { MIN_SECONDS_REMAINING } from "../base44/shared/sessionEndPush.ts";

const STOPPED = {
  sessionStarted: false,
  isActive: false,
  targetEndMs: null,
  isBreakTime: false,
  focusTechnique: "standard",
  remainingSec: 0,
};

const state = (overrides = {}) => ({ ...STOPPED, sessionStarted: true, ...overrides });

/** Feeds a sequence of states through the rule and records the calls it makes. */
function calls(states) {
  let key = null;
  const made = [];
  for (const s of states) {
    const next = endPushActionFor(key, s);
    if (next.action === "none") continue;
    key = next.key;
    made.push(next.action === "schedule" ? `schedule:${next.kind}` : "cancel");
  }
  return made;
}

test("the client minimum agrees with the server's bound", () => {
  assert.equal(MIN_SECONDS, MIN_SECONDS_REMAINING);
});

test("(a) a 25-minute uninterrupted session: one schedule, no cancel", () => {
  const running = state({ isActive: true, targetEndMs: 1000, remainingSec: 1500 });
  // Start, then 1,500 ticks that change nothing but the clock reading.
  const made = calls([STOPPED, running, ...Array(1500).fill(running)]);
  assert.deepEqual(made, ["schedule:session"]);
});

test("(b) one pause and resume: schedule, cancel, schedule", () => {
  const running = state({ isActive: true, targetEndMs: 1000, remainingSec: 1500 });
  const paused = state({ isActive: false, targetEndMs: 1000, remainingSec: 1500 });
  const resumed = state({ isActive: true, targetEndMs: 2000, remainingSec: 1400 });
  const made = calls([STOPPED, running, paused, paused, resumed]);
  assert.deepEqual(made, ["schedule:session", "cancel", "schedule:session"]);
});

test("(c) a pomodoro work, break, work cycle: one call per real transition", () => {
  const work = state({ isActive: true, targetEndMs: 1000, remainingSec: 1500, focusTechnique: "pomodoro" });
  // Work ends: the tick stops the clock and the break is set up in the same render.
  const workEnded = state({ isActive: false, targetEndMs: 2000, remainingSec: 300, isBreakTime: true, focusTechnique: "pomodoro" });
  // The break opens paused, so starting it is a real transition.
  const breakRunning = state({ isActive: true, targetEndMs: 2000, remainingSec: 300, isBreakTime: true, focusTechnique: "pomodoro" });
  // Break ends into a paused next work phase.
  const breakEnded = state({ isActive: false, targetEndMs: 3000, remainingSec: 1500, isBreakTime: false, focusTechnique: "pomodoro" });
  const workAgain = state({ isActive: true, targetEndMs: 3000, remainingSec: 1500, focusTechnique: "pomodoro" });

  const made = calls([STOPPED, work, workEnded, breakRunning, breakEnded, workAgain]);
  assert.deepEqual(made, [
    "schedule:work_end",
    "cancel",
    "schedule:break_end",
    "cancel",
    "schedule:work_end",
  ]);
});

test("(d) backgrounding and foregrounding 5 times makes no call", () => {
  const running = state({ isActive: true, targetEndMs: 1000, remainingSec: 1500 });
  // Each foreground re-runs the effect with the same timer state.
  const made = calls([running, ...Array(5).fill(running)]);
  assert.deepEqual(made, ["schedule:session"]);
});

test("(e) a tick-by-tick countdown makes no call after the first", () => {
  const ticks = Array.from({ length: 600 }, (_, i) =>
    state({ isActive: true, targetEndMs: 1000, remainingSec: 1500 - i }),
  );
  assert.deepEqual(calls(ticks), ["schedule:session"]);
});

test("stopping cancels once, and later stops stay silent", () => {
  const running = state({ isActive: true, targetEndMs: 1000, remainingSec: 1500 });
  const paused = state({ isActive: false, targetEndMs: 1000, remainingSec: 1500 });
  assert.deepEqual(calls([running, paused, paused, paused]), ["schedule:session", "cancel"]);
});

test("nothing armed and nothing running is a no-op, never a stray cancel", () => {
  assert.deepEqual(calls([STOPPED, STOPPED]), []);
});

test("pushing the deadline out re-schedules once, with the same kind", () => {
  const running = state({ isActive: true, targetEndMs: 1000, remainingSec: 1500 });
  const moreTime = state({ isActive: true, targetEndMs: 5000, remainingSec: 1500 });
  assert.deepEqual(calls([running, moreTime, moreTime]), [
    "schedule:session",
    "schedule:session",
  ]);
});

test("the phase kind follows the timer: standard, pomodoro work, break", () => {
  assert.equal(
    endPushActionFor(null, state({ isActive: true, targetEndMs: 1, remainingSec: 600 })).kind,
    "session",
  );
  assert.equal(
    endPushActionFor(
      null,
      state({ isActive: true, targetEndMs: 1, remainingSec: 600, focusTechnique: "pomodoro" }),
    ).kind,
    "work_end",
  );
  assert.equal(
    endPushActionFor(
      null,
      state({ isActive: true, targetEndMs: 1, remainingSec: 60, isBreakTime: true, focusTechnique: "pomodoro" }),
    ).kind,
    "break_end",
  );
});

test("a deadline too close to the end schedules nothing and arms nothing", () => {
  const nearlyDone = state({ isActive: true, targetEndMs: 1000, remainingSec: MIN_SECONDS - 1 });
  assert.equal(endPushActionFor(null, nearlyDone).action, "none");
  // Still armed from before: the pending push is left alone, not cancelled.
  assert.equal(endPushActionFor("1000:session", nearlyDone).action, "none");
  // And the key survives, so a later real transition still schedules.
  const next = endPushActionFor("1000:session", state({ isActive: true, targetEndMs: 2000, remainingSec: 900 }));
  assert.equal(next.action, "schedule");
});

test("a zero or negative remainder from an elapsed deadline is never scheduled", () => {
  for (const remainingSec of [0, -1, -600]) {
    assert.equal(
      endPushActionFor(null, state({ isActive: true, targetEndMs: 1000, remainingSec })).action,
      "none",
    );
  }
});

test("the schedule carries whole seconds", () => {
  const next = endPushActionFor(null, state({ isActive: true, targetEndMs: 1000, remainingSec: 1499.6 }));
  assert.equal(next.action, "schedule");
  assert.equal(next.remainingSec, 1500);
  assert.equal(next.key, "1000:session");
});

test("a new phase at the same deadline still schedules", () => {
  const work = state({ isActive: true, targetEndMs: 1000, remainingSec: 300, focusTechnique: "pomodoro" });
  const breakSameDeadline = state({ isActive: true, targetEndMs: 1000, remainingSec: 300, isBreakTime: true, focusTechnique: "pomodoro" });
  assert.deepEqual(calls([work, breakSameDeadline]), [
    "schedule:work_end",
    "schedule:break_end",
  ]);
});