import { base44 } from '@/api/base44Client';
import { asRows, describeError, stamped } from '@/lib/rlsProbeCommon';

/**
 * CollaborativeFocusSession sentinel checks — the rule is LIVE:
 *   read / update : created_by_id | host_id | member_user_ids | admin
 *   delete        : created_by_id | host_id | admin      (a plain member cannot delete)
 *   create        : created_by_id only
 *
 * Sentinels (created by rlsProbeRowSetup):
 *   A — host_id = the outlook account, member_user_ids = [outlook]
 *   B — host_id = outlook, member_user_ids = [outlook, hotmail, schools]
 *   C — host_id = hotmail, member_user_ids = [hotmail]
 *
 * Expected is derived at run time from the caller's email and role, never assumed:
 *   host of A (or any admin) — sees A and B
 *   host of C                 — sees C
 *   B member                  — sees B
 *   anyone else               — sees none of the three
 *
 * Writes are narrow: an accepted update is restored to its original task_title, and
 * delete is only attempted on a sentinel the caller is expected to be refused, so no
 * sentinel is ever removed. 403 and 404 on delete both count as denied.
 */

const ENTITY = 'CollaborativeFocusSession';
const lower = (v) => String(v || '').toLowerCase();

export const SESSION_SENTINEL_KEY = ENTITY;

export function sessionExpectations(s = {}, me = {}) {
  const email = lower(me.email);
  const isAdmin = me.role === 'admin';
  const aHost = !!email && email === lower(s.a_host_email);
  const bHost = !!email && email === lower(s.b_host_email);
  const bMember = (s.b_member_emails || []).some((e) => lower(e) === email);
  const cHost = !!email && email === lower(s.c_host_email);
  const basis = [
    aHost && 'host of A',
    bHost && 'host of B',
    bMember && 'member of B',
    cHost && 'host of C',
    isAdmin && 'admin',
  ].filter(Boolean);
  return {
    A: aHost || isAdmin ? 1 : 0,
    B: bHost || bMember || isAdmin ? 1 : 0,
    C: cHost || isAdmin ? 1 : 0,
    updA: aHost || isAdmin,
    updC: cHost || isAdmin,
    delA: aHost || isAdmin,
    delC: cHost || isAdmin,
    basis: basis.length ? basis.join(' + ') : 'this email matches no sentinel branch',
    has_emails: Boolean(
      s.a_host_email || s.b_host_email || s.c_host_email || (s.b_member_emails || []).length,
    ),
  };
}

const show = (v) =>
  `A ${v.A === 1 ? 'present' : 'absent'} · B ${v.B === 1 ? 'present' : 'absent'} · C ${
    v.C === 1 ? 'present' : 'absent'
  }`;
const showCount = (v) => `A ${v.A} · B ${v.B} · C ${v.C}`;

const skipped = (check, why) => ({ check, ok: false, label: `SKIPPED — ${why}`, raw: { skipped: why } });

const context = (s, me, exp, extra = {}) => ({
  rule: 'live — read/update: creator | host | member | admin; delete: creator | host | admin',
  sentinels: s,
  caller: { email: me?.email ?? null, role: me?.role ?? null },
  expected_rows: exp,
  ...extra,
});

async function checkList(s, me, exp) {
  const check = `${ENTITY} 1/7 list() — expect ${showCount(exp)} for ${me?.email || 'unknown'} (${exp.basis})`;
  try {
    const rows = asRows(await base44.entities[ENTITY].list({ limit: 200 }));
    const ids = new Set(rows.map((r) => r.id));
    const got = { A: ids.has(s.a) ? 1 : 0, B: ids.has(s.b) ? 1 : 0, C: ids.has(s.c) ? 1 : 0 };
    const ok = got.A === exp.A && got.B === exp.B && got.C === exp.C;
    return {
      check,
      ok,
      label: `${ok ? 'PASS' : 'FAIL'} — got ${show(got)} of ${rows.length} rows listed; expected ${showCount(exp)}`,
      raw: context(s, me, exp, { rows_returned: rows.length, got }),
    };
  } catch (err) {
    return { check, ok: false, label: 'FAIL — list request failed', raw: describeError(err) };
  }
}

async function checkFilter(label, role, s, me, exp) {
  const id = role === 'A' ? s.a : s.c;
  const expected = exp[role];
  const check = `${ENTITY} ${label} filter({ id: ${role} }) — expect ${expected} row${expected === 1 ? '' : 's'}`;
  if (!id) return skipped(check, `no ${role} id in this link`);
  try {
    const rows = asRows(await base44.entities[ENTITY].filter({ id }));
    const ok = rows.length === expected;
    return {
      check,
      ok,
      label: `${ok ? 'PASS' : 'FAIL'} — ${rows.length} row${rows.length === 1 ? '' : 's'} returned, expected ${expected}`,
      raw: context(s, me, exp, { sentinel_role: role, sentinel_id: id, returned: rows.length, expected }),
    };
  } catch (err) {
    const described = describeError(err);
    const ok = expected === 0 && described.status === 403;
    return {
      check,
      ok,
      label: ok ? 'PASS — 403 permission denied' : `FAIL — ${described.status ?? 'no status'} ${described.error}`,
      raw: context(s, me, exp, { sentinel_role: role, ...described }),
    };
  }
}

