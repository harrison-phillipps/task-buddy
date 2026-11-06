/**
 * Unit tests for the calendar-event match rule — the only thing that authorises
 * calendarEventsCleanup to delete an event.
 *
 * Run: node --test tests/*.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { eventMatchesTask, normalizeTitle } from "../base44/shared/calendarEventMatch.ts";

const TASK = { id: "6a230588e62ffa3d5d7c87e5", title: "Draft the report" };

/** What pushTaskToCalendar writes to Google. */
const googleEvent = (over = {}) => ({
  summary: "📋 Draft the report",
  description: "Notes\nTag: work\nTaskBuddy task ID: 6a230588e62ffa3d5d7c87e5",
  ...over,
});

/** What pushTaskToCalendar writes to Outlook. */
const outlookEvent = (over = {}) => ({
  subject: "📋 Draft the report",
  body: {
    contentType: "HTML",
    content: "Notes<br>Category: work<br>TaskBuddy task ID: 6a230588e62ffa3d5d7c87e5",
  },
  ...over,
});

test("normalizeTitle: strips the 📋 marker, case and extra whitespace", () => {
  assert.equal(normalizeTitle("📋 Draft the report"), "draft the report");
  assert.equal(normalizeTitle("📋Draft  the   report"), "draft the report");
  assert.equal(normalizeTitle("  Draft the report  "), "draft the report");
  assert.equal(normalizeTitle(null), "");
});

test("title: a matching title with the 📋 prefix matches", () => {
  assert.equal(eventMatchesTask({ summary: "📋 Draft the report" }, TASK), "title");
});

test("title: a matching title with no prefix matches", () => {
  assert.equal(eventMatchesTask({ summary: "Draft the report" }, TASK), "title");
});

test("title: case and whitespace differences still match", () => {
  assert.equal(eventMatchesTask({ summary: "  📋  DRAFT THE   REPORT " }, TASK), "title");
});

test("title: the Outlook subject field is read too", () => {
  assert.equal(eventMatchesTask({ subject: "📋 Draft the report" }, TASK), "title");
});

test("title: a different title with no tag is refused", () => {
  assert.equal(eventMatchesTask({ summary: "📋 Something else", description: "no tag here" }, TASK), null);
});

test("description: the task id tag authorises an event whose title drifted", () => {
  assert.equal(eventMatchesTask(googleEvent({ summary: "📋 Draft the report (2)" }), TASK), "description");
});

test("description: the tag is read out of Outlook's HTML body", () => {
  assert.equal(eventMatchesTask(outlookEvent({ subject: "Weekly review" }), TASK), "description");
});

test("description: the tag is case-insensitive", () => {
  assert.equal(
    eventMatchesTask({ summary: "Other", description: "taskbuddy task id:6a230588e62ffa3d5d7c87e5" }, TASK),
    "description"
  );
});

test("description: a tag for a longer id does not authorise a shorter task id", () => {
  const shortTask = { id: "6a230588", title: "Draft the report" };
  assert.equal(eventMatchesTask({ summary: "Something else", description: "TaskBuddy task ID: 6a230588e62ffa3d5d7c87e5" }, shortTask), null);
});

test("description: a truncated tag does not authorise the full task id", () => {
  assert.equal(eventMatchesTask({ summary: "Something else", description: "TaskBuddy task ID: 6a230588" }, TASK), null);
});

test("a null or empty event never matches", () => {
  assert.equal(eventMatchesTask(null, TASK), null);
  assert.equal(eventMatchesTask({}, TASK), null);
  assert.equal(eventMatchesTask({ summary: "", description: "" }, TASK), null);
});

test("an event with no task is never matched", () => {
  assert.equal(eventMatchesTask(googleEvent(), null), null);
  assert.equal(eventMatchesTask(googleEvent(), { id: "" }), null);
});

test("two empty titles do not match on emptiness alone", () => {
  assert.equal(eventMatchesTask({ summary: "📋" }, { id: TASK.id, title: "" }), null);
});