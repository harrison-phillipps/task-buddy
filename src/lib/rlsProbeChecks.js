import { base44 } from '@/api/base44Client';
import { asRows, describeError, stamped } from '@/lib/rlsProbeCommon';

/**
 * Temporary RLS verification probes for the Team entity.
 *
 * Every check runs with the SIGNED-IN USER'S OWN client (no service role), so the
 * results are the real RLS outcome for that account. Checks 2-5 only ever address
 * the throwaway team whose exact id came in the page link, and the service role
 * (rlsProbeTouch) refuses any id that rlsProbeSetup did not register — a team merely
 * named zzProbe-* is not acceptable to it.
 *
 * ORDER MATTERS: the join check runs LAST, after read, filter, update and subscribe,
 * because joining is the only check that changes data (it adds the caller to the
 * sentinel's membership). Every result is stamped with start, finish and duration.
 */

const SENTINEL_PREFIX = 'zzProbe-';

/** Display only — used to count zzProbe-* names in a list result. Never an authorisation check. */
export const isSentinelName = (name) =>
  typeof name === 'string' && name.startsWith(SENTINEL_PREFIX);

export async function checkList() {
  try {
    const rows = asRows(await base44.entities.Team.list());
    const named = rows.filter((t) => isSentinelName(t.name)).map((t) => ({ id: t.id, name: t.name }));
    return {
      check: '1. Team.list() — read',
      ok: true,
      raw: {
        count: rows.length,
        names: rows.map((t) => t.name),
        zzProbe_named_visible: named.length,
        zzProbe_named_rows: named,
        note: 'zzProbe_named_visible is a visibility count only, not proof of a sentinel.',
      },
    };
  } catch (err) {
    return { check: '1. Team.list() — read', ok: false, raw: describeError(err) };
  }
}

export async function checkFilter(teamId) {
  if (!teamId) {
    return { check: '2. Team.filter({ id }) — read', ok: false, raw: { skipped: 'no sentinel id in the link' } };
  }
  try {
    const rows = asRows(await base44.entities.Team.filter({ id: teamId }));
    return {
      check: '2. Team.filter({ id: <sentinel A> }) — read',
      ok: true,
      raw: {
        rows_returned: rows.length,
        rows: rows.map((t) => ({
          id: t.id,
          name: t.name,
          member_user_ids: t.member_user_ids ?? null,
        })),
      },
    };
  } catch (err) {
    return { check: '2. Team.filter({ id: <sentinel A> }) — read', ok: false, raw: describeError(err) };
  }
}

export async function checkUpdate(teamId) {
  if (!teamId) {
    return { check: '3. Team.update() — write', ok: false, raw: { skipped: 'no sentinel id in the link' } };
  }
  const marker = `probe touch ${new Date().toISOString()}`;
  try {
    const res = await base44.entities.Team.update(teamId, { description: marker });
    return {
      check: '3. direct Team.update() on sentinel A (harmless field: description)',
      ok: true,
      raw: {
        wrote: true,
        description_attempted: marker,
        returned: {
          id: res?.id ?? null,
          name: res?.name ?? null,
          description: res?.description ?? null,
        },
      },
    };
  } catch (err) {
    return {
      check: '3. direct Team.update() on sentinel A (harmless field: description)',
      ok: false,
      raw: { ...describeError(err), description_attempted: marker },
    };
  }
}

export async function checkSubscribe(teamId) {
  if (!teamId) {
    return { check: '4. subscribe() 10s', ok: false, raw: { skipped: 'no sentinel id in the link' } };
  }
  const events = [];
  let unsubscribe = null;
  let subscribeError = null;
  try {
    unsubscribe = base44.entities.Team.subscribe((event) => {
      events.push({
        type: event?.type ?? null,
        id: event?.id ?? event?.data?.id ?? null,
        name: event?.data?.name ?? null,
        at: new Date().toISOString(),
      });
    });
  } catch (err) {
    subscribeError = describeError(err);
  }

  const touchStartedAt = new Date().toISOString();
  let touch = null;
  try {
    const res = await base44.functions.invoke('rlsProbeTouch', { team_id: teamId });
    touch = { ...(res?.data ?? res), requested_at: touchStartedAt };
  } catch (err) {
    touch = { ...describeError(err), requested_at: touchStartedAt };
  }

  await new Promise((resolve) => setTimeout(resolve, 10000));
  try {
    if (typeof unsubscribe === 'function') unsubscribe();
  } catch {
    /* unsubscribe is best-effort; the socket closes on unmount anyway */
  }

  return {
    check: '4. subscribe() for 10s while the service role updates sentinel A',
    ok: !subscribeError,
    raw: {
      window_seconds: 10,
      events_received: events.length,
      events,
      touch_request: touch,
      subscribe_error: subscribeError,
    },
  };
}

