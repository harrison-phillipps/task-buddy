import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Code, Sparkles, Crown, Lock, Unlock, Trophy, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FEATURE_ACCESS, TIER_INFO } from "./subscription/FeatureGate";
import { ACHIEVEMENTS, REWARDS, BADGES } from "./achievementsData";

export default function DevModeIndicator() {
  const [expanded, setExpanded] = useState(false);
  
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
              <CardContent className="p-4 space-y-4">
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

                {/* Achievements */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                    <Trophy className="w-4 h-4" />
                    Achievements ({Object.keys(ACHIEVEMENTS).length})
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {Object.values(ACHIEVEMENTS).slice(0, 6).map(achievement => (
                      <div key={achievement.id} className="flex items-center gap-1 text-xs bg-blue-50 px-2 py-1 rounded">
                        <span>{achievement.icon}</span>
                        <span className="text-gray-600 truncate">{achievement.title}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 italic">...and {Object.keys(ACHIEVEMENTS).length - 6} more</p>
                </div>

                {/* Rewards */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                    <Zap className="w-4 h-4" />
                    Unlockable Rewards
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-gray-600">Themes: {REWARDS.themes.length}</div>
                    <div className="flex flex-wrap gap-1">
                      {REWARDS.themes.map(theme => (
                        <Badge key={theme.id} variant="outline" className="text-xs">
                          {theme.icon} {theme.name}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-xs font-medium text-gray-600 mt-2">Companions: {REWARDS.companions.length}</div>
                    <div className="flex flex-wrap gap-1">
                      {REWARDS.companions.map(comp => (
                        <Badge key={comp.id} variant="outline" className="text-xs">
                          {comp.icon} {comp.name}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-xs font-medium text-gray-600 mt-2">Power-ups: {REWARDS.powerups.length}</div>
                    <div className="flex flex-wrap gap-1">
                      {REWARDS.powerups.map(powerup => (
                        <Badge key={powerup.id} variant="outline" className="text-xs">
                          {powerup.icon} {powerup.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Badges */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-orange-700">
                    <Trophy className="w-4 h-4" />
                    Special Badges ({Object.keys(BADGES).length})
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {Object.values(BADGES).slice(0, 6).map(badge => (
                      <div key={badge.id} className="flex items-center gap-1 text-xs bg-orange-50 px-2 py-1 rounded">
                        <span>{badge.icon}</span>
                        <span className="text-gray-600 truncate">{badge.name}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 italic">...and {Object.keys(BADGES).length - 6} more</p>
                </div>

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