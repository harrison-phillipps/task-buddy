import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Code, Sparkles, Crown, Lock, Unlock, Trophy, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FEATURE_ACCESS, TIER_INFO } from "./subscription/FeatureGate";
import { ACHIEVEMENTS, REWARDS, BADGES } from "./achievementsData";

export default function DevModeIndicator() {
  const [expanded, setExpanded] = useState(false);
  const [selectedTab, setSelectedTab] = useState("features");
  
  const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
  
  if (!isDevelopment) return null;

  const allFeatures = Object.keys(FEATURE_ACCESS);
  const proFeatures = allFeatures.filter(f => FEATURE_ACCESS[f].includes("pro") && !FEATURE_ACCESS[f].includes("free"));
  const premiumFeatures = allFeatures.filter(f => FEATURE_ACCESS[f].includes("premium") && !FEATURE_ACCESS[f].includes("pro"));

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          <Code className="w-4 h-4" />
          <span className="font-semibold">Dev Mode</span>
          <Unlock className="w-4 h-4" />
        </button>
      </motion.div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed bottom-20 right-4 z-50 w-96 max-h-[80vh] overflow-auto"
          >
            <Card className="bg-white shadow-2xl border-purple-200">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Unlock className="w-5 h-5" />
                  All Features Unlocked
                </CardTitle>
                <p className="text-purple-100 text-sm">Development mode - showing all rewards & features</p>
              </CardHeader>
              
              {/* Tabs */}
              <div className="flex border-b border-gray-200 bg-gray-50">
                <button
                  onClick={() => setSelectedTab("features")}
                  className={`px-4 py-2 text-sm font-medium ${selectedTab === "features" ? "border-b-2 border-purple-600 text-purple-600" : "text-gray-600"}`}
                >
                  Features
                </button>
                <button
                  onClick={() => setSelectedTab("rewards")}
                  className={`px-4 py-2 text-sm font-medium ${selectedTab === "rewards" ? "border-b-2 border-purple-600 text-purple-600" : "text-gray-600"}`}
                >
                  Rewards
                </button>
                <button
                  onClick={() => setSelectedTab("achievements")}
                  className={`px-4 py-2 text-sm font-medium ${selectedTab === "achievements" ? "border-b-2 border-purple-600 text-purple-600" : "text-gray-600"}`}
                >
                  Progress
                </button>
              </div>
              
              <CardContent className="p-4 space-y-4">{selectedTab === "features" && (
                <>
                {/* Pro Features */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-purple-700">
                    <Sparkles className="w-4 h-4" />
                    Pro Features ({proFeatures.length})
                  </div>
                  <div className="space-y-1">
                    {proFeatures.map(feature => (
                      <div key={feature} className="flex items-center gap-2 text-sm bg-purple-50 px-3 py-1.5 rounded">
                        <Unlock className="w-3 h-3 text-purple-600" />
                        <span className="text-gray-700">{feature.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Premium Features */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-yellow-700">
                    <Crown className="w-4 h-4" />
                    Premium Features ({premiumFeatures.length})
                  </div>
                  <div className="space-y-1">
                    {premiumFeatures.map(feature => (
                      <div key={feature} className="flex items-center gap-2 text-sm bg-yellow-50 px-3 py-1.5 rounded">
                        <Unlock className="w-3 h-3 text-yellow-600" />
                        <span className="text-gray-700">{feature.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
                </>
              )}

              {selectedTab === "rewards" && (
                <>
                  {/* Themes */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-pink-700">
                      🎨 Themes ({REWARDS.themes.length})
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {REWARDS.themes.map(theme => (
                        <button
                          key={theme.id}
                          className="flex items-center gap-3 p-3 bg-gradient-to-r from-pink-50 to-purple-50 hover:from-pink-100 hover:to-purple-100 rounded-lg border border-pink-200 transition-all text-left"
                        >
                          <span className="text-2xl">{theme.icon}</span>
                          <div className="flex-1">
                            <div className="font-semibold text-sm text-gray-800">{theme.name}</div>
                            <div className="text-xs text-gray-600">{theme.description}</div>
                          </div>
                          <Badge variant="outline" className="text-xs">Lvl {theme.unlockLevel}</Badge>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Companions */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                      🤖 Companions ({REWARDS.companions.length})
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {REWARDS.companions.map(companion => (
                        <button
                          key={companion.id}
                          className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 rounded-lg border border-blue-200 transition-all text-left"
                        >
                          <span className="text-2xl">{companion.icon}</span>
                          <div className="flex-1">
                            <div className="font-semibold text-sm text-gray-800">{companion.name}</div>
                            <div className="text-xs text-gray-600">{companion.description}</div>
                          </div>
                          <Badge variant="outline" className="text-xs">Lvl {companion.unlockLevel}</Badge>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Titles */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-yellow-700">
                      👑 Titles ({REWARDS.titles.length})
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {REWARDS.titles.map(title => (
                        <button
                          key={title.id}
                          className="flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 hover:from-yellow-100 hover:to-orange-100 rounded-lg border border-yellow-200 transition-all text-left"
                        >
                          <span className="text-2xl">{title.icon}</span>
                          <div className="flex-1">
                            <div className="font-semibold text-sm text-gray-800">{title.name}</div>
                            <div className="text-xs text-gray-600">{title.description}</div>
                          </div>
                          <Badge variant="outline" className="text-xs">Lvl {title.unlockLevel}</Badge>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Power-ups */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                      ⚡ Power-ups ({REWARDS.powerups.length})
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {REWARDS.powerups.map(powerup => (
                        <button
                          key={powerup.id}
                          className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-lg border border-green-200 transition-all text-left"
                        >
                          <span className="text-2xl">{powerup.icon}</span>
                          <div className="flex-1">
                            <div className="font-semibold text-sm text-gray-800">{powerup.name}</div>
                            <div className="text-xs text-gray-600">{powerup.description}</div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="outline" className="text-xs">Lvl {powerup.unlockLevel}</Badge>
                            <span className="text-xs text-gray-500">{powerup.uses} uses</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {selectedTab === "achievements" && (
                <>
                  {/* Achievements */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                    <Trophy className="w-4 h-4" />
                    Achievements ({Object.keys(ACHIEVEMENTS).length})
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.values(ACHIEVEMENTS).map(achievement => (
                      <div key={achievement.id} className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                        <span className="text-xl">{achievement.icon}</span>
                        <div className="flex-1">
                          <div className="font-semibold text-xs text-gray-800">{achievement.title}</div>
                          <div className="text-xs text-gray-600">{achievement.description}</div>
                        </div>
                        <Badge variant="outline" className="text-xs">{achievement.points} pts</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Badges */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-orange-700">
                    <Trophy className="w-4 h-4" />
                    Special Badges ({Object.keys(BADGES).length})
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.values(BADGES).map(badge => (
                      <div key={badge.id} className="flex items-center gap-3 p-2 bg-orange-50 rounded-lg border border-orange-100">
                        <span className="text-xl">{badge.icon}</span>
                        <div className="flex-1">
                          <div className="font-semibold text-xs text-gray-800">{badge.name}</div>
                          <div className="text-xs text-gray-600">{badge.description}</div>
                        </div>
                        <Badge variant="outline" className="text-xs">{badge.points} pts</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                </>
              )}

                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-center text-gray-500">
                    🔓 All features, limits, and rewards are accessible in dev mode
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}