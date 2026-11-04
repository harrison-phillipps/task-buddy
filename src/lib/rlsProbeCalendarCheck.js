import { base44 } from '@/api/base44Client';
import { asRows, describeError } from '@/lib/rlsProbeCommon';

/**
 * CalendarEvent probe — one check, run with the SIGNED-IN USER'S OWN client.
 *
 * Lists CalendarEvent and reports the total plus how many rows carry a
 * created_by_id that is not the caller's. The interim rule scopes reads to
 * created_by_id (plus admin), so a non-admin must see zero foreign rows.
 * Expected own rows: the hotmail account about 6 task-block rows, schools 0.
 * An admin legitimately sees every row, so for an admin the result is
 * reported but never marked as a failure.
 */
export async function runCalendarEventCheck(me = {}) {
  const check = 'CalendarEvent list() as the caller — own vs foreign rows';
  try {
    const rows = asRows(await base44.entities.CalendarEvent.list());
    const own = rows.filter((r) => r.created_by_id === me.id).length;
    const foreign = rows.length - own;
    const isAdmin = me.role === 'admin';
    const ok = isAdmin ? true : foreign === 0;
    const adminNote = isAdmin ? ' (admin — sees every row, informational)' : '';
    return {
      check,
      ok,
      label: `${ok ? 'PASS' : 'FAIL'} — ${rows.length} rows · ${own} own · ${foreign} foreign${adminNote}`,
      raw: {
        rows_returned: rows.length,
        own_rows: own,
        foreign_rows: foreign,
        caller_role: me.role ?? null,
        rule: 'read = created_by_id is caller, or admin',
        expectation: isAdmin
          ? 'informational only — an admin is allowed to see other users rows'
          : 'foreign rows must be 0; hotmail expects about 6 own rows, schools 0',
      },
    };
  } catch (err) {
    return { check, ok: false, label: 'FAIL — list request failed', raw: describeError(err) };
  }
}