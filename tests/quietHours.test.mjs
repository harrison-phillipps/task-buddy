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

test("opt-out: an untouched row still gets the default window", () => {
  // quiet_hours_user_set absent — the user has never saved the card.
  const untouched = { timezone: "Australia/Adelaide" };
  assert.equal(isQuietNow(untouched, at("2026-11-06T11:30:00Z")), true); // 22:00 local
  assert.equal(isQuietNow(untouched, at("2026-11-06T01:30:00Z")), false); // 12:00 local
  // enabled:false alone is not an opt-out while the row is untouched.
  const untoggled = { timezone: "Australia/Adelaide", quiet_hours_enabled: false };
  assert.equal(isQuietNow(untoggled, at("2026-11-06T11:30:00Z")), true); // 22:00 local
});

test("opt-out: a user who turned quiet hours off is never quiet", () => {
  const turnedOff = {
    timezone: "Australia/Adelaide",
    quiet_hours_user_set: true,
    quiet_hours_enabled: false,
  };
  assert.equal(isQuietNow(turnedOff, at("2026-11-06T11:30:00Z")), false); // 22:00 local
  assert.equal(isQuietNow(turnedOff, at("2026-11-06T16:30:00Z")), false); // 03:00 local
  // A stored window does not resurrect quiet hours after an explicit opt-out.
  const turnedOffWithWindow = {
    ...turnedOff,
    quiet_hours_start: "22:00",
    quiet_hours_end: "06:00",
  };
  assert.equal(isQuietNow(turnedOffWithWindow, at("2026-11-06T11:30:00Z")), false);
});

test("the frontend copy agrees with the backend rule", async () => {
  // src/lib/quietHours.js mirrors base44/shared/quietHours.ts for the browser-side
  // email step; if the two ever diverge, this fails.
  const client = await import("../src/lib/quietHours.js");
  const windows = [
    null,
    { timezone: "Australia/Adelaide" },
    { timezone: "Australia/Adelaide", quiet_hours_enabled: false },
    { timezone: "Australia/Adelaide", quiet_hours_start: "22:00", quiet_hours_end: "06:00" },
    { timezone: "Australia/Adelaide", quiet_hours_start: "09:00", quiet_hours_end: "17:00" },
    { timezone: "Australia/Adelaide", quiet_hours_user_set: true, quiet_hours_enabled: false },
    {
      timezone: "Australia/Adelaide",
      quiet_hours_user_set: true,
      quiet_hours_enabled: true,
      quiet_hours_start: "23:30",
      quiet_hours_end: "07:00",
    },
    { timezone: "Asia/Tokyo", quiet_hours_start: "09:00", quiet_hours_end: "17:00" },
    { timezone: "UTC" },
    { timezone: "Not/AZone", quiet_hours_start: "22:00", quiet_hours_end: "06:00" },
  ];

  let compared = 0;
  for (const prefs of windows) {
    // Sample every 7 minutes across two UTC days, so DST and day boundaries are hit.
    for (let minute = 0; minute < 48 * 60; minute += 7) {
      const now = new Date(Date.UTC(2026, 9, 3, 0, 0, 0) + minute * 60000);
      assert.equal(
        client.isQuietNow(prefs, now),
        isQuietNow(prefs, now),
        `disagreement for ${JSON.stringify(prefs)} at ${now.toISOString()}`
      );
      compared++;
    }
  }
  assert.ok(compared > 4000, `expected a wide comparison, got ${compared}`);
});

test("opt-out: a user who turned quiet hours on uses their custom window", () => {
  const turnedOn = {
    timezone: "Australia/Adelaide",
    quiet_hours_user_set: true,
    quiet_hours_enabled: true,
    quiet_hours_start: "22:00",
    quiet_hours_end: "06:00",
  };
  assert.equal(isQuietNow(turnedOn, at("2026-11-06T11:30:00Z")), true); // 22:00 local
  assert.equal(isQuietNow(turnedOn, at("2026-11-06T10:29:00Z")), false); // 20:59 local
  assert.equal(isQuietNow(turnedOn, at("2026-11-06T19:30:00Z")), false); // 06:00 exactly
});