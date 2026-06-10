import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_email } = await req.json();
    if (!client_email) {
      return Response.json({ error: 'client_email is required' }, { status: 400 });
    }

    // Fetch first 5 tasks (unfiltered) to inspect created_by values
    const sampleTasks = await base44.asServiceRole.entities.Task.list('-created_date', 5);
    const sampleSummary = sampleTasks.map(t => ({
      id: t.id,
      title: t.title,
      created_by_id: t.created_by_id,
    }));

    // Fetch tasks filtered by created_by_id matching the email (to test the filter)
    const filteredByEmail = await base44.asServiceRole.entities.Task.filter({ created_by_id: client_email }, '-created_date', 10);

    return Response.json({
      lookup_email: client_email,
      sample_tasks_unfiltered: sampleSummary,
      filtered_by_email_count: filteredByEmail.length,
      filtered_by_email: filteredByEmail.map(t => ({
        id: t.id,
        title: t.title,
        created_by_id: t.created_by_id,
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});