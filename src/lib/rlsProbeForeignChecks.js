import { base44 } from '@/api/base44Client';
import { asRows, describeError } from '@/lib/rlsProbeCommon';

/**
 * TEMPORARY — foreign-row checks for the seven-entity run.
 *
 * Every check runs with the SIGNED-IN USER'S OWN client, so RLS is what decides
 * the outcome. Expectations come from the rules as written in
 * base44/entities/<Entity>.jsonc; each result carries the rule text it was
 * derived from so the numbers can be judged without trusting the label.
 *
 * Safety:
 *  - an update that succeeds is restored to its seeded value immediately
 *  - a delete expected to succeed is NEVER executed
 *  - a row a check unexpectedly creates is deleted again, and its id reported
 */

const HOTMAIL = '6a61816f1e6ed9f4008cdc78';
const SCHOOLS = '6a83bdb5d956875ae281ac2f';

const ACCOUNT_OF = {
  [HOTMAIL]: 'hotmail',
  [SCHOOLS]: 'schools',
};

const ARRAY_NOTE =
  'reads `data.member_user_ids == {{user.id}}` as "the id is in the array"; that is what TeamMessage showed, but it is not independently confirmed for this entity';

const STAMP_NOTE =
  'depends on the sentinel row carrying created_by_id = service_3b355b66… (confirmed when the sentinels were created), so the created_by_id branch never matches a probe account';

const SESSION_READ =
  'read: created_by_id == {{user.id}} OR data.host_id == {{user.id}} OR data.member_user_ids == {{user.id}} OR role == admin';
const SESSION_WRITE = SESSION_READ.replace('read:', 'update:');
const SESSION_DELETE = 'delete: created_by_id == {{user.id}} OR data.host_id == {{user.id}} OR role == admin';

const TEMPLATE_READ = 'read: data.member_user_ids == {{user.id}} OR created_by_id == {{user.id}} OR role == admin';
const TEMPLATE_UPDATE = 'update: data.member_user_ids == {{user.id}} OR role == admin';
const TEMPLATE_DELETE = 'delete: created_by_id == {{user.id}} OR role == admin';

const LEADERBOARD_ALL = 'read/create/update/delete: user_condition { role: "admin" } and nothing else';

const COMMENT_READ =
  'read: created_by_id == {{user.id}} OR data.user_id == {{user.id}} OR data.member_user_ids == {{user.id}} OR role == admin';
const COMMENT_WRITE = 'update/delete: data.user_id == {{user.id}} OR role == admin';

const ACTIVITY_READ =
  'read: data.user_id == {{user.id}} OR data.member_user_ids == {{user.id}} OR created_by_id == {{user.id}} OR role == admin';
const ACTIVITY_WRITE = 'update/delete: user_condition { role: "admin" } and nothing else';

const SESSION_TITLE = {
  a: 'RLS probe A — safe to delete',
  c: 'RLS probe C — safe to delete',
};

