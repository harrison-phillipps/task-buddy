import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CONNECTOR_ID = "6a151e1a747800c818af2da4"; // Google Tasks app-user connector

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);

    // Fetch all user goals
    const goals = await base44.entities.Goal.filter({ created_by: user.email });

    // Get or create a TaskBuddy task list
    const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const listsData = await listsRes.json();
    let taskListId = listsData.items?.find(l => l.title === 'TaskBuddy Goals')?.id;

    if (!taskListId) {
      const createRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'TaskBuddy Goals' })
      });
      const created = await createRes.json();
      taskListId = created.id;
    }

    // Get existing tasks in the list to avoid duplicates
    const existingRes = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks?showCompleted=true`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const existingData = await existingRes.json();
    const existingTasks = existingData.items || [];

    const results = [];
    for (const goal of goals) {
      // Match by title
      const existing = existingTasks.find(t => t.title === goal.title || t.notes?.includes(goal.id));
      const dueRfc = goal.target_date ? new Date(goal.target_date + 'T00:00:00Z').toISOString() : undefined;

      const taskBody = {
        title: goal.title,
        notes: `${goal.description || ''}\n\n[TaskBuddy Goal ID: ${goal.id}]`.trim(),
        status: goal.status === 'completed' ? 'completed' : 'needsAction',
        ...(dueRfc ? { due: dueRfc } : {}),
      };

      if (existing) {
        await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${existing.id}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(taskBody)
        });
        results.push({ goal: goal.title, action: 'updated' });
      } else {
        await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(taskBody)
        });
        results.push({ goal: goal.title, action: 'created' });
      }
    }

    return Response.json({ success: true, synced: results.length, results });
  } catch (error) {
    console.error('syncGoalsToGoogleTasks error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});