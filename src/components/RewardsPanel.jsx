import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, Unlock, Gift, Palette, Users, Award, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { REWARDS, BADGES } from "./achievementsData";

function RewardCard({ reward, userLevel, onClaim, claimed }) {
  const isUnlocked = userLevel >= reward.unlockLevel;
  
  return (
    <motion.div
      whileHover={isUnlocked ? { scale: 1.02 } : {}}
      className={`p-4 rounded-xl border-2 transition-all ${
        isUnlocked
          ? claimed
            ? "bg-gradient-to-br from-green-50 to-teal-50 border-green-300"
            : "bg-gradient-to-br from-purple-50 to-pink-50 border-purple-300 cursor-pointer hover:shadow-lg"
          : "bg-gray-50 border-gray-200 opacity-60"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`text-3xl ${!isUnlocked && "grayscale"}`}>
          {reward.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-gray-900">{reward.name}</h3>
            {isUnlocked ? (
              <Unlock className="w-4 h-4 text-green-500" />
            ) : (
              <Lock className="w-4 h-4 text-gray-400" />
            )}
          </div>
          <p className="text-sm text-gray-600 mb-2">{reward.description}</p>
          <div className="flex items-center justify-between">
            <Badge variant={isUnlocked ? "default" : "secondary"} className="text-xs">
              {isUnlocked ? "Unlocked" : `Level ${reward.unlockLevel}`}
            </Badge>
            {isUnlocked && !claimed && onClaim && (
              <Button size="sm" onClick={() => onClaim(reward.id)} className="text-xs">
                Claim
              </Button>
            )}
            {claimed && (
              <Badge className="bg-green-100 text-green-700 text-xs">Active</Badge>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function BadgeCard({ badge, earned }) {
  return (
    <motion.div
      whileHover={earned ? { scale: 1.05 } : {}}
      className={`p-4 rounded-xl border-2 text-center transition-all ${
        earned
          ? "bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300 shadow-md"
          : "bg-gray-50 border-gray-200 opacity-50"
      }`}
    >
      <div className={`text-4xl mb-2 ${!earned && "grayscale"}`}>
        {badge.icon}
      </div>
      <h3 className="font-bold text-gray-900 text-sm mb-1">{badge.name}</h3>
      <p className="text-xs text-gray-600 mb-2">{badge.description}</p>
      <Badge className={earned ? "bg-yellow-500 text-white" : "bg-gray-300 text-gray-600"}>
        {badge.points} pts
      </Badge>
    </motion.div>
  );
}

export default function RewardsPanel({ userProgress, onClaimReward }) {
  const [activeTab, setActiveTab] = useState("rewards");
  const userLevel = userProgress?.level || 1;
  const claimedRewards = userProgress?.claimed_rewards || [];
  const earnedBadges = userProgress?.earned_badges || [];

  const allRewards = [
    ...REWARDS.themes,
    ...REWARDS.companions,
    ...REWARDS.titles,
    ...REWARDS.powerups
  ];

  const unlockedCount = allRewards.filter(r => userLevel >= r.unlockLevel).length;
  const earnedBadgeCount = Object.values(BADGES).filter(b => earnedBadges.includes(b.id)).length;

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-pink-500" />
            Rewards & Badges
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline">{unlockedCount}/{allRewards.length} Rewards</Badge>
            <Badge variant="outline">{earnedBadgeCount}/{Object.keys(BADGES).length} Badges</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="rewards" className="flex items-center gap-2">
              <Gift className="w-4 h-4" /> Rewards
            </TabsTrigger>
            <TabsTrigger value="badges" className="flex items-center gap-2">
              <Award className="w-4 h-4" /> Badges
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rewards" className="space-y-6">
            {/* Themes */}
            <div>
              <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-3">
                <Palette className="w-4 h-4" /> Themes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {REWARDS.themes.map(theme => (
                  <RewardCard
                    key={theme.id}
                    reward={theme}
                    userLevel={userLevel}
                    claimed={claimedRewards.includes(theme.id)}
                    onClaim={onClaimReward}
                  />
                ))}
              </div>
            </div>

            {/* Companions */}
            <div>
              <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-3">
                <Users className="w-4 h-4" /> Companions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {REWARDS.companions.map(companion => (
                  <RewardCard
                    key={companion.id}
                    reward={companion}
                    userLevel={userLevel}
                    claimed={claimedRewards.includes(companion.id)}
                    onClaim={onClaimReward}
                  />
                ))}
              </div>
            </div>

            {/* Titles */}
            <div>
              <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-3">
                <Award className="w-4 h-4" /> Titles
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {REWARDS.titles.map(title => (
                  <RewardCard
                    key={title.id}
                    reward={title}
                    userLevel={userLevel}
                    claimed={claimedRewards.includes(title.id)}
                    onClaim={onClaimReward}
                  />
                ))}
              </div>
            </div>

            {/* Power-ups */}
            <div>
              <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4" /> Power-ups
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {REWARDS.powerups.map(powerup => (
                  <RewardCard
                    key={powerup.id}
                    reward={powerup}
                    userLevel={userLevel}
                    claimed={claimedRewards.includes(powerup.id)}
                    onClaim={onClaimReward}
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="badges">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.values(BADGES).map(badge => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  earned={earnedBadges.includes(badge.id)}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}