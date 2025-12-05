import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Crown, Users } from "lucide-react";
import { motion } from "framer-motion";

const rankIcons = {
  1: { icon: Crown, color: "text-yellow-500", bg: "bg-yellow-100" },
  2: { icon: Medal, color: "text-gray-400", bg: "bg-gray-100" },
  3: { icon: Award, color: "text-amber-600", bg: "bg-amber-100" },
};

function LeaderboardRow({ entry, rank, isCurrentUser }) {
  const RankIcon = rankIcons[rank]?.icon || null;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.05 }}
      className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
        isCurrentUser 
          ? "bg-gradient-to-r from-purple-100 to-teal-100 border-2 border-purple-300" 
          : "bg-white hover:bg-gray-50"
      }`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
        rankIcons[rank] ? rankIcons[rank].bg : "bg-gray-100"
      }`}>
        {RankIcon ? (
          <RankIcon className={`w-5 h-5 ${rankIcons[rank].color}`} />
        ) : (
          <span className="text-gray-600">{rank}</span>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={`font-semibold truncate ${isCurrentUser ? "text-purple-700" : "text-gray-900"}`}>
          {entry.user_name || "Anonymous"}
          {isCurrentUser && <span className="text-xs ml-2">(You)</span>}
        </p>
        <p className="text-xs text-gray-500">Level {Math.floor(entry.all_time_points / 200) + 1}</p>
      </div>
      
      <div className="text-right">
        <p className="font-bold text-lg text-purple-600">{entry.points?.toLocaleString()}</p>
        <p className="text-xs text-gray-500">points</p>
      </div>
    </motion.div>
  );
}

export default function Leaderboard({ compact = false }) {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [timeframe, setTimeframe] = useState("weekly");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const user = await base44.auth.me();
        setCurrentUserId(user.id);
        
        const entries = await base44.entities.Leaderboard.list('-all_time_points', 50);
        
        // Map entries based on timeframe
        const mapped = entries.map(entry => ({
          ...entry,
          points: timeframe === "weekly" ? entry.weekly_points :
                  timeframe === "monthly" ? entry.monthly_points :
                  entry.all_time_points
        })).sort((a, b) => b.points - a.points);
        
        setLeaderboardData(mapped);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      }
      setLoading(false);
    };
    
    fetchLeaderboard();
  }, [timeframe]);

  const currentUserRank = leaderboardData.findIndex(e => e.user_id === currentUserId) + 1;
  const displayData = compact ? leaderboardData.slice(0, 5) : leaderboardData.slice(0, 20);

  if (loading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
        <CardContent className="pt-6 text-center text-gray-500">
          Loading leaderboard...
        </CardContent>
      </Card>
    );
  }

  if (leaderboardData.length === 0) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No rankings yet. Complete tasks to appear!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Leaderboard
          </CardTitle>
          {currentUserRank > 0 && (
            <Badge className="bg-purple-100 text-purple-700">
              Your Rank: #{currentUserRank}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={timeframe} onValueChange={setTimeframe} className="mb-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="weekly">This Week</TabsTrigger>
            <TabsTrigger value="monthly">This Month</TabsTrigger>
            <TabsTrigger value="alltime">All Time</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="space-y-2">
          {displayData.map((entry, index) => (
            <LeaderboardRow
              key={entry.id}
              entry={entry}
              rank={index + 1}
              isCurrentUser={entry.user_id === currentUserId}
            />
          ))}
        </div>
        
        {currentUserRank > 5 && compact && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <LeaderboardRow
              entry={leaderboardData.find(e => e.user_id === currentUserId)}
              rank={currentUserRank}
              isCurrentUser={true}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}