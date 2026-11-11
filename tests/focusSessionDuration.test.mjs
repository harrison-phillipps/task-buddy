/**
 * Unit tests for the bounded focus-session duration.
 *
 * A finished session must record active focus time — wall clock minus every
 * pause — never the hours that passed while the app was closed. The recorded
 * value is capped at what was planned plus any "More Time" added, and never
 * exceeds MAX_SESSION_MINUTES.
 *
 * Run: node --test tests/*.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  computeSessionMinutes,
  normalizeRecord,
  MAX_SESSION_MINUTES,
} from "../src/lib/focusTimerStore.js";

const MIN = 60 * 1000;
const NOW = Date.parse("2026-11-11T22:23:34.000Z");

/** A minimal valid stored record, so normalization can be exercised. */
function baseRecord(overrides = {}) {
  return {
    taskId: "task_1",
    phase: "work",
    status: "running",
    targetEndMs: NOW + 10 * MIN,
    remainingAtPauseSec: null,
    focusTechnique: "standard",
    workInterval: 25,
    breakInterval: 5,
    pomodorosCompleted: 0,
    sessionStartMs: NOW - 10 * MIN,
    ...overrides,
  };
}

test("1. normal completion records the full planned length", () => {
  assert.equal(
    computeSessionMinutes({
      nowMs: NOW,
      startMs: NOW - 25 * MIN,
      plannedMinutes: 25,
    }),
    25
  );
});

test("2. early finish records only the time that actually elapsed", () => {
  assert.equal(
    computeSessionMinutes({
      nowMs: NOW,
      startMs: NOW - 10 * MIN,
      plannedMinutes: 25,
    }),
    10
  );

  // A 1-minute session rounds to 1, never 0-by-truncation.
  assert.equal(
    computeSessionMinutes({
      nowMs: NOW,
      startMs: NOW - 1 * MIN,
      plannedMinutes: 25,
    }),
    1
  );
});

test("3. long pause, then resume, then finish excludes the paused time", () => {
  // 40 minutes on the clock, 30 of them paused → 10 minutes of focus.
  assert.equal(
    computeSessionMinutes({
      nowMs: NOW,
      startMs: NOW - 40 * MIN,
      pausedTotalMs: 30 * MIN,
      plannedMinutes: 25,
    }),
    10
  );
});

test("4. paused restore does not count the time away while paused", () => {
  // Session began 20 hours ago; the record sat paused for 19h45m of it.
  assert.equal(
    computeSessionMinutes({
      nowMs: NOW,
      startMs: NOW - 20 * 60 * MIN,
      pausedTotalMs: (19 * 60 + 45) * MIN,
      plannedMinutes: 25,
    }),
    15
  );

  // Paused the whole time: nothing was focused, so nothing is recorded.
  assert.equal(
    computeSessionMinutes({
      nowMs: NOW,
      startMs: NOW - 5 * 60 * MIN,
      pausedTotalMs: 5 * 60 * MIN,
      plannedMinutes: 25,
    }),
    0
  );
});

test("5. expired restore after 23 hours records the planned length", () => {
  // The case that produced duration_minutes 1397 in production.
  assert.equal(
    computeSessionMinutes({
      nowMs: NOW,
      startMs: NOW - 23 * 60 * MIN,
      pausedTotalMs: 0,
      plannedMinutes: 25,
      expired: true,
    }),
    25
  );

  // Expired, and a long planned session: still the plan, not the elapsed time.
  assert.equal(
    computeSessionMinutes({
      nowMs: NOW,
      startMs: NOW - 23 * 60 * MIN,
      plannedMinutes: 90,
      expired: true,
    }),
    90
  );

  // Expired restore must ignore the wall clock entirely.
  assert.ok(
    computeSessionMinutes({
      nowMs: NOW,
      startMs: NOW - 23 * 60 * MIN,
      plannedMinutes: 25,
      expired: true,
    }) < 24 * 60
  );
});

