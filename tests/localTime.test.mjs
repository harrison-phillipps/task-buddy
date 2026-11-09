/**
 * Unit tests for the wall-clock → UTC helper that every reminder time goes
 * through. The offset is never hardcoded in the product: it comes from Intl, so
 * these tests pin the two transition days that a hand-written offset table
 * would get wrong.
 *
 * Adelaide 2026, from Intl itself:
 *   - DST ends:   2026-04-04T17:00Z  (03:00 ACDT -> 02:00 ACST)  -> 02:00-03:00 repeats
 *   - DST starts: 2026-10-03T17:00Z  (02:00 ACST -> 03:00 ACDT)  -> 02:00-03:00 is skipped
 *
 * Run: node --test tests/*.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  localToUtc,
  localDateString,
  localClockParts,
  isValidLocalDate,
  isValidLocalClock,
} from "../base44/shared/localTime.ts";

const ADL = "Australia/Adelaide";
const iso = (d) => (d ? d.toISOString() : null);
const wall = (d, tz = ADL) => {
  const clock = localClockParts(d, tz);
  return `${localDateString(d, tz)} ${clock.hour}:${String(clock.minute).padStart(2, "0")}`;
};

test("normal day: converts a plain wall clock to the right UTC instant", () => {
  // November is ACDT, UTC+10:30.
  assert.equal(iso(localToUtc("2026-11-10", "14:00", ADL)), "2026-11-10T03:30:00.000Z");
  assert.equal(iso(localToUtc("2026-11-10", "09:15", ADL)), "2026-11-09T22:45:00.000Z");
  // June is ACST, UTC+09:30 — the other half of the year.
  assert.equal(iso(localToUtc("2026-06-15", "14:00", ADL)), "2026-06-15T04:30:00.000Z");
  // Round trip: the instant really is that wall clock where the owner lives.
  assert.equal(wall(localToUtc("2026-11-10", "14:00", ADL)), "2026-11-10 14:00");
});

test("spring forward: a wall clock that does not exist moves forward past the gap", () => {
  // 02:00-03:00 local never happens on 4 October 2026.
  const skipped = localToUtc("2026-10-04", "02:30", ADL);
  assert.equal(iso(skipped), "2026-10-03T17:00:00.000Z");
  assert.equal(wall(skipped), "2026-10-04 3:30");
  // It lands on the same instant as the first real time after the gap.
  assert.equal(iso(skipped), iso(localToUtc("2026-10-04", "03:30", ADL)));
  // The minute before the gap is untouched.
  assert.equal(wall(localToUtc("2026-10-04", "01:30", ADL)), "2026-10-04 1:30");
});

test("fall back: an ambiguous wall clock resolves to the later, standard-time occurrence", () => {
  // 02:00-03:00 local happens twice on 5 April 2026 (ACDT, then ACST).
  const ambiguous = localToUtc("2026-04-05", "02:30", ADL);
  assert.equal(iso(ambiguous), "2026-04-04T17:00:00.000Z"); // ACST, the second pass
  assert.equal(wall(ambiguous), "2026-04-05 2:30");
  // The first pass (ACDT) would have been 16:00Z; it is not chosen, but the
  // chosen instant still reads 02:30 locally.
  assert.notEqual(iso(ambiguous), "2026-04-04T16:00:00.000Z");
  assert.equal(wall(localToUtc("2026-04-05", "01:30", ADL)), "2026-04-05 1:30");
});

test("midnight: local midnight is the previous UTC day, and today is the owner's day", () => {
  const midnight = localToUtc("2026-11-10", "00:00", ADL);
  assert.equal(iso(midnight), "2026-11-09T13:30:00.000Z");
  assert.equal(wall(midnight), "2026-11-10 0:00");
  // The UTC date and the owner's date differ here — the reason reminders must
  // never be judged by the server's calendar day.
  assert.equal(midnight.toISOString().slice(0, 10), "2026-11-09");
  assert.equal(localDateString(midnight, ADL), "2026-11-10");

  assert.equal(iso(localToUtc("2026-11-10", "23:59", ADL)), "2026-11-10T13:29:00.000Z");
  assert.equal(wall(localToUtc("2026-11-10", "23:59", ADL)), "2026-11-10 23:59");

  // Another zone, same rule: Tokyo midnight is the previous afternoon in UTC.
  assert.equal(iso(localToUtc("2026-11-10", "00:00", "Asia/Tokyo")), "2026-11-09T15:00:00.000Z");
});

test("invalid input returns null instead of throwing", () => {
  const bad = [
    ["2026-02-30", "10:00", ADL], // no such day
    ["2026-13-01", "10:00", ADL], // no such month
    ["10/11/2026", "10:00", ADL], // wrong format
    ["2026-11-10", "24:00", ADL], // hour out of range
    ["2026-11-10", "2:5", ADL], // not zero-padded
    ["2026-11-10", "noon", ADL], // not a clock
    ["2026-11-10", "10:00", "Not/AZone"], // unknown timezone
    ["2026-11-10", "10:00", ""], // no timezone
    [null, "10:00", ADL],
    ["2026-11-10", undefined, ADL],
  ];
  for (const [date, time, tz] of bad) {
    assert.equal(localToUtc(date, time, tz), null, `expected null for ${date} ${time} ${tz}`);
  }

  assert.equal(isValidLocalDate("2026-11-10"), true);
  assert.equal(isValidLocalDate("2026-02-30"), false);
  assert.equal(isValidLocalDate(20261110), false);
  assert.equal(isValidLocalClock("14:00"), true);
  assert.equal(isValidLocalClock("24:00"), false);
  assert.equal(isValidLocalClock("14:60"), false);
  assert.equal(isValidLocalClock(" 14:00"), false);
});