import { base44 } from '@/api/base44Client';

/**
 * Temporary RLS verification probes for the Team entity.
 *
 * Every check runs with the SIGNED-IN USER'S OWN client (no service role), so
 * the results are the real RLS outcome for that account. Checks 3 and 4 only
 * ever address a throwaway zzProbe-* row supplied in the page link.
 */

const SENTINEL_PREFIX = 'zzProbe-';
const asRows = (p) => (Array.isArray(p) ? p : (p?.items || []));

export const isSentinelName = (name) =>
  typeof name === 'string' && name.startsWith(SENTINEL_PREFIX);

const describeError = (err) => ({
  failed: true,
  status: err?.response?.status ?? err?.status ?? null,
  error: err?.response?.data?.error ?? err?.message ?? 'request failed',
});

export async function checkList() {
  try {
    const rows = asRows(await base44.entities.Team.list());
    const sentinels = rows
      .filter((t) => isSentinelName(t.name))
      .map((t) => ({ id: t.id, name: t.name }));
    return {
      check: '1. Team.list()',
      ok: true,
      raw: {
        count: rows.length,
        names: rows.map((t) => t.name),
        sentinel_count: sentinels.length,
        sentinels,
      },
    };
  } catch (err) {
    return { check: '1. Team.list()', ok: false, raw: describeError(err) };
  }
}

export async function checkFilter(teamId) {
  if (!teamId) {
    return { check: '2. Team.filter({ id })', ok: false, raw: { skipped: 'no sentinel id in the link' } };
  }
  try {
    const rows = asRows(await base44.entities.Team.filter({ id: teamId }));
    return {
      check: '2. Team.filter({ id: <sentinel A> })',
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
    return { check: '2. Team.filter({ id: <sentinel A> })', ok: false, raw: describeError(err) };
  }
}

export async function checkUpdate(teamId) {
  if (!teamId) {
    return { check: '3. direct Team.update()', ok: false, raw: { skipped: 'no sentinel id in the link' } };
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
      });
    });
  } catch (err) {
    subscribeError = describeError(err);
  }

  let touch = null;
  try {
    const res = await base44.functions.invoke('rlsProbeTouch', { team_id: teamId });
    touch = res?.data ?? res;
  } catch (err) {
    touch = describeError(err);
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

export async function checkJoin(code) {
  if (!code) {
    return { check: '5. joinTeamByCode()', ok: false, raw: { skipped: 'no sentinel code in the link' } };
  }
  try {
    const res = await base44.functions.invoke('joinTeamByCode', { code });
    const data = res?.data ?? res;
    return {
      check: '5. joinTeamByCode() with the sentinel A code',
      ok: true,
      raw: {
        http: 200,
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
      check: '5. joinTeamByCode() with the sentinel A code',
      ok: false,
      raw: describeError(err),
    };
  }
}

export async function runAllChecks({ sentinelAId, sentinelCode }) {
  const results = [];
  results.push(await checkList());
  results.push(await checkFilter(sentinelAId));
  results.push(await checkUpdate(sentinelAId));
  results.push(await checkSubscribe(sentinelAId));
  results.push(await checkJoin(sentinelCode));
  return results;
}