const PLAN = [
  // ── CollaborativeFocusSession ───────────────────────────────────────────
  { entity: 'CollaborativeFocusSession', who: 'both', sentinel: 'a', kind: 'read', check: 'read foreign row A', expected: '0', rule: SESSION_READ },
  { entity: 'CollaborativeFocusSession', who: 'both', sentinel: 'b', kind: 'read', check: 'read shared row B', expected: '1', rule: SESSION_READ, unsure: true, note: ARRAY_NOTE },
  { entity: 'CollaborativeFocusSession', who: 'hotmail', sentinel: 'c', kind: 'read', check: 'read own row C', expected: '1', rule: SESSION_READ },
  { entity: 'CollaborativeFocusSession', who: 'schools', sentinel: 'c', kind: 'read', check: 'read foreign row C', expected: '0', rule: SESSION_READ },
  { entity: 'CollaborativeFocusSession', who: 'both', sentinel: 'a', kind: 'update', check: 'update foreign row A', expected: 'denied (403)', rule: SESSION_WRITE, field: 'task_title', restore: SESSION_TITLE.a },
  { entity: 'CollaborativeFocusSession', who: 'hotmail', sentinel: 'c', kind: 'update', check: 'update own row C', expected: '1 row written, then restored', rule: SESSION_WRITE, field: 'task_title', restore: SESSION_TITLE.c },
  { entity: 'CollaborativeFocusSession', who: 'schools', sentinel: 'c', kind: 'update', check: 'update foreign row C', expected: 'denied (403)', rule: SESSION_WRITE, field: 'task_title', restore: SESSION_TITLE.c },
  { entity: 'CollaborativeFocusSession', who: 'both', sentinel: 'a', kind: 'delete', check: 'delete foreign row A', expected: 'denied (403)', rule: SESSION_DELETE },
  { entity: 'CollaborativeFocusSession', who: 'schools', sentinel: 'b', kind: 'delete', check: 'delete shared row B', expected: 'denied (403) — delete rule has no member branch', rule: SESSION_DELETE },
  { entity: 'CollaborativeFocusSession', who: 'hotmail', sentinel: 'c', kind: 'delete', check: 'delete own row C', expected: 'allowed — NOT executed', rule: SESSION_DELETE, dangerous: true },

  // ── TeamTemplate ────────────────────────────────────────────────────────
  { entity: 'TeamTemplate', who: 'hotmail', sentinel: 'a', kind: 'read', check: 'read own row A', expected: '1', rule: TEMPLATE_READ },
  { entity: 'TeamTemplate', who: 'schools', sentinel: 'b', kind: 'read', check: 'read own row B', expected: '1', rule: TEMPLATE_READ },
  { entity: 'TeamTemplate', who: 'hotmail', sentinel: 'b', kind: 'read', check: 'read foreign row B', expected: '0', rule: TEMPLATE_READ },
  { entity: 'TeamTemplate', who: 'schools', sentinel: 'a', kind: 'read', check: 'read foreign row A', expected: '0', rule: TEMPLATE_READ },
  { entity: 'TeamTemplate', who: 'both', sentinel: 'c', kind: 'read', check: 'read shared row C', expected: '1', rule: TEMPLATE_READ, unsure: true, note: ARRAY_NOTE },
  { entity: 'TeamTemplate', who: 'hotmail', sentinel: 'a', kind: 'update', check: 'update own row A', expected: '1 row written, then restored', rule: TEMPLATE_UPDATE, field: 'name', restore: 'zzProbe TeamTemplate A — safe to delete', unsure: true, note: ARRAY_NOTE },
  { entity: 'TeamTemplate', who: 'schools', sentinel: 'b', kind: 'update', check: 'update own row B', expected: '1 row written, then restored', rule: TEMPLATE_UPDATE, field: 'name', restore: 'zzProbe TeamTemplate B — safe to delete', unsure: true, note: ARRAY_NOTE },
  { entity: 'TeamTemplate', who: 'hotmail', sentinel: 'b', kind: 'update', check: 'update foreign row B', expected: 'denied (403)', rule: TEMPLATE_UPDATE, field: 'name', restore: 'zzProbe TeamTemplate B — safe to delete' },
  { entity: 'TeamTemplate', who: 'schools', sentinel: 'a', kind: 'update', check: 'update foreign row A', expected: 'denied (403)', rule: TEMPLATE_UPDATE, field: 'name', restore: 'zzProbe TeamTemplate A — safe to delete' },
  { entity: 'TeamTemplate', who: 'hotmail', sentinel: 'a', kind: 'delete', check: 'delete own row A', expected: 'denied (403)', rule: TEMPLATE_DELETE, note: STAMP_NOTE },
  { entity: 'TeamTemplate', who: 'schools', sentinel: 'b', kind: 'delete', check: 'delete own row B', expected: 'denied (403)', rule: TEMPLATE_DELETE, note: STAMP_NOTE },
  { entity: 'TeamTemplate', who: 'both', sentinel: 'c', kind: 'delete', check: 'delete shared row C', expected: 'denied (403)', rule: TEMPLATE_DELETE, note: STAMP_NOTE },

  // ── Leaderboard ─────────────────────────────────────────────────────────
  { entity: 'Leaderboard', who: 'hotmail', sentinel: 'a', kind: 'read', check: 'read own row A', expected: '0 — read rule has no self branch', rule: LEADERBOARD_ALL },
  { entity: 'Leaderboard', who: 'schools', sentinel: 'b', kind: 'read', check: 'read own row B', expected: '0 — read rule has no self branch', rule: LEADERBOARD_ALL },
  { entity: 'Leaderboard', who: 'both', sentinel: 'a', kind: 'read', check: 'read foreign row A', expected: '0', rule: LEADERBOARD_ALL },
  { entity: 'Leaderboard', who: 'hotmail', sentinel: 'a', kind: 'update', check: 'update own row A', expected: 'denied (403)', rule: LEADERBOARD_ALL, field: 'user_name', restore: 'zzProbe Leaderboard A — safe to delete' },
  { entity: 'Leaderboard', who: 'schools', sentinel: 'b', kind: 'update', check: 'update own row B', expected: 'denied (403)', rule: LEADERBOARD_ALL, field: 'user_name', restore: 'zzProbe Leaderboard B — safe to delete' },
  { entity: 'Leaderboard', who: 'both', sentinel: 'a', kind: 'delete', check: 'delete foreign row A', expected: 'denied (403)', rule: LEADERBOARD_ALL },
  { entity: 'Leaderboard', who: 'hotmail', sentinel: 'a', kind: 'delete', check: 'delete own row A', expected: 'denied (403)', rule: LEADERBOARD_ALL },
  { entity: 'Leaderboard', who: 'both', sentinel: null, kind: 'create', check: 'create a row with own user_id', expected: 'denied (403)', rule: LEADERBOARD_ALL },

  // ── TaskComment ─────────────────────────────────────────────────────────
  { entity: 'TaskComment', who: 'hotmail', sentinel: 'a', kind: 'read', check: 'read own row A', expected: '1', rule: COMMENT_READ },
  { entity: 'TaskComment', who: 'schools', sentinel: 'b', kind: 'read', check: 'read own row B', expected: '1', rule: COMMENT_READ },
  { entity: 'TaskComment', who: 'hotmail', sentinel: 'b', kind: 'read', check: 'read foreign row B', expected: '0', rule: COMMENT_READ },
  { entity: 'TaskComment', who: 'schools', sentinel: 'a', kind: 'read', check: 'read foreign row A', expected: '0', rule: COMMENT_READ },
  { entity: 'TaskComment', who: 'both', sentinel: 'c', kind: 'read', check: 'read shared row C', expected: '1', rule: COMMENT_READ, unsure: true, note: ARRAY_NOTE },
  { entity: 'TaskComment', who: 'hotmail', sentinel: 'a', kind: 'update', check: 'update own row A', expected: '1 row written, then restored', rule: COMMENT_WRITE, field: 'content', restore: 'zzProbe TaskComment A — safe to delete' },
  { entity: 'TaskComment', who: 'schools', sentinel: 'b', kind: 'update', check: 'update own row B', expected: '1 row written, then restored', rule: COMMENT_WRITE, field: 'content', restore: 'zzProbe TaskComment B — safe to delete' },
  { entity: 'TaskComment', who: 'hotmail', sentinel: 'b', kind: 'update', check: 'update foreign row B', expected: 'denied (403)', rule: COMMENT_WRITE, field: 'content', restore: 'zzProbe TaskComment B — safe to delete' },
  { entity: 'TaskComment', who: 'both', sentinel: 'c', kind: 'update', check: 'update shared row C', expected: 'denied (403) — update rule has no member branch', rule: COMMENT_WRITE, field: 'content', restore: 'zzProbe TaskComment C — safe to delete' },
  { entity: 'TaskComment', who: 'both', sentinel: 'c', kind: 'delete', check: 'delete shared row C', expected: 'denied (403)', rule: COMMENT_WRITE },
  { entity: 'TaskComment', who: 'hotmail', sentinel: 'a', kind: 'delete', check: 'delete own row A', expected: 'allowed — NOT executed', rule: COMMENT_WRITE, dangerous: true },
  { entity: 'TaskComment', who: 'schools', sentinel: 'b', kind: 'delete', check: 'delete own row B', expected: 'allowed — NOT executed', rule: COMMENT_WRITE, dangerous: true },

  // ── TaskActivity ────────────────────────────────────────────────────────
  { entity: 'TaskActivity', who: 'hotmail', sentinel: 'a', kind: 'read', check: 'read own row A', expected: '1', rule: ACTIVITY_READ },
  { entity: 'TaskActivity', who: 'schools', sentinel: 'b', kind: 'read', check: 'read own row B', expected: '1', rule: ACTIVITY_READ },
  { entity: 'TaskActivity', who: 'hotmail', sentinel: 'b', kind: 'read', check: 'read foreign row B', expected: '0', rule: ACTIVITY_READ },
  { entity: 'TaskActivity', who: 'schools', sentinel: 'a', kind: 'read', check: 'read foreign row A', expected: '0', rule: ACTIVITY_READ },
  { entity: 'TaskActivity', who: 'both', sentinel: 'c', kind: 'read', check: 'read shared row C', expected: '1', rule: ACTIVITY_READ, unsure: true, note: ARRAY_NOTE },
  { entity: 'TaskActivity', who: 'hotmail', sentinel: 'a', kind: 'update', check: 'update own row A', expected: 'denied (403) — activity is append-only for users', rule: ACTIVITY_WRITE, field: 'description', restore: 'zzProbe TaskActivity A — safe to delete' },
  { entity: 'TaskActivity', who: 'schools', sentinel: 'b', kind: 'update', check: 'update own row B', expected: 'denied (403) — activity is append-only for users', rule: ACTIVITY_WRITE, field: 'description', restore: 'zzProbe TaskActivity B — safe to delete' },
  { entity: 'TaskActivity', who: 'hotmail', sentinel: 'a', kind: 'delete', check: 'delete own row A', expected: 'denied (403)', rule: ACTIVITY_WRITE },
  { entity: 'TaskActivity', who: 'schools', sentinel: 'b', kind: 'delete', check: 'delete own row B', expected: 'denied (403)', rule: ACTIVITY_WRITE },
];