async function checkUpdate(label, role, s, me, exp) {
  const id = role === 'A' ? s.a : s.c;
  const expectAllowed = role === 'A' ? exp.updA : exp.updC;
  const check = `${ENTITY} ${label} update on ${role} — expect ${
    expectAllowed ? 'accepted, value restored after' : 'denied (403)'
  }`;
  if (!id) return skipped(check, `no ${role} id in this link`);

  let original = null;
  try {
    const before = asRows(await base44.entities[ENTITY].filter({ id }))[0] || null;
    original = before?.task_title ?? null;
  } catch {
    original = null;
  }

  const marker = `probe touch ${new Date().toISOString()}`;
  let accepted = false;
  let failure = null;
  try {
    await base44.entities[ENTITY].update(id, { task_title: marker });
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
        ? `${expectAllowed ? 'FAIL' : 'PASS'} — 403 permission denied${
            expectAllowed ? ', but this caller should have been allowed' : ''
          }`
        : `FAIL — ${failure?.status ?? 'no status'} ${failure?.error}`,
      raw: context(s, me, exp, {
        sentinel_role: role,
        sentinel_id: id,
        expected: expectAllowed ? 'accepted' : '403',
        ...(failure || {}),
      }),
    };
  }

  let written = null;
  let restored = null;
  let restoreError = null;
  try {
    const after = asRows(await base44.entities[ENTITY].filter({ id }))[0] || null;
    written = after ? after.task_title === marker : null;
    await base44.entities[ENTITY].update(id, { task_title: original });
    const back = asRows(await base44.entities[ENTITY].filter({ id }))[0] || null;
    restored = back ? (back.task_title ?? null) === original : null;
  } catch (err) {
    restoreError = describeError(err);
  }

  const ok = expectAllowed && written !== false && restored !== false;
  return {
    check,
    ok,
    label: `${ok ? 'PASS' : 'FAIL'} — update accepted${
      written === false ? ', value did not change' : ''
    }${
      restored === true
        ? ', original value restored'
        : restored === false
        ? ', RESTORE DID NOT LAND'
        : ', restore unverified'
    }`,
    raw: context(s, me, exp, {
      sentinel_role: role,
      sentinel_id: id,
      marker_written: written,
      original_task_title: original,
      restored,
      restore_error: restoreError,
    }),
  };
}

async function checkDelete(label, role, s, me, exp) {
  const id = role === 'A' ? s.a : s.c;
  const couldDelete = role === 'A' ? exp.delA : exp.delC;
  const check = `${ENTITY} ${label} delete on ${role} — expect 403 or 404 (denied), sentinel never deleted`;
  if (!id) return skipped(check, `no ${role} id in this link`);
  if (couldDelete) {
    return skipped(check, `this caller could delete ${role} (host/creator/admin) — not attempted, sentinel kept`);
  }

  try {
    await base44.entities[ENTITY].delete(id);
    return {
      check,
      ok: false,
      label: `FAIL — delete was ACCEPTED; sentinel ${role} may have been removed`,
      raw: context(s, me, exp, { deleted: true, sentinel_role: role, sentinel_id: id }),
    };
  } catch (err) {
    const described = describeError(err);
    const status = described.status;
    const denied = status === 403 || status === 404;
    return {
      check,
      ok: denied,
      label: denied
        ? `PASS — denied with ${status} (${status === 404 ? 'not found' : 'permission denied'}), nothing deleted`
        : `FAIL — ${status ?? 'no status'} ${described.error}`,
      raw: context(s, me, exp, {
        deleted: false,
        sentinel_role: role,
        sentinel_id: id,
        expected: '403 or 404 (denied)',
        ...described,
      }),
    };
  }
}

export async function runSessionChecks(s = {}, me = {}) {
  if (!s || (!s.a && !s.b && !s.c)) return [];
  const exp = sessionExpectations(s, me);
  if (!exp.has_emails) {
    return [
      {
        check: `${ENTITY} checks`,
        ok: false,
        label:
          'SKIPPED — this link carried no sentinel emails, so the expected rows cannot be derived. Re-copy the link from the probe page after "Create entity sentinels".',
        raw: { sentinels: s, caller: { email: me?.email ?? null, role: me?.role ?? null } },
      },
    ];
  }
  const steps = [
    stamped(() => checkList(s, me, exp)),
    stamped(() => checkFilter('2/7', 'A', s, me, exp)),
    stamped(() => checkFilter('3/7', 'C', s, me, exp)),
    stamped(() => checkUpdate('4/7', 'A', s, me, exp)),
    stamped(() => checkUpdate('5/7', 'C', s, me, exp)),
    stamped(() => checkDelete('6/7', 'A', s, me, exp)),
    stamped(() => checkDelete('7/7', 'C', s, me, exp)),
  ];
  const results = [];
  for (const step of steps) results.push(await step());
  return results;
}