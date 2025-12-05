import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Crown, Users, Target, Zap, Flame } from "lucide-react";
import { motion } from "framer-motion";
import RewardsPanel from "../components/RewardsPanel";

const rankIcons = {
  1: { icon: Crown, color: "text-yellow-500", bg: "bg-gradient-to-br from-yellow-100 to-yellow-200" },
  2: { icon: Medal, color: "text-gray-400", bg: "bg-gradient-to-br from-gray-100 to-gray-200" },
  3: { icon: Award, color: "text-amber-600", bg: "bg-gradient-to-br from-amber-100 to-amber-200" },
};

function LeaderboardRow({ entry, rank, isCurrentUser }) {
  const RankIcon = rankIcons[rank]?.icon || null;
  const level = Math.floor((entry.all_time_points || 0) / 200) + 1;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.03 }}
      className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
        isCurrentUser 
          ? "bg-gradient-to-r from-purple-100 to-teal-100 border-2 border-purple-300 shadow-lg" 
          : "bg-white hover:bg-gray-50 border border-gray-100"
      }`}
    >
      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
        rankIcons[rank] ? rankIcons[rank].bg : "bg-gray-100"
      }`}>
        {RankIcon ? (
          <RankIcon className={`w-6 h-6 ${rankIcons[rank].color}`} />
        ) : (
          <span className="text-gray-600">#{rank}</span>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`font-semibold truncate ${isCurrentUser ? "text-purple-700" : "text-gray-900"}`}>
            {entry.user_name || "Anonymous"}
          </p>
          {isCurrentUser && (
            <Badge className="bg-purple-500 text-white text-xs">You</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs">Lv.{level}</Badge>
          {rank <= 3 && (
            <Badge className={`text-xs ${
              rank === 1 ? "bg-yellow-500" : rank === 2 ? "bg-gray-400" : "bg-amber-500"
            } text-white`}>
              {rank === 1 ? "🥇 Champion" : rank === 2 ? "🥈 Runner-up" : "🥉 Third"}
            </Badge>
          )}
        </div>
      </div>
      
      <div className="text-right">
        <p className="font-bold text-xl text-purple-600">{entry.points?.toLocaleString()}</p>
        <p className="text-xs text-gray-500">points</p>
      </div>
    </motion.div>
  );
}

export default function LeaderboardPage() {
  const [timeframe, setTimeframe] = useState("weekly");
  const [currentUserId, setCurrentUserId] = useState(null);

  const { data: userProgress } = useQuery({
    queryKey: ['userProgress'],
    queryFn: async () => {
      const user = await base44.auth.me();
      setCurrentUserId(user.id);
      const progressList = await base44.entities.UserProgress.filter({ user_id: user.id });
      return progressList[0] || null;
    },
  });

  const { data: leaderboardData = [], isLoading } = useQuery({
    queryKey: ['leaderboard', timeframe],
    queryFn: async () => {
      const entries = await base44.entities.Leaderboard.list('-all_time_points', 50);
      return entries.map(entry => ({
        ...entry,
        points: timeframe === "weekly" ? entry.weekly_points :
                timeframe === "monthly" ? entry.monthly_points :
                entry.all_time_points
      })).sort((a, b) => (b.points || 0) - (a.points || 0));
    },
  });

  const currentUserRank = leaderboardData.findIndex(e => e.user_id === currentUserId) + 1;
  const currentUserEntry = leaderboardData.find(e => e.user_id === currentUserId);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
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
            Leaderboard & Rewards
          </h1>
          <p className="text-gray-600">Compete with others and unlock amazing rewards!</p>
        </motion.div>

        {/* User Stats Overview */}
        {userProgress && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            <Card className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-none">
              <CardContent className="pt-6 text-center">
                <Trophy className="w-8 h-8 mx-auto mb-2" />
                <p className="text-3xl font-bold">{currentUserRank > 0 ? `#${currentUserRank}` : "-"}</p>
                <p className="text-sm text-purple-200">Your Rank</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white border-none">
              <CardContent className="pt-6 text-center">
                <Zap className="w-8 h-8 mx-auto mb-2" />
                <p className="text-3xl font-bold">{userProgress.total_points?.toLocaleString() || 0}</p>
                <p className="text-sm text-yellow-200">Total Points</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-teal-500 to-green-500 text-white border-none">
              <CardContent className="pt-6 text-center">
                <Target className="w-8 h-8 mx-auto mb-2" />
                <p className="text-3xl font-bold">{userProgress.tasks_completed || 0}</p>
                <p className="text-sm text-teal-200">Tasks Done</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-500 to-red-500 text-white border-none">
              <CardContent className="pt-6 text-center">
                <Flame className="w-8 h-8 mx-auto mb-2" />
                <p className="text-3xl font-bold">{userProgress.current_streak || 0}</p>
                <p className="text-sm text-orange-200">Day Streak</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Leaderboard */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Top Performers
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={timeframe} onValueChange={setTimeframe} className="mb-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="weekly">Weekly</TabsTrigger>
                    <TabsTrigger value="monthly">Monthly</TabsTrigger>
                    <TabsTrigger value="alltime">All Time</TabsTrigger>
                  </TabsList>
                </Tabs>

                {isLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : leaderboardData.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No rankings yet. Start completing tasks!</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {leaderboardData.slice(0, 10).map((entry, index) => (
                      <LeaderboardRow
                        key={entry.id}
                        entry={entry}
                        rank={index + 1}
                        isCurrentUser={entry.user_id === currentUserId}
                      />
                    ))}
                    
                    {currentUserRank > 10 && currentUserEntry && (
                      <>
                        <div className="text-center py-2 text-gray-400">• • •</div>
                        <LeaderboardRow
                          entry={currentUserEntry}
                          rank={currentUserRank}
                          isCurrentUser={true}
                        />
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Rewards Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <RewardsPanel userProgress={userProgress} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}