const denied = (err) => {
  const described = describeError(err);
  return described.status === 403
    ? 'denied (403)'
    : `error ${described.status ?? 'no status'}: ${described.error}`;
};

async function readCount(entity, id) {
  try {
    return String(asRows(await base44.entities[entity].filter({ id })).length);
  } catch (err) {
    return denied(err);
  }
}

async function attemptUpdate(entity, id, field, restore) {
  const marker = `zzProbe touch ${new Date().toISOString()}`;
  try {
    await base44.entities[entity].update(id, { [field]: marker });
  } catch (err) {
    return denied(err);
  }
  try {
    await base44.entities[entity].update(id, { [field]: restore });
    return '1 row written, restored';
  } catch (err) {
    return `1 row written, restore failed (${denied(err)}) — ${field} now reads "${marker}"`;
  }
}

async function attemptCreate(entity, me) {
  const marker = `zzProbe create ${new Date().toISOString()}`;
  let created = null;
  try {
    created = await base44.entities[entity].create({ user_id: me.id, user_name: marker });
  } catch (err) {
    return denied(err);
  }
  let cleanup = 'could not be deleted again — remove it as an admin';
  try {
    await base44.entities[entity].delete(created.id);
    cleanup = 'row was created and then deleted again';
  } catch (err) {
    cleanup = `1 row created and NOT removable by this account: ${created.id}`;
  }
  return `1 row created (${cleanup})`;
}