test("6. More Time extension raises the cap, and only by what was added", () => {
  assert.equal(
    computeSessionMinutes({
      nowMs: NOW,
      startMs: NOW - 40 * MIN,
      plannedMinutes: 25,
      extensionMinutes: 15,
    }),
    40
  );

  // Past the extended cap: held at planned + extension.
  assert.equal(
    computeSessionMinutes({
      nowMs: NOW,
      startMs: NOW - 70 * MIN,
      plannedMinutes: 25,
      extensionMinutes: 15,
    }),
    40
  );
});

test("7. the 240-minute ceiling always wins", () => {
  assert.equal(MAX_SESSION_MINUTES, 240);

  assert.equal(
    computeSessionMinutes({
      nowMs: NOW,
      startMs: NOW - 700 * MIN,
      plannedMinutes: 600,
    }),
    240
  );

  // A cap built from plan + extension is still held at the ceiling.
  assert.equal(
    computeSessionMinutes({
      nowMs: NOW,
      startMs: NOW - 700 * MIN,
      plannedMinutes: 230,
      extensionMinutes: 60,
    }),
    240
  );

  // Unknown plan: the ceiling is the only bound.
  assert.equal(
    computeSessionMinutes({ nowMs: NOW, startMs: NOW - 700 * MIN }),
    240
  );
});

test("8. absent pausedTotalMs means zero", () => {
  const normalized = normalizeRecord(baseRecord());
  assert.equal(normalized.pausedTotalMs, 0);

  assert.equal(
    computeSessionMinutes({
      nowMs: NOW,
      startMs: NOW - 12 * MIN,
      plannedMinutes: 25,
    }),
    12
  );

  // Round-trips through the store like any other field.
  assert.equal(normalizeRecord(baseRecord({ pausedTotalMs: 90 * MIN })).pausedTotalMs, 90 * MIN);
  assert.equal(normalizeRecord(baseRecord({ pausedTotalMs: -5 })).pausedTotalMs, 0);
});

test("9. never negative, never NaN, never above the cap", () => {
  // Paused longer than the clock allows (device clock moved): floor at zero.
  assert.equal(
    computeSessionMinutes({
      nowMs: NOW,
      startMs: NOW - 5 * MIN,
      pausedTotalMs: 60 * MIN,
      plannedMinutes: 25,
    }),
    0
  );

  // Garbage in the pause accumulator is ignored, not propagated.
  assert.equal(
    computeSessionMinutes({
      nowMs: NOW,
      startMs: NOW - 10 * MIN,
      pausedTotalMs: Number.NaN,
      plannedMinutes: 25,
    }),
    10
  );

  // A start in the future cannot produce a negative duration.
  assert.equal(
    computeSessionMinutes({
      nowMs: NOW,
      startMs: NOW + 30 * MIN,
      plannedMinutes: 25,
    }),
    0
  );

  assert.equal(computeSessionMinutes(), 0);
});

test("10. the finish path records the capped value and clears the active session", () => {
  const source = readFileSync(new URL("../src/pages/FocusSession.jsx", import.meta.url), "utf8");

  const start = source.indexOf("const finishSessionAfterReflection");
  const end = source.indexOf("const resetSession");
  assert.ok(start > 0 && end > start, "could not locate finishSessionAfterReflection");
  const finishPath = source.slice(start, end);

  // The old wall-clock formula must be gone from the finish path.
  assert.equal(
    finishPath.includes("Math.round((Date.now() - sessionStartTime) / 60000)"),
    false,
    "the finish path still computes a wall-clock duration"
  );
  assert.ok(finishPath.includes("computeSessionMinutes({"), "finish path does not use the bounded duration");
  assert.ok(finishPath.includes("expired: expiredRestoreRef.current"));
  assert.ok(finishPath.includes("duration_minutes: totalDuration"));
  assert.ok(finishPath.includes("total_focus_minutes: (userProgress.total_focus_minutes || 0) + totalDuration"));
  assert.ok(finishPath.includes("duration_minutes: totalDuration,\n        subtasks_completed"), "FocusJourney does not use the capped value");
  assert.ok(finishPath.includes("await clearSyncSession();"), "finish path does not clear the ActiveSession");
  assert.ok(
    finishPath.includes('console.warn("FocusJourney create failed:"'),
    "FocusJourney failures are still silent"
  );
});