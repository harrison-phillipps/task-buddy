import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Sparkles, Zap, Crown, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Feature access configuration
export const FEATURE_ACCESS = {
  // Free features
  basic_tasks: ["free", "pro", "premium"],
  brain_dump: ["free", "pro", "premium"],
  focus_session: ["free", "pro", "premium"],
  basic_achievements: ["free", "pro", "premium"],
  
  // Pro features
  ai_prioritization: ["pro", "premium"],
  calendar_sync: ["free", "pro", "premium"],
  calendar_events: ["free", "pro", "premium"],
  advanced_analytics: ["pro", "premium"],
  unlimited_tasks: ["pro", "premium"],
  ambient_sounds: ["pro", "premium"],
  spotify_player: ["pro", "premium"],
  cross_device_notifications: ["pro", "premium"],
  
  // Premium features
  ai_task_breakdown: ["premium"],
  custom_companions: ["premium"],
  priority_support: ["premium"],
  export_data: ["premium"],
  team_features: ["premium"]
};

export const TIER_LIMITS = {
  free: {
    max_tasks: 10,
    max_brain_dumps_per_day: 2,
    max_focus_sessions_per_day: 3
  },
  pro: {
    max_tasks: 100,
    max_brain_dumps_per_day: 20,
    max_focus_sessions_per_day: 50
  },
  premium: {
    max_tasks: Infinity,
    max_brain_dumps_per_day: Infinity,
    max_focus_sessions_per_day: Infinity
  }
};

export const TIER_INFO = {
  free: {
    name: "Free",
    icon: Zap,
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    price: "$0"
  },
  pro: {
    name: "Pro",
    icon: Sparkles,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    price: "A$9.99/mo"
  },
  premium: {
    name: "Premium",
    icon: Crown,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    price: "A$19.99/mo"
  }
};

// Check if we're in development mode
const isDevelopmentMode = () => {
  return process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
};

// Check if user has access to a feature
export function hasFeatureAccess(userTier, featureName) {
  // In development mode, grant access to all features
  if (isDevelopmentMode()) return true;
  
  const tier = userTier || "free";
  const allowedTiers = FEATURE_ACCESS[featureName];
  if (!allowedTiers) return true; // Unknown features default to allowed
  return allowedTiers.includes(tier);
}

// Check if user is within tier limits
export function isWithinLimit(userTier, limitType, currentCount) {
  // In development mode, no limits
  if (isDevelopmentMode()) return true;
  
  const tier = userTier || "free";
  const limit = TIER_LIMITS[tier]?.[limitType];
  if (limit === undefined || limit === Infinity) return true;
  return currentCount < limit;
}

// Get required tier for a feature
export function getRequiredTier(featureName) {
  const tiers = FEATURE_ACCESS[featureName];
  if (!tiers || tiers.includes("free")) return "free";
  if (tiers.includes("pro")) return "pro";
  return "premium";
}

// Upgrade prompt modal
export function UpgradeModal({ open, onOpenChange, feature, requiredTier = "pro" }) {
  const navigate = useNavigate();
  const tierInfo = TIER_INFO[requiredTier];
  const TierIcon = tierInfo?.icon || Sparkles;

  const features = {
    pro: [
      "AI Task Prioritization",
      "Google Calendar Sync",
      "Advanced Analytics",
      "Unlimited Tasks",
      "Ambient Focus Sounds",
      "Spotify Focus Music",
      "Smartwatch & Cross-Device Notifications"
    ],
    premium: [
      "Everything in Pro",
      "AI Task Breakdown",
      "Custom Companions",
      "Priority Support",
      "Data Export",
      "Team Features"
    ]
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`w-10 h-10 ${tierInfo?.bgColor} rounded-full flex items-center justify-center`}>
              <TierIcon className={`w-5 h-5 ${tierInfo?.color}`} />
            </div>
            Upgrade to {tierInfo?.name}
          </DialogTitle>
          <DialogDescription>
            Unlock {feature} and more powerful features
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">{tierInfo?.price}</p>
            <p className="text-sm text-gray-500">Billed monthly</p>
          </div>

          <div className="space-y-2">
            {features[requiredTier]?.map((feat, idx) => (
              <motion.div
                key={feat}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-2 text-sm"
              >
                <Check className={`w-4 h-4 ${tierInfo?.color}`} />
                <span>{feat}</span>
              </motion.div>
            ))}
          </div>

          <Button
            onClick={() => {
              onOpenChange(false);
              navigate(createPageUrl("Subscription"));
            }}
            className="w-full bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white"
          >
            <TierIcon className="w-4 h-4 mr-2" />
            Upgrade Now
          </Button>

          <p className="text-xs text-center text-gray-400">
            Cancel anytime. No questions asked.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Inline upgrade prompt (for embedding in components)
export function UpgradePrompt({ feature, requiredTier = "pro", compact = false }) {
  const [showModal, setShowModal] = React.useState(false);
  const tierInfo = TIER_INFO[requiredTier];
  const TierIcon = tierInfo?.icon || Sparkles;

  if (compact) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className={`flex items-center gap-1.5 px-2 py-1 ${tierInfo?.bgColor} rounded-full text-xs font-medium ${tierInfo?.color} hover:opacity-80 transition-opacity`}
        >
          <Lock className="w-3 h-3" />
          {tierInfo?.name}
        </button>
        <UpgradeModal 
          open={showModal} 
          onOpenChange={setShowModal} 
          feature={feature}
          requiredTier={requiredTier}
        />
      </>
    );
  }

  return (
    <>
      <div className="p-4 bg-gradient-to-r from-purple-50 to-teal-50 rounded-xl border border-purple-200">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 ${tierInfo?.bgColor} rounded-full flex items-center justify-center`}>
            <TierIcon className={`w-5 h-5 ${tierInfo?.color}`} />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{tierInfo?.name} Feature</p>
            <p className="text-sm text-gray-600">Upgrade to unlock {feature}</p>
          </div>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          variant="outline"
          className="w-full border-purple-200 hover:bg-purple-50"
        >
          <Lock className="w-4 h-4 mr-2" />
          Unlock with {tierInfo?.name}
        </Button>
      </div>
      <UpgradeModal 
        open={showModal} 
        onOpenChange={setShowModal} 
        feature={feature}
        requiredTier={requiredTier}
      />
    </>
  );
}

// HOC to wrap components with feature gating
export function withFeatureGate(Component, featureName, fallback = null) {
  return function GatedComponent({ userTier, ...props }) {
    if (hasFeatureAccess(userTier, featureName)) {
      return <Component {...props} />;
    }
    
    const requiredTier = getRequiredTier(featureName);
    return fallback || <UpgradePrompt feature={featureName} requiredTier={requiredTier} />;
  };
}