// Get pronoun based on gender
import { base44 } from "@/api/base44Client";

function getPronouns(gender) {
  if (gender === "female") return { subject: "she", object: "her", possessive: "her" };
  if (gender === "male") return { subject: "he", object: "him", possessive: "his" };
  return { subject: "they", object: "them", possessive: "their" };
}

// Personality-based message transformations
const personalityStyles = {
  motivational: {
    prefix: ["LET'S GO!", "You've GOT this!", "AMAZING!", "YES!", "INCREDIBLE!"],
    suffix: ["💪🔥", "You're UNSTOPPABLE! 🚀", "Keep that energy! ⚡", "CHAMPION! 🏆", "Let's CRUSH it! 💥"],
    transform: (msg) => msg.toUpperCase().replace(/\./g, "!").replace(/\?\!/g, "?")
  },
  calm: {
    prefix: ["Take a breath.", "Gently now.", "At your own pace.", "No rush.", "Peacefully,"],
    suffix: ["🌿", "You're doing wonderfully. 🧘", "One step at a time. 🌸", "Trust the process. ✨", "Be kind to yourself. 💚"],
    transform: (msg) => msg.replace(/!/g, ".").replace(/LET'S GO/gi, "Let's begin")
  },
  witty: {
    prefix: ["Plot twist:", "Fun fact:", "Spoiler alert:", "Between us,", "Hot take:"],
    suffix: ["😄", "No pressure, just diamonds! 💎", "*mic drop* 🎤", "You're basically a superhero now! 🦸", "10/10 would recommend! ⭐"],
    transform: (msg) => msg
  },
  direct: {
    prefix: ["Status:", "Update:", "Note:", "Action:", "Focus:"],
    suffix: ["", "Let's proceed.", "Moving forward.", "Ready when you are.", ""],
    transform: (msg) => msg.replace(/!/g, ".").replace(/amazing|incredible|awesome/gi, "good").replace(/💪|🔥|✨|🎉/g, "")
  }
};

function applyPersonalityStyle(message, personality = "motivational") {
  const style = personalityStyles[personality] || personalityStyles.motivational;
  
  // Sometimes add prefix (30% chance)
  const usePrefix = Math.random() < 0.3;
  const prefix = usePrefix ? style.prefix[Math.floor(Math.random() * style.prefix.length)] + " " : "";
  
  // Always add suffix for flavor
  const suffix = " " + style.suffix[Math.floor(Math.random() * style.suffix.length)];
  
  // Transform the message based on personality
  const transformed = style.transform(message);
  
  return prefix + transformed + suffix;
}

// Get AI-enhanced message based on archetype and traits
async function getAIEnhancedMessage(baseMessage, user, context) {
  if (!user?.companion_archetype && !user?.companion_traits) {
    return baseMessage;
  }

  try {
    const archetype = user.companion_archetype || "energetic_coach";
    const traits = user.companion_traits || {};
    const prefs = user.companion_preferences || {};

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Transform this message to match the user's companion personality.

BASE MESSAGE: "${baseMessage}"
CONTEXT: ${context}

COMPANION ARCHETYPE: ${archetype}
TRAITS:
- Encouragement: ${traits.encouragement || 70}% (0=minimal, 100=highly motivating)
- Humor: ${traits.humor || 40}% (0=serious, 100=witty)
- Directness: ${traits.directness || 50}% (0=gentle, 100=concise)
- Wisdom: ${traits.wisdom || 30}% (0=practical, 100=philosophical)
- Formality: ${traits.formality || 40}% (0=casual, 100=professional)
- Empathy: ${traits.empathy || 60}% (0=task-focused, 100=supportive)

PREFERENCES:
- Emoji usage: ${prefs.emoji_usage || "moderate"}
- Message length: ${prefs.message_length || "balanced"}

TRANSFORM the message to perfectly match these settings. Keep the core meaning but adjust tone, style, and length.`,
      response_json_schema: {
        type: "object",
        properties: {
          transformed_message: { type: "string" }
        }
      }
    });

    return result.transformed_message || baseMessage;
  } catch (error) {
    console.error("AI enhancement failed:", error);
    return baseMessage;
  }
}

// Personalized companion messages based on user progress
export function getPersonalizedMessage(userProgress, context, user = null) {
  const displayName = user?.display_name || "friend";
  const pronouns = getPronouns(user?.gender);
  const personality = user?.companion_personality || "motivational";
  const archetype = user?.companion_archetype;
  const level = userProgress?.level || 1;
  const streak = userProgress?.current_streak || 0;
  const longestStreak = userProgress?.longest_streak || 0;
  const tasksCompleted = userProgress?.tasks_completed || 0;
  const focusSessions = userProgress?.focus_sessions_completed || 0;
  const totalFocusMinutes = userProgress?.total_focus_minutes || 0;
  const brainDumps = userProgress?.brain_dumps_created || 0;

  // Analyze user patterns for personalized advice
  const isStreakStruggling = longestStreak > 3 && streak < 2;
  const isNewUser = tasksCompleted < 3 && focusSessions < 2;
  const isFocusHeavy = focusSessions > tasksCompleted * 2;
  const isTaskHeavy = tasksCompleted > focusSessions * 3;
  const hasLostStreak = longestStreak >= 5 && streak === 0;
  const isConsistent = streak >= 5;
  const needsBrainDumps = tasksCompleted > 10 && brainDumps < 2;

  // Base messages by personality type
  const messagesByPersonality = {
    motivational: {
      dashboard: [
        `${displayName}, you're a ROCKSTAR! Ready to dominate today?`,
        `Champions like you don't quit, ${displayName}! Let's GO!`,
        `${displayName}, today is YOUR day to shine!`
      ],
      focus_start: [
        `Time to show this task who's BOSS, ${displayName}!`,
        `${displayName}, you're about to CRUSH this! Ready?`,
        `Focus mode: ACTIVATED! You've got this, ${displayName}!`
      ],
      brain_dump: [
        `Let it ALL out, ${displayName}! Every thought is POWERFUL!`,
        `${displayName}, your brain is FULL of amazing ideas!`,
        `Dump those thoughts and watch the MAGIC happen!`
      ],
      task_breakdown: [
        `Let's SMASH this big task into bite-sized wins!`,
        `${displayName}, we're about to make this task your victory!`,
        `Breaking it down = Setting yourself up for SUCCESS!`
      ]
    },
    calm: {
      dashboard: [
        `Welcome back, ${displayName}. Take a moment to breathe.`,
        `${displayName}, there's no rush. Let's find your flow today.`,
        `Gently now, ${displayName}. What feels right to work on?`
      ],
      focus_start: [
        `${displayName}, settle in. Find your comfortable rhythm.`,
        `No pressure, ${displayName}. Just you and this moment.`,
        `Let's begin peacefully, ${displayName}. One breath at a time.`
      ],
      brain_dump: [
        `Let your thoughts flow freely, ${displayName}. No judgment.`,
        `${displayName}, release what's on your mind. It's safe here.`,
        `Gently unload your thoughts, ${displayName}. Take your time.`
      ],
      task_breakdown: [
        `Let's softly break this down, ${displayName}. Step by step.`,
        `${displayName}, we'll approach this gently together.`,
        `No rush. Let's find the natural pieces of this task.`
      ]
    },
    witty: {
      dashboard: [
        `${displayName}! Back for more productivity shenanigans? 😄`,
        `Plot twist: ${displayName} returns to conquer tasks!`,
        `${displayName}, your to-do list doesn't stand a chance!`
      ],
      focus_start: [
        `${displayName}, time to focus... or as I call it, "task wizardry"!`,
        `Focus mode? More like "becoming a legend" mode, ${displayName}!`,
        `${displayName}'s focusing? Someone alert the productivity hall of fame!`
      ],
      brain_dump: [
        `${displayName}'s brain buffet is now open! Dump away!`,
        `Time to empty that beautiful brain, ${displayName}!`,
        `Let the thought avalanche begin, ${displayName}! 🏔️`
      ],
      task_breakdown: [
        `Let's slice this task like a productivity ninja, ${displayName}!`,
        `${displayName}, time to turn this mountain into molehills!`,
        `Task surgery incoming! Dr. ${displayName} is ready! 🔪`
      ]
    },
    direct: {
      dashboard: [
        `${displayName}. Ready to work. What's the priority?`,
        `Welcome, ${displayName}. Let's see what needs doing.`,
        `${displayName}, checking in. Tasks are waiting.`
      ],
      focus_start: [
        `${displayName}, focus session ready. Let's begin.`,
        `Timer set. Focus mode active, ${displayName}.`,
        `${displayName}, task selected. Time to execute.`
      ],
      brain_dump: [
        `${displayName}, write your thoughts. I'll organize them.`,
        `Brain dump time. List everything, ${displayName}.`,
        `${displayName}, clear your mind. Put it all here.`
      ],
      task_breakdown: [
        `${displayName}, let's break this down efficiently.`,
        `Task received. Creating actionable steps.`,
        `${displayName}, we'll divide this into clear steps.`
      ]
    }
  };

  const messages = {
    dashboard: [],
    focus_start: [],
    brain_dump: [],
    task_breakdown: []
  };

  // Add personality-specific base messages
  const personalityMessages = messagesByPersonality[personality] || messagesByPersonality.motivational;
  Object.keys(messages).forEach(key => {
    messages[key].push(...(personalityMessages[key] || []));
  });

  // Dashboard messages - personalized based on patterns
  if (isNewUser) {
    messages.dashboard.push(
      `Welcome, ${displayName}! Start small - even one tiny task counts as progress! 🌱`,
      `Hey ${displayName}! Break big tasks into tiny steps. It makes everything easier!`,
      `${displayName}, don't aim for perfect - aim for done! Let's start simple. ✨`
    );
  } else if (hasLostStreak) {
    messages.dashboard.push(
      `${displayName}, you had a ${longestStreak}-day streak before - you can do it again! Fresh start today? 💪`,
      `Hey ${displayName}, streaks break sometimes, and that's okay! What matters is starting again. 🌅`,
      `${displayName}, every expert was once a beginner who kept coming back. Ready to restart? 🔄`
    );
  } else if (isStreakStruggling) {
    messages.dashboard.push(
      `${displayName}, try setting a daily reminder to check in, even for 5 minutes! ⏰`,
      `Small daily wins build big streaks, ${displayName}. What's one tiny thing you can do today?`,
      `Consistency beats intensity, ${displayName}! Even a 2-minute task keeps the streak alive. 🎯`
    );
  } else if (isConsistent) {
    messages.dashboard.push(
      `${displayName}, ${streak} days strong! Your consistency is your superpower! 🔥`,
      `Amazing ${streak}-day streak, ${displayName}! You're building incredible habits! 🏆`,
      `${displayName}, your dedication is inspiring! Keep riding this momentum! ⚡`
    );
  }

  if (isTaskHeavy) {
    messages.dashboard.push(
      "You're great at completing tasks! Try a focus session for deeper work. 🧘",
      "Tip: Focus sessions can help you tackle those harder tasks more easily!"
    );
  }

  if (isFocusHeavy) {
    messages.dashboard.push(
      "Great focus habits! Remember to break big goals into smaller tasks too! 📝",
      "You're a focus champion! Try brain dumping to capture all your ideas. 🧠"
    );
  }

  if (needsBrainDumps) {
    messages.dashboard.push(
      "Tip: Feeling overwhelmed? Try a brain dump to clear your head! 🧠",
      "Pro tip: Regular brain dumps help prevent task buildup!"
    );
  }

  // Level-based encouragement
  if (level >= 15) {
    messages.dashboard.push(`Level ${level} master! Your journey inspires others! 👑`);
  } else if (level >= 10) {
    messages.dashboard.push(`Level ${level}! You've come so far - incredible! 🌟`);
  } else if (level >= 5) {
    messages.dashboard.push(`Level ${level} and growing! Keep up the great work! 💫`);
  }

  // Default dashboard messages
  messages.dashboard.push(
    `Ready to tackle today, ${displayName}? I'm here with you!`,
    `Let's make progress together, ${displayName}!`,
    `Every step counts, ${displayName}. What shall we work on?`
  );

  // Focus start messages - personalized
  if (focusSessions === 0) {
    messages.focus_start.push(
      `${displayName}, your first focus session! Start with just 10-15 minutes. You've got this! 🎯`,
      `Tip for ${displayName}: Remove distractions before starting. Phone on silent helps! 📵`,
      `First time focusing together, ${displayName}! Remember: it's okay to take breaks! 💚`
    );
  } else if (focusSessions < 5) {
    messages.focus_start.push(
      `${displayName}, you're building a great focus habit! Each session gets easier. 💪`,
      `${displayName}, if you get distracted, gently bring your attention back. No judgment!`,
      `Focus session #${focusSessions + 1}, ${displayName}! You're on your way to mastery! 🚀`
    );
  } else if (focusSessions >= 25) {
    messages.focus_start.push(
      `${displayName}, focus veteran! Your concentration powers are legendary! ⚡`,
      `${displayName}, ${focusSessions} sessions completed! You know exactly what works for you! 🏆`,
      `A true focus master at work, ${displayName}! Let's make this session count! 👑`
    );
  }

  if (totalFocusMinutes >= 500) {
    messages.focus_start.push(
      `${totalFocusMinutes} minutes of focus logged! That's serious dedication! ⏱️`
    );
  }

  messages.focus_start.push(
    `Let's focus together, ${displayName}! You've got this!`,
    `I'll be right here cheering you on, ${displayName}!`,
    `Time to shine, ${displayName}! Let's do this!`
  );

  // Brain dump messages - personalized
  if (brainDumps === 0) {
    messages.brain_dump.push(
      "First brain dump! Just write everything - no filtering needed! 🧠",
      "Tip: Don't organize as you write. Just let it all flow out!",
      "This is a judgment-free zone. Dump ALL your thoughts! 💭"
    );
  } else if (brainDumps >= 10) {
    messages.brain_dump.push(
      "Brain dump pro! You know the power of clearing your mind! 🌟",
      `${brainDumps} brain dumps! You've mastered the art of mental clarity! 🧘`
    );
  }

  if (tasksCompleted > 20 && brainDumps < 5) {
    messages.brain_dump.push(
      "Tip: Regular brain dumps can help you discover hidden tasks and reduce anxiety!"
    );
  }

  messages.brain_dump.push(
    `Pour out everything on your mind, ${displayName}. I'll help organize it!`,
    `No thought is too small, ${displayName}. Let it all out!`,
    `Brain feeling full, ${displayName}? Let's empty it together!`
  );

  // Task breakdown messages
  if (tasksCompleted < 5) {
    messages.task_breakdown.push(
      "Breaking tasks down is the secret to getting things done! Let me help! ✨",
      "Tip: Smaller steps = less overwhelm. Let's make this manageable!",
      "Big tasks can feel scary. Let's chop this into tiny, doable pieces! 🔪"
    );
  } else {
    messages.task_breakdown.push(
      "You know the drill! Let's break this down into easy steps! 💪",
      "Another task to conquer! Small steps lead to big wins! 🏆"
    );
  }

  messages.task_breakdown.push(
    `Let's turn this big task into small, doable steps, ${displayName}!`,
    `I'll help you break this down into manageable pieces, ${displayName}!`
  );

  const contextMessages = messages[context] || messages.dashboard;
  const baseMessage = contextMessages[Math.floor(Math.random() * contextMessages.length)];

  // Note: AI enhancement (getAIEnhancedMessage) is intentionally NOT called here
  // because this function is used synchronously in JSX renders.
  // Deep personality customisation is handled asynchronously by AdaptiveCompanionAI.
  return baseMessage;
}

