import { base44 } from '@/api/base44Client';
import { asRows, describeError, stamped, windowSubscribe } from '@/lib/rlsProbeCommon';

/**
 * Entity-level RLS probes for ActiveSession, TeamNotification and TeamMessage.
 *
 * Each entity gets five checks, all run with the SIGNED-IN USER'S OWN client:
 *   1. list()                      — count returned, sentinel A hidden and B visible
 *   2. filter({ id: A })           — expect 0 rows (A belongs to someone else)
 *   3. direct update on A          — expect 403
 *   4. subscribe 10s, A touched    — caller is NOT a member, expect 0 events
 *   5. subscribe 10s, B touched    — caller IS a member, expect >= 1 event
 *
 * Sentinel ids come from the link; the service role only writes rows registered in
 * RlsProbeRecord. Every verdict is a sentence with the number in it, never a colour.
 */

export const ROW_ENTITIES = ['ActiveSession', 'TeamNotification', 'TeamMessage'];

/** The harmless field a probe write touches on each entity. */
const TOUCH_FIELD = {
  ActiveSession: 'task_title',
  TeamNotification: 'title',
  TeamMessage: 'content',
};

const entityOf = (name) => base44.entities[name];

const skipped = (check, why) => ({ check, ok: false, label: `SKIPPED — ${why}`, raw: { skipped: why } });

async function checkList(name, aId, bId) {
  const check = `${name} 1/5 list() — count returned`;
  if (!aId || !bId) return skipped(check, 'no sentinel ids for this entity');
  try {
    const rows = asRows(await entityOf(name).list());
    const ids = new Set(rows.map((r) => r.id));
    const aSeen = ids.has(aId) ? 1 : 0;
    const bSeen = ids.has(bId) ? 1 : 0;
    const ok = aSeen === 0 && bSeen === 1;
    return {
      check,
      ok,
      label: `${ok ? 'PASS' : 'FAIL'} — ${rows.length} rows · A seen ${aSeen} · B seen ${bSeen}`,
      raw: {
        rows_returned: rows.length,
        sentinel_a_present: aSeen,
        sentinel_b_present: bSeen,
        note: 'pass needs A absent and B present',
      },
    };
  } catch (err) {
    return { check, ok: false, label: 'FAIL — list request failed', raw: describeError(err) };
  }
}

async function checkFilterA(name, aId) {
  const check = `${name} 2/5 filter({ id: A }) — expect 0 rows`;
  if (!aId) return skipped(check, 'no A id for this entity');
  try {
    const rows = asRows(await entityOf(name).filter({ id: aId }));
    const ok = rows.length === 0;
    return {
      check,
      ok,
      label: `${ok ? 'PASS' : 'FAIL'} — ${rows.length} row${rows.length === 1 ? '' : 's'} returned`,
      raw: { rows_returned: rows.length, sentinel_a_id: aId },
    };
  } catch (err) {
    const described = describeError(err);
    return {
      check,
      ok: described.status === 403,
      label:
        described.status === 403
          ? 'PASS — 403 permission denied'
          : `FAIL — ${described.status ?? 'no status'} ${described.error}`,
      raw: described,
    };
  }
}

async function checkUpdateA(name, aId) {
  const check = `${name} 3/5 direct update on A — expect denied`;
  if (!aId) return skipped(check, 'no A id for this entity');
  const field = TOUCH_FIELD[name];
  const marker = `probe touch ${new Date().toISOString()}`;
  try {
    const res = await entityOf(name).update(aId, { [field]: marker });
    return {
      check,
      ok: false,
      label: `FAIL — update accepted (1 row written to ${field})`,
      raw: { updated: true, rows_written: 1, returned_id: res?.id ?? null, field, marker },
    };
  } catch (err) {
    const described = describeError(err);
    const denied = described.status === 403;
    return {
      check,
      ok: denied,
      label: denied ? 'PASS — 403 permission denied' : `FAIL — ${described.status ?? 'no status'} ${described.error}`,
      raw: { ...described, field, marker },
    };
  }
}

async function checkSubscribe(name, role, recordId) {
  const expectMember = role === 'B';
  const check = expectMember
    ? `${name} 5/5 subscribe 10s — caller IS a member, expect ≥1 event`
    : `${name} 4/5 subscribe 10s — caller is NOT a member, expect 0 events`;
  if (!recordId) return skipped(check, `no ${role} id for this entity`);

  const socket = await windowSubscribe(entityOf(name), 10000);

  const touchRequestedAt = new Date().toISOString();
  let touch = null;
  try {
    const res = await base44.functions.invoke('rlsProbeRowTouch', { entity_name: name, record_id: recordId });
    touch = { ...(res?.data ?? res), requested_at: touchRequestedAt };
  } catch (err) {
    touch = { ...describeError(err), requested_at: touchRequestedAt };
  }

  await socket.wait();
  socket.close();

  const count = socket.events.filter((e) => e.id === recordId).length;
  const ok = expectMember ? count >= 1 : count === 0;

  return {
    check,
    ok,
    label: `${ok ? 'PASS' : 'FAIL'} — ${count} event${count === 1 ? '' : 's'} received`,
    raw: {
      window_seconds: 10,
      events_for_sentinel: count,
      events_received_total: socket.events.length,
      events: socket.events,
      sentinel_role: role,
      sentinel_id: recordId,
      touch_request: touch,
      subscribe_error: socket.subscribeError,
    },
  };
}

export async function runAllEntityChecks(sentinels = {}) {
  const results = [];
  for (const name of ROW_ENTITIES) {
    const pair = sentinels?.[name] || {};
    const steps = [
      stamped(() => checkList(name, pair.a, pair.b)),
      stamped(() => checkFilterA(name, pair.a)),
      stamped(() => checkUpdateA(name, pair.a)),
      stamped(() => checkSubscribe(name, 'A', pair.a)),
      stamped(() => checkSubscribe(name, 'B', pair.b)),
    ];
    for (const step of steps) {
      const result = await step();
      results.push({ ...result, sequence: results.length + 1 });
    }
  }
  return results;
}