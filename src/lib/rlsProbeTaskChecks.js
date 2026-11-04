import { base44 } from '@/api/base44Client';
import { asRows, describeError, stamped, windowSubscribe } from '@/lib/rlsProbeCommon';

/**
 * Task sentinel checks — the Task rule is LIVE:
 *   read / update : created_by_id | owner_user_id | assigned_to | team_member_ids | admin
 *   delete        : created_by_id | owner_user_id | admin      (no assignee, no team member)
 *   create        : created_by_id only
 *
 * Sentinels (created by rlsProbeRowSetup):
 *   A — personal task, owner_user_id = the outlook account
 *   B — team task, team_member_ids = hotmail + schools
 *   C — task assigned_to hotmail only
 *
 * Expected per account (admin reaches everything through the admin branch):
 *   outlook  A present · B present · C present
 *   hotmail  A absent  · B present · C present
 *   schools  A absent  · B present · C absent
 *
 * Writes are deliberately narrow: B and C are updated and then restored to their
 * original description, and delete is only ever attempted on A by a caller who is
 * expected to be refused, so no sentinel is removed.
 */

const lower = (v) => String(v || '').toLowerCase();

export function taskExpectations(s = {}, me = {}) {
  const email = lower(me.email);
  const admin = me.role === 'admin';
  const owner = !!email && email === lower(s.owner_email);
  const member = (s.b_member_emails || []).some((e) => lower(e) === email);
  const assignee = !!email && email === lower(s.c_assignee_email);
  return { A: owner || admin ? 1 : 0, B: member || admin ? 1 : 0, C: assignee || admin ? 1 : 0 };
}

const show = (v) => `A ${v.A === 1 ? 'present' : 'absent'} · B ${v.B === 1 ? 'present' : 'absent'} · C ${v.C === 1 ? 'present' : 'absent'}`;
const showCount = (v) => `A ${v.A} · B ${v.B} · C ${v.C}`;

const skipped = (check, why) => ({ check, ok: false, label: `SKIPPED — ${why}`, raw: { skipped: why } });

const context = (s, me, exp, extra = {}) => ({
  rule: 'live — read/update: creator | owner | assignee | team member | admin; delete: creator | owner | admin',
  sentinels: s,
  caller: { email: me?.email ?? null, role: me?.role ?? null },
  expected_rows: exp,
  ...extra,
});

async function checkList(s, me, exp) {
  const check = 'Task 1/8 list() — A absent, B present, C present for a non-member';
  try {
    const rows = asRows(await base44.entities.Task.list({ limit: 500 }));
    const ids = new Set(rows.map((r) => r.id));
    const got = { A: ids.has(s.a) ? 1 : 0, B: ids.has(s.b) ? 1 : 0, C: ids.has(s.c) ? 1 : 0 };
    const ok = got.A === exp.A && got.B === exp.B && got.C === exp.C;
    return {
      check,
      ok,
      label: `${ok ? 'PASS' : 'FAIL'} — got ${show(got)} of ${rows.length} tasks listed; expected ${showCount(exp)}`,
      raw: context(s, me, exp, { rows_returned: rows.length, got }),
    };
  } catch (err) {
    return { check, ok: false, label: 'FAIL — list request failed', raw: describeError(err) };
  }
}

async function checkFilterA(s, me, exp) {
  const check = `Task 2/8 filter({ id: A }) — expect ${exp.A} row${exp.A === 1 ? '' : 's'}`;
  try {
    const rows = asRows(await base44.entities.Task.filter({ id: s.a }));
    const ok = rows.length === exp.A;
    return {
      check,
      ok,
      label: `${ok ? 'PASS' : 'FAIL'} — ${rows.length} row${rows.length === 1 ? '' : 's'} returned, expected ${exp.A}`,
      raw: context(s, me, exp, { returned: rows.length, expected: exp.A }),
    };
  } catch (err) {
    const described = describeError(err);
    const ok = exp.A === 0 && described.status === 403;
    return {
      check,
      ok,
      label: ok ? 'PASS — 403 permission denied' : `FAIL — ${described.status ?? 'no status'} ${described.error}`,
      raw: context(s, me, exp, described),
    };
  }
}

