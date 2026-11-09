/**
 * Unit tests for the OneSignal delivery rules: what counts as a delivered push,
 * which failures mean the stored player id is dead, and the test-push limit.
 *
 * Run: node --test tests/*.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  parseOneSignalResponse,
  isInvalidPlayerIdError,
  isOverTestPushLimit,
} from "../base44/shared/oneSignal.ts";

/* ── response parsing ─────────────────────────────────────────────────────── */

test("200 with recipients: delivered", () => {
  const result = parseOneSignalResponse(200, { id: "abc", recipients: 1 });
  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
  assert.equal(result.recipients, 1);
  assert.deepEqual(result.errors, []);
});

test("200 with several recipients: delivered", () => {
  const result = parseOneSignalResponse(200, { id: "abc", recipients: 4 });
  assert.equal(result.ok, true);
  assert.equal(result.recipients, 4);
});

test("200 with recipients 0 and no errors: failure", () => {
  const result = parseOneSignalResponse(200, { id: "abc", recipients: 0 });
  assert.equal(result.ok, false);
  assert.equal(result.recipients, 0);
});

test("200 with recipients 0 and not-subscribed error: failure, dead id", () => {
  const body = {
    id: "",
    recipients: 0,
    errors: ["All included players are not subscribed"],
  };
  const result = parseOneSignalResponse(200, body);
  assert.equal(result.ok, false);
  assert.equal(result.recipients, 0);
  assert.deepEqual(result.errors, ["All included players are not subscribed"]);
  assert.equal(isInvalidPlayerIdError(result.errors), true);
});

test("200 with recipients but a non-empty errors list: failure", () => {
  const result = parseOneSignalResponse(200, {
    recipients: 2,
    errors: ["Some players are not subscribed"],
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, ["Some players are not subscribed"]);
});

test("non-2xx with an error string: failure", () => {
  const result = parseOneSignalResponse(400, { errors: "Invalid auth key" });
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.equal(result.recipients, 0);
  assert.deepEqual(result.errors, ["Invalid auth key"]);
});

test("auth and rate-limit errors never count as a dead player id", () => {
  assert.equal(isInvalidPlayerIdError(["Invalid auth key"]), false);
  assert.equal(isInvalidPlayerIdError(["Rate limit exceeded"]), false);
  assert.equal(isInvalidPlayerIdError(["Invalid 'contents' value"]), false);
  assert.equal(isInvalidPlayerIdError([]), false);
});

test("an unsubscribed or malformed id is a dead player id", () => {
  assert.equal(isInvalidPlayerIdError(["All included players are not subscribed"]), true);
  assert.equal(isInvalidPlayerIdError(["Player id is invalid"]), true);
  assert.equal(isInvalidPlayerIdError(["invalid player id format"]), true);
  assert.equal(isInvalidPlayerIdError(["that subscription is no longer subscribed"]), true);
});

/* ── malformed bodies ─────────────────────────────────────────────────────── */

test("malformed bodies never throw and never read as success", () => {
  for (const body of [null, undefined, "OK", 42, [], {}, { recipients: "two" }]) {
    const result = parseOneSignalResponse(200, body);
    assert.equal(result.ok, false, `body ${JSON.stringify(body)} must not succeed`);
    assert.equal(result.recipients, 0);
    assert.ok(result.errors.length > 0, `body ${JSON.stringify(body)} must explain itself`);
  }
});

test("a non-numeric recipients value is treated as zero", () => {
  const result = parseOneSignalResponse(200, { recipients: "1" });
  assert.equal(result.recipients, 0);
  assert.equal(result.ok, false);
});

/* ── test-push rate limit ─────────────────────────────────────────────────── */

const now = new Date("2026-11-09T10:00:00.000Z");
const minutesAgo = (n) => new Date(now.getTime() - n * 60000).toISOString();

test("under the limit passes", () => {
  assert.equal(isOverTestPushLimit([], now), false);
  assert.equal(isOverTestPushLimit([minutesAgo(5)], now), false);
  assert.equal(isOverTestPushLimit([minutesAgo(5), minutesAgo(30)], now), false);
});

test("three attempts in the window blocks", () => {
  assert.equal(
    isOverTestPushLimit([minutesAgo(5), minutesAgo(30), minutesAgo(59)], now),
    true,
  );
});

test("attempts older than an hour do not count", () => {
  assert.equal(isOverTestPushLimit([minutesAgo(61), minutesAgo(90)], now), false);
  assert.equal(
    isOverTestPushLimit([minutesAgo(1), minutesAgo(2), minutesAgo(61)], now),
    false,
  );
  assert.equal(
    isOverTestPushLimit([minutesAgo(1), minutesAgo(2), minutesAgo(3), minutesAgo(61)], now),
    true,
  );
});

test("unparseable timestamps are ignored, not counted", () => {
  assert.equal(isOverTestPushLimit([null, undefined, "not a date"], now), false);
});

test("Date objects and ISO strings are interchangeable", () => {
  const attempts = [new Date(now.getTime() - 60000), minutesAgo(2), new Date(now.getTime() - 180000)];
  assert.equal(isOverTestPushLimit(attempts, now), true);
});