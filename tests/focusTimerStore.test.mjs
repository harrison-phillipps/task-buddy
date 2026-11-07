/**
 * Unit tests for the focus-timer store: the derive / persist / restore logic
 * that lets a countdown survive a locked phone, a backgrounded tab or an app
 * kill. Remaining time must always come from the clock, never a counter.
 *
 * Run: node --test tests/*.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  FOCUS_STORAGE_KEY,
  MAX_RECORD_AGE_MS,
  deriveRemainingSec,
  normalizeRecord,
  isStaleRecord,
  saveFocusRecord,
  loadFocusRecord,
  clearFocusRecord,
  restoreFocusSession,
} from "../src/lib/focusTimerStore.js";

const NOW = Date.parse("2026-11-07T00:00:00.000Z");

/** Minimal in-memory stand-in for localStorage. */
function fakeStorage(initial) {
  const map = new Map(initial ? Object.entries(initial) : []);
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    _map: map,
  };
}

/** Storage whose every access throws — private mode / blocked cookies. */
const brokenStorage = {
  getItem() {
    throw new Error("blocked");
  },
  setItem() {
    throw new Error("blocked");
  },
  removeItem() {
    throw new Error("blocked");
  },
};

const baseRecord = (over = {}) => ({
  taskId: "task_1",
  phase: "work",
  targetEndMs: NOW + 300_000, // 5 minutes left
  status: "running",
  remainingAtPauseSec: 300,
  focusTechnique: "standard",
  workInterval: 25,
  breakInterval: 5,
  pomodorosCompleted: 2,
  sessionStartMs: NOW - 60_000,
  ...over,
});

// ── derive ───────────────────────────────────────────────────────────────────

test("derive: rounds up to whole seconds", () => {
  assert.equal(deriveRemainingSec(NOW + 1500, NOW), 2);
  assert.equal(deriveRemainingSec(NOW + 1000, NOW), 1);
});

test("derive: never goes negative once the deadline passes", () => {
  assert.equal(deriveRemainingSec(NOW - 60_000, NOW), 0);
});

test("derive: garbage in, zero out", () => {
  assert.equal(deriveRemainingSec(null, NOW), 0);
  assert.equal(deriveRemainingSec(undefined, NOW), 0);
  assert.equal(deriveRemainingSec(Number.NaN, NOW), 0);
  assert.equal(deriveRemainingSec(NOW + 1000, undefined), 0);
});

test("derive: a long absence is accounted for from the clock, not ticks", () => {
  // Eight minutes away from a five-minute deadline: expired, not "five left".
  assert.equal(deriveRemainingSec(NOW + 300_000, NOW + 480_000), 0);
});

// ── normalize ────────────────────────────────────────────────────────────────

test("normalize: keeps only known keys", () => {
  const clean = normalizeRecord({ ...baseRecord(), junk: "drop me", taskTitle: "leak" });
  assert.equal(clean.junk, undefined);
  assert.equal(clean.taskTitle, undefined);
  assert.equal(clean.taskId, "task_1");
});

test("normalize: rejects a record with no task", () => {
  assert.equal(normalizeRecord(baseRecord({ taskId: "" })), null);
  assert.equal(normalizeRecord(baseRecord({ taskId: 42 })), null);
});

test("normalize: rejects unknown phase or status", () => {
  assert.equal(normalizeRecord(baseRecord({ phase: "lunch" })), null);
  assert.equal(normalizeRecord(baseRecord({ status: "sleeping" })), null);
});

test("normalize: a running record needs a deadline", () => {
  assert.equal(normalizeRecord(baseRecord({ targetEndMs: null })), null);
});

test("normalize: a paused record needs a frozen remainder", () => {
  const paused = normalizeRecord(
    baseRecord({ status: "paused", remainingAtPauseSec: null }),
  );
  assert.equal(paused, null);
});

test("normalize: rejects non-objects", () => {
  assert.equal(normalizeRecord(null), null);
  assert.equal(normalizeRecord("nope"), null);
  assert.equal(normalizeRecord([1, 2, 3]), null);
});

// ── persist + load round trip ────────────────────────────────────────────────

test("persist: round-trips a running record", () => {
  const store = fakeStorage();
  assert.equal(saveFocusRecord(baseRecord(), store), true);
  const loaded = loadFocusRecord(NOW, store);
  assert.equal(loaded.taskId, "task_1");
  assert.equal(loaded.status, "running");
  assert.equal(loaded.targetEndMs, NOW + 300_000);
  assert.equal(loaded.pomodorosCompleted, 2);
});

test("persist: writes one key only", () => {
  const store = fakeStorage();
  saveFocusRecord(baseRecord(), store);
  assert.deepEqual([...store._map.keys()], [FOCUS_STORAGE_KEY]);
});

