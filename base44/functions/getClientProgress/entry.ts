import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Returns a progress summary for one client, but only if the caller's own
// ClinicianProfile lists that client. Task and UserProgress are read with the
// service role so the clinician sees the client's rows without either entity
// being opened up.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const clientUserId = typeof body?.client_user_id === 'string' ? body.client_user_id.trim() : '';
    if (!clientUserId) {
      return Response.json({ error: 'client_user_id is required' }, { status: 400 });
    }

    const profiles = await base44.asServiceRole.entities.ClinicianProfile.filter({ user_id: user.id });
    const profile = profiles?.[0];
    const clients = Array.isArray(profile?.clients) ? profile.clients : [];
    if (!profile || !clients.some((c) => c.client_user_id === clientUserId)) {
      console.warn(`[getClientProgress] user ${user.id} is not linked to client ${clientUserId}`);
      return Response.json({ error: 'This client is not linked to you' }, { status: 403 });
    }

    const tasksRaw = await base44.asServiceRole.entities.Task.filter(
      { created_by_id: clientUserId },
      '-created_date',
      20
    );
    const tasks = Array.isArray(tasksRaw) ? tasksRaw : tasksRaw?.items || [];

    const progressRaw = await base44.asServiceRole.entities.UserProgress.filter({ user_id: clientUserId });
    const progressList = Array.isArray(progressRaw) ? progressRaw : progressRaw?.items || [];
    const progress = progressList[0] || null;

    return Response.json({
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        created_date: t.created_date,
        updated_date: t.updated_date,
      })),
      progress: progress ? { current_streak: progress.current_streak ?? 0 } : null,
    });
  } catch (error) {
    console.error('[getClientProgress] error:', error.message);
    return Response.json({ error: 'Could not load client progress' }, { status: 500 });
  }
});