/**
 * Member-side realtime check: the caller IS a member of sentinel B, so a service-role
 * write to B must reach this socket. Pass is defined by the event count (>=1), never by
 * the badge colour — the result carries its own text label.
 */
export async function checkMemberSubscribe(teamId) {
  const title = '5. subscribe() on sentinel B as a member — must receive ≥1 event';
  if (!teamId) {
    return {
      check: title,
      ok: false,
      label: 'SKIPPED — no b= sentinel in this link',
      raw: { skipped: 'no member sentinel id in the link (b=…)' },
    };
  }

  let memberRead;
  try {
    memberRead = asRows(await base44.entities.Team.filter({ id: teamId })).length;
  } catch (err) {
    memberRead = describeError(err);
  }

  const events = [];
  let unsubscribe = null;
  let subscribeError = null;
  try {
    unsubscribe = base44.entities.Team.subscribe((event) => {
      events.push({
        type: event?.type ?? null,
        id: event?.id ?? event?.data?.id ?? null,
        name: event?.data?.name ?? null,
        at: new Date().toISOString(),
      });
    });
  } catch (err) {
    subscribeError = describeError(err);
  }

  const touchRequestedAt = new Date().toISOString();
  let touch = null;
  try {
    const res = await base44.functions.invoke('rlsProbeTouch', { team_id: teamId });
    touch = { ...(res?.data ?? res), requested_at: touchRequestedAt };
  } catch (err) {
    touch = { ...describeError(err), requested_at: touchRequestedAt };
  }

  await new Promise((resolve) => setTimeout(resolve, 10000));
  try {
    if (typeof unsubscribe === 'function') unsubscribe();
  } catch {
    /* unsubscribe is best-effort; the socket closes on unmount anyway */
  }

  const forSentinel = events.filter((e) => e.id === teamId).length;

  return {
    check: title,
    ok: forSentinel >= 1,
    label:
      forSentinel >= 1
        ? `PASS — ${forSentinel} event${forSentinel === 1 ? '' : 's'} received`
        : 'FAIL — 0 events received',
    raw: {
      window_seconds: 10,
      events_for_sentinel_b: forSentinel,
      events_received_total: events.length,
      events,
      member_read_rows: memberRead,
      touch_request: touch,
      subscribe_error: subscribeError,
      pass_rule: 'passes only when at least one event for sentinel B arrives inside the window',
    },
  };
}

export async function checkJoin(code) {
  if (!code) {
    return {
      check: '6. joinTeamByCode() — LAST, changes data',
      ok: false,
      raw: { skipped: 'no sentinel code in the link' },
    };
  }
  const requestedAt = new Date().toISOString();
  try {
    const res = await base44.functions.invoke('joinTeamByCode', { code });
    const data = res?.data ?? res;
    return {
      check: '6. joinTeamByCode() with the sentinel A code — LAST, changes data',
      ok: true,
      raw: {
        http: 200,
        requested_at: requestedAt,
        body: {
          ok: data?.ok ?? null,
          joined: data?.joined ?? null,
          already_member: data?.already_member ?? null,
          member_count: data?.member_count ?? null,
          error: data?.error ?? null,
        },
      },
    };
  } catch (err) {
    return {
      check: '6. joinTeamByCode() with the sentinel A code — LAST, changes data',
      ok: false,
      raw: { ...describeError(err), requested_at: requestedAt },
    };
  }
}

export async function runAllChecks({ sentinelAId, sentinelBId, sentinelCode }) {
  // Fixed order: reads, then the non-member write, then the two subscription windows
  // (A hidden, then B as a member), and only then the join — the one check that
  // mutates membership.
  const steps = [
    stamped(checkList),
    stamped(() => checkFilter(sentinelAId)),
    stamped(() => checkUpdate(sentinelAId)),
    stamped(() => checkSubscribe(sentinelAId)),
    stamped(() => checkMemberSubscribe(sentinelBId)),
    stamped(() => checkJoin(sentinelCode)),
  ];

  const results = [];
  for (const step of steps) {
    const result = await step();
    results.push({ ...result, sequence: results.length + 1 });
  }
  return results;
}