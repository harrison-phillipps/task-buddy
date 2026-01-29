import { base44 } from "@/api/base44Client";

export async function analyzeUserProgress(userProgress, tasks, focusSessions, brainDumps) {
  // Calculate key metrics
  const today = new Date();
  const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const recentTasks = tasks.filter(t => new Date(t.created_date) >= last30Days);
  const completedTasks = recentTasks.filter(t => t.status === 'completed');
  const recentSessions = focusSessions.filter(s => new Date(s.created_date) >= last30Days);
  const recentBrainDumps = brainDumps.filter(b => new Date(b.created_date) >= last30Days);

  const completionRate = recentTasks.length > 0 
    ? Math.round((completedTasks.length / recentTasks.length) * 100) 
    : 0;

  const avgSessionLength = recentSessions.length > 0
    ? Math.round(recentSessions.reduce((sum, s) => sum + s.duration_minutes, 0) / recentSessions.length)
    : 0;

  const categoryBreakdown = {};
  completedTasks.forEach(task => {
    categoryBreakdown[task.category] = (categoryBreakdown[task.category] || 0) + 1;
  });

  const mostProductiveCategory = Object.entries(categoryBreakdown)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none';

  const prompt = `You are an empathetic ADHD coach analyzing someone's productivity progress.

CURRENT STATS:
- Total Points: ${userProgress?.total_points || 0}
- Level: ${userProgress?.level || 1}
- Current Streak: ${userProgress?.current_streak || 0} days
- Longest Streak: ${userProgress?.longest_streak || 0} days
- Tasks Completed (all time): ${userProgress?.tasks_completed || 0}
- Focus Sessions Completed: ${userProgress?.focus_sessions_completed || 0}
- Total Focus Time: ${userProgress?.total_focus_minutes || 0} minutes

RECENT ACTIVITY (Last 30 Days):
- Tasks Created: ${recentTasks.length}
- Tasks Completed: ${completedTasks.length}
- Completion Rate: ${completionRate}%
- Focus Sessions: ${recentSessions.length}
- Average Session Length: ${avgSessionLength} minutes
- Brain Dumps: ${recentBrainDumps.length}
- Most Productive Category: ${mostProductiveCategory}

PATTERNS:
- Peak productivity category: ${mostProductiveCategory}
- Brain dumps created: ${userProgress?.brain_dumps_created || 0}

Provide a warm, personalized analysis that:
1. Celebrates their wins (be specific!)
2. Identifies positive patterns or trends
3. Gives 2-3 actionable, encouraging insights
4. Acknowledges any struggles with compassion
5. Suggests one small improvement
6. Ends with genuine encouragement

Be conversational, warm, and authentic. Use "you" and "your". Keep insights specific to their data.
Avoid generic advice. Make them feel seen and supported.`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        summary: { 
          type: "string",
          description: "A warm 2-3 sentence overview of their progress"
        },
        key_wins: {
          type: "array",
          items: { type: "string" },
          description: "2-3 specific wins to celebrate"
        },
        insights: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              icon: { type: "string", enum: ["🎯", "🔥", "💡", "⚡", "🌟", "🚀", "💪", "🎨", "📈", "✨"] }
            }
          },
          description: "2-3 actionable insights"
        },
        recommended_focus: {
          type: "string",
          description: "One specific thing to focus on this week"
        },
        motivation_message: {
          type: "string",
          description: "A personal, encouraging closing message"
        },
        progress_score: {
          type: "number",
          description: "Overall progress score 1-100"
        }
      }
    }
  });

  return {
    ...result,
    metrics: {
      completionRate,
      avgSessionLength,
      recentTasks: recentTasks.length,
      completedTasks: completedTasks.length,
      recentSessions: recentSessions.length,
      recentBrainDumps: recentBrainDumps.length,
      mostProductiveCategory,
      streak: userProgress?.current_streak || 0,
      totalPoints: userProgress?.total_points || 0,
      level: userProgress?.level || 1
    }
  };
}

export function getProgressTrend(tasks) {
  const last14Days = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const recentCompleted = tasks.filter(t => 
    t.status === 'completed' && 
    new Date(t.updated_date) >= last14Days
  );

  const daysAgo7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const lastWeek = recentCompleted.filter(t => new Date(t.updated_date) >= daysAgo7).length;
  const weekBefore = recentCompleted.filter(t => 
    new Date(t.updated_date) < daysAgo7 && new Date(t.updated_date) >= last14Days
  ).length;

  if (lastWeek > weekBefore) return 'up';
  if (lastWeek < weekBefore) return 'down';
  return 'stable';
}