import { base44 } from "@/api/base44Client";

/**
 * Generate a dynamic companion message using AI based on personality, context, and user data
 */
export async function generateCompanionMessage({
  personality = {},
  context = "general",
  userProgress = null,
  userMood = null,
  recentActivity = null,
  userPreferences = null
}) {
  const level = userProgress?.level || 1;
  const streak = userProgress?.current_streak || 0;
  const tasksCompleted = userProgress?.tasks_completed || 0;
  
  // Build personality description
  const personalityTraits = [];
  if (personality.encouragement >= 70) personalityTraits.push("highly encouraging and supportive");
  else if (personality.encouragement >= 40) personalityTraits.push("moderately encouraging");
  else personalityTraits.push("straightforward without excessive praise");
  
  if (personality.humor >= 70) personalityTraits.push("witty and playful");
  else if (personality.humor >= 40) personalityTraits.push("occasionally humorous");
  else personalityTraits.push("serious and focused");
  
  if (personality.directness >= 70) personalityTraits.push("direct and to-the-point");
  else if (personality.directness >= 40) personalityTraits.push("balanced in communication style");
  else personalityTraits.push("gentle and elaborate");
  
  if (personality.wisdom >= 70) personalityTraits.push("philosophical and insightful");
  else if (personality.wisdom >= 40) personalityTraits.push("occasionally shares insights");
  else personalityTraits.push("practical and action-oriented");
  
  const personalityDesc = personalityTraits.join(", ");
  
  // Build context-specific instructions
  const contextInstructions = {
    dashboard: "Welcome the user and provide an overview of their day ahead",
    task_start: "Motivate them to begin working on their task",
    task_complete: "Celebrate their achievement",
    focus_session: "Help them maintain focus and concentration",
    brain_dump: "Encourage them to freely express all their thoughts",
    struggling: "Provide compassionate support and practical advice",
    streak_milestone: "Celebrate their consistency achievement",
    general: "Provide relevant encouragement or advice"
  };
  
  const prompt = `You are a virtual productivity companion with the following personality: ${personalityDesc}.

User Context:
- Level: ${level}
- Current streak: ${streak} days
- Tasks completed: ${tasksCompleted}
- Current mood: ${userMood || "not specified"}
- Context: ${context}
${recentActivity ? `- Recent activity: ${recentActivity}` : ""}

${userPreferences?.dislikedPhrases?.length > 0 ? `AVOID these phrases (user dislikes them): ${userPreferences.dislikedPhrases.join(", ")}` : ""}
${userPreferences?.preferredStyle ? `User prefers: ${userPreferences.preferredStyle}` : ""}

Task: ${contextInstructions[context] || contextInstructions.general}

Write ONE concise message (1-2 sentences max) that:
- Matches your personality traits exactly
- Addresses their current context
- Considers their mood and progress
- Feels authentic and personalized
- ${personality.emoji_usage >= 50 ? "Uses 1-2 relevant emojis" : "Uses minimal or no emojis"}

Return ONLY the message text, nothing else.`;

  try {
    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false,
    });
    
    return response;
  } catch (error) {
    console.error("AI message generation failed:", error);
    // Fallback to simple message
    return getFallbackMessage(context, personality);
  }
}

/**
 * Generate contextual tips using AI
 */
export async function generateCompanionTip({
  personality = {},
  userProgress = null,
  strugglingWith = null
}) {
  const prompt = `You are a productivity coach. Generate ONE specific, actionable tip for a user who:
- Level: ${userProgress?.level || 1}
- Completed ${userProgress?.tasks_completed || 0} tasks
- Current streak: ${userProgress?.current_streak || 0} days
${strugglingWith ? `- Is struggling with: ${strugglingWith}` : ""}

Personality: ${personality.directness >= 70 ? "Direct and concise" : "Warm and detailed"}

Provide a SHORT (1-2 sentences), practical tip that will genuinely help them improve.
${personality.humor >= 70 ? "You can use light humor if appropriate." : "Be straightforward."}

Return ONLY the tip text.`;

  try {
    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false,
    });
    
    return response;
  } catch (error) {
    console.error("Tip generation failed:", error);
    return "Break big tasks into smaller steps - it makes everything more manageable!";
  }
}

/**
 * Get fallback message if AI fails
 */
function getFallbackMessage(context, personality) {
  const messages = {
    dashboard: "Ready to tackle today's tasks?",
    task_complete: "Great job completing that task!",
    focus_session: "Let's focus together!",
    brain_dump: "Let it all out - I'm here to help organize.",
    general: "You're doing great! Keep going!"
  };
  
  let message = messages[context] || messages.general;
  
  // Add emoji if personality calls for it
  if (personality.emoji_usage >= 50) {
    message += " ✨";
  }
  
  return message;
}