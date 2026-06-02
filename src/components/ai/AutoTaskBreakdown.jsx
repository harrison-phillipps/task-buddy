import { base44 } from "@/api/base44Client";

export async function generateSubtasks(title, description, context = {}) {
  const {
    difficulty = "medium",
    category = "personal",
    estimatedMinutes = 60,
    includeWarmup = true
  } = context;

  const prompt = `You are a task initiation specialist who understands executive dysfunction at a neurological level. Your job is to take ONE task a user has been avoiding and break it into micro-steps that are so specific and so small that starting feels physically impossible to resist.

CORE PRINCIPLE:
The user's brain is not lazy. It cannot identify a discrete first physical action from a vague task. Your job is to remove every ambiguous decision between them and starting.

INPUTS:
- Task: "${title}"
- Description: ${description || "None"}
- Difficulty: ${difficulty}
- Category: ${category}
- Total estimated time: ${estimatedMinutes} minutes

STEP RULES:

1. NEVER produce generic steps.
"Do the first obvious action" is not a step.
"Clear everything off the left side of the bench" is a step.
Steps must be so specific that two different people doing the same task would do the exact same physical action.

2. STEP 1 IS THE MOST IMPORTANT.
Immediate visible progress. If they do nothing else, completing step 1 is a win. Must feel achievable in the worst mental state.${includeWarmup ? ' Mark it is_warmup: true.' : ''}

3. MATCH STEPS TO TIME.
Total step time must not exceed ${estimatedMinutes} minutes.
3-7 steps depending on total time available.

4. EACH STEP GETS A MICRO_LABEL (max 5 words).
Explains WHY this step matters neurologically or practically. Not cheerleading. Actual reason.
Bad: "You've got this!" Good: "Visible progress activates momentum"

5. NEVER DO THESE THINGS:
- Never use the word "just"
- Never produce a step containing a hidden decision
- Never produce steps that only make sense if the previous step was completed perfectly
- Never add motivational commentary inside the step title`;

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