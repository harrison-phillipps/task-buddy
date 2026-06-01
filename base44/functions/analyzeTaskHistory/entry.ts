import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse body once
    let body = {};
    try { body = await req.json(); } catch { /* no body */ }
    const { analysisType = 'time_estimation', period = 'weekly', force = false } = body;

    // Fetch user's historical tasks and focus sessions
    const allTasks = await base44.entities.Task.filter({
      created_by: user.email
    }, '-updated_date', 500);

    const completedTasks = allTasks.filter(t => t.status === 'completed');

    const focusSessions = await base44.entities.FocusSession.filter({
      created_by: user.email
    }, '-created_date', 300);

    // --- Cache check: read from UserProgress ---
    const progressList = await base44.entities.UserProgress.filter({ user_id: user.id });
    const progress = progressList[0] || null;

    const cacheField = `ai_cache_${analysisType}`;
    const cacheCountField = `ai_cache_count_${analysisType}`;
    const cachedResult = progress?.[cacheField];
    const cachedCount = progress?.[cacheCountField] || 0;
    const currentCount = completedTasks.length;

    // Return cache if: not forced, cache exists, and fewer than 5 new completions since last run
    if (!force && cachedResult && (currentCount - cachedCount) < 5) {
      console.log(`[analyzeTaskHistory] Returning cached result for ${analysisType} (${currentCount - cachedCount} new completions since last run)`);
      return Response.json(typeof cachedResult === 'string' ? JSON.parse(cachedResult) : cachedResult);
    }

    console.log(`[analyzeTaskHistory] Running fresh LLM analysis: ${analysisType} (${currentCount - cachedCount} new completions since last cache)`);

    let result;

    if (analysisType === 'time_estimation') {
      result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze these completed tasks and focus sessions to provide accurate time estimation patterns:

Completed Tasks: ${JSON.stringify(completedTasks.slice(0, 50).map(t => ({
  title: t.title,
  category: t.category,
  difficulty: t.difficulty,
  estimated_minutes: t.estimated_minutes,
  subtasks_count: t.subtasks?.length || 0
})))}

Focus Sessions: ${JSON.stringify(focusSessions.slice(0, 50).map(s => ({
  task_title: s.task_title,
  duration_minutes: s.duration_minutes,
  completed: s.completed
})))}

Provide time estimation insights by category and difficulty.`,
        response_json_schema: {
          type: "object",
          properties: {
            category_estimates: {
              type: "object",
              properties: {
                work: { type: "number" },
                personal: { type: "number" },
                health: { type: "number" },
                creative: { type: "number" },
                learning: { type: "number" }
              }
            },
            difficulty_multipliers: {
              type: "object",
              properties: {
                easy: { type: "number" },
                medium: { type: "number" },
                hard: { type: "number" }
              }
            },
            insights: { type: "string" }
          }
        }
      });
    } else if (analysisType === 'optimal_times') {
      result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze when this user is most productive based on their focus session history:

Focus Sessions: ${JSON.stringify(focusSessions.map(s => ({
  created_date: s.created_date,
  task_category: s.task_category || 'unknown',
  duration_minutes: s.duration_minutes,
  completed: s.completed,
  effectiveness_score: s.effectiveness_score,
  mood_before: s.mood_before,
  mood_after: s.mood_after
})))}

Identify:
1. Best times of day for different task categories
2. Productivity patterns by day of week
3. Optimal session durations for each task type`,
        response_json_schema: {
          type: "object",
          properties: {
            time_of_day_recommendations: {
              type: "object",
              properties: {
                work: { type: "string" },
                personal: { type: "string" },
                creative: { type: "string" },
                learning: { type: "string" }
              }
            },
            best_days: {
              type: "array",
              items: { type: "string" }
            },
            optimal_session_length: { type: "number" },
            productivity_insights: { type: "string" }
          }
        }
      });
    } else if (analysisType === 'productivity_report') {
      const now = new Date();
      const startDate = new Date(now);
      if (period === 'weekly') {
        startDate.setDate(now.getDate() - 7);
      } else if (period === 'monthly') {
        startDate.setMonth(now.getMonth() - 1);
      }

      const periodTasks = completedTasks.filter(t =>
        new Date(t.updated_date) >= startDate
      );

      const periodSessions = focusSessions.filter(s =>
        new Date(s.created_date) >= startDate
      );

      result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a comprehensive productivity report for this ${period} period:

Completed Tasks (${periodTasks.length}): ${JSON.stringify(periodTasks.map(t => ({
  title: t.title,
  category: t.category,
  difficulty: t.difficulty,
  subtasks_completed: t.subtasks?.filter(st => st.completed).length || 0,
  total_subtasks: t.subtasks?.length || 0
})))}

Focus Sessions (${periodSessions.length}): ${JSON.stringify(periodSessions.map(s => ({
  duration_minutes: s.duration_minutes,
  category: s.task_category,
  effectiveness_score: s.effectiveness_score,
  completed: s.completed
})))}

Provide:
1. Overall productivity score (0-100)
2. Task completion rate by category
3. Total time spent (minutes)
4. Most productive categories
5. Areas for improvement (specific, actionable)
6. Achievements and highlights
7. Trends compared to previous period
8. Personalized recommendations`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number" },
            total_tasks_completed: { type: "number" },
            total_time_minutes: { type: "number" },
            completion_rate_by_category: {
              type: "object",
              additionalProperties: { type: "number" }
            },
            most_productive_category: { type: "string" },
            achievements: {
              type: "array",
              items: { type: "string" }
            },
            areas_for_improvement: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  suggestion: { type: "string" }
                }
              }
            },
            trends: { type: "string" },
            recommendations: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });
    } else {
      return Response.json({ error: 'Invalid analysis type' }, { status: 400 });
    }

    // --- Store result in UserProgress cache fields ---
    try {
      const updateData = {
        [cacheField]: JSON.stringify(result),
        [cacheCountField]: currentCount,
      };
      if (progress) {
        await base44.entities.UserProgress.update(progress.id, updateData);
      } else {
        await base44.entities.UserProgress.create({ user_id: user.id, ...updateData });
      }
    } catch (cacheErr) {
      console.warn('[analyzeTaskHistory] Failed to store cache:', cacheErr.message);
    }

    return Response.json(result);

  } catch (error) {
    console.error('Analysis error:', error);
    return Response.json({
      error: error.message || 'Failed to analyze task history'
    }, { status: 500 });
  }
});