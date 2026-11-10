/**
 * Tests that a dry run of the reminder sweep cannot write anything, and that the
 * report it returns names tasks by id only.
 *
 * Two levels:
 *   1. Behaviour — buildDryRunReport / decideTaskReminder are pure, so running
 *      them leaves every input untouched and returns no task text.
 *   2. Structure — the function's dry-run branch returns before the first
 *      write-capable call in the file, so none of them is reachable in that mode.
 *
 * Run: node --test tests/*.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildDryRunReport } from "../base44/shared/reminderDryRun.ts";
import { decideTaskReminder, reminderKey } from "../base44/shared/taskReminderSelection.ts";

const ADL = "Australia/Adelaide";
const NOW = new Date("2026-11-10T03:00:00Z"); // 13:30 Adelaide
const ENTRY = new URL("../base44/functions/sendUpcomingTaskReminders/entry.ts", import.meta.url);

const task = (over = {}) => ({
  id: "t1",
  title: "Secret title that must never reach the report",
  status: "not_started",
  created_by_id: "u1",
  due_date: "2026-11-10",
  due_time: "14:30",
  ...over,
});

const prefsByUserId = {
  u1: { user_id: "u1", timezone: ADL, task_reminder_minutes: 60, task_reminders: true },
};

test("the dry-run report names ids and reasons, never task text", () => {
  const tasks = [
    task({ id: "in-window" }),
    task({ id: "completed-one", status: "completed" }),
    task({ id: "no-owner", created_by_id: null }),
    task({ id: "too-late", due_time: "18:00" }),
    task({ id: "untimed", due_time: null }),
    task({ id: "already", due_time: "14:30" }),
  ];

  const report = buildDryRunReport(tasks, {
    prefsByUserId,
    now: NOW,
    alreadyNotified: new Set([reminderKey("u1", "already", "2026-11-10")]),
  });

  assert.equal(report.length, tasks.length);

  const byId = Object.fromEntries(report.map((entry) => [entry.task_id, entry]));
  assert.equal(byId["in-window"].reason_skipped, null, "in-window would be notified");
  assert.equal(byId["in-window"].owner_user_id, "u1");
  assert.equal(byId["in-window"].time_source, "task_due_time");
  assert.equal(byId["in-window"].diff_minutes, 60);
  assert.equal(byId["in-window"].can_push, true);

  assert.equal(byId["completed-one"].reason_skipped, "completed");
  assert.equal(byId["no-owner"].reason_skipped, "no_owner");
  assert.equal(byId["too-late"].reason_skipped, "outside_window");
  assert.equal(byId["too-late"].diff_minutes, 270);
  assert.equal(byId["untimed"].reason_skipped, "outside_window");
  assert.equal(byId["untimed"].diff_minutes, null);
  assert.equal(byId["already"].reason_skipped, "already_notified");

  // Nothing task-shaped may leak into the report.
  const serialised = JSON.stringify(report);
  assert.equal(serialised.includes("Secret title"), false);
  assert.equal("title" in byId["in-window"], false);
  for (const entry of report) {
    assert.deepEqual(Object.keys(entry).sort(), [
      "can_push",
      "diff_minutes",
      "owner_user_id",
      "quiet",
      "reason_skipped",
      "task_id",
      "time_source",
    ]);
  }
});

test("a dry run mutates nothing it reads", () => {
  const tasks = [task(), task({ id: "t2", due_time: "09:00" }), task({ id: "t3", status: "completed" })];
  const calendarTimeByTaskId = { t2: "09:00" };
  const alreadyNotified = new Set([reminderKey("u1", "t3", "2026-11-10")]);

  const tasksBefore = JSON.parse(JSON.stringify(tasks));
  const prefsBefore = JSON.parse(JSON.stringify(prefsByUserId));
  const keysBefore = [...alreadyNotified];
  const calendarBefore = JSON.parse(JSON.stringify(calendarTimeByTaskId));

  buildDryRunReport(tasks, { prefsByUserId, now: NOW, alreadyNotified, calendarTimeByTaskId });

  assert.deepEqual(JSON.parse(JSON.stringify(tasks)), tasksBefore);
  assert.deepEqual(JSON.parse(JSON.stringify(prefsByUserId)), prefsBefore);
  assert.deepEqual([...alreadyNotified], keysBefore);
  assert.deepEqual(JSON.parse(JSON.stringify(calendarTimeByTaskId)), calendarBefore);
});

test("decideTaskReminder reports the same verdict the live sweep acts on", () => {
  const selectedDecision = decideTaskReminder(task(), { prefsByUserId, now: NOW });
  assert.equal(selectedDecision.reason, null);
  assert.equal(selectedDecision.canPush, true);
  assert.equal(selectedDecision.diffMinutes, 60);

  const quietDecision = decideTaskReminder(task(), {
    prefsByUserId: {
      u1: {
        user_id: "u1",
        timezone: ADL,
        task_reminder_minutes: 60,
        quiet_hours_user_set: true,
        quiet_hours_enabled: true,
        quiet_hours_start: "13:00",
        quiet_hours_end: "14:00",
      },
    },
    now: NOW,
  });
  assert.equal(quietDecision.reason, null, "quiet hours do not skip the reminder");
  assert.equal(quietDecision.quiet, true);
  assert.equal(quietDecision.canPush, false);
});

test("the dry-run branch returns before every write-capable call", () => {
  const src = readFileSync(ENTRY, "utf8");

  const dryAt = src.indexOf("if (dryRun) {");
  assert.ok(dryAt > -1, "the function has a dry-run branch");

  const dryReturn = src.indexOf("dry_run: true", dryAt);
  assert.ok(dryReturn > dryAt, "the dry-run branch returns its report");

  const block = src.slice(dryAt, dryReturn);
  for (const write of [
    "Notification.create",
    "functions.invoke",
    "SendEmail",
    "entities.User.update",
    "bulkCreate",
    "updateMany",
  ]) {
    assert.equal(block.includes(write), false, `the dry-run block must not call ${write}`);
  }

  // Every write in the file must sit after that return, so the branch's early
  // return is what keeps a dry run free of side effects.
  for (const write of [
    "Notification.create",
    "functions.invoke('sendPushNotification'",
    "integrations.Core.SendEmail",
    "entities.User.update",
  ]) {
    const at = src.indexOf(write);
    assert.ok(at > -1, `${write} still exists in the live path`);
    assert.ok(at > dryReturn, `${write} must be unreachable from the dry-run branch`);
  }
});

test("the prefsByUserId identifier is declared and used consistently", () => {
  const src = readFileSync(ENTRY, "utf8");
  assert.ok(
    src.includes("const prefsByUserId = Object.fromEntries"),
    "the map the selection reads is declared under its own name",
  );
  assert.equal(
    /\bprefByUserId\b/.test(src),
    false,
    "the old misspelling must not come back",
  );
});