test("persist: pause freezes the remainder and resume re-anchors the deadline", () => {
  const store = fakeStorage();

  // Paused with 4 minutes left.
  saveFocusRecord(baseRecord({ status: "paused", remainingAtPauseSec: 240 }), store);
  const paused = restoreFocusSession(loadFocusRecord(NOW, store), NOW);
  assert.equal(paused.status, "paused");
  assert.equal(paused.remainingSec, 240);

  // Resume three minutes later: deadline must move, not stay in the past.
  const resumeAt = NOW + 180_000;
  saveFocusRecord(
    baseRecord({ status: "running", targetEndMs: resumeAt + 240_000 }),
    store,
  );
  const running = restoreFocusSession(loadFocusRecord(resumeAt, store), resumeAt);
  assert.equal(running.status, "running");
  assert.equal(running.remainingSec, 240);
});

test("persist: clear removes the record", () => {
  const store = fakeStorage();
  saveFocusRecord(baseRecord(), store);
  clearFocusRecord(store);
  assert.equal(loadFocusRecord(NOW, store), null);
  assert.equal(store._map.size, 0);
});

// ── restore ──────────────────────────────────────────────────────────────────

test("restore: running session well inside its deadline", () => {
  const r = restoreFocusSession(normalizeRecord(baseRecord()), NOW);
  assert.deepEqual(r, { status: "running", remainingSec: 300 });
});

test("restore: deadline passed while away reports expired once", () => {
  const r = restoreFocusSession(normalizeRecord(baseRecord()), NOW + 900_000);
  assert.deepEqual(r, { status: "expired", remainingSec: 0 });
});

test("restore: paused session stays frozen no matter how long away", () => {
  const rec = normalizeRecord(
    baseRecord({ status: "paused", remainingAtPauseSec: 120 }),
  );
  const r = restoreFocusSession(rec, NOW + 3 * 60 * 60 * 1000);
  assert.equal(r.status, "paused");
  assert.equal(r.remainingSec, 120);
});

test("restore: a break phase is restored as a break, not replayed as work", () => {
  const rec = normalizeRecord(baseRecord({ phase: "break", targetEndMs: NOW + 60_000 }));
  assert.equal(rec.phase, "break");
  assert.equal(restoreFocusSession(rec, NOW).status, "running");
});

test("restore: no record means no session", () => {
  assert.equal(restoreFocusSession(null, NOW), null);
});

// ── malformed + stale ────────────────────────────────────────────────────────

test("load: malformed JSON is discarded, not thrown", () => {
  const store = fakeStorage({ [FOCUS_STORAGE_KEY]: "{not json" });
  assert.equal(loadFocusRecord(NOW, store), null);
  assert.equal(store._map.size, 0, "the bad key is cleared");
});

test("load: a structurally wrong record is discarded", () => {
  const store = fakeStorage({
    [FOCUS_STORAGE_KEY]: JSON.stringify({ taskId: "task_1", phase: "work" }),
  });
  assert.equal(loadFocusRecord(NOW, store), null);
});

test("load: a record older than 24 hours is discarded", () => {
  const store = fakeStorage();
  saveFocusRecord(
    baseRecord({ sessionStartMs: NOW - MAX_RECORD_AGE_MS - 1000 }),
    store,
  );
  assert.equal(loadFocusRecord(NOW, store), null);
});

test("load: a record just inside 24 hours is kept", () => {
  const store = fakeStorage();
  saveFocusRecord(
    baseRecord({ sessionStartMs: NOW - MAX_RECORD_AGE_MS + 60_000 }),
    store,
  );
  assert.equal(loadFocusRecord(NOW, store)?.taskId, "task_1");
});

test("stale: a start time from the future is not trusted", () => {
  const rec = normalizeRecord(baseRecord({ sessionStartMs: NOW + 60 * 60 * 1000 }));
  assert.equal(isStaleRecord(rec, NOW), true);
});

// ── storage unavailable ──────────────────────────────────────────────────────

test("storage unavailable: saving reports failure instead of throwing", () => {
  assert.equal(saveFocusRecord(baseRecord(), brokenStorage), false);
});

test("storage unavailable: loading and clearing are silent", () => {
  assert.equal(loadFocusRecord(NOW, brokenStorage), null);
  assert.doesNotThrow(() => clearFocusRecord(brokenStorage));
});

test("storage unavailable: no storage object at all", () => {
  assert.equal(saveFocusRecord(baseRecord(), null), false);
  assert.equal(loadFocusRecord(NOW, null), null);
  assert.doesNotThrow(() => clearFocusRecord(null));
});

// ── double-completion guard ──────────────────────────────────────────────────

/**
 * The screen keys its one-shot completion on the deadline that just elapsed.
 * A tick and a visibility event can both observe remaining === 0; only the
 * first may run the completion handler.
 */
function makeCompletionGuard() {
  let completed = null;
  return (targetEndMs) => {
    if (completed === targetEndMs) return false;
    completed = targetEndMs;
    return true;
  };
}

test("guard: simultaneous tick and visibility event complete once", () => {
  const completeOnce = makeCompletionGuard();
  const deadline = NOW + 60_000;
  const results = [
    completeOnce(deadline), // tick
    completeOnce(deadline), // visibilitychange landed with it
    completeOnce(deadline), // pageshow
  ];
  assert.deepEqual(results, [true, false, false]);
});

test("guard: a genuinely new phase still completes", () => {
  const completeOnce = makeCompletionGuard();
  assert.equal(completeOnce(NOW + 60_000), true);
  assert.equal(completeOnce(NOW + 120_000), true);
});