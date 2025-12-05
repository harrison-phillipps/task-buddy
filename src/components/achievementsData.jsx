// Points system
export const POINTS_SYSTEM = {
  TASK_COMPLETED: 25,
  FOCUS_SESSION_COMPLETED: 15,
  BRAIN_DUMP_CREATED: 10,
  STREAK_BONUS: 5,
  SUBTASK_COMPLETED: 5,
  TASK_DIFFICULTY_BONUS: {
    easy: 0,
    medium: 10,
    hard: 25
  },
  PERFECT_FOCUS_SESSION: 15,
  EARLY_BIRD: 20,
  NIGHT_OWL: 20,
  SPEED_BONUS: 10,
  FIRST_OF_DAY: 15,
  COMBO_BONUS: 5
};

// Unlockable Rewards
export const REWARDS = {
  themes: [
    { id: "theme_ocean", name: "Ocean Theme", description: "Calm blue color scheme", icon: "🌊", unlockLevel: 3 },
    { id: "theme_forest", name: "Forest Theme", description: "Peaceful green vibes", icon: "🌲", unlockLevel: 5 },
    { id: "theme_sunset", name: "Sunset Theme", description: "Warm orange & pink", icon: "🌅", unlockLevel: 8 },
    { id: "theme_galaxy", name: "Galaxy Theme", description: "Cosmic purple & stars", icon: "🌌", unlockLevel: 12 },
    { id: "theme_rainbow", name: "Rainbow Theme", description: "All the colors!", icon: "🌈", unlockLevel: 20 },
  ],
  companions: [
    { id: "companion_owl", name: "Wise Owl", description: "A knowledgeable companion", icon: "🦉", unlockLevel: 4 },
    { id: "companion_fox", name: "Clever Fox", description: "A quick-thinking friend", icon: "🦊", unlockLevel: 7 },
    { id: "companion_dragon", name: "Baby Dragon", description: "A fiery motivator", icon: "🐲", unlockLevel: 15 },
  ],
  titles: [
    { id: "title_starter", name: "Beginner", description: "Just getting started", icon: "🌱", unlockLevel: 1 },
    { id: "title_achiever", name: "Achiever", description: "Making progress", icon: "⭐", unlockLevel: 5 },
    { id: "title_warrior", name: "Productivity Warrior", description: "Fighting procrastination", icon: "⚔️", unlockLevel: 10 },
    { id: "title_master", name: "Task Master", description: "Mastering the art", icon: "👑", unlockLevel: 15 },
    { id: "title_legend", name: "Productivity Legend", description: "Legendary status", icon: "🏆", unlockLevel: 25 },
  ],
  powerups: [
    { id: "powerup_double", name: "Double Points", description: "2x points for 1 hour", icon: "⚡", unlockLevel: 6, uses: 3 },
    { id: "powerup_streak_shield", name: "Streak Shield", description: "Protect streak for 1 day", icon: "🛡️", unlockLevel: 10, uses: 1 },
    { id: "powerup_time_freeze", name: "Time Freeze", description: "Pause timer without penalty", icon: "⏸️", unlockLevel: 8, uses: 2 },
  ]
};

// Badges (beyond achievements)
export const BADGES = {
  daily_champion: { id: "daily_champion", name: "Daily Champion", description: "Complete 5+ tasks in one day", icon: "🏅", points: 50 },
  focus_marathon: { id: "focus_marathon", name: "Focus Marathon", description: "2+ hours of focus in one day", icon: "🎖️", points: 75 },
  perfect_week: { id: "perfect_week", name: "Perfect Week", description: "7-day streak with daily tasks", icon: "💎", points: 200 },
  centurion: { id: "centurion", name: "Centurion", description: "Complete 100 tasks", icon: "🎯", points: 300 },
  time_lord: { id: "time_lord", name: "Time Lord", description: "1000 minutes of focus", icon: "⏰", points: 250 },
  brain_master: { id: "brain_master", name: "Brain Master", description: "20 brain dumps", icon: "🧠", points: 150 },
  early_adopter: { id: "early_adopter", name: "Early Adopter", description: "One of the first users", icon: "🌟", points: 100 },
  comeback_kid: { id: "comeback_kid", name: "Comeback Kid", description: "Return after 7+ days and complete a task", icon: "🔄", points: 75 },
  night_warrior: { id: "night_warrior", name: "Night Warrior", description: "Complete 10 tasks after 9pm", icon: "🌙", points: 100 },
  dawn_breaker: { id: "dawn_breaker", name: "Dawn Breaker", description: "Complete 10 tasks before 9am", icon: "🌅", points: 100 },
};

