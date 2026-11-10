/**
 * Quick-start focus sessions — task choice and URL params.
 *
 * The focus nudge card opens /FocusSession?minutes=10&quickStart=1 with no task
 * id, so these two helpers decide both what runs and for how long.
 *
 * Run: node --test tests/*.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { pickQuickStartTask, parseFocusParams } from "../src/lib/focusQuickStart.js";

const task = (over = {}) => ({
  id: "t",
  title: "A task",
  status: "not_started",
  task_priority: null,
  due_date: null,
  created_date: "2026-11-01T00:00:00.000Z",
  ...over,
});

test("must-do comes first, whatever its due date", () => {
  const picked = pickQuickStartTask([
    task({ id: "soon", due_date: "2026-11-11" }),
    task({ id: "must", task_priority: "must_do", due_date: "2026-12-31" }),
  ]);
  assert.equal(picked.id, "must");
});

test("then the nearest due date, with undated tasks last", () => {
  const picked = pickQuickStartTask([
    task({ id: "undated" }),
    task({ id: "later", due_date: "2026-11-20" }),
    task({ id: "sooner", due_date: "2026-11-12" }),
  ]);
  assert.equal(picked.id, "sooner");

  const noDates = pickQuickStartTask([task({ id: "undated" })]);
  assert.equal(noDates.id, "undated");
});

test("completed tasks are never chosen", () => {
  const picked = pickQuickStartTask([
    task({ id: "done", status: "completed", task_priority: "must_do", due_date: "2026-11-01" }),
    task({ id: "open", due_date: "2026-11-30" }),
  ]);
  assert.equal(picked.id, "open");
});

test("nothing open returns null rather than a guess", () => {
  assert.equal(pickQuickStartTask([]), null);
  assert.equal(pickQuickStartTask(undefined), null);
  assert.equal(pickQuickStartTask([task({ status: "completed" })]), null);
});

test("the same choice every time when importance and date tie", () => {
  const older = task({ id: "older", created_date: "2026-10-01T00:00:00.000Z" });
  const newer = task({ id: "newer", created_date: "2026-11-05T00:00:00.000Z" });
  assert.equal(pickQuickStartTask([newer, older]).id, "older");
  assert.equal(pickQuickStartTask([older, newer]).id, "older");
});

test("the nudge card's link is read as a 10-minute quick start with no task", () => {
  const params = parseFocusParams("?minutes=10&quickStart=1");
  assert.equal(params.minutes, 10);
  assert.equal(params.quickStart, true);
  assert.equal(params.taskId, null);
});

test("minutes is only honoured when it is a positive number", () => {
  assert.equal(parseFocusParams("?minutes=25").minutes, 25);
  assert.equal(parseFocusParams("?minutes=7.6").minutes, 8, "rounded to whole minutes");
  assert.equal(parseFocusParams("?minutes=0").minutes, null);
  assert.equal(parseFocusParams("?minutes=-5").minutes, null);
  assert.equal(parseFocusParams("?minutes=abc").minutes, null);
  assert.equal(parseFocusParams("").minutes, null);
});

test("the existing task and autostart links keep working", () => {
  const withTask = parseFocusParams("?taskId=abc&taskTitle=Write%20the%20thing");
  assert.equal(withTask.taskId, "abc");
  assert.equal(withTask.taskTitle, "Write the thing");
  assert.equal(withTask.quickStart, false);

  assert.equal(parseFocusParams("?autostart=true").quickStart, true);
  assert.equal(parseFocusParams("?quickStart=0").quickStart, false);
});