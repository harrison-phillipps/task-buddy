/**
 * Unit tests for the AI nudge tone filter.
 *
 * Run: node --test tests/*.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  NEUTRAL_NUDGE,
  MAX_NUDGE_WORDS,
  nudgeViolations,
  sanitizeNudge,
} from "../src/lib/nudgeTone.js";

test("the fallback line itself breaks no rule", () => {
  assert.deepEqual(nudgeViolations(NEUTRAL_NUDGE), []);
});

test("a plain, gentle message passes", () => {
  assert.deepEqual(nudgeViolations("A short walk before the next block can help."), []);
  assert.deepEqual(nudgeViolations("Your calendar looks clear if you want to start."), []);
});

test("guilt and being-behind wording is caught", () => {
  assert.ok(nudgeViolations("You should have started earlier today.").includes("guilt_or_behind"));
  assert.ok(nudgeViolations("You are behind on your plan.").includes("guilt_or_behind"));
  assert.ok(nudgeViolations("You haven't touched this one yet.").includes("guilt_or_behind"));
  assert.ok(nudgeViolations("Let's catch up on the backlog.").includes("guilt_or_behind"));
});

test("streak and comparison wording is caught", () => {
  assert.ok(nudgeViolations("Protect your 12 day streak today.").includes("streak_or_comparison"));
  assert.ok(nudgeViolations("Everyone else finished this already.").includes("streak_or_comparison"));
  assert.ok(nudgeViolations("You rank better than most people.").includes("streak_or_comparison"));
});

test("urgency wording is caught", () => {
  assert.ok(nudgeViolations("Hurry and start the next task.").includes("urgency"));
  assert.ok(nudgeViolations("This is urgent for the deadline.").includes("urgency"));
  assert.ok(nudgeViolations("Don't forget the report.").includes("urgency"));
});

test("format rules are caught", () => {
  assert.ok(nudgeViolations("Start now!").includes("exclamation"));
  assert.ok(nudgeViolations("Nice work 💪🎉").includes("too_many_emoji"));
  assert.ok(nudgeViolations("One 🎯").length === 0); // a single emoji is allowed
  const long = Array.from({ length: MAX_NUDGE_WORDS + 1 }, () => "word").join(" ");
  assert.ok(nudgeViolations(long).includes("too_long"));
});

test("sanitizeNudge swaps a bad message for the neutral line", () => {
  const cleaned = sanitizeNudge({
    nudge_type: "momentum_keeper",
    message: "You're behind — hurry up!",
    action_label: "Start now",
    action_type: "start_focus",
  });
  assert.equal(cleaned.message, NEUTRAL_NUDGE);
  assert.equal(cleaned.action_label, null);
  assert.equal(cleaned.action_type, "none");
  assert.equal(cleaned.nudge_type, "momentum_keeper");
});

test("sanitizeNudge keeps a clean message and a short action", () => {
  const cleaned = sanitizeNudge({
    nudge_type: "break_suggestion",
    message: "A five minute pause might help here.",
    action_label: "Take a break",
    action_type: "take_break",
  });
  assert.equal(cleaned.message, "A five minute pause might help here.");
  assert.equal(cleaned.action_label, "Take a break");
  assert.equal(cleaned.action_type, "take_break");
});

test("sanitizeNudge drops an over-long or exclamatory action label", () => {
  const long = sanitizeNudge({
    nudge_type: "productivity_boost",
    message: "A small step is enough for now.",
    action_label: "Start working on the next task",
    action_type: "start_task",
  });
  assert.equal(long.action_label, null);
  assert.equal(long.action_type, "none");

  const shouting = sanitizeNudge({
    nudge_type: "productivity_boost",
    message: "A small step is enough for now.",
    action_label: "Go!",
    action_type: "start_task",
  });
  assert.equal(shouting.action_label, null);
  assert.equal(shouting.action_type, "none");
});

test("sanitizeNudge repairs an unknown nudge type", () => {
  const cleaned = sanitizeNudge({
    nudge_type: "not_a_type",
    message: "A small step is enough for now.",
    action_type: "none",
  });
  assert.equal(cleaned.nudge_type, "productivity_boost");
});