// Achievement definitions (without condition functions for serialization)
export const ACHIEVEMENTS = {
  first_task: {
    id: "first_task",
    title: "First Steps",
    description: "Complete your first task",
    icon: "🎯",
    points: 50,
    requirement: { type: "tasks_completed", value: 1 }
  },
  task_warrior: {
    id: "task_warrior",
    title: "Task Warrior",
    description: "Complete 10 tasks",
    icon: "⚔️",
    points: 100,
    requirement: { type: "tasks_completed", value: 10 }
  },
  task_conqueror: {
    id: "task_conqueror",
    title: "Task Conqueror",
    description: "Complete 50 tasks",
    icon: "👑",
    points: 250,
    requirement: { type: "tasks_completed", value: 50 }
  },
  first_focus: {
    id: "first_focus",
    title: "Focus Finder",
    description: "Complete your first focus session",
    icon: "🧘",
    points: 50,
    requirement: { type: "focus_sessions_completed", value: 1 }
  },
  focus_master: {
    id: "focus_master",
    title: "Focus Master",
    description: "Complete 25 focus sessions",
    icon: "🎯",
    points: 150,
    requirement: { type: "focus_sessions_completed", value: 25 }
  },
  zen_master: {
    id: "zen_master",
    title: "Zen Master",
    description: "Complete 100 focus sessions",
    icon: "🏆",
    points: 500,
    requirement: { type: "focus_sessions_completed", value: 100 }
  },
  hour_warrior: {
    id: "hour_warrior",
    title: "Hour Warrior",
    description: "Focus for 60 minutes total",
    icon: "⏰",
    points: 75,
    requirement: { type: "total_focus_minutes", value: 60 }
  },
  time_champion: {
    id: "time_champion",
    title: "Time Champion",
    description: "Focus for 300 minutes total",
    icon: "⏱️",
    points: 200,
    requirement: { type: "total_focus_minutes", value: 300 }
  },
  productivity_legend: {
    id: "productivity_legend",
    title: "Productivity Legend",
    description: "Focus for 1000 minutes total",
    icon: "🌟",
    points: 500,
    requirement: { type: "total_focus_minutes", value: 1000 }
  },
  brain_dump_pro: {
    id: "brain_dump_pro",
    title: "Brain Dump Pro",
    description: "Create 5 brain dumps",
    icon: "🧠",
    points: 75,
    requirement: { type: "brain_dumps_created", value: 5 }
  },
  thought_organizer: {
    id: "thought_organizer",
    title: "Thought Organizer",
    description: "Create 20 brain dumps",
    icon: "💡",
    points: 150,
    requirement: { type: "brain_dumps_created", value: 20 }
  },
  streak_starter: {
    id: "streak_starter",
    title: "Streak Starter",
    description: "Achieve a 3-day streak",
    icon: "🔥",
    points: 50,
    requirement: { type: "current_streak", value: 3 }
  },
  consistency_king: {
    id: "consistency_king",
    title: "Consistency King",
    description: "Achieve a 7-day streak",
    icon: "👑",
    points: 150,
    requirement: { type: "current_streak", value: 7 }
  },
  unstoppable: {
    id: "unstoppable",
    title: "Unstoppable",
    description: "Achieve a 30-day streak",
    icon: "🚀",
    points: 500,
    requirement: { type: "current_streak", value: 30 }
  }
};

// Check if an achievement is unlocked
function checkAchievementCondition(achievement, progress) {
  if (!achievement.requirement) return false;
  const { type, value } = achievement.requirement;
  return (progress[type] || 0) >= value;
}

// Check for newly unlocked achievements
export function checkNewAchievements(currentProgress, previousProgress) {
  const newlyUnlocked = [];
  const alreadyUnlocked = previousProgress?.achievements_unlocked || [];

  Object.values(ACHIEVEMENTS).forEach(achievement => {
    if (!alreadyUnlocked.includes(achievement.id)) {
      if (checkAchievementCondition(achievement, currentProgress)) {
        newlyUnlocked.push(achievement);
      }
    }
  });

  return newlyUnlocked;
}

// Calculate level from points
export function calculateLevel(points) {
  return Math.floor(points / 200) + 1;
}

// Get points needed for next level
export function getPointsForNextLevel(currentLevel) {
  return currentLevel * 200;
}

// Get level rewards
export function getLevelRewards(level) {
  const rewards = {
    5: { title: "Bronze Achiever", bonus: 100 },
    10: { title: "Silver Star", bonus: 250 },
    15: { title: "Gold Champion", bonus: 500 },
    20: { title: "Platinum Master", bonus: 750 },
    25: { title: "Diamond Legend", bonus: 1000 }
  };
  return rewards[level] || null;
}