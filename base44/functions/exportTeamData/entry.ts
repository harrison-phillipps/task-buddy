import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { asRows, readAll } from '../../shared/entityResults.ts';

// Read-only snapshot of one team, for verification before/after RLS changes.
// Admin-only and strictly non-mutating: it never writes, updates or deletes.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    // This returns member emails and every message in a team, so it is admin-only.
    if (user.role !== 'admin') return Response.json({ error: 'Admins only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const teamId = typeof body?.team_id === 'string' ? body.team_id.trim() : '';
    if (!teamId) return Response.json({ error: 'team_id is required' }, { status: 400 });

    const admin = base44.asServiceRole;
    const teams = asRows(await admin.entities.Team.filter({ id: teamId }));
    if (teams.length !== 1) return Response.json({ error: 'Team not found' }, { status: 404 });

    const tasks = await readAll(admin.entities.Task, { team_id: teamId });
    const taskIds = new Set(tasks.map((t) => t.id));
    // TaskComment carries task_id only, so comments are joined through the team's tasks.
    const comments = (await readAll(admin.entities.TaskComment, {})).filter((c) => taskIds.has(c.task_id));

    const [messages, notifications, templates, goals, brainDumps, sessions] = await Promise.all([
      readAll(admin.entities.TeamMessage, { team_id: teamId }),
      readAll(admin.entities.TeamNotification, { team_id: teamId }),
      readAll(admin.entities.TeamTemplate, { team_id: teamId }),
      readAll(admin.entities.Goal, { team_id: teamId }),
      readAll(admin.entities.BrainDump, { team_id: teamId }),
      readAll(admin.entities.CollaborativeFocusSession, { team_id: teamId }),
    ]);

    const counts = {
      tasks: tasks.length,
      comments: comments.length,
      messages: messages.length,
      notifications: notifications.length,
      templates: templates.length,
      goals: goals.length,
      brain_dumps: brainDumps.length,
      sessions: sessions.length,
    };
    console.log(`exportTeamData: team ${teamId} → ${JSON.stringify(counts)}`);

    return Response.json({
      exported_at: new Date().toISOString(),
      exported_by: user.id,
      team: teams[0],
      counts,
      tasks,
      comments,
      messages,
      notifications,
      templates,
      goals,
      brain_dumps: brainDumps,
      sessions,
    });
  } catch (error) {
    console.error('exportTeamData failed:', error);
    return Response.json({ error: error?.message || 'Export failed' }, { status: 500 });
  }
});