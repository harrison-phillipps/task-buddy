import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Gate: LLM analysis is Pro/Premium only
    const tier = user.subscription_tier || 'free';
    if (tier === 'free') {
      return Response.json({ error: 'This feature requires a Pro or Premium subscription.' }, { status: 403 });
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
      const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": Deno.env.get("ANTHROPIC_API_KEY"),
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
          messages: [{
            role: "user",
            content: `Analyze these completed tasks and focus sessions to provide accurate time estimation patterns.

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

Respond with ONLY a JSON object, no preamble, no markdown. Format:
{
  "category_estimates": { "work": number, "personal": number, "health": number, "creative": number, "learning": number },
  "difficulty_multipliers": { "easy": number, "medium": number, "hard": number },
  "insights": "string"
}`
          }]
        })
      });
      const anthropicData = await anthropicRes.json();
      const rawText = anthropicData.content[0].text.replace(/```json|```/g, '').trim();
      result = JSON.parse(rawText);
    } else if (analysisType === 'optimal_times') {
      const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": Deno.env.get("ANTHROPIC_API_KEY"),
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
          messages: [{
            role: "user",
            content: `Analyze when this user is most productive based on their focus session history.

Focus Sessions: ${JSON.stringify(focusSessions.map(s => ({
  created_date: s.created_date,
  task_category: s.task_category || 'unknown',
  duration_minutes: s.duration_minutes,
  completed: s.completed,
  effectiveness_score: s.effectiveness_score,
  mood_before: s.mood_before,
  mood_after: s.mood_after
})))}

Respond with ONLY a JSON object, no preamble, no markdown. Format:
{
  "time_of_day_recommendations": { "work": "string", "personal": "string", "creative": "string", "learning": "string" },
  "best_days": ["string"],
  "optimal_session_length": number,
  "productivity_insights": "string"
}`
          }]
        })
      });
      const anthropicData = await anthropicRes.json();
      const rawText = anthropicData.content[0].text.replace(/```json|```/g, '').trim();
      result = JSON.parse(rawText);
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

      const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": Deno.env.get("ANTHROPIC_API_KEY"),
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 800,
          messages: [{
            role: "user",
            content: `Generate a comprehensive productivity report for this ${period} period.

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

Respond with ONLY a JSON object, no preamble, no markdown. Format:
{
  "overall_score": number,
  "total_tasks_completed": number,
  "total_time_minutes": number,
  "completion_rate_by_category": { "category": number },
  "most_productive_category": "string",
  "achievements": ["string"],
  "areas_for_improvement": [{ "area": "string", "suggestion": "string" }],
  "trends": "string",
  "recommendations": ["string"]
}`
          }]
        })
      });
      const anthropicData = await anthropicRes.json();
      const rawText = anthropicData.content[0].text.replace(/```json|```/g, '').trim();
      result = JSON.parse(rawText);
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