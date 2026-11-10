/**
 * Gentle focus nudge — the decision rules.
 *
 * Covers the local-time window across timezones and both daylight-saving
 * transitions, one nudge per local day, quiet hours, no open tasks, a session
 * already started, the ignored/back-off arithmetic, and the two structural
 * promises: a dry run cannot reach a write, and an opt-in cannot switch on email.
 *
 * Run: node --test tests/*.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  decideFocusNudge,
  evaluateIgnored,
  isInsideNudgeWindow,
  nextIgnoredCount,
  pendingEvaluations,
  shouldPause,
} from "../base44/shared/focusNudge.ts";
import {
  buildNewPreferencesRow,
  buildNudgeOptInPayload,
} from "../src/lib/focusNudgeOptIn.js";

const ADL = "Australia/Adelaide";
const NY = "America/New_York";

/** An opted-in row. Quiet hours are explicitly opted out unless a test sets them. */
const prefsAt = (over = {}) => ({
  user_id: "u1",
  timezone: ADL,
  focus_nudge_enabled: true,
  focus_nudge_time: "13:20",
  focus_nudge_paused: false,
  focus_nudge_ignored_count: 0,
  quiet_hours_user_set: true,
  quiet_hours_enabled: false,
  ...over,
});

const decide = (over = {}, input = {}) =>
  decideFocusNudge({
    prefs: prefsAt(over),
    now: new Date("2026-11-10T03:00:00Z"), // 13:30 Adelaide
    playerId: "player-1",
    openTaskCount: 2,
    lastSessionActivityMs: null,
    ...input,
  });

/* ── the local window ──────────────────────────────────────────────────────── */

test("inside the chosen 15-minute window, in the user's own timezone", () => {
  const decision = decide();
  assert.equal(decision.send, true);
  assert.equal(decision.reason, null);
  assert.equal(decision.timezone, ADL);
  assert.equal(decision.local_date, "2026-11-10");
  assert.equal(decision.local_minutes, 13 * 60 + 30);
});

test("the window is [time, time + 15 minutes) — both edges", () => {
  const now = new Date("2026-11-10T03:00:00Z"); // 13:30 Adelaide
  assert.equal(isInsideNudgeWindow(13 * 60 + 30, "13:30"), true);
  assert.equal(isInsideNudgeWindow(13 * 60 + 44, "13:30"), true);
  assert.equal(isInsideNudgeWindow(13 * 60 + 45, "13:30"), false);
  assert.equal(isInsideNudgeWindow(13 * 60 + 29, "13:30"), false);
  assert.equal(decide({ focus_nudge_time: "13:16" }).send, true, "14 minutes late is still inside");
  assert.equal(decide({ focus_nudge_time: "13:15" }, { now }).reason, "outside_window");
});

test("a window that crosses local midnight", () => {
  // 13:32Z = 00:02 the next day in Adelaide.
  const decision = decide({ focus_nudge_time: "23:50" }, { now: new Date("2026-11-10T13:32:00Z") });
  assert.equal(decision.send, true);
  assert.equal(decision.local_date, "2026-11-11");
  assert.equal(decision.local_minutes, 2);
});

test("the same instant is a different local time in another timezone", () => {
  // 03:00Z is 22:00 the previous day in New York.
  const decision = decide(
    { timezone: NY, focus_nudge_time: "21:50" },
    { now: new Date("2026-11-10T03:00:00Z") },
  );
  assert.equal(decision.send, true);
  assert.equal(decision.local_date, "2026-11-09");
  assert.equal(decision.local_minutes, 22 * 60);
});

test("fall back: the repeated hour lands inside the window, but the day is spent", () => {
  // New York, 2026-11-01: 01:30 happens twice (05:30Z as EDT, 06:30Z as EST).
  const firstPass = decide(
    { timezone: NY, focus_nudge_time: "01:30" },
    { now: new Date("2026-11-01T05:30:00Z") },
  );
  assert.equal(firstPass.send, true);
  assert.equal(firstPass.local_date, "2026-11-01");

  // The first pass went out, so the row now carries the day.
  const secondPass = decide(
    { timezone: NY, focus_nudge_time: "01:30", focus_nudge_last_sent_local_date: "2026-11-01" },
    { now: new Date("2026-11-01T06:30:00Z") },
  );
  assert.equal(secondPass.local_minutes, 1 * 60 + 30, "the wall clock really is 01:30 again");
  assert.equal(secondPass.send, false, "the once-a-day rule, not the clock, stops the repeat");
  assert.equal(secondPass.reason, "already_sent_today");
});

test("spring forward: a time the clock skips is passed over, not sent at the wrong hour", () => {
  // New York, 2026-03-08: 02:00 jumps to 03:00. 07:00Z is 03:00 local.
  const skipped = decide(
    { timezone: NY, focus_nudge_time: "02:30" },
    { now: new Date("2026-03-08T07:00:00Z") },
  );
  assert.equal(skipped.reason, "outside_window");
  assert.equal(skipped.local_minutes, 3 * 60);

  const reachable = decide(
    { timezone: NY, focus_nudge_time: "03:00" },
    { now: new Date("2026-03-08T07:00:00Z") },
  );
  assert.equal(reachable.send, true);
});

