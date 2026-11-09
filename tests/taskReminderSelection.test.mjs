/**
 * Unit tests for the reminder selection rule — the decision that says which
 * tasks are due a reminder right now, before anything is written or sent.
 *
 * Fixed instant for every case: 2026-11-10T03:00:00Z, which is 13:30 on
 * 10 November in Adelaide (ACDT, UTC+10:30).
 *
 * Run: node --test tests/*.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  selectDueReminders,
  reminderKey,
  DEFAULT_REMINDER_MINUTES,
} from "../base44/shared/taskReminderSelection.ts";

const ADL = "Australia/Adelaide";
const NOW = new Date("2026-11-10T03:00:00Z"); // 13:30 Adelaide

const task = (over = {}) => ({
  id: "t1",
  title: "Task",
  status: "not_started",
  created_by_id: "u1",
  due_date: "2026-11-10",
  ...over,
});

const prefs = (over = {}) => ({
  u1: { user_id: "u1", timezone: ADL, task_reminder_minutes: 60, ...over },
});

const run = (over = {}) =>
  selectDueReminders({
    tasks: [task()],
    prefsByUserId: prefs(),
    now: NOW,
    ...over,
  });

test("timed task inside the window is selected for push", () => {
  // Due 14:30 Adelaide = 04:00Z, exactly the 60-minute lead.
  const { selected, skipped } = run({ tasks: [task({ due_time: "14:30" })] });
  assert.equal(selected.length, 1);
  assert.equal(skipped.outside_window, 0);
  assert.equal(selected[0].timeSource, "task_due_time");
  assert.equal(selected[0].dueTime, "14:30");
  assert.equal(selected[0].dueAt, "2026-11-10T04:00:00.000Z");
  assert.equal(selected[0].timezone, ADL);
  assert.equal(selected[0].userId, "u1");
  assert.equal(selected[0].quiet, false);
  assert.equal(selected[0].canPush, true);

  // The 5-minute tolerance either side of the lead is the whole window.
  assert.equal(run({ tasks: [task({ due_time: "14:34" })] }).selected.length, 1);
  assert.equal(run({ tasks: [task({ due_time: "14:35" })] }).selected.length, 1); // inclusive edge
  assert.equal(run({ tasks: [task({ due_time: "14:36" })] }).selected.length, 0);
  assert.equal(run({ tasks: [task({ due_time: "14:25" })] }).selected.length, 1); // inclusive edge
  assert.equal(run({ tasks: [task({ due_time: "14:24" })] }).selected.length, 0);
});

test("timed task outside the window is skipped", () => {
  const tooLate = run({ tasks: [task({ due_time: "16:00" })] });
  assert.equal(tooLate.selected.length, 0);
  assert.equal(tooLate.skipped.outside_window, 1);

  const alreadyPast = run({ tasks: [task({ due_time: "10:00" })] });
  assert.equal(alreadyPast.selected.length, 0);
  assert.equal(alreadyPast.skipped.outside_window, 1);

  // A different lead time moves the window with it.
  const twoHours = run({
    tasks: [task({ due_time: "15:25" })],
    prefsByUserId: prefs({ task_reminder_minutes: 120 }),
  });
  assert.equal(twoHours.selected.length, 1);

  // Default lead when the row does not set one.
  assert.equal(DEFAULT_REMINDER_MINUTES, 60);
  assert.equal(
    run({ tasks: [task({ due_time: "14:30" })], prefsByUserId: { u1: { user_id: "u1", timezone: ADL } } }).selected.length,
    1,
  );
});

test("a task already reminded today is not reminded again", () => {
  const alreadyNotified = new Set([reminderKey("u1", "t1", "2026-11-10")]);
  const { selected, skipped } = run({ tasks: [task({ due_time: "14:30" })], alreadyNotified });
  assert.equal(selected.length, 0);
  assert.equal(skipped.already_notified, 1);

  // Yesterday's key does not block today.
  const stale = new Set([reminderKey("u1", "t1", "2026-11-09")]);
  assert.equal(run({ tasks: [task({ due_time: "14:30" })], alreadyNotified: stale }).selected.length, 1);
});

test("a completed task is never selected", () => {
  const { selected, skipped } = run({ tasks: [task({ due_time: "14:30", status: "completed" })] });
  assert.equal(selected.length, 0);
  assert.equal(skipped.completed, 1);
});

test("quiet hours keep the in-app reminder but drop push and email", () => {
  // 13:30 Adelaide falls inside this window.
  const quietPrefs = prefs({
    quiet_hours_user_set: true,
    quiet_hours_enabled: true,
    quiet_hours_start: "13:00",
    quiet_hours_end: "14:00",
  });
  const { selected } = run({ tasks: [task({ due_time: "14:30" })], prefsByUserId: quietPrefs });
  assert.equal(selected.length, 1, "the in-app row is still written");
  assert.equal(selected[0].quiet, true);
  assert.equal(selected[0].canPush, false);
});

test("an untimed task gets the 08:00 local fallback and never pushes", () => {
  // 08:02 Adelaide = 21:32Z the evening before.
  const atEight = new Date("2026-11-09T21:32:00Z");
  const selectedRun = run({ tasks: [task()], now: atEight });
  assert.equal(selectedRun.selected.length, 1);
  assert.equal(selectedRun.selected[0].timeSource, "untimed");
  assert.equal(selectedRun.selected[0].dueTime, null);
  assert.equal(selectedRun.selected[0].dueAt, null);
  assert.equal(selectedRun.selected[0].canPush, false, "untimed tasks stay in-app and email");

  // 08:06 local is outside the fallback window.
  const late = new Date("2026-11-09T21:36:00Z");
  const lateRun = run({ tasks: [task()], now: late });
  assert.equal(lateRun.selected.length, 0);
  assert.equal(lateRun.skipped.outside_window, 1);

  // A task due tomorrow waits for its own 08:00.
  const tomorrow = run({ tasks: [task({ due_date: "2026-11-11" })], now: atEight });
  assert.equal(tomorrow.selected.length, 0);
});

test("a calendar start time is the second time source, after due_time", () => {
  const withCalendar = run({
    tasks: [task()],
    calendarTimeByTaskId: { t1: "14:30" },
  });
  assert.equal(withCalendar.selected.length, 1);
  assert.equal(withCalendar.selected[0].timeSource, "calendar_start_time");
  assert.equal(withCalendar.selected[0].dueTime, "14:30");
  assert.equal(withCalendar.selected[0].canPush, true);

  // due_time wins when both exist.
  const both = run({
    tasks: [task({ due_time: "14:30" })],
    calendarTimeByTaskId: { t1: "16:00" },
  });
  assert.equal(both.selected[0].timeSource, "task_due_time");

  // An unparseable calendar time falls back to untimed, not to a guess:
  // it gets the 08:00 fallback and no push.
  const badCalendar = run({
    tasks: [task()],
    calendarTimeByTaskId: { t1: "afternoon" },
    now: new Date("2026-11-09T21:32:00Z"), // 08:02 Adelaide
  });
  assert.equal(badCalendar.selected.length, 1);
  assert.equal(badCalendar.selected[0].timeSource, "untimed");
  assert.equal(badCalendar.selected[0].canPush, false);
});

test("another timezone near midnight is judged by the owner's day, not the server's", () => {
  // 23:01Z on 9 November: Tokyo is 08:01 on 10 November, Adelaide is 09:31 on
  // 10 November, Los Angeles is 15:01 on 9 November. One instant, three days.
  const nearMidnight = new Date("2026-11-09T23:01:00Z");
  const tokyoPrefs = { u1: { user_id: "u1", timezone: "Asia/Tokyo", task_reminder_minutes: 60 } };
  const laPrefs = { u1: { user_id: "u1", timezone: "America/Los_Angeles", task_reminder_minutes: 60 } };

  // Tokyo: untimed task due 10 November is due on their today -> 08:01 fallback.
  const tokyoUntimed = selectDueReminders({
    tasks: [task({ due_date: "2026-11-10" })],
    prefsByUserId: tokyoPrefs,
    now: nearMidnight,
  });
  assert.equal(tokyoUntimed.selected.length, 1);
  assert.equal(tokyoUntimed.selected[0].timeSource, "untimed");

  // Tokyo, same instant, a task due 9 November: that is their yesterday.
  const tokyoYesterday = selectDueReminders({
    tasks: [task({ due_date: "2026-11-09" })],
    prefsByUserId: tokyoPrefs,
    now: nearMidnight,
  });
  assert.equal(tokyoYesterday.selected.length, 0);

  // Tokyo: a timed task at 09:05 local is 64 minutes out -> inside the window.
  const tokyoTimed = selectDueReminders({
    tasks: [task({ due_date: "2026-11-10", due_time: "09:05" })],
    prefsByUserId: tokyoPrefs,
    now: nearMidnight,
  });
  assert.equal(tokyoTimed.selected.length, 1);
  assert.equal(tokyoTimed.selected[0].dueAt, "2026-11-10T00:05:00.000Z");

  // Los Angeles is on 9 November — a different day from Adelaide's 10 November.
  // The widened query carries the row and this owner still gets their reminder.
  const laTimed = selectDueReminders({
    tasks: [task({ due_date: "2026-11-09", due_time: "16:01" })],
    prefsByUserId: laPrefs,
    now: nearMidnight,
  });
  assert.equal(laTimed.selected.length, 1);
  assert.equal(laTimed.selected[0].timezone, "America/Los_Angeles");
  assert.equal(laTimed.selected[0].dueAt, "2026-11-10T00:01:00.000Z");

  // And their untimed 08:00 is nowhere near this instant.
  const laUntimed = selectDueReminders({
    tasks: [task({ due_date: "2026-11-09" })],
    prefsByUserId: laPrefs,
    now: nearMidnight,
  });
  assert.equal(laUntimed.selected.length, 0);
});