/**
 * Unit tests for the caller gate — the rule that decides whether a request with
 * no token, a non-admin user, or an admin may run a gated function.
 *
 * Run: node --test tests/*.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveCaller,
  requireAdmin,
  requireUser,
} from "../base44/shared/authGuard.ts";

const clientWith = (me) => ({ auth: { me } });

/** What the SDK actually does with no token: throws, and not with a 401. */
const noToken = () =>
  Promise.reject(
    Object.assign(new Error("You must be logged in to access this app"), {
      status: 403,
    })
  );
const resolves = (user) => () => Promise.resolve(user);

test("resolveCaller: a throwing me() is no caller", async () => {
  assert.equal(await resolveCaller(clientWith(noToken)), null);
});

test("resolveCaller: a resolving null me() is no caller", async () => {
  assert.equal(await resolveCaller(clientWith(resolves(null))), null);
});

test("resolveCaller: an admin resolves to the caller", async () => {
  const caller = await resolveCaller(clientWith(resolves({ id: "u-admin", role: "admin" })));
  assert.equal(caller.id, "u-admin");
});

test("requireAdmin: no token → 401, both throw and null shapes", async () => {
  for (const me of [noToken, resolves(null)]) {
    const gate = await requireAdmin(clientWith(me));
    assert.equal(gate.ok, false);
    assert.equal(gate.response.status, 401);
    assert.deepEqual(await gate.response.json(), { error: "Unauthorized" });
  }
});

test("requireAdmin: a non-auth failure is still 401, never a 500", async () => {
  const gate = await requireAdmin(
    clientWith(() => Promise.reject(new Error("network unreachable")))
  );
  assert.equal(gate.ok, false);
  assert.equal(gate.response.status, 401);
});

test("requireAdmin: non-admin → 403", async () => {
  const gate = await requireAdmin(clientWith(resolves({ id: "u-1", role: "user" })));
  assert.equal(gate.ok, false);
  assert.equal(gate.response.status, 403);
  assert.deepEqual(await gate.response.json(), { error: "Forbidden" });
});

test("requireAdmin: admin → passes and carries the caller", async () => {
  const gate = await requireAdmin(clientWith(resolves({ id: "u-admin", role: "admin" })));
  assert.equal(gate.ok, true);
  assert.equal(gate.user.id, "u-admin");
  assert.equal(gate.user.role, "admin");
});

test("requireUser: no token → 401", async () => {
  const gate = await requireUser(clientWith(noToken));
  assert.equal(gate.ok, false);
  assert.equal(gate.response.status, 401);
});

test("requireUser: any signed-in role passes, admin included", async () => {
  for (const role of ["user", "admin"]) {
    const gate = await requireUser(clientWith(resolves({ id: "u-2", role })));
    assert.equal(gate.ok, true);
    assert.equal(gate.user.role, role);
  }
});