/* ── one per day, quiet hours, tasks, sessions ─────────────────────────────── */

test("at most one nudge per local day", () => {
  assert.equal(decide({ focus_nudge_last_sent_local_date: "2026-11-10" }).reason, "already_sent_today");
  assert.equal(decide({ focus_nudge_last_sent_local_date: "2026-11-09" }).send, true, "yesterday does not block today");
});

test("quiet hours are respected, including the untouched default window", () => {
  const inWindow = decide({
    quiet_hours_user_set: undefined,
    quiet_hours_enabled: true,
    quiet_hours_start: "13:00",
    quiet_hours_end: "14:00",
  });
  assert.equal(inWindow.reason, "quiet_hours");

  // A row nobody has saved still gets the 21:00-07:30 default.
  const defaultWindow = decide(
    { quiet_hours_user_set: undefined, quiet_hours_enabled: undefined, focus_nudge_time: "21:30" },
    { now: new Date("2026-11-10T11:00:00Z") }, // 21:30 Adelaide
  );
  assert.equal(defaultWindow.local_minutes, 21 * 60 + 30);
  assert.equal(defaultWindow.reason, "quiet_hours");

  // An explicit opt-out of quiet hours removes the window entirely.
  const optedOut = decide(
    { quiet_hours_user_set: true, quiet_hours_enabled: false, focus_nudge_time: "21:30" },
    { now: new Date("2026-11-10T11:00:00Z") },
  );
  assert.equal(optedOut.send, true);
});

test("no open tasks means no nudge", () => {
  assert.equal(decide({}, { openTaskCount: 0 }).reason, "no_open_tasks");
});

test("a session already started today means no nudge", () => {
  const startedToday = decide(
    {},
    { lastSessionActivityMs: Date.parse("2026-11-10T02:00:00Z") }, // 12:30 Adelaide
  );
  assert.equal(startedToday.reason, "session_started_today");

  // 13:00Z the day before is 23:30 on the 9th, before local midnight.
  const yesterdayOnly = decide(
    {},
    { lastSessionActivityMs: Date.parse("2026-11-09T13:00:00Z") },
  );
  assert.equal(yesterdayOnly.send, true);
});

test("every guard reports its own reason", () => {
  assert.equal(decide({ focus_nudge_enabled: false }).reason, "not_enabled");
  assert.equal(decide({ focus_nudge_enabled: undefined }).reason, "not_enabled");
  assert.equal(decide({ focus_nudge_paused: true }).reason, "paused");
  assert.equal(decide({}, { playerId: null }).reason, "no_player_id");
  assert.equal(decide({ timezone: undefined }).reason, "no_timezone");
  assert.equal(decide({ timezone: "Not/AZone" }).reason, "no_timezone");
  assert.equal(decide({ focus_nudge_time: undefined }).reason, "no_nudge_time");
  assert.equal(decide({ focus_nudge_time: "25:00" }).reason, "no_nudge_time");
});

/* ── ignored nudges and back-off ───────────────────────────────────────────── */

const NOW = new Date("2026-11-10T03:00:00Z");
const logRow = (over = {}) => ({
  id: "log-1",
  user_id: "u1",
  sent_at: "2026-11-09T23:00:00.000Z", // four hours before NOW
  local_date: "2026-11-10",
  session_started: false,
  ...over,
});

test("only closed, unjudged nudges are evaluated", () => {
  const due = pendingEvaluations(
    [
      logRow({ id: "closed" }),
      logRow({ id: "still-open", sent_at: "2026-11-10T02:00:00.000Z" }),
      logRow({ id: "judged", evaluated_at: "2026-11-10T02:30:00.000Z" }),
      logRow({ id: "answered", session_started: true }),
      logRow({ id: "no-date", sent_at: null }),
    ],
    NOW,
  );
  assert.deepEqual(due.map((row) => row.id), ["closed"]);
});

test("a session inside three hours counts as started; one outside does not", () => {
  const sentAt = Date.parse("2026-11-09T23:00:00Z");
  const inside = evaluateIgnored(logRow(), sentAt + 20 * 60 * 1000, NOW);
  assert.deepEqual(inside, { started: true, started_within_minutes: 20 });

  const outside = evaluateIgnored(logRow(), sentAt + 4 * 60 * 60 * 1000, NOW);
  assert.deepEqual(outside, { started: false, started_within_minutes: null });

  const before = evaluateIgnored(logRow(), sentAt - 60 * 1000, NOW);
  assert.deepEqual(before, { started: false, started_within_minutes: null });

  const unknown = evaluateIgnored(logRow(), null, NOW);
  assert.deepEqual(unknown, { started: false, started_within_minutes: null });
});

