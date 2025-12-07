import { base44 } from "@/api/base44Client";

/**
 * Generate personalized habit recommendations based on user goals and past behavior
 */
export async function generateHabitRecommendations({ userGoals, currentHabits, userProgress, completionHistory }) {
  const prompt = `You are a habit formation coach. Analyze the user's situation and provide 3 personalized habit recommendations.

Current Habits: ${currentHabits.map(h => `${h.title} (${h.frequency}, streak: ${h.current_streak})`).join(", ") || "None"}
User Level: ${userProgress?.level || 1}
Tasks Completed: ${userProgress?.tasks_completed || 0}
Focus Sessions: ${userProgress?.focus_sessions_completed || 0}
${userGoals ? `User Goals: ${userGoals}` : ""}

Based on their current habits and progress, suggest 3 NEW habits that would:
- Complement their existing routine
- Support their productivity goals
- Be realistic and achievable
- Build on their current momentum

Return a JSON array with this exact structure:
[
  {
    "title": "habit name",
    "reason": "why this habit would help them (1 sentence)",
    "frequency": "daily" or "weekly",
    "difficulty": "easy", "medium", or "hard"
  }
]

Return ONLY the JSON array, no other text.`;

  try {
    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                reason: { type: "string" },
                frequency: { type: "string" },
                difficulty: { type: "string" }
              }
            }
          }
        }
      }
    });

    return response.recommendations || [];
  } catch (error) {
    console.error("Failed to generate recommendations:", error);
    return [];
  }
}

/**
 * Generate motivational message based on current progress
 */
export async function generateMotivationalMessage({ habit, userProgress, personality = {} }) {
  const streakStatus = habit.current_streak > habit.longest_streak * 0.8 ? "approaching their best" : 
                       habit.current_streak >= 7 ? "building strong momentum" :
                       habit.current_streak >= 3 ? "gaining traction" : "just starting";

  const encouragementLevel = personality.encouragement || 70;
  const humorLevel = personality.humor || 40;

  const prompt = `Generate a motivational message for a user working on the habit: "${habit.title}"

Context:
- Current streak: ${habit.current_streak} days
- Longest streak: ${habit.longest_streak} days
- Status: ${streakStatus}
- Total completions: ${habit.total_completions}

Personality:
- Encouragement level: ${encouragementLevel}% (${encouragementLevel >= 70 ? "highly encouraging" : encouragementLevel >= 40 ? "balanced" : "straightforward"})
- Humor level: ${humorLevel}% (${humorLevel >= 70 ? "witty and fun" : humorLevel >= 40 ? "occasionally playful" : "serious"})

Write ONE SHORT motivational message (1-2 sentences) that:
- Acknowledges their current progress
- Encourages continuation
- Matches the personality style
${humorLevel >= 70 ? "- Can include light humor" : ""}
${encouragementLevel >= 70 ? "- Should be highly positive and energizing" : ""}

Return ONLY the message text.`;

  try {
    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false
    });

    return response;
  } catch (error) {
    console.error("Failed to generate message:", error);
    return `${habit.current_streak} day streak! Keep it going! 🔥`;
  }
}

/**
 * Analyze habit patterns and suggest adjustments
 */
export async function analyzeHabitPatterns({ habit, completions, userProgress }) {
  // Calculate completion rate
  const last7Days = completions.filter(c => {
    const date = new Date(c.completion_date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return date >= weekAgo;
  });

  const last30Days = completions.filter(c => {
    const date = new Date(c.completion_date);
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    return date >= monthAgo;
  });

  const weeklyRate = (last7Days.length / 7) * 100;
  const monthlyRate = (last30Days.length / 30) * 100;

  // Analyze completion times and patterns
  const completionDays = completions.map(c => new Date(c.completion_date).getDay());
  const dayFrequency = {};
  completionDays.forEach(day => {
    dayFrequency[day] = (dayFrequency[day] || 0) + 1;
  });

  const mostSuccessfulDays = Object.entries(dayFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 2)
    .map(([day]) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]);

  const prompt = `Analyze this habit and provide actionable suggestions for improvement.

Habit: "${habit.title}"
Frequency: ${habit.frequency}
Target: ${habit.target_count}x per ${habit.frequency === 'daily' ? 'day' : 'week'}

Performance:
- Last 7 days: ${weeklyRate.toFixed(0)}% completion rate (${last7Days.length}/7 days)
- Last 30 days: ${monthlyRate.toFixed(0)}% completion rate (${last30Days.length}/30 days)
- Current streak: ${habit.current_streak} days
- Longest streak: ${habit.longest_streak} days
- Most successful days: ${mostSuccessfulDays.join(", ")}

Provide 2-3 SPECIFIC, ACTIONABLE suggestions to improve consistency. Consider:
- If completion rate is low, suggest reducing frequency or simplifying
- If they're successful on certain days, suggest optimizing for those patterns
- If streaks are breaking, suggest reminder strategies
- If they're doing well, suggest progressive challenges

Return a JSON object:
{
  "analysis": "brief assessment of their pattern (1 sentence)",
  "suggestions": [
    {"tip": "specific actionable suggestion", "reason": "why this will help"}
  ]
}`;

  try {
    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          analysis: { type: "string" },
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                tip: { type: "string" },
                reason: { type: "string" }
              }
            }
          }
        }
      }
    });

    return {
      weeklyRate,
      monthlyRate,
      mostSuccessfulDays,
      analysis: response.analysis,
      suggestions: response.suggestions || []
    };
  } catch (error) {
    console.error("Failed to analyze patterns:", error);
    return {
      weeklyRate,
      monthlyRate,
      mostSuccessfulDays,
      analysis: "Keep building your consistency!",
      suggestions: []
    };
  }
}

/**
 * Generate a quick coaching tip based on overall habit health
 */
export async function generateQuickTip({ habits, userProgress, personality = {} }) {
  const activeHabits = habits.filter(h => h.is_active);
  const avgStreak = activeHabits.reduce((sum, h) => sum + h.current_streak, 0) / activeHabits.length;
  const totalCompletions = activeHabits.reduce((sum, h) => sum + h.total_completions, 0);

  const context = activeHabits.length === 0 ? "no habits yet" :
                  activeHabits.length > 5 ? "many habits (might be too many)" :
                  avgStreak >= 7 ? "strong consistency" :
                  avgStreak >= 3 ? "building momentum" : "struggling with consistency";

  const prompt = `Provide ONE quick, actionable habit coaching tip.

User situation: ${context}
- Active habits: ${activeHabits.length}
- Average streak: ${avgStreak.toFixed(1)} days
- Total completions: ${totalCompletions}
- User level: ${userProgress?.level || 1}

Personality: ${personality.directness >= 70 ? "Direct and concise" : "Warm and encouraging"}

Give ONE specific tip (1 sentence) that will genuinely help them right now.
Return ONLY the tip text.`;

  try {
    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false
    });

    return response;
  } catch (error) {
    console.error("Failed to generate tip:", error);
    return "Start small - one habit at a time builds lasting change.";
  }
}