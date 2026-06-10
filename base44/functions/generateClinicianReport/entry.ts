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

    // Generate narrative via LLM
    const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are writing a professional progress report for a disability support or allied health context. Write a single paragraph (3-4 sentences) in plain, professional English. Do not use clinical jargon. The paragraph should read naturally and be suitable for inclusion in an NDIS plan review or progress note. Use this data: Client initiated ${tasks_initiated} tasks and completed ${tasks_completed} of them (${completion_rate}%) over the past ${periodLabel}. Their current streak is ${current_streak} days. Their most productive time of day is ${best_time_of_day}. Their support goal is: ${goal_description || "general task engagement and daily living skills"}. Their support type includes: ${support_type}. Start the paragraph with 'Over the past ${periodLabel},' and end with a sentence about what this indicates for their goal progress.`,
      response_json_schema: {
        type: "object",
        properties: {
          narrative: { type: "string" },
        },
      },
    });

    const narrative_summary = llmResult?.narrative || "";

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