test("three ignored in a row pause the nudge; one session resets the count", () => {
  assert.equal(nextIgnoredCount(0, { started: false }), 1);
  assert.equal(nextIgnoredCount(1, { started: false }), 2);
  assert.equal(nextIgnoredCount(2, { started: false }), 3);
  assert.equal(nextIgnoredCount(7, { started: false }), 3, "the count never runs past three");
  assert.equal(nextIgnoredCount(2, { started: true, started_within_minutes: 12 }), 0);
  assert.equal(nextIgnoredCount(undefined, { started: false }), 1);

  assert.equal(shouldPause(2), false);
  assert.equal(shouldPause(3), true);
  assert.equal(shouldPause(undefined), false);
});

/* ── dry-run safety ────────────────────────────────────────────────────────── */

test("the dry-run branch returns before every write-capable call", () => {
  const src = readFileSync(new URL("../base44/functions/sendFocusNudges/entry.ts", import.meta.url), "utf8");

  const dryAt = src.indexOf("if (dryRun) {");
  assert.ok(dryAt > -1, "the function has a dry-run branch");
  const dryReturn = src.indexOf("dry_run: true", dryAt);
  assert.ok(dryReturn > dryAt, "the dry-run branch returns its report");

  const block = src.slice(dryAt, dryReturn);
  for (const write of [
    "NotificationPreferences.update",
    "NotificationPreferences.create",
    "NudgeLog.create",
    "NudgeLog.update",
    "await sendOneSignal(",
    "entities.User.update",
  ]) {
    assert.equal(block.includes(write), false, `the dry-run block must not call ${write}`);
  }

  // The report is built from the same rule the live sweep uses.
  assert.ok(block.includes("decideFocusNudge"), "the dry run reports the real decision");
  assert.ok(
    src.indexOf("would_notify") > dryAt,
    "the dry run names the users it would nudge",
  );

  for (const write of [
    "NotificationPreferences.update",
    "NudgeLog.create",
    "NudgeLog.update",
    "await sendOneSignal(",
    "entities.User.update",
  ]) {
    const at = src.indexOf(write);
    assert.ok(at > -1, `${write} still exists in the live path`);
    assert.ok(at > dryReturn, `${write} must be unreachable from the dry-run branch`);
  }
});

/* ── the opt-in cannot switch on email ─────────────────────────────────────── */

test("a newly created preferences row keeps every other notification off", () => {
  const row = buildNewPreferencesRow({
    userId: "u1",
    time: "09:00",
    timezone: ADL,
  });

  assert.equal(row.focus_nudge_enabled, true);
  assert.equal(row.focus_nudge_time, "09:00");
  assert.equal(row.timezone, ADL);

  for (const flag of [
    "task_reminders",
    "goal_reminders",
    "habit_reminders",
    "achievement_notifications",
    "team_notifications",
    "email_notifications",
  ]) {
    assert.equal(row[flag], false, `${flag} must be explicitly false, never a default`);
  }
  assert.equal(row.email_digest, "none");
});

test("opting in on an existing row leaves its email and reminder flags alone", () => {
  const patch = buildNudgeOptInPayload({ userId: "u1", time: "09:00" });
  for (const untouched of ["email_notifications", "email_digest", "task_reminders", "timezone"]) {
    assert.equal(untouched in patch, false, `${untouched} must not be touched by the opt-in`);
  }
  assert.equal(patch.focus_nudge_enabled, true);
  assert.equal(patch.focus_nudge_paused, false);
});

test("the nudge log is owner-readable only, and its schema carries the state fields", () => {
  const entity = readFileSync(new URL("../base44/entities/NudgeLog.jsonc", import.meta.url), "utf8");
  const parsed = JSON.parse(entity);
  for (const field of ["user_id", "sent_at", "local_date", "session_started", "started_within_minutes"]) {
    assert.ok(parsed.properties[field], `NudgeLog needs ${field}`);
  }
  assert.equal(JSON.stringify(parsed.rls.read).includes('"admin"'), false, "no admin read");
  assert.ok(parsed.rls.read["data.user_id"], "the owner reads their own rows");
});

test("the six nudge fields exist on the preferences schema", () => {
  const parsed = JSON.parse(
    readFileSync(new URL("../base44/entities/NotificationPreferences.jsonc", import.meta.url), "utf8"),
  );
  for (const field of [
    "focus_nudge_enabled",
    "focus_nudge_time",
    "focus_nudge_paused",
    "focus_nudge_ignored_count",
    "focus_nudge_last_sent_local_date",
    "focus_nudge_last_sent_at",
  ]) {
    assert.ok(parsed.properties[field], `NotificationPreferences needs ${field}`);
  }
  assert.equal(parsed.properties.focus_nudge_enabled.default, false);
  assert.equal(parsed.properties.focus_nudge_paused.default, false);
  assert.equal(parsed.properties.focus_nudge_ignored_count.default, 0);
});