// Export personality styles for use elsewhere
export { personalityStyles, applyPersonalityStyle };

// Get contextual tips based on user struggles
export function getProductivityTip(userProgress, context = null, additionalData = {}) {
  const streak = userProgress?.current_streak || 0;
  const longestStreak = userProgress?.longest_streak || 0;
  const focusSessions = userProgress?.focus_sessions_completed || 0;
  const tasksCompleted = userProgress?.tasks_completed || 0;
  const totalFocusMinutes = userProgress?.total_focus_minutes || 0;
  const brainDumps = userProgress?.brain_dumps_created || 0;

  const tips = [];

  // Streak-related tips
  if (longestStreak > streak && streak < 3) {
    tips.push({
      type: "streak",
      title: "Rebuild Your Streak",
      message: "You had a " + longestStreak + "-day streak before! Let's get it back. Even 5 minutes today counts! 🔥",
      priority: "high"
    });
  }

  if (streak >= 3 && streak < 7) {
    tips.push({
      type: "encouragement",
      title: "Streak Growing!",
      message: streak + " days strong! Keep this momentum going - you're building powerful habits! 💪",
      priority: "medium"
    });
  }

  // Focus session tips
  if (focusSessions < 5) {
    tips.push({
      type: "focus",
      title: "Focus Session Tip",
      message: "Try starting with just 10-15 minutes. Short, focused bursts are more effective than marathon sessions! 🎯",
      priority: "medium"
    });
  }

  if (totalFocusMinutes > 300 && focusSessions < 10) {
    tips.push({
      type: "focus",
      title: "You're Building Focus Stamina!",
      message: "Nice! You've focused for " + totalFocusMinutes + " minutes. Regular sessions are training your concentration muscle! 🧠",
      priority: "low"
    });
  }

  // Balance tips
  if (tasksCompleted > 10 && focusSessions < 3) {
    tips.push({
      type: "balance",
      title: "Try Deep Focus",
      message: "You complete tasks quickly! For complex work, try focus sessions to dive deeper without distractions. ⚡",
      priority: "medium"
    });
  }

  if (focusSessions > tasksCompleted * 2) {
    tips.push({
      type: "balance",
      title: "Break It Down",
      message: "You love focus time! Try breaking bigger goals into smaller tasks for clearer progress tracking. 📝",
      priority: "medium"
    });
  }

  // Brain dump tips
  if (tasksCompleted > 15 && brainDumps < 3) {
    tips.push({
      type: "braindump",
      title: "Clear Your Mind",
      message: "Feeling overwhelmed? Try a brain dump! It helps capture floating thoughts and reduce mental clutter. 🧠✨",
      priority: "high"
    });
  }

  // Time of day tips
  const hour = new Date().getHours();
  if (hour >= 14 && hour <= 16 && context !== "focus_session") {
    tips.push({
      type: "energy",
      title: "Afternoon Dip?",
      message: "Post-lunch energy slump is real! Try a 5-minute walk or tackle an easy task to regain momentum. 🚶",
      priority: "low"
    });
  }

  // Context-specific tips
  if (context === "many_tasks" && additionalData.taskCount > 10) {
    tips.push({
      type: "overwhelm",
      title: "Feeling Overwhelmed?",
      message: "You have " + additionalData.taskCount + " tasks. Focus on just 3 priority tasks today. Progress over perfection! 🎯",
      priority: "high"
    });
  }

  if (context === "no_due_dates" && additionalData.tasksWithoutDates > 5) {
    tips.push({
      type: "planning",
      title: "Set Some Deadlines",
      message: "Tasks with due dates are 3x more likely to get done! Add realistic deadlines to your top priorities. 📅",
      priority: "medium"
    });
  }

  if (context === "hard_tasks_blocked" && additionalData.blockedTasks > 0) {
    tips.push({
      type: "unblock",
      title: "Unblock Progress",
      message: "You have blocked tasks! Can you break dependencies or work on their prerequisites first? 🔓",
      priority: "high"
    });
  }

  // Milestone celebrations
  if (tasksCompleted === 1) {
    tips.push({
      type: "milestone",
      title: "First Task Complete! 🎉",
      message: "You just completed your first task! Every journey starts with a single step. Keep going!",
      priority: "high"
    });
  }

  if (tasksCompleted === 10) {
    tips.push({
      type: "milestone",
      title: "10 Tasks Done! 🏆",
      message: "Double digits! You're building real momentum now. This is where habits form!",
      priority: "high"
    });
  }

  if (tasksCompleted === 25) {
    tips.push({
      type: "milestone",
      title: "25 Tasks Completed! 🌟",
      message: "WOW! 25 tasks! You've proven you can stick with this. You're a productivity champion!",
      priority: "high"
    });
  }

  if (streak === 7) {
    tips.push({
      type: "milestone",
      title: "One Week Streak! 🔥",
      message: "7 days in a row! You've officially built a habit. This is where transformation happens!",
      priority: "high"
    });
  }

  // Sort by priority and return highest priority tip
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  tips.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  
  return tips.length > 0 ? tips[0] : null;
}

// Companion visual upgrades based on level
export function getCompanionUpgrades(level) {
  const upgrades = {
    badge: null,
    aura: null,
    accessories: [],
    specialEffects: []
  };

  // Level badges
  if (level >= 1) upgrades.badge = { color: "bronze" };
  if (level >= 5) {
    upgrades.badge = { color: "silver" };
    upgrades.accessories.push("sparkle");
  }
  if (level >= 10) {
    upgrades.badge = { color: "gold" };
    upgrades.accessories.push("crown");
    upgrades.aura = "bronze";
  }
  if (level >= 15) {
    upgrades.badge = { color: "purple" };
    upgrades.aura = "silver";
  }
  if (level >= 20) {
    upgrades.badge = { color: "rainbow" };
    upgrades.accessories.push("halo");
    upgrades.aura = "gold";
    upgrades.specialEffects.push("particles");
  }
  if (level >= 25) {
    upgrades.aura = "rainbow";
    upgrades.specialEffects.push("legendary_glow");
  }

  return upgrades;
}