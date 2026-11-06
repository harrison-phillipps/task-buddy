/**
 * Unit tests for quiet-hours evaluation — the only thing that stops push and
 * email going out at night. In-app notification rows are never suppressed, so
 * this rule only ever governs delivery.
 *
 * Run: node --test tests/*.test.mjs
 *
 * Adelaide offsets: ACST = UTC+09:30 (Apr-Oct), ACDT = UTC+10:30 (Oct-Apr).
 * DST 2026 starts Sunday 4 October (02:00 -> 03:00 local).
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  isQuietNow,
  quietWindow,
  resolveTimezone,
  DEFAULT_TIMEZONE,
} from "../base44/shared/quietHours.ts";

const at = (iso) => new Date(iso);

test("window: missing row falls back to 21:00-07:30", () => {
  assert.deepEqual(quietWindow(null), { start: 21 * 60, end: 7 * 60 + 30 });
  assert.deepEqual(quietWindow({}), { start: 21 * 60, end: 7 * 60 + 30 });
});

test("window: the row's own times win", () => {
  assert.deepEqual(
    quietWindow({ quiet_hours_start: "22:00", quiet_hours_end: "06:00" }),
    { start: 22 * 60, end: 6 * 60 }
  );
});

test("window: unusable or zero-length times fall back to the default", () => {
  assert.deepEqual(quietWindow({ quiet_hours_start: "abc", quiet_hours_end: "06:00" }), { start: 21 * 60, end: 7 * 60 + 30 });
  assert.deepEqual(quietWindow({ quiet_hours_start: "", quiet_hours_end: "06:00" }), { start: 21 * 60, end: 7 * 60 + 30 });
  assert.deepEqual(quietWindow({ quiet_hours_start: "25:00", quiet_hours_end: "06:00" }), { start: 21 * 60, end: 7 * 60 + 30 });
  assert.deepEqual(quietWindow({ quiet_hours_start: "07:00", quiet_hours_end: "07:00" }), { start: 21 * 60, end: 7 * 60 + 30 });
});

test("window: padded single-digit hours parse", () => {
  assert.deepEqual(quietWindow({ quiet_hours_start: " 9:00 ", quiet_hours_end: "17:30" }), { start: 9 * 60, end: 17 * 60 + 30 });
});

test("overnight default window: inside both ends of the night", () => {
  const adelaide = { timezone: "Australia/Adelaide" };
  assert.equal(isQuietNow(adelaide, at("2026-11-06T11:30:00Z")), true); // 22:00 local
  assert.equal(isQuietNow(adelaide, at("2026-11-06T16:30:00Z")), true); // 03:00 local
  assert.equal(isQuietNow(adelaide, at("2026-11-06T20:59:00Z")), true); // 07:29 local
});

test("overnight default window: outside it", () => {
  const adelaide = { timezone: "Australia/Adelaide" };
  assert.equal(isQuietNow(adelaide, at("2026-11-06T01:30:00Z")), false); // 12:00 local
  assert.equal(isQuietNow(adelaide, at("2026-11-06T10:29:00Z")), false); // 20:59 local
});

test("boundaries: start is quiet, end is not", () => {
  const adelaide = { timezone: "Australia/Adelaide" };
  assert.equal(isQuietNow(adelaide, at("2026-11-06T10:30:00Z")), true); // 21:00 local exactly
  assert.equal(isQuietNow(adelaide, at("2026-11-06T21:00:00Z")), false); // 07:30 local exactly
});

test("custom overnight window is honoured", () => {
  const prefs = { timezone: "Australia/Adelaide", quiet_hours_start: "22:00", quiet_hours_end: "06:00" };
  assert.equal(isQuietNow(prefs, at("2026-11-06T11:30:00Z")), true); // 22:00
  assert.equal(isQuietNow(prefs, at("2026-11-06T10:29:00Z")), false); // 20:59
  assert.equal(isQuietNow(prefs, at("2026-11-06T19:29:00Z")), true); // 05:59
  assert.equal(isQuietNow(prefs, at("2026-11-06T19:30:00Z")), false); // 06:00 exactly
});

test("same-day window does not wrap", () => {
  const prefs = { timezone: "Australia/Adelaide", quiet_hours_start: "09:00", quiet_hours_end: "17:00" };
  assert.equal(isQuietNow(prefs, at("2026-11-06T00:00:00Z")), true); // 10:30
  assert.equal(isQuietNow(prefs, at("2026-11-05T22:29:00Z")), false); // 08:59
  assert.equal(isQuietNow(prefs, at("2026-11-06T06:29:00Z")), true); // 16:59
  assert.equal(isQuietNow(prefs, at("2026-11-06T06:30:00Z")), false); // 17:00 exactly
});

test("DST: the same UTC clock time flips across the spring-forward day", () => {
  const prefs = { timezone: "Australia/Adelaide" };
  // 21:00Z = 06:30 ACST before DST (quiet) but 07:30 ACDT after it (not quiet).
  assert.equal(isQuietNow(prefs, at("2026-09-20T21:00:00Z")), true);
  assert.equal(isQuietNow(prefs, at("2026-10-05T21:00:00Z")), false);
});

test("DST: the transition day itself is evaluated on local wall clock", () => {
  const prefs = { timezone: "Australia/Adelaide" };
  // 3 Oct 2026 is still ACST; from 03:00 on 4 Oct the offset is ACDT.
  assert.equal(isQuietNow(prefs, at("2026-10-03T12:00:00Z")), true); // 21:30 ACST, quiet
  assert.equal(isQuietNow(prefs, at("2026-10-03T20:00:00Z")), true); // 06:30 ACDT, quiet
  assert.equal(isQuietNow(prefs, at("2026-10-03T21:00:00Z")), false); // 07:30 ACDT, boundary
  assert.equal(isQuietNow(prefs, at("2026-10-04T11:00:00Z")), true); // 21:30 ACDT, quiet
});

test("missing timezone falls back to Adelaide", () => {
  assert.equal(resolveTimezone({}), DEFAULT_TIMEZONE);
  assert.equal(resolveTimezone({ timezone: "   " }), DEFAULT_TIMEZONE);
  assert.equal(isQuietNow({ quiet_hours_enabled: true }, at("2026-11-06T11:30:00Z")), true); // 22:00 Adelaide
});

test("an unknown timezone name falls back instead of throwing", () => {
  assert.equal(resolveTimezone({ timezone: "Not/AZone" }), DEFAULT_TIMEZONE);
  assert.equal(isQuietNow({ timezone: "Not/AZone" }, at("2026-11-06T11:30:00Z")), true);
});

test("a valid non-default timezone is used, not the fallback", () => {
  assert.equal(resolveTimezone({ timezone: "Asia/Tokyo" }), "Asia/Tokyo");
  const prefs = { timezone: "Asia/Tokyo", quiet_hours_start: "09:00", quiet_hours_end: "17:00" };
  // 07:00Z = 16:00 in Tokyo (quiet) but 17:30 in Adelaide (not quiet).
  assert.equal(isQuietNow(prefs, at("2026-11-06T07:00:00Z")), true);
  assert.equal(isQuietNow({ ...prefs, timezone: "Australia/Adelaide" }, at("2026-11-06T07:00:00Z")), false);
});

test("UTC works as an explicit timezone", () => {
  const prefs = { timezone: "UTC" };
  assert.equal(isQuietNow(prefs, at("2026-11-06T12:00:00Z")), false); // 12:00
  assert.equal(isQuietNow(prefs, at("2026-11-06T22:00:00Z")), true); // 22:00
});