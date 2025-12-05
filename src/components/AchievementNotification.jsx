import { motion, AnimatePresence } from "framer-motion";
import { Award, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

export default function AchievementNotification({ achievement, onClose }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!achievement) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.8 }}
          className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4"
        >
          <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 p-1 rounded-2xl shadow-2xl">
            <div className="bg-white rounded-xl p-6 relative">
              <button
                onClick={() => {
                  setIsVisible(false);
                  setTimeout(onClose, 300);
                }}
                className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>

              <div className="flex items-start gap-4">
                <motion.div
                  animate={{
                    rotate: [0, -10, 10, -10, 10, 0],
                    scale: [1, 1.1, 1, 1.1, 1]
                  }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="flex-shrink-0"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-3xl">{achievement.icon}</span>
                  </div>
                </motion.div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-5 h-5 text-yellow-600" />
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                      Achievement Unlocked!
                    </h3>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {achievement.title}
                  </h2>
                  <p className="text-sm text-gray-600 mb-2">
                    {achievement.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-bold text-purple-600">
                      +{achievement.points} points
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}