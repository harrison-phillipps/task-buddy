import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { asRows } from '../../shared/entityResults.ts';

/**
 * getClinicianClientTasks — the clinician panel's task read, behind a function.
 *
 * Why: the panel used to call Task.filter({ created_by_id: client.client_user_id })
 * with the clinician's own client. That is a cross-user read: the clinician is
 * neither creator, owner, assignee nor team member of the client's tasks, so it
 * only works while Task has no rules, and it returns the client's whole task list
 * rather than the items this clinician added.
 *
 * Access check: caller must own a ClinicianProfile, and every requested client id
 * must be on that profile with an active link. Anything else is skipped, not
 * returned.
 *
 * Attribution: Task carries no clinician id, so "added by this clinician" is the
 * addClinicianItem marker — added_by_clinician plus the display name it stamped.
 * The name match is the only attribution that exists today; adding an
 * added_by_clinician_id field to Task and writing it in addClinicianItem would
 * make this exact. Until then a same-named clinician could match another's rows
 * for a client they are both linked to.
 */

const MAX_CLIENTS = 25;

const MINIMAL_FIELDS = (t) => ({
  id: t.id,
  title: t.title ?? '',
  status: t.status ?? null,
  due_date: t.due_date ?? null,
  completed_at: t.completed_at ?? null,
  created_date: t.created_date ?? null,
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const requested = Array.isArray(body?.client_user_ids) ? body.client_user_ids : [body?.client_user_id];
    const clientIds = [
      ...new Set(
        requested
          .filter((id) => typeof id === 'string' && id.trim())
          .map((id) => id.trim()),
      ),
    ].slice(0, MAX_CLIENTS);

    if (clientIds.length === 0) {
      return Response.json({ error: 'client_user_ids is required' }, { status: 400 });
    }

    const admin = base44.asServiceRole;
    const profiles = asRows(await admin.entities.ClinicianProfile.filter({ user_id: user.id }));
    const profile = profiles[0] || null;
    if (!profile) return Response.json({ error: 'No clinician profile found' }, { status: 403 });

    const clinicianName = String(user.display_name || user.full_name || user.email || '').trim().toLowerCase();
    if (!clinicianName) {
      return Response.json({ error: 'Clinician has no name to attribute tasks to' }, { status: 400 });
    }

    const linked = new Map((profile.clients || []).map((c) => [c.client_user_id, c]));

    const tasksByClient = {};
    const skipped = [];

    for (const clientId of clientIds) {
      const link = linked.get(clientId);
      const isActive = !!link && (!link.status || link.status === 'active');
      if (!isActive) {
        tasksByClient[clientId] = [];
        skipped.push({ client_user_id: clientId, reason: link ? 'link_inactive' : 'not_linked' });
        continue;
      }

      const rows = asRows(
        await admin.entities.Task.filter(
          { assigned_to: clientId, added_by_clinician: true },
          '-created_date',
          200,
        ),
      );

      tasksByClient[clientId] = rows
        .filter((t) => String(t.added_by_clinician_name || '').trim().toLowerCase() === clinicianName)
        .map(MINIMAL_FIELDS);
    }

    console.log('[getClinicianClientTasks]', {
      clinician_user_id: user.id,
      clients: clientIds.length,
      skipped: skipped.length,
    });

    return Response.json({
      ok: true,
      clinician: { id: user.id },
      tasks_by_client: tasksByClient,
      skipped,
    });
  } catch (error) {
    console.error('[getClinicianClientTasks] error:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});