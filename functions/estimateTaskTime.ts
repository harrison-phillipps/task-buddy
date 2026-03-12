import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { task } = await req.json();
        if (!task) {
            return Response.json({ error: 'Task data required' }, { status: 400 });
        }

        // Fetch user's focus session history for context
        const [sessions, completedTasks] = await Promise.all([
            base44.entities.FocusSession.filter({ created_by: user.email }, '-created_date', 20),
            base44.entities.Task.filter({ created_by: user.email, status: 'completed' }, '-updated_date', 20),
        ]);

        // Build history summary
        const sessionHistory = sessions.map(s => ({
            task_title: s.task_title,
            duration_minutes: s.duration_minutes,
            completed: s.completed,
        }));

        const completedHistory = completedTasks.map(t => ({
            title: t.title,
            category: t.category,
            difficulty: t.difficulty,
            estimated_minutes: t.estimated_minutes,
            subtask_count: t.subtasks?.length || 0,
        }));

        const prompt = `You are a productivity assistant helping estimate realistic focus session durations.

Analyze the following task and the user's historical data to suggest realistic time estimates.

TASK TO ESTIMATE:
- Title: ${task.title}
- Description: ${task.description || 'No description'}
- Category: ${task.category || 'unknown'}
- Difficulty: ${task.difficulty || 'medium'}
- Number of subtasks: ${task.subtasks?.length || 0}
- Subtasks: ${task.subtasks?.map(s => s.title).join(', ') || 'none'}
- Existing estimate (if any): ${task.estimated_minutes ? task.estimated_minutes + ' minutes' : 'none'}

USER'S RECENT FOCUS SESSIONS (last 20):
${sessionHistory.length > 0 ? JSON.stringify(sessionHistory, null, 2) : 'No history yet'}

USER'S RECENTLY COMPLETED TASKS (last 20):
${completedHistory.length > 0 ? JSON.stringify(completedHistory, null, 2) : 'No history yet'}

Based on the task details and user's historical pace, provide:
1. A realistic total time estimate in minutes
2. A suggested single focus session duration in minutes (ideally 25-90 min)
3. How many focus sessions it might take
4. A confidence level (low/medium/high)
5. A brief 1-sentence reasoning

Be realistic and use the user's history to calibrate. If no history exists, use general productivity research.
For difficulty: easy tasks ~ 15-45 min, medium ~ 30-90 min, hard ~ 60-180 min.`;

        const result = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    total_estimate_minutes: { type: "number" },
                    session_duration_minutes: { type: "number" },
                    sessions_needed: { type: "number" },
                    confidence: { type: "string", enum: ["low", "medium", "high"] },
                    reasoning: { type: "string" },
                }
            }
        });

        return Response.json({ success: true, estimate: result });

    } catch (error) {
        console.error('Error estimating task time:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});