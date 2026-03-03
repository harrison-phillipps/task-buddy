import { base44 } from "@/api/base44Client";

export async function analyzeTaskPriority(tasks, userHistory, preferences = {}, strategyHint = "") {
  const {
    considerDeadlines = true,
    considerDependencies = true,
    considerDifficulty = true,
    considerCompletionPatterns = true,
    urgencyWeight = 1.0,
    importanceWeight = 1.0
  } = preferences;

  // Get completed tasks for pattern analysis
  const completedTasks = userHistory.filter(t => t.status === 'completed');
  
  // Analyze completion patterns
  const completionPatterns = {
    preferredTimeOfDay: getPreferredWorkTime(completedTasks),
    averageCompletionTime: getAverageCompletionTime(completedTasks),
    categorySuccess: getCategorySuccessRates(completedTasks),
    difficultySuccess: getDifficultySuccessRates(completedTasks)
  };

  const strategyLine = strategyHint ? `\nSTRATEGY INSTRUCTION: ${strategyHint}\n` : "";

  const prompt = `You are an expert task prioritization assistant helping someone with ADHD optimize their workflow.${strategyLine}

ACTIVE TASKS:
${tasks.map(t => `
- "${t.title}" 
  Category: ${t.category}, Difficulty: ${t.difficulty}, Energy: ${t.energy_level_needed}
  Estimated: ${t.estimated_minutes}m, Priority: ${t.task_priority || 'not set'}
  Due: ${t.due_date || 'no deadline'}
  Dependencies: ${t.blocked_by?.length > 0 ? 'blocked' : 'none'}
  Status: ${t.status}
  Subtasks: ${t.subtasks?.length || 0} (${t.subtasks?.filter(st => st.completed).length || 0} done)
`).join('\n')}

USER'S COMPLETION PATTERNS:
- Preferred work time: ${completionPatterns.preferredTimeOfDay}
- Average completion time: ${completionPatterns.averageCompletionTime}m
- Best performing category: ${completionPatterns.categorySuccess[0]?.category || 'N/A'}
- Best performing difficulty: ${completionPatterns.difficultySuccess[0]?.difficulty || 'N/A'}

PRIORITIZATION RULES:
- Consider deadlines: ${considerDeadlines}
- Consider dependencies: ${considerDependencies}
- Consider difficulty: ${considerDifficulty}
- Consider patterns: ${considerCompletionPatterns}
- Urgency weight: ${urgencyWeight}x
- Importance weight: ${importanceWeight}x

Analyze these tasks and suggest optimal prioritization order. Consider:
1. Deadlines and urgency
2. Task dependencies (unblock others first)
3. User's historical success patterns
4. Energy levels and difficulty
5. Progress momentum (tasks already started)
6. Time estimates vs available time
7. MoSCoW priority (must/should/could do)

For each task, provide:
- Suggested priority score (1-100, higher = more important)
- Reasoning (brief, encouraging)
- Best time to tackle (morning/afternoon/evening)
- Energy match (how well it fits current capabilities)`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        priorities: {
          type: "array",
          items: {
            type: "object",
            properties: {
              task_title: { type: "string" },
              priority_score: { type: "number" },
              reasoning: { type: "string" },
              best_time: { type: "string", enum: ["morning", "afternoon", "evening", "any"] },
              energy_match: { type: "string", enum: ["perfect", "good", "fair", "poor"] },
              urgency_level: { type: "string", enum: ["critical", "high", "medium", "low"] }
            }
          }
        },
        overall_strategy: { type: "string" },
        recommended_focus: { type: "string" }
      }
    }
  });

  // Map priorities back to tasks
  const prioritizedTasks = tasks.map(task => {
    const aiPriority = result.priorities.find(p => 
      p.task_title.toLowerCase().includes(task.title.toLowerCase().substring(0, 15)) ||
      task.title.toLowerCase().includes(p.task_title.toLowerCase().substring(0, 15))
    );

    return {
      ...task,
      ai_priority_score: aiPriority?.priority_score || 50,
      ai_reasoning: aiPriority?.reasoning || "",
      ai_best_time: aiPriority?.best_time || "any",
      ai_energy_match: aiPriority?.energy_match || "good",
      ai_urgency_level: aiPriority?.urgency_level || "medium"
    };
  });

  return {
    tasks: prioritizedTasks,
    strategy: result.overall_strategy,
    recommended_focus: result.recommended_focus
  };
}

function getPreferredWorkTime(completedTasks) {
  const timeSlots = { morning: 0, afternoon: 0, evening: 0 };
  
  completedTasks.forEach(task => {
    if (task.updated_date) {
      const hour = new Date(task.updated_date).getHours();
      if (hour >= 5 && hour < 12) timeSlots.morning++;
      else if (hour >= 12 && hour < 18) timeSlots.afternoon++;
      else timeSlots.evening++;
    }
  });

  const max = Math.max(timeSlots.morning, timeSlots.afternoon, timeSlots.evening);
  if (timeSlots.morning === max) return "morning";
  if (timeSlots.afternoon === max) return "afternoon";
  return "evening";
}

function getAverageCompletionTime(completedTasks) {
  const timesWithEstimates = completedTasks.filter(t => t.estimated_minutes);
  if (timesWithEstimates.length === 0) return 30;
  
  const avg = timesWithEstimates.reduce((sum, t) => sum + t.estimated_minutes, 0) / timesWithEstimates.length;
  return Math.round(avg);
}

function getCategorySuccessRates(completedTasks) {
  const categories = {};
  
  completedTasks.forEach(task => {
    const cat = task.category || 'other';
    if (!categories[cat]) categories[cat] = 0;
    categories[cat]++;
  });

  return Object.entries(categories)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

function getDifficultySuccessRates(completedTasks) {
  const difficulties = {};
  
  completedTasks.forEach(task => {
    const diff = task.difficulty || 'medium';
    if (!difficulties[diff]) difficulties[diff] = 0;
    difficulties[diff]++;
  });

  return Object.entries(difficulties)
    .map(([difficulty, count]) => ({ difficulty, count }))
    .sort((a, b) => b.count - a.count);
}

export function getAIPriorityColor(score) {
  if (score >= 80) return "from-red-500 to-orange-500";
  if (score >= 60) return "from-orange-500 to-yellow-500";
  if (score >= 40) return "from-yellow-500 to-green-500";
  return "from-green-500 to-teal-500";
}

export function getAIPriorityLabel(score) {
  if (score >= 80) return "Critical Priority";
  if (score >= 60) return "High Priority";
  if (score >= 40) return "Medium Priority";
  return "Low Priority";
}

export function getUrgencyIcon(urgency) {
  const icons = {
    critical: "🔴",
    high: "🟠",
    medium: "🟡",
    low: "🟢"
  };
  return icons[urgency] || "🟡";
}