/** One result per check, in plan order, for the signed-in account only. */
export async function runForeignChecks(sentinels = {}, me = {}) {
  const who = ACCOUNT_OF[me.id];
  const account = me.email || 'not signed in';

  if (!who) {
    return [
      {
        entity: '—',
        account,
        check: 'account mapping',
        expected: 'signed in as hotmail or schools',
        rule: 'n/a',
        actual: 'not a probe account — no foreign-row checks were run',
        unsure: false,
      },
    ];
  }

  const results = [];
  for (const entry of PLAN) {
    if (entry.who !== 'both' && entry.who !== who) continue;
    const recordId = entry.sentinel ? sentinels?.[entry.entity]?.[entry.sentinel] : null;

    let actual;
    if (entry.kind === 'delete' && entry.dangerous) {
      actual = 'not executed (expected to succeed; left untouched)';
    } else if (entry.sentinel && !recordId) {
      actual = 'no sentinel id in this link';
    } else if (entry.kind === 'read') {
      actual = await readCount(entry.entity, recordId);
    } else if (entry.kind === 'update') {
      actual = await attemptUpdate(entry.entity, recordId, entry.field, entry.restore);
    } else if (entry.kind === 'delete') {
      actual = 'not executed (expected to be denied, so nothing was deleted)';
    } else if (entry.kind === 'create') {
      actual = await attemptCreate(entry.entity, me);
    } else {
      actual = 'unknown check kind';
    }

    results.push({
      entity: entry.entity,
      account,
      check: entry.check,
      expected: entry.expected,
      rule: entry.rule,
      actual,
      unsure: Boolean(entry.unsure),
      note: entry.note || '',
    });
  }
  return results;
}

/** Plain text, one line per check, for copying. No verdict words. */
export function formatForeignResults(results = []) {
  return results
    .map((r) => {
      const flag = r.unsure
        ? ` [FLAG: ${r.note || 'reading of the rule is uncertain'}]`
        : r.note
          ? ` [NOTE: ${r.note}]`
          : '';
      return `${r.entity} | ${r.account} | ${r.check} | expected ${r.expected} · rule: ${r.rule}${flag} | actual ${r.actual}`;
    })
    .join('\n');
}