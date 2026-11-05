/**
 * Decision unit test for resolveTaskTeamStamp — the rule that decides what
 * happens to a team task's member snapshot.
 *
 * Run: node --test tests/*.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveTaskTeamStamp,
  taskCreatorId,
  snapshotDiffers,
  clearNoticesFor,
} from "../base44/shared/teamMemberSnapshot.ts";

// Owner is on the team, plus two unrelated teammates.
const MEMBERS = ["user-home-1", "user-home-2", "user-owner"];

/** What the sweep leaves on the row for a given decision. */
const snapshotAfter = (decision, stored) => {
  if (decision.action === "stamp") return MEMBERS;
  if (decision.action === "clear") return [];
  return stored; // leave: untouched
};

test("member creator: stamped with the team's members", () => {
  const task = { id: "task-1", team_id: "team-1", created_by_id: "user-owner", team_member_ids: [] };
  const decision = resolveTaskTeamStamp({ task, members: MEMBERS });

  assert.equal(decision.action, "stamp");
  assert.equal(decision.reason, "member");
  assert.equal(decision.creator_id, "user-owner");
  assert.deepEqual(snapshotAfter(decision, task.team_member_ids), MEMBERS);
});

test("non-member creator: cleared", () => {
  const task = { id: "task-2", team_id: "team-1", created_by_id: "user-stranger", team_member_ids: [] };
  const decision = resolveTaskTeamStamp({ task, members: MEMBERS });

  assert.equal(decision.action, "clear");
  assert.equal(decision.reason, "not_member");
  assert.equal(decision.creator_id, "user-stranger");
  assert.deepEqual(snapshotAfter(decision, task.team_member_ids), []);
});

test("admin creator who is not on the team: stamped", () => {
  const task = { id: "task-3", team_id: "team-1", created_by_id: "user-admin", team_member_ids: [] };
  const decision = resolveTaskTeamStamp({ task, members: MEMBERS, creatorIsAdmin: true });

  assert.equal(decision.action, "stamp");
  assert.equal(decision.reason, "admin");
  assert.equal(decision.creator_id, "user-admin");
  assert.deepEqual(snapshotAfter(decision, task.team_member_ids), MEMBERS);
});

test("service creator with a member owner: judged by the owner, stamped", () => {
  const task = {
    id: "task-4",
    team_id: "team-1",
    created_by_id: "service_recurring_spawn",
    owner_user_id: "user-owner",
    team_member_ids: [],
  };
  const decision = resolveTaskTeamStamp({ task, members: MEMBERS });

  assert.equal(taskCreatorId(task), "user-owner");
  assert.equal(decision.action, "stamp");
  assert.equal(decision.reason, "member");
  assert.equal(decision.creator_id, "user-owner");
  assert.deepEqual(snapshotAfter(decision, task.team_member_ids), MEMBERS);
});

test("service creator with no owner: no one to check, cleared", () => {
  const task = {
    id: "task-5",
    team_id: "team-1",
    created_by_id: "service_recurring_spawn",
    team_member_ids: [],
  };
  const decision = resolveTaskTeamStamp({ task, members: MEMBERS, creatorIsAdmin: true });

  assert.equal(taskCreatorId(task), null);
  assert.equal(decision.action, "clear");
  assert.equal(decision.reason, "missing_creator");
  assert.equal(decision.creator_id, null);
  assert.deepEqual(snapshotAfter(decision, task.team_member_ids), []);
});

test("leaver with creator in snapshot: left untouched, not cleared, not restamped", () => {
  // Stamped while user-leaver was on the team; they have since left.
  const stored = ["user-home-1", "user-home-2", "user-leaver"];
  const task = {
    id: "task-6",
    team_id: "team-1",
    created_by_id: "user-leaver",
    team_member_ids: stored,
  };
  const decision = resolveTaskTeamStamp({ task, members: MEMBERS });

  assert.equal(decision.action, "leave");
  assert.equal(decision.reason, "former_member");
  assert.equal(decision.creator_id, "user-leaver");
  assert.deepEqual(snapshotAfter(decision, stored), stored);
});

test("deleted account in snapshot: left untouched", () => {
  // The creator's account is gone: not a team member, cannot be an admin, but
  // their id is still in the row's snapshot from when it was stamped.
  const stored = ["user-home-1", "user-home-2", "user-deleted-account"];
  const task = {
    id: "task-7",
    team_id: "team-1",
    created_by_id: "user-deleted-account",
    team_member_ids: stored,
  };
  const decision = resolveTaskTeamStamp({ task, members: MEMBERS, creatorIsAdmin: false });

  assert.equal(decision.action, "leave");
  assert.equal(decision.reason, "former_member");
  assert.deepEqual(snapshotAfter(decision, stored), stored);
});

test("sweep over an already-empty snapshot: clear decision, nothing written, rejected_notified 0", () => {
  // Dry run of one sweep iteration: a stray team_id on a row that never carried
  // a snapshot. Same clear decision, but there is nothing to empty.
  const task = { id: "task-8", team_id: "team-1", created_by_id: "user-stranger", team_member_ids: [] };
  const decision = resolveTaskTeamStamp({ task, members: MEMBERS });
  assert.equal(decision.action, "clear");

  const wrote = snapshotDiffers(task.team_member_ids, []);
  assert.equal(wrote, false);

  const rejected = [{ task_id: task.id, team_id: task.team_id, reason: decision.reason, wrote }];
  assert.equal(clearNoticesFor(rejected, "sweep").length, 0); // rejected_notified: 0
  assert.equal(clearNoticesFor(rejected, "trigger").length, 1); // trigger still notifies
});

test("sweep over a snapshot it had to empty: one notice, as before", () => {
  // Same row after the sweep writes: a snapshot existed, so the write happened.
  const rejected = [{ task_id: "task-9", team_id: "team-1", reason: "not_member", wrote: true }];
  assert.equal(clearNoticesFor(rejected, "sweep").length, 1);
  assert.equal(clearNoticesFor(rejected, "trigger").length, 1);
  // Mixed run: only the cleared one is announced.
  const mixed = [{ task_id: "task-8", team_id: "team-1", reason: "not_member", wrote: false }, rejected[0]];
  assert.deepEqual(clearNoticesFor(mixed, "sweep").map((r) => r.task_id), ["task-9"]);
});