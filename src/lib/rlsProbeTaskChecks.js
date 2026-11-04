import { base44 } from '@/api/base44Client';
import { asRows, describeError, stamped, windowSubscribe } from '@/lib/rlsProbeCommon';

/**
 * Task sentinels for the PROPOSED Task rule — which is NOT applied yet, so every check
 * here is a baseline and is EXPECTED TO FAIL until the rule lands. A PASS today would
 * mean a rule is already in force.
 *
 * Sentinels (created by rlsProbeRowSetup):
 *   A — personal task, owner_user_id = the outlook account
 *   B — team task, team_member_ids = hotmail + schools
 *   C — task assigned_to hotmail only
 *
 * Expected rows per account (admin can read everything through the admin branch):
 *   outlook  A 1 · B 1 · C 1   (owner branch on A, admin branch elsewhere)
 *   hotmail  A 0 · B 1 · C 1
 *   schools  A 0 · B 1 · C 0
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

const show = (v) => `A ${v.A} · B ${v.B} · C ${v.C}`;

const skipped = (check, why) => ({ check, ok: false, label: `SKIPPED — ${why}`, raw: { skipped: why } });

const baseline = (s, me) => ({
  applied: false,
  expected_per_account: {
    outlook: { A: 1, B: 1, C: 1 },
    hotmail: { A: 0, B: 1, C: 1 },
    schools: { A: 0, B: 1, C: 0 },
  },
  sentinels: s,
  caller: { email: me?.email ?? null, role: me?.role ?? null },
  note: 'Task has no rls yet: every Task check FAILs until the proposed rule is applied.',
});

async function checkList(s, me, exp) {
  const check = 'Task 1/6 list() — A/B/C visible vs expected';
  try {
    const rows = asRows(await base44.entities.Task.list());
    const ids = new Set(rows.map((r) => r.id));
    const got = { A: ids.has(s.a) ? 1 : 0, B: ids.has(s.b) ? 1 : 0, C: ids.has(s.c) ? 1 : 0 };
    const ok = got.A === exp.A && got.B === exp.B && got.C === exp.C;
    return {
      check,
      ok,
      label: `${ok ? 'PASS' : 'FAIL'} — expected ${show(exp)}, got ${show(got)}`,
      raw: { rows_returned: rows.length, expected: exp, got, ...baseline(s, me) },
    };
  } catch (err) {
    return { check, ok: false, label: 'FAIL — list request failed', raw: describeError(err) };
  }
}

async function checkSentinel(step, role, s, me, exp) {
  const id = role === 'A' ? s.a : role === 'B' ? s.b : s.c;
  const expect = exp[role];
  const check = `Task ${step} filter({ id: ${role} }) — expect ${expect} row${expect === 1 ? '' : 's'}`;
  if (!id) return skipped(check, `no ${role} id in this link`);
  try {
    const rows = asRows(await base44.entities.Task.filter({ id }));
    const ok = rows.length === expect;
    return {
      check,
      ok,
      label: `${ok ? 'PASS' : 'FAIL'} — ${rows.length} row${rows.length === 1 ? '' : 's'} returned, expected ${expect}`,
      raw: { sentinel_role: role, sentinel_id: id, returned: rows.length, expected: expect, ...baseline(s, me) },
    };
  } catch (err) {
    const described = describeError(err);
    const ok = expect === 0 && described.status === 403;
    return {
      check,
      ok,
      label: ok
        ? 'PASS — 403 permission denied'
        : `FAIL — ${described.status ?? 'no status'} ${described.error}`,
      raw: { sentinel_role: role, sentinel_id: id, expected: expect, ...described, ...baseline(s, me) },
    };
  }
}

async function checkUpdateA(s, me, exp) {
  const expectAllowed = exp.A === 1;
  const check = `Task 5/6 direct update on A — expect ${expectAllowed ? 'accepted (owner/admin)' : 'denied (403)'}`;
  if (!s.a) return skipped(check, 'no A id in this link');
  const marker = `probe touch ${new Date().toISOString()}`;
  try {
    await base44.entities.Task.update(s.a, { description: marker });
    return {
      check,
      ok: expectAllowed,
      label: expectAllowed
        ? 'PASS — update accepted, as expected for the owner/admin'
        : 'FAIL — update accepted, but this caller is neither owner nor admin',
      raw: { updated: true, marker, expected: expectAllowed ? 'accepted' : '403', ...baseline(s, me) },
    };
  } catch (err) {
    const described = describeError(err);
    const denied = described.status === 403;
    return {
      check,
      ok: !expectAllowed && denied,
      label: denied
        ? 'PASS — 403 permission denied'
        : `FAIL — ${described.status ?? 'no status'} ${described.error}`,
      raw: { marker, expected: expectAllowed ? 'accepted' : '403', ...described, ...baseline(s, me) },
    };
  }
}

async function checkSubscribeB(s, me, exp) {
  const expectEvents = exp.B === 1;
  const check = `Task 6/6 subscribe 10s on B — expect ${expectEvents ? '≥1 event' : '0 events'}`;
  if (!s.b) return skipped(check, 'no B id in this link');

  const socket = await windowSubscribe(base44.entities.Task, 10000);

  const touchRequestedAt = new Date().toISOString();
  let touch = null;
  try {
    const res = await base44.functions.invoke('rlsProbeRowTouch', { entity_name: 'Task', record_id: s.b });
    touch = { ...(res?.data ?? res), requested_at: touchRequestedAt };
  } catch (err) {
    touch = { ...describeError(err), requested_at: touchRequestedAt };
  }

  await socket.wait();
  socket.close();

  const count = socket.events.filter((e) => e.id === s.b).length;
  const ok = expectEvents ? count >= 1 : count === 0;

  return {
    check,
    ok,
    label: `${ok ? 'PASS' : 'FAIL'} — ${count} event${count === 1 ? '' : 's'} received, expected ${expectEvents ? 'at least 1' : '0'}`,
    raw: {
      window_seconds: 10,
      events_for_sentinel: count,
      events_received_total: socket.events.length,
      sentinel_id: s.b,
      expectation: expectEvents ? 'at least 1 event' : '0 events',
      touch_request: touch,
      subscribe_error: socket.subscribeError,
      ...baseline(s, me),
    },
  };
}

export async function runTaskChecks(s = {}, me = {}) {
  if (!s || (!s.a && !s.b && !s.c)) return [];
  const exp = taskExpectations(s, me);
  const steps = [
    stamped(() => checkList(s, me, exp)),
    stamped(() => checkSentinel('2/6', 'A', s, me, exp)),
    stamped(() => checkSentinel('3/6', 'B', s, me, exp)),
    stamped(() => checkSentinel('4/6', 'C', s, me, exp)),
    stamped(() => checkUpdateA(s, me, exp)),
    stamped(() => checkSubscribeB(s, me, exp)),
  ];
  const results = [];
  for (const step of steps) results.push(await step());
  return results;
}