async function checkUpdate(label, role, s, me, exp) {
  const id = role === 'A' ? s.a : role === 'B' ? s.b : s.c;
  const expectAllowed = exp[role] === 1;
  const check = `Task ${label} update on ${role} — expect ${expectAllowed ? 'accepted, value restored after' : 'denied (403)'}`;
  if (!id) return skipped(check, `no ${role} id in this link`);

  // Capture the original so the sentinel is left as it was found.
  let original = null;
  try {
    const before = asRows(await base44.entities.Task.filter({ id }))[0] || null;
    original = before?.description ?? null;
  } catch {
    original = null; // unreadable for this caller: nothing to restore to
  }

  const marker = `probe touch ${new Date().toISOString()}`;
  let accepted = false;
  let failure = null;
  try {
    await base44.entities.Task.update(id, { description: marker });
    accepted = true;
  } catch (err) {
    failure = describeError(err);
  }

  if (!accepted) {
    const denied = failure?.status === 403;
    const ok = !expectAllowed && denied;
    return {
      check,
      ok,
      label: denied
        ? `${expectAllowed ? 'FAIL' : 'PASS'} — 403 permission denied${expectAllowed ? ', but this caller should have been allowed' : ''}`
        : `FAIL — ${failure?.status ?? 'no status'} ${failure?.error}`,
      raw: context(s, me, exp, { sentinel_role: role, sentinel_id: id, expected: expectAllowed ? 'accepted' : '403', ...(failure || {}) }),
    };
  }

  // Accepted: confirm the write landed, then put the original back.
  let written = null;
  let restored = null;
  let restoreError = null;
  try {
    const after = asRows(await base44.entities.Task.filter({ id }))[0] || null;
    written = after ? after.description === marker : null;
    await base44.entities.Task.update(id, { description: original });
    const back = asRows(await base44.entities.Task.filter({ id }))[0] || null;
    restored = back ? (back.description ?? null) === original : null;
  } catch (err) {
    restoreError = describeError(err);
  }

  const ok = expectAllowed && written !== false && restored !== false;
  return {
    check,
    ok,
    label: `${ok ? 'PASS' : 'FAIL'} — update accepted${written === false ? ', value did not change' : ''}${
      restored === true ? ', original value restored' : restored === false ? ', RESTORE DID NOT LAND' : ', restore unverified'
    }`,
    raw: context(s, me, exp, {
      sentinel_role: role,
      sentinel_id: id,
      marker_written: written,
      original_description: original,
      restored,
      restore_error: restoreError,
    }),
  };
}

async function checkDeleteA(s, me, exp) {
  const check = 'Task 7/8 delete on A — expect 403, sentinel never deleted';
  if (!s.a) return skipped(check, 'no A id in this link');
  if (exp.A === 1) return skipped(check, 'this caller could delete A (owner/admin) — not attempted, sentinel kept');

  try {
    await base44.entities.Task.delete(s.a);
    return {
      check,
      ok: false,
      label: 'FAIL — delete was ACCEPTED; sentinel A may have been removed',
      raw: context(s, me, exp, { deleted: true }),
    };
  } catch (err) {
    const described = describeError(err);
    const ok = described.status === 403;
    return {
      check,
      ok,
      label: ok ? 'PASS — 403 permission denied, nothing deleted' : `FAIL — ${described.status ?? 'no status'} ${described.error}`,
      raw: context(s, me, exp, { deleted: false, ...described }),
    };
  }
}

async function checkSubscribe(label, role, s, me, exp) {
  const id = role === 'A' ? s.a : role === 'B' ? s.b : s.c;
  const expectEvents = exp[role] === 1;
  const check = `Task ${label} subscribe 10s on ${role} — expect ${expectEvents ? '≥1 event' : '0 events'}`;
  if (!id) return skipped(check, `no ${role} id in this link`);

  const socket = await windowSubscribe(base44.entities.Task, 10000);

  let touch = null;
  try {
    const res = await base44.functions.invoke('rlsProbeRowTouch', { entity_name: 'Task', record_id: id });
    touch = res?.data ?? res;
  } catch (err) {
    touch = describeError(err);
  }

  await socket.wait();
  socket.close();

  const count = socket.events.filter((e) => e.id === id).length;
  const ok = expectEvents ? count >= 1 : count === 0;

  return {
    check,
    ok,
    label: `${ok ? 'PASS' : 'FAIL'} — ${count} event${count === 1 ? '' : 's'} received, expected ${expectEvents ? 'at least 1' : '0'}`,
    raw: context(s, me, exp, {
      window_seconds: 10,
      sentinel_role: role,
      sentinel_id: id,
      events_for_sentinel: count,
      events_received_total: socket.events.length,
      expectation: expectEvents ? 'at least 1 event' : '0 events',
      touch_request: touch,
      subscribe_error: socket.subscribeError,
    }),
  };
}

export async function runTaskChecks(s = {}, me = {}) {
  if (!s || (!s.a && !s.b && !s.c)) return [];
  const exp = taskExpectations(s, me);
  const steps = [
    stamped(() => checkList(s, me, exp)),
    stamped(() => checkFilterA(s, me, exp)),
    stamped(() => checkUpdate('3/8', 'A', s, me, exp)),
    stamped(() => checkUpdate('4/8', 'B', s, me, exp)),
    stamped(() => checkUpdate('5/8', 'C', s, me, exp)),
    stamped(() => checkDeleteA(s, me, exp)),
    stamped(() => checkSubscribe('7/8', 'A', s, me, exp)),
    stamped(() => checkSubscribe('8/8', 'B', s, me, exp)),
  ];
  const results = [];
  for (const step of steps) results.push(await step());
  return results;
}