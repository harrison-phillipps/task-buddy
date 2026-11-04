/**
 * Decision unit test for resolveTaskTeamStamp — the rule that decides whether a
 * team task may carry its team's member snapshot.
 *
 * Run: node --test tests/
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveTaskTeamStamp,
  teamMembers,
  taskCreatorId,
} from "../base44/shared/teamMemberSnapshot.ts";

// Owner is on the team, plus one unrelated teammate.
const TEAM = { member_user_ids: ["user-owner", "user-teammate"] };
const members = teamMembers(TEAM);

/** What the sweep writes for a given decision. */
const snapshotFor = (decision) => (decision.stamp ? members : []);

test("member creator: stamped with the team's members", () => {
  const task = { id: "task-1", team_id: "team-1", created_by_id: "user-owner" };
  const decision = resolveTaskTeamStamp({ task, members });

  assert.equal(decision.stamp, true);
  assert.equal(decision.reason, "member");
  assert.equal(decision.creator_id, "user-owner");
  assert.deepEqual(snapshotFor(decision), ["user-owner", "user-teammate"]);
});

test("non-member creator: not stamped, snapshot cleared", () => {
  const task = { id: "task-2", team_id: "team-1", created_by_id: "user-stranger" };
  const decision = resolveTaskTeamStamp({ task, members });

  assert.equal(decision.stamp, false);
  assert.equal(decision.reason, "not_member");
  assert.equal(decision.creator_id, "user-stranger");
  assert.deepEqual(snapshotFor(decision), []);
});

test("admin creator who is not on the team: stamped", () => {
  const task = { id: "task-3", team_id: "team-1", created_by_id: "user-admin" };
  const decision = resolveTaskTeamStamp({ task, members, creatorIsAdmin: true });

  assert.equal(decision.stamp, true);
  assert.equal(decision.reason, "admin");
  assert.equal(decision.creator_id, "user-admin");
  assert.deepEqual(snapshotFor(decision), ["user-owner", "user-teammate"]);
});

test("service creator with a member owner: judged by the owner, stamped", () => {
  const task = {
    id: "task-4",
    team_id: "team-1",
    created_by_id: "service_recurring_spawn",
    owner_user_id: "user-owner",
  };
  const decision = resolveTaskTeamStamp({ task, members });

  assert.equal(taskCreatorId(task), "user-owner");
  assert.equal(decision.stamp, true);
  assert.equal(decision.reason, "member");
  assert.equal(decision.creator_id, "user-owner");
  assert.deepEqual(snapshotFor(decision), ["user-owner", "user-teammate"]);
});

test("service creator with no owner: no one to check, snapshot cleared", () => {
  const task = {
    id: "task-5",
    team_id: "team-1",
    created_by_id: "service_recurring_spawn",
  };
  const decision = resolveTaskTeamStamp({ task, members, creatorIsAdmin: true });

  assert.equal(taskCreatorId(task), null);
  assert.equal(decision.stamp, false);
  assert.equal(decision.reason, "missing_creator");
  assert.equal(decision.creator_id, null);
  assert.deepEqual(snapshotFor(decision), []);
});