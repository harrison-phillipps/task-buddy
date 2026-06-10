import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      client_user_id,
      period = "monthly",
      goal_description = "",
      support_type = "assistive technology and task support",
    } = body;

    if (!client_user_id) {
      return Response.json({ error: "client_user_id is required" }, { status: 400 });
    }
    if (!["monthly", "quarterly"].includes(period)) {
      return Response.json({ error: "period must be monthly or quarterly" }, { status: 400 });
    }

    // Calculate date range
    const now = new Date();
    const daysBack = period === "quarterly" ? 90 : 30;
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - daysBack);

    const report_period_start = periodStart.toISOString().split("T")[0];
    const report_period_end = now.toISOString().split("T")[0];

    // Fetch all tasks for the client in the period
    const allTasks = await base44.asServiceRole.entities.Task.filter({
      created_by_id: client_user_id,
    });

    const tasksInPeriod = allTasks.filter((t) => {
      const created = new Date(t.created_date);
      return created >= periodStart && created <= now;
    });

    // Calculate metrics
    const tasks_initiated = tasksInPeriod.length;
    const tasks_completed = tasksInPeriod.filter((t) => t.status === "completed").length;
    const completion_rate = tasks_initiated > 0
      ? Math.round((tasks_completed / tasks_initiated) * 100)
      : 0;

    // Fetch UserProgress for current_streak
    let current_streak = 0;
    try {
      const progressList = await base44.asServiceRole.entities.UserProgress.filter({
        user_id: client_user_id,
      });
      if (progressList.length > 0) {
        current_streak = progressList[0].current_streak || 0;
      }
    } catch {
      // Non-fatal — streak stays 0
    }

    // Determine best_time_of_day from completed tasks
    const completedTasks = tasksInPeriod.filter((t) => t.status === "completed" && t.updated_date);
    const timeBuckets = { morning: 0, afternoon: 0, evening: 0 };
    for (const t of completedTasks) {
      const hour = new Date(t.updated_date).getHours();
      if (hour >= 6 && hour < 12) timeBuckets.morning++;
      else if (hour >= 12 && hour < 17) timeBuckets.afternoon++;
      else if (hour >= 17 && hour < 21) timeBuckets.evening++;
    }
    const best_time_of_day = Object.entries(timeBuckets).sort((a, b) => b[1] - a[1])[0][0];

    const periodLabel = period === "quarterly" ? "90 days" : "30 days";

    // Generate narrative via direct Anthropic API call
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY"),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `You are writing a professional progress report for a disability support or allied health context. Write a single paragraph (3-4 sentences) in plain, professional English. Do not use clinical jargon. The paragraph should be suitable for inclusion in an NDIS plan review or progress note.

Use this data:
- Tasks initiated: ${tasks_initiated}
- Tasks completed: ${tasks_completed}
- Completion rate: ${completion_rate}%
- Current streak: ${current_streak} days
- Most productive time: ${best_time_of_day}
- Support goal: ${goal_description || "general task engagement and daily living skills"}
- Support type: ${support_type}
- Period: ${periodLabel}

Start with "Over the past ${periodLabel}," and end with a sentence about what this indicates for their goal progress. Return only the paragraph, no preamble.`,
          },
        ],
      }),
    });

    const anthropicData = await anthropicResponse.json();
    if (!anthropicResponse.ok) {
      console.error(`[generateClinicianReport] Anthropic error: ${JSON.stringify(anthropicData)}`);
      throw new Error(anthropicData?.error?.message || "Anthropic API error");
    }
    const narrative_summary = anthropicData.content[0].text;

    // Fetch client display name
    let client_display_name = "";
    try {
      const clientUsers = await base44.asServiceRole.entities.User.filter({ id: client_user_id });
      if (clientUsers.length > 0) client_display_name = clientUsers[0].full_name || "";
    } catch {
      // Non-fatal
    }

    // Create ClinicianReport record
    const report = await base44.asServiceRole.entities.ClinicianReport.create({
      clinician_user_id: user.id,
      client_user_id,
      client_display_name,
      report_period_start,
      report_period_end,
      tasks_initiated,
      tasks_completed,
      completion_rate,
      current_streak,
      best_time_of_day,
      goal_description,
      narrative_summary,
      support_type,
      generated_date: now.toISOString(),
    });

    console.log(`[generateClinicianReport] Report created — clinician: ${user.id}, client: ${client_user_id}, period: ${period}`);
    return Response.json(report);

  } catch (error) {
    console.error(`[generateClinicianReport] Error: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});