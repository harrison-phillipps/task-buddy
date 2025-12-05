import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, TrendingUp, Zap } from "lucide-react";
import { useState, useEffect } from "react";

export default function PointsDisplay({ points, previousPoints, showBreakdown = false, breakdown = {} }) {
  const [showAnimation, setShowAnimation] = useState(false);
  const pointsGained = points - (previousPoints || points);

  useEffect(() => {
    if (pointsGained > 0) {
      setShowAnimation(true);
      const timer = setTimeout(() => setShowAnimation(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [points, pointsGained]);

  return (
    <div className="relative">
      <motion.div
        animate={showAnimation ? { scale: [1, 1.2, 1] } : {}}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full shadow-lg"
      >
        <Sparkles className="w-5 h-5 text-white" />
        <span className="font-bold text-white text-lg">{points.toLocaleString()}</span>
        <span className="text-yellow-100 text-sm">pts</span>
      </motion.div>

      <AnimatePresence>
        {showAnimation && pointsGained > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: 1, y: -30 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute left-1/2 -translate-x-1/2 -top-2 flex items-center gap-1 text-green-600 font-bold"
          >
            <TrendingUp className="w-4 h-4" />
            +{pointsGained}
          </motion.div>
        )}
      </AnimatePresence>

      {showBreakdown && Object.keys(breakdown).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 right-0 mt-2 p-3 bg-white rounded-lg shadow-xl border border-gray-200 text-sm z-10"
        >
          <p className="font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <Zap className="w-4 h-4 text-yellow-500" /> Points Breakdown
          </p>
          <div className="space-y-1">
            {Object.entries(breakdown).map(([key, value]) => (
              <div key={key} className="flex justify-between text-gray-600">
                <span>{key}</span>
                <span className="font-medium text-green-600">+{value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export function PointsEarnedToast({ points, reason, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.9 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full shadow-2xl"
    >
      <div className="flex items-center gap-3 text-white">
        <motion.div
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 0.5, repeat: 2 }}
        >
          <Sparkles className="w-6 h-6" />
        </motion.div>
        <div>
          <p className="font-bold text-lg">+{points} points!</p>
          <p className="text-sm text-yellow-100">{reason}</p>
        </div>
      </div>
    </motion.div>
  );
}