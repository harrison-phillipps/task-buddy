import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Award, TrendingUp, Zap, Star, Trophy, Target, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { ACHIEVEMENTS, calculateLevel, getPointsForNextLevel, getLevelRewards } from "@/components/achievementsData";

export default function AchievementsPage() {
  const [currentUser, setCurrentUser] = useState(null);

  const { data: userProgress } = useQuery({
    queryKey: ['userProgress'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const progressList = await base44.entities.UserProgress.filter({ user_id: user.id });
      return progressList[0] || null;
    },
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const currentLevel = calculateLevel(userProgress?.total_points || 0);
  const pointsForNext = getPointsForNextLevel(currentLevel);
  const pointsInCurrentLevel = (userProgress?.total_points || 0) % 200;
  const levelProgress = (pointsInCurrentLevel / 200) * 100;
  const levelReward = getLevelRewards(currentLevel);

  const unlockedAchievements = Object.values(ACHIEVEMENTS).filter(achievement =>
    userProgress?.achievements_unlocked?.includes(achievement.id)
  );

  const lockedAchievements = Object.values(ACHIEVEMENTS).filter(achievement =>
    !userProgress?.achievements_unlocked?.includes(achievement.id)
  );

  const achievementCategories = {
    "🎯 Tasks": ["first_task", "task_warrior", "task_conqueror"],
    "🧘 Focus": ["first_focus", "focus_master", "zen_master"],
    "⏰ Time": ["hour_warrior", "time_champion", "productivity_legend"],
    "🧠 Brain Dumps": ["brain_dump_pro", "thought_organizer"],
    "🔥 Streaks": ["streak_starter", "consistency_king", "unstoppable"]
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl">
              <Trophy className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500 bg-clip-text text-transparent">
            Your Achievements
          </h1>
          <p className="text-gray-600">Track your progress and unlock rewards!</p>
        </motion.div>

        {/* Level and Points */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <Card className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-none">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Current Level</p>
                  <p className="text-4xl font-bold">{currentLevel}</p>
                </div>
                <Star className="w-12 h-12 text-yellow-300" />
              </div>
              <Progress value={levelProgress} className="h-2 bg-purple-300" />
              <p className="text-sm text-purple-100 mt-2">
                {pointsInCurrentLevel}/{200} points to level {currentLevel + 1}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-teal-500 to-green-600 text-white border-none">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-teal-100 text-sm font-medium">Total Points</p>
                  <p className="text-4xl font-bold">{userProgress?.total_points || 0}</p>
                </div>
                <Zap className="w-12 h-12 text-yellow-300" />
              </div>
              <p className="text-sm text-teal-100">
                Keep completing tasks to earn more!
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white border-none">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Current Streak</p>
                  <p className="text-4xl font-bold">{userProgress?.current_streak || 0}</p>
                </div>
                <Flame className="w-12 h-12 text-yellow-300" />
              </div>
              <p className="text-sm text-orange-100">
                Longest: {userProgress?.longest_streak || 0} days
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                Your Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
                  <Target className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                  <p className="text-2xl font-bold text-gray-900">{userProgress?.tasks_completed || 0}</p>
                  <p className="text-sm text-gray-600">Tasks Completed</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-teal-50 to-green-50 rounded-xl">
                  <Zap className="w-8 h-8 mx-auto mb-2 text-teal-600" />
                  <p className="text-2xl font-bold text-gray-900">{userProgress?.focus_sessions_completed || 0}</p>
                  <p className="text-sm text-gray-600">Focus Sessions</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl">
                  <Award className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                  <p className="text-2xl font-bold text-gray-900">{userProgress?.total_focus_minutes || 0}</p>
                  <p className="text-sm text-gray-600">Minutes Focused</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
                  <Trophy className="w-8 h-8 mx-auto mb-2 text-indigo-600" />
                  <p className="text-2xl font-bold text-gray-900">{unlockedAchievements.length}</p>
                  <p className="text-sm text-gray-600">Achievements</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Achievements by Category */}
        {Object.entries(achievementCategories).map(([categoryName, achievementIds], categoryIndex) => {
          const categoryAchievements = achievementIds.map(id => ACHIEVEMENTS[id]).filter(Boolean);
          const unlockedInCategory = categoryAchievements.filter(a => 
            a && userProgress?.achievements_unlocked?.includes(a.id)
          );

          return (
            <motion.div
              key={categoryName}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + categoryIndex * 0.1 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{categoryName}</CardTitle>
                    <Badge variant="secondary">
                      {unlockedInCategory.length}/{categoryAchievements.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryAchievements.filter(Boolean).map((achievement) => {
                      const isUnlocked = userProgress?.achievements_unlocked?.includes(achievement.id);
                      
                      return (
                        <motion.div
                          key={achievement.id}
                          whileHover={isUnlocked ? { scale: 1.05 } : {}}
                          className={`p-4 rounded-xl border-2 transition-all ${
                            isUnlocked
                              ? "bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300 shadow-md"
                              : "bg-gray-50 border-gray-200 opacity-60"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`text-4xl ${!isUnlocked && "grayscale"}`}>
                              {achievement.icon}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-bold text-gray-900 mb-1">
                                {achievement.title}
                              </h3>
                              <p className="text-sm text-gray-600 mb-2">
                                {achievement.description}
                              </p>
                              <div className="flex items-center gap-2">
                                <Badge className={isUnlocked ? "bg-yellow-500 text-white" : "bg-gray-300 text-gray-600"}>
                                  {achievement.points} pts
                                </Badge>
                                {isUnlocked && (
                                  <Badge className="bg-green-100 text-green-700">
                                    ✓ Unlocked
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {levelReward && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center p-6 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 rounded-2xl text-white"
          >
            <Trophy className="w-12 h-12 mx-auto mb-3" />
            <h3 className="text-2xl font-bold mb-2">Level {currentLevel} Milestone!</h3>
            <p className="text-lg mb-2">{levelReward.title}</p>
            <p className="text-sm opacity-90">Bonus reward: +{levelReward.bonus} points</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}