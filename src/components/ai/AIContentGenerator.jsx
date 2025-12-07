import { base44 } from "@/api/base44Client";

export async function generateTaskDescription(taskTitle, context = "") {
  const prompt = `You are a helpful task planning assistant. Generate a clear, actionable task description for: "${taskTitle}".
  
${context ? `Context: ${context}` : ""}

Provide a concise 2-3 sentence description that clarifies what needs to be done and why it matters. Be encouraging and specific.

Return only the description text, nothing else.`;

  const response = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: false,
  });

  return response;
}

export async function generateGoalStatement(goalTitle, type = "personal") {
  const prompt = `You are a goal-setting coach. Create an inspiring, specific goal statement for: "${goalTitle}".

Goal type: ${type}

Write a compelling 2-3 sentence statement that:
- Clarifies the desired outcome
- Explains the benefit or impact
- Uses motivating, positive language

Return only the goal statement, nothing else.`;

  const response = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: false,
  });

  return response;
}

export async function generateHabitSuggestions(habitGoal) {
  const prompt = `You are a habit formation expert. The user wants to: "${habitGoal}".

Suggest 3 specific, actionable habits that would help achieve this goal. For each habit, provide:
- A clear habit title (short, action-oriented)
- A brief explanation of why it helps

Format as JSON array:
[
  {"title": "habit name", "explanation": "why it helps", "frequency": "daily or weekly"},
  ...
]`;

  const response = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: false,
    response_json_schema: {
      type: "object",
      properties: {
        suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              explanation: { type: "string" },
              frequency: { type: "string" }
            }
          }
        }
      }
    }
  });

  return response.suggestions || [];
}

export async function generateMotivationalMessage(userProgress, context = "general") {
  const level = userProgress?.level || 1;
  const streak = userProgress?.current_streak || 0;
  const tasksCompleted = userProgress?.tasks_completed || 0;
  
  const prompt = `You are an encouraging productivity coach. Create a personalized motivational message for a user with these stats:
- Level: ${level}
- Current streak: ${streak} days
- Tasks completed: ${tasksCompleted}
- Context: ${context}

Write a warm, specific message (2-3 sentences) that:
- Acknowledges their progress
- Provides encouragement
- Offers a gentle nudge forward

Be authentic and avoid clichés. Return only the message text.`;

  const response = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: false,
  });

  return response;
}

export async function generateProgressReport(userProgress, timeframe = "week") {
  const prompt = `You are a personal productivity analyst. Generate a progress summary for this ${timeframe}.

User stats:
- Level: ${userProgress?.level || 1}
- Total points: ${userProgress?.total_points || 0}
- Tasks completed: ${userProgress?.tasks_completed || 0}
- Focus sessions: ${userProgress?.focus_sessions_completed || 0}
- Total focus time: ${userProgress?.total_focus_minutes || 0} minutes
- Current streak: ${userProgress?.current_streak || 0} days
- Brain dumps: ${userProgress?.brain_dumps_created || 0}

Create a personalized report with:
1. Key highlights (2-3 achievements)
2. Growth areas (1-2 opportunities)
3. Motivation for the next ${timeframe}

Format as JSON:
{
  "summary": "brief overview sentence",
  "highlights": ["achievement 1", "achievement 2"],
  "growth_areas": ["opportunity 1"],
  "next_steps": "encouraging message for moving forward"
}`;

  const response = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: false,
    response_json_schema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        highlights: { type: "array", items: { type: "string" } },
        growth_areas: { type: "array", items: { type: "string" } },
        next_steps: { type: "string" }
      }
    }
  });

  return response;
}

export async function generateSocialPost(achievement, userProgress) {
  const level = userProgress?.level || 1;
  const streak = userProgress?.current_streak || 0;
  
  const prompt = `You are a social media content creator. Craft an engaging post to share this productivity achievement:

Achievement: ${achievement.title}
User Level: ${level}
Current Streak: ${streak} days

Create a short, authentic social media post (1-2 sentences + emojis) that:
- Celebrates the achievement
- Inspires others
- Is humble but proud
- Uses 2-3 relevant emojis

Also suggest 3-5 relevant hashtags.

Format as JSON:
{
  "post": "the social media post text",
  "hashtags": ["hashtag1", "hashtag2", ...]
}`;

  const response = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: false,
    response_json_schema: {
      type: "object",
      properties: {
        post: { type: "string" },
        hashtags: { type: "array", items: { type: "string" } }
      }
    }
  });

  return response;
}