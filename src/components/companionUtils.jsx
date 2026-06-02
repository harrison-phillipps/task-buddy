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
  // Tone principle: peer/coach, not cheerleader. Specific > generic. Never patronising.
  const messagesByPersonality = {
    motivational: {
      dashboard: [
        `${displayName}, what's the one thing that actually moves the needle today?`,
        `Back at it. What are you making happen today, ${displayName}?`,
        `${displayName}, the hardest part is starting. You're already here.`
      ],
      focus_start: [
        `${displayName}, close the tabs. This is your time.`,
        `One task. Full attention. Go, ${displayName}.`,
        `${displayName}, this window is yours. Make it count.`
      ],
      brain_dump: [
        `${displayName}, get it all out. Nothing's too small or too messy.`,
        `No filtering, no judging. Just write, ${displayName}.`,
        `Clear the mental backlog, ${displayName}. Everything out.`
      ],
      task_breakdown: [
        `${displayName}, let's find the first real step — not the whole staircase.`,
        `Big tasks shrink fast once you start cutting, ${displayName}.`,
        `${displayName}, let's find where to bite first.`
      ]
    },
    calm: {
      dashboard: [
        `Welcome back, ${displayName}. What feels manageable right now?`,
        `${displayName}, no agenda — just whatever makes sense to start with.`,
        `Take stock, ${displayName}. What needs your attention today?`
      ],
      focus_start: [
        `${displayName}, settle in. Distraction is normal — just return when it happens.`,
        `No pressure on the outcome, ${displayName}. Just show up for the time.`,
        `${displayName}, you don't need to be in the zone. Just begin.`
      ],
      brain_dump: [
        `${displayName}, let it out without editing. You can sort it after.`,
        `Whatever's in your head — useful or not — write it down, ${displayName}.`,
        `${displayName}, this is a private page. Let it be honest.`
      ],
      task_breakdown: [
        `${displayName}, one concrete next action. That's all we need right now.`,
        `Let's find the first step that doesn't require perfect conditions, ${displayName}.`,
        `${displayName}, small is fine. Small still moves things forward.`
      ]
    },
    witty: {
      dashboard: [
        `${displayName}, your task list hasn't given up on you. Time to return the favour.`,
        `Back? Great. Your procrastination has been noted and forgiven, ${displayName}.`,
        `${displayName}, the to-do list is holding. What are you doing about it?`
      ],
      focus_start: [
        `${displayName}, phone face-down. Tabs closed. Let's pretend it's 1987 and there's no internet.`,
        `Focus mode: the part where ${displayName} actually does the thing.`,
        `${displayName}, time to make the browser tabs feel ignored.`
      ],
      brain_dump: [
        `${displayName}, open the mental floodgates. We'll sort the mess later.`,
        `Thinking about 12 things at once again, ${displayName}? Great — write them all.`,
        `${displayName}, give the inside of your head a good shake onto this page.`
      ],
      task_breakdown: [
        `${displayName}, let's cut this thing into pieces small enough to actually do.`,
        `Big task, ${displayName}? Not for long.`,
        `${displayName}, we eat the elephant one bite at a time. Which bite first?`
      ]
    },
    direct: {
      dashboard: [
        `${displayName}. What's the priority right now?`,
        `Three tasks max today, ${displayName}. Which three?`,
        `${displayName}, what's blocking progress? Let's fix it.`
      ],
      focus_start: [
        `${displayName}, task locked. Timer set. Begin.`,
        `Focus session active. No switching, ${displayName}.`,
        `${displayName}, single task. Full attention. Go.`
      ],
      brain_dump: [
        `${displayName}, write everything. Prioritise after.`,
        `All of it, ${displayName}. Unfiltered. Now.`,
        `${displayName}, capture first. Organise second.`
      ],
      task_breakdown: [
        `${displayName}, what's the first physical action?`,
        `Break it until each step takes under 30 minutes, ${displayName}.`,
        `${displayName}, concrete steps only. No vague goals.`
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
      `${displayName}, you hit ${longestStreak} days before. That didn't disappear — the capacity is still there.`,
      `Streaks end. The ones who matter start again, ${displayName}.`,
      `${displayName}, ${longestStreak} days is proof you can. Today's the reset.`
    );
  } else if (isStreakStruggling) {
    messages.dashboard.push(
      `${displayName}, even 5 minutes today keeps the thread alive. Don't overthink it.`,
      `Consistency doesn't require perfection, ${displayName}. It just requires showing up.`,
      `${displayName}, one small task. That's all a streak needs today.`
    );
  } else if (isConsistent) {
    messages.dashboard.push(
      `${displayName}, that's a ${streak}-day streak. That's not luck — that's a system working.`,
      `${streak} days, ${displayName}. Most people don't make it this far.`,
      `${displayName}, ${streak} days straight. You're building something real here.`
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

  // Level-based — specific and grounded, not gushing
  if (level >= 15) {
    messages.dashboard.push(`Level ${level}, ${displayName}. You're in the top tier of users who stick with this.`);
  } else if (level >= 10) {
    messages.dashboard.push(`Level ${level}. ${displayName}, most people quit before they get here.`);
  } else if (level >= 5) {
    messages.dashboard.push(`Level ${level}, ${displayName}. The early gains are compounding now.`);
  }

  // Default dashboard messages
  messages.dashboard.push(
    `${displayName}, what's the highest-value thing you can do in the next hour?`,
    `What's on your plate today, ${displayName}?`,
    `${displayName}, let's see what's next.`
  );

  // Focus start messages - personalized
  if (focusSessions === 0) {
    messages.focus_start.push(
      `${displayName}, first session. Start with 10–15 minutes — shorter than you think you need.`,
      `${displayName}, phone down, one tab open. That's it.`,
      `No system yet, ${displayName}? That's fine — this is session one. Just see how it feels.`
    );
  } else if (focusSessions < 5) {
    messages.focus_start.push(
      `${displayName}, session ${focusSessions + 1}. Still early — the habit is forming.`,
      `${displayName}, distraction will happen. Just return when it does. No drama.`,
      `${displayName}, you've done ${focusSessions} of these. You know you can get through it.`
    );
  } else if (focusSessions >= 25) {
    messages.focus_start.push(
      `${displayName}, ${focusSessions} sessions in. You're past the part where people quit.`,
      `${displayName}, you know what works for you by now. Trust it.`,
      `${focusSessions} sessions logged, ${displayName}. This is just what you do now.`
    );
  }

  if (totalFocusMinutes >= 500) {
    messages.focus_start.push(
      `${displayName}, ${totalFocusMinutes} minutes of focus time logged. That's a real number.`
    );
  }

  messages.focus_start.push(
    `${displayName}, pick the task. Set the timer. Start.`,
    `${displayName}, you've got this window — use it.`,
    `One thing at a time, ${displayName}. That's the whole strategy.`
  );

  // Brain dump messages - grounded, not cheerful
  if (brainDumps === 0) {
    messages.brain_dump.push(
      "First one. No structure required — the goal is empty head, full page.",
      "Write without filtering. You can throw half of it away later.",
      "Capture everything. Useful, pointless, half-formed — it all goes in."
    );
  } else if (brainDumps >= 10) {
    messages.brain_dump.push(
      `${displayName}, ${brainDumps} brain dumps in. You know what this does for you.`,
      `${displayName}, clear the backlog. You know the process.`
    );
  }

  if (tasksCompleted > 20 && brainDumps < 5) {
    messages.brain_dump.push(
      `${displayName}, with that many tasks done, a regular brain dump would surface the stuff slipping through the cracks.`
    );
  }

  messages.brain_dump.push(
    `${displayName}, what's taking up mental space right now? Get it out.`,
    `${displayName}, everything — not just the important stuff. Go.`,
    `Clear it out, ${displayName}. Organise after.`
  );

  // Task breakdown messages
  if (tasksCompleted < 5) {
    messages.task_breakdown.push(
      "The trick: make each step small enough that you can't argue with starting it.",
      "Smaller steps aren't cheating. They're the strategy.",
      "What's the smallest thing that would count as real progress here?"
    );
  } else {
    messages.task_breakdown.push(
      `${displayName}, you've broken down tasks before. Find the first step.`,
      `${displayName}, cut until each piece is under 30 minutes. That's the threshold.`
    );
  }

  messages.task_breakdown.push(
    `${displayName}, what's the actual first action — not the plan, the action?`,
    `${displayName}, let's find where this gets stuck and work backwards from there.`
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

  // Milestone — peer tone, specific, no exclamation marks at the end of sentences
  if (tasksCompleted === 1) {
    tips.push({
      type: "milestone",
      title: "First task done.",
      message: "One task completed. That's not nothing — starting is the part most people skip.",
      priority: "high"
    });
  }

  if (tasksCompleted === 10) {
    tips.push({
      type: "milestone",
      title: "10 tasks completed.",
      message: "Double digits. You've crossed the point where most people stop. Keep the same approach.",
      priority: "high"
    });
  }

  if (tasksCompleted === 25) {
    tips.push({
      type: "milestone",
      title: "25 tasks done.",
      message: "25 tasks completed. That's a consistent pattern, not a lucky streak.",
      priority: "high"
    });
  }

  if (streak === 7) {
    tips.push({
      type: "milestone",
      title: "7-day streak.",
      message: "One week straight. Research puts habit formation at around 21 days — you're a third of the way there.",
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