import { base44 } from '@/api/base44Client';
import { asRows, describeError, stamped } from '@/lib/rlsProbeCommon';

/**
 * NotificationPreferences is owner-only: no row belongs to anyone but its own
 * user_id. Unlike the sentinel checks this one needs no probe row — it reads
 * whatever list() returns as the signed-in user and counts the rows that are
 * not theirs.
 *
 * A non-admin must get 0 foreign rows. An admin's rule deliberately lets every
 * row through, so for an admin the count is reported but not judged.
 */
export async function runPreferencesCheck(me = {}) {
  const check = 'NotificationPreferences own-versus-foreign rows';
  try {
    const rows = asRows(await base44.entities.NotificationPreferences.list());
    const own = rows.filter((row) => row.user_id === me.id).length;
    const foreign = rows.filter((row) => row.user_id !== me.id).length;
    const isAdmin = me.role === 'admin';
    const ok = isAdmin ? true : Boolean(me.id) && foreign === 0;

    return {
      check,
      ok,
      label: isAdmin
        ? `NOT JUDGED — admin sees every row (${rows.length} returned, ${foreign} foreign)`
        : `${ok ? 'PASS' : 'FAIL'} — ${rows.length} row${rows.length === 1 ? '' : 's'} returned, ${foreign} foreign`,
      raw: {
        rows_returned: rows.length,
        own_rows: own,
        foreign_rows: foreign,
        role: me.role ?? null,
        signed_in_user_id: me.id ?? null,
        expectation: isAdmin ? 'admin reads every row by design' : '0 foreign rows',
      },
    };
  } catch (err) {
    return { check, ok: false, label: 'FAIL — list request failed', raw: describeError(err) };
  }
}

export const runPreferencesChecks = async (me) => [await stamped(() => runPreferencesCheck(me))()];