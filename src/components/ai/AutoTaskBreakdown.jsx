import { base44 } from "@/api/base44Client";

export async function generateSubtasks(title, description, context = {}) {
  const {
    difficulty = "medium",
    category = "personal",
    estimatedMinutes = 60,
    includeWarmup = true
  } = context;

  const prompt = `You are helping someone with ADHD break down a task into manageable subtasks.

TASK TO BREAK DOWN:
Title: "${title}"
Description: ${description || "No additional description"}
Difficulty: ${difficulty}
Category: ${category}
Total estimated time: ${estimatedMinutes} minutes

INSTRUCTIONS:
1. Break this task into 3-7 specific, actionable subtasks
2. Each subtask should be clear, concrete, and achievable in one sitting
3. Order subtasks logically (dependencies first)
4. Estimate realistic time for each subtask
${includeWarmup ? `5. IMPORTANT: Include 1-2 "warm-up" steps at the beginning - tiny, easy actions that take <5 minutes to build momentum (e.g., "Gather materials", "Open relevant files", "Clear workspace", "Set timer for 10 min")` : ''}
6. Make subtask titles friendly and encouraging
7. Consider the person's ADHD - avoid overwhelming steps

Focus on:
- Breaking large steps into smaller ones
- Creating natural stopping points
- Building momentum with quick wins
- Clear, specific language
- Realistic time estimates`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        subtasks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              estimated_minutes: { type: "number" },
              is_warmup: { type: "boolean" },
              order: { type: "number" },
              completed: { type: "boolean", default: false }
            }
          }
        },
        encouragement: { type: "string" },
        tips: { 
          type: "array",
          items: { type: "string" }
        },
        suggested_difficulty: { 
          type: "string", 
          enum: ["easy", "medium", "hard"] 
        }
      }
    }
  });

  return {
    subtasks: result.subtasks.map((st, idx) => ({
      ...st,
      order: idx,
      completed: false
    })),
    encouragement: result.encouragement,
    tips: result.tips,
    suggested_difficulty: result.suggested_difficulty
  };
}

export async function refineSubtask(subtask, context) {
  const prompt = `Help refine this subtask to be more actionable:

CURRENT SUBTASK: "${subtask.title}"
Estimated time: ${subtask.estimated_minutes} minutes

Context: ${context}

Make it more specific, actionable, and ADHD-friendly. Keep it short and clear.`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        refined_title: { type: "string" },
        suggested_time: { type: "number" },
        tip: { type: "string" }
      }
    }
  });

  return result;
}

export async function suggestNextSubtask(completedSubtasks, remainingTask) {
  const prompt = `Based on completed subtasks, suggest what to do next:

COMPLETED:
${completedSubtasks.map(st => `✓ ${st.title}`).join('\n')}

REMAINING TASK:
${remainingTask}

Suggest the best next step considering momentum, energy, and logical flow. Keep it encouraging!`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        suggestion: { type: "string" },
        reasoning: { type: "string" },
        estimated_minutes: { type: "number" }
      }
    }
  });

  return result;
}