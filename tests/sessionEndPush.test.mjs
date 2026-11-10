/**
 * Unit tests for the scheduled end-of-phase push: input bounds, the server-clock
 * send time, ownership of the session row, cancel idempotency, generic copy, and
 * the 30-per-hour limit.
 *
 * Run: node --test tests/*.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  parseSecondsRemaining,
  isEndPushKind,
  endPushBody,
  endPushSendAfter,
  findOwnSessionRow,
  cancelDecision,
  END_PUSH_TITLE,
  END_PUSH_KINDS,
  END_PUSH_LIMIT,
  MIN_SECONDS_REMAINING,
  MAX_SECONDS_REMAINING,
} from "../base44/shared/sessionEndPush.ts";
import { isOverTestPushLimit } from "../base44/shared/oneSignal.ts";

const SERVER_NOW = Date.parse("2026-11-10T05:00:00.000Z");
const CALLER = "user-me";
const OTHER = "user-somebody-else";

/* ── seconds_remaining validation and bounds ──────────────────────────────── */

test("accepts every whole second inside the bounds", () => {
  for (const value of [5, 6, 25 * 60, 3600, 14399, 14400]) {
    assert.equal(parseSecondsRemaining(value), value);
  }
  assert.equal(parseSecondsRemaining(MIN_SECONDS_REMAINING), 5);
  assert.equal(parseSecondsRemaining(MAX_SECONDS_REMAINING), 14400);
});

test("rejects anything outside 5..14400", () => {
  for (const value of [4.99, 0, -1, -6000]) {
    assert.equal(parseSecondsRemaining(value), null, `${value} must be rejected`);
  }
  for (const value of [14401, 86400, 1e9]) {
    assert.equal(parseSecondsRemaining(value), null, `${value} must be rejected`);
  }
});

test("rejects non-numbers, NaN and Infinity", () => {
  for (const value of [undefined, null, "600", "", true, {}, [], NaN, Infinity, -Infinity]) {
    assert.equal(parseSecondsRemaining(value), null, `${String(value)} must be rejected`);
  }
});

test("fractional seconds are accepted as a number (the server rounds the send time)", () => {
  assert.equal(parseSecondsRemaining(5.5), 5.5);
});

test("kind must be one of the three known values", () => {
  for (const kind of END_PUSH_KINDS) assert.equal(isEndPushKind(kind), true);
  for (const kind of ["session_end", "work", "", null, undefined, 1, {}]) {
    assert.equal(isEndPushKind(kind), false);
  }
});

/* ── send time comes from the server clock ────────────────────────────────── */

test("send_after is server now + remaining, as an ISO 8601 instant", () => {
  assert.equal(endPushSendAfter(SERVER_NOW, 5), "2026-11-10T05:00:05.000Z");
  assert.equal(endPushSendAfter(SERVER_NOW, 600), "2026-11-10T05:10:00.000Z");
  assert.equal(endPushSendAfter(SERVER_NOW, 14400), "2026-11-10T09:00:00.000Z");
});

test("send_after is parseable and exactly the requested offset ahead", () => {
  const iso = endPushSendAfter(SERVER_NOW, 1500);
  assert.equal(Date.parse(iso) - SERVER_NOW, 1500 * 1000);
  assert.match(iso, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
});

/* ── ownership: ids only ever come from the caller's own row ──────────────── */

test("a row owned by another user is never returned", () => {
  const rows = [
    { id: "row-other", user_id: OTHER, end_push_id: "push-other" },
    { id: "row-mine", user_id: CALLER, end_push_id: "push-mine" },
  ];
  assert.equal(findOwnSessionRow(rows, CALLER).id, "row-mine");
  assert.equal(findOwnSessionRow([rows[0]], CALLER), null);
  assert.equal(findOwnSessionRow(rows, ""), null);
  assert.equal(findOwnSessionRow(null, CALLER), null);
});

test("cancel reads the push id from the caller's own row only", () => {
  const decision = cancelDecision(
    { id: "row-other", user_id: OTHER, end_push_id: "push-other" },
    CALLER,
  );
  assert.deepEqual(decision, { action: "noop", reason: "no_session" });

  const mine = cancelDecision({ id: "row-mine", user_id: CALLER, end_push_id: "push-mine" }, CALLER);
  assert.deepEqual(mine, { action: "cancel", sessionRowId: "row-mine", pushId: "push-mine" });
});

/* ── cancel idempotency ──────────────────────────────────────────────────── */

test("no row, no pending push, or blank id is a no-op (a success)", () => {
  assert.deepEqual(cancelDecision(null, CALLER), { action: "noop", reason: "no_session" });
  assert.deepEqual(cancelDecision({ id: "r", user_id: CALLER }, CALLER), {
    action: "noop",
    reason: "none_pending",
  });
  assert.deepEqual(cancelDecision({ id: "r", user_id: CALLER, end_push_id: "" }, CALLER), {
    action: "noop",
    reason: "none_pending",
  });
  assert.deepEqual(cancelDecision({ id: "r", user_id: CALLER, end_push_id: "   " }, CALLER), {
    action: "noop",
    reason: "none_pending",
  });
});

test("cancel then cancel again is a no-op once the field is cleared", () => {
  const row = { id: "row-mine", user_id: CALLER, end_push_id: "push-mine" };
  assert.equal(cancelDecision(row, CALLER).action, "cancel");
  const cleared = { ...row, end_push_id: null };
  assert.deepEqual(cancelDecision(cleared, CALLER), { action: "noop", reason: "none_pending" });
});

/* ── copy carries no task title ──────────────────────────────────────────── */

test("each kind has its exact, generic body", () => {
  assert.equal(endPushBody("session"), "Your focus session is complete.");
  assert.equal(endPushBody("work_end"), "Focus interval complete. Time for a break.");
  assert.equal(endPushBody("break_end"), "Break's over. Ready when you are.");
});

test("no body contains a task title, and the heading is fixed", () => {
  const title = "Review the Henderson contract";
  for (const kind of END_PUSH_KINDS) {
    const body = endPushBody(kind);
    assert.ok(!body.includes(title));
    assert.ok(!/task|step|"|:/i.test(body), `"${body}" must stay generic`);
    assert.ok(body.length <= 60, `"${body}" must stay lock-screen short`);
  }
  assert.equal(END_PUSH_TITLE, "TaskBuddy");
});

/* ── 30 per hour per user ────────────────────────────────────────────────── */

const now = new Date("2026-11-10T05:00:00.000Z");
const minutesAgo = (n) => new Date(now.getTime() - n * 60000).toISOString();

test("29 calls in the hour pass, the 30th blocks", () => {
  const rows = (n) => Array.from({ length: n }, (_, i) => minutesAgo(i + 1));
  assert.equal(isOverTestPushLimit(rows(29), now, END_PUSH_LIMIT), false);
  assert.equal(isOverTestPushLimit(rows(30), now, END_PUSH_LIMIT), true);
  assert.equal(END_PUSH_LIMIT, 30);
});

test("calls older than an hour free the budget again", () => {
  const old = Array.from({ length: 30 }, (_, i) => minutesAgo(61 + i));
  assert.equal(isOverTestPushLimit(old, now, END_PUSH_LIMIT), false);
});