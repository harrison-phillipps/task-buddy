import { base44 } from "@/api/base44Client";

export async function analyzeTaskPriority(tasks, userHistory, preferences = {}, strategyHint = "", goals = [], skills = []) {
  const {
    considerDeadlines = true,
    considerDependencies = true,
    considerDifficulty = true,
    considerCompletionPatterns = true,
    considerGoalAlignment = true,
    considerSkillDevelopment = true,
    urgencyWeight = 1.0,
    importanceWeight = 1.0,
    goalAlignmentWeight = 1.0,
    learningWeight = 1.0,
    dependencyChainWeight = 1.0,
    workStyle = 'balanced',
    avoidTaskSwitching = false,
    preferDeepWork = false,
  } = preferences;

  const completedTasks = userHistory.filter(t => t.status === 'completed');

  const completionPatterns = {
    preferredTimeOfDay: getPreferredWorkTime(completedTasks),
    averageCompletionTime: getAverageCompletionTime(completedTasks),
    categorySuccess: getCategorySuccessRates(completedTasks),
    difficultySuccess: getDifficultySuccessRates(completedTasks)
  };

  // Build dependency chain depth: tasks that unblock more tasks get higher depth
  const dependencyDepthMap = buildDependencyDepth(tasks);

  // Map tasks to their linked goal
  const goalMap = {};
  goals.forEach(g => { goalMap[g.id] = g; });

  // Map skills being developed
  const skillCategories = new Set(skills.map(s => s.category).filter(Boolean));

  const strategyLine = strategyHint ? `\nSTRATEGY INSTRUCTION: ${strategyHint}\n` : "";

  const prompt = `You are an expert task prioritization assistant helping someone optimize their workflow.${strategyLine}

ACTIVE TASKS (with dependency chain depth and goal linkage):
${tasks.map(t => {
  const goal = t.goal_id ? goalMap[t.goal_id] : null;
  const depth = dependencyDepthMap[t.id] || 0;
  const isLearning = t.category === 'learning' || skillCategories.has(t.category);
  return `
- ID: "${t.id}" | Title: "${t.title}"
  Category: ${t.category}, Difficulty: ${t.difficulty}, Energy: ${t.energy_level_needed}
  Estimated: ${t.estimated_minutes || '?'}m, Priority: ${t.task_priority || 'not set'}
  Due: ${t.due_date || 'no deadline'}
  Blocked by: ${t.blocked_by?.length > 0 ? t.blocked_by.length + ' tasks' : 'none'}
  Unblocks: ${t.blocks?.length || 0} tasks (chain depth: ${depth})
  Status: ${t.status}, Subtasks: ${t.subtasks?.length || 0} (${t.subtasks?.filter(st => st.completed).length || 0} done)
  Goal alignment: ${goal ? `"${goal.title}" (${goal.priority} priority, status: ${goal.status})` : 'none'}
  Skill/learning task: ${isLearning ? 'yes' : 'no'}`;
}).join('\n')}

USER GOALS (active):
${goals.filter(g => g.status !== 'completed').map(g => `- "${g.title}" | type: ${g.type} | priority: ${g.priority} | deadline: ${g.target_date || 'none'} | status: ${g.status}`).join('\n') || 'None set'}

SKILL DEVELOPMENT AREAS:
${skills.slice(0, 8).map(s => `- ${s.name || s.title} (${s.category || 'general'})`).join('\n') || 'None tracked'}

USER COMPLETION PATTERNS:
- Preferred work time: ${completionPatterns.preferredTimeOfDay}
- Average task completion time: ${completionPatterns.averageCompletionTime}m
- Best performing category: ${completionPatterns.categorySuccess[0]?.category || 'N/A'}
- Best at difficulty level: ${completionPatterns.difficultySuccess[0]?.difficulty || 'N/A'}

PRIORITIZATION PREFERENCES:
- Consider deadlines: ${considerDeadlines} (weight: ${urgencyWeight}x)
- Consider dependencies: ${considerDependencies} (chain depth weight: ${dependencyChainWeight}x)
- Consider difficulty: ${considerDifficulty}
- Consider patterns: ${considerCompletionPatterns}
- Consider goal alignment: ${considerGoalAlignment} (weight: ${goalAlignmentWeight}x)
- Consider skill development: ${considerSkillDevelopment} (weight: ${learningWeight}x)
- Work style: ${workStyle}
- Avoid task switching: ${avoidTaskSwitching}
- Prefer deep work blocks: ${preferDeepWork}
- Importance weight: ${importanceWeight}x

Analyze and provide optimal task order. Scoring factors (0-100):
1. Deadline urgency (× ${urgencyWeight})
2. Dependency chain depth - tasks unblocking more work score higher (× ${dependencyChainWeight})
3. Goal alignment - tasks tied to high-priority goals score higher (× ${goalAlignmentWeight})
4. Learning/skill development value (× ${learningWeight})
5. Historical success patterns for this category/difficulty
6. Energy level match and work style fit
7. MoSCoW priority and task importance (× ${importanceWeight})
8. Momentum: in-progress tasks get a boost
9. Work style: ${workStyle === 'deep_work' ? 'cluster similar tasks together' : workStyle === 'quick_wins' ? 'favour shorter tasks' : 'balanced approach'}`;

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
              urgency_level: { type: "string", enum: ["critical", "high", "medium", "low"] },
              goal_alignment_note: { type: "string" },
              dependency_note: { type: "string" }
            }
          }
        },
        overall_strategy: { type: "string" },
        recommended_focus: { type: "string" },
        goal_insights: { type: "string" }
      }
    }
  });

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
      ai_urgency_level: aiPriority?.urgency_level || "medium",
      ai_goal_note: aiPriority?.goal_alignment_note || "",
      ai_dependency_note: aiPriority?.dependency_note || "",
    };
  });

  return {
    tasks: prioritizedTasks,
    strategy: result.overall_strategy,
    recommended_focus: result.recommended_focus,
    goal_insights: result.goal_insights,
  };
}

function buildDependencyDepth(tasks) {
  // For each task, count how many tasks (directly or transitively) it unblocks
  const idSet = new Set(tasks.map(t => t.id));
  const depth = {};
  const getDepth = (taskId, visited = new Set()) => {
    if (visited.has(taskId)) return 0;
    if (depth[taskId] !== undefined) return depth[taskId];
    visited.add(taskId);
    const task = tasks.find(t => t.id === taskId);
    const unblocks = (task?.blocks || []).filter(id => idSet.has(id));
    const d = unblocks.reduce((sum, id) => sum + 1 + getDepth(id, new Set(visited)), 0);
    depth[taskId] = d;
    return d;
  };
  tasks.forEach(t => getDepth(t.id));
  return depth;
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