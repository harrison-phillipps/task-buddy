import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, BookOpen, Coffee, Music, Palette, Code, Dumbbell, Crown, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { getCompanionUpgrades } from "@/components/companionUtils";

const activities = [
  { text: "organizing my notes", icon: BookOpen, emoji: "📝" },
  { text: "grabbing some water", icon: Coffee, emoji: "💧" },
  { text: "listening to focus music", icon: Music, emoji: "🎵" },
  { text: "sketching ideas", icon: Palette, emoji: "🎨" },
  { text: "working on a project", icon: Code, emoji: "💻" },
  { text: "doing some stretches", icon: Dumbbell, emoji: "🧘" },
  { text: "taking notes", icon: BookOpen, emoji: "✍️" },
  { text: "checking my to-do list", icon: Sparkles, emoji: "✨" },
];

function HumanCharacter({ mood, isLarge, isBlinking, currentMood }) {
  return (
    <div className={`relative ${isLarge ? 'w-48 h-56' : 'w-32 h-40'}`}>
      {/* Head */}
      <motion.div
        animate={{
          y: [0, -8, 0],
          rotate: [-2, 2, -2]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className={`absolute ${isLarge ? 'w-24 h-24 top-0 left-1/2 -translate-x-1/2' : 'w-16 h-16 top-0 left-1/2 -translate-x-1/2'}`}
      >
        <div className={`w-full h-full rounded-full bg-gradient-to-br ${currentMood.color} shadow-2xl border-4 border-white relative overflow-hidden`}>
          {/* Face */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 flex gap-3">
              <motion.div 
                animate={{ scaleY: isBlinking ? 0.1 : 1 }}
                transition={{ duration: 0.1 }}
                className={`bg-gray-800 rounded-full ${isLarge ? 'w-3 h-3' : 'w-2 h-2'}`}
              />
              <motion.div 
                animate={{ scaleY: isBlinking ? 0.1 : 1 }}
                transition={{ duration: 0.1 }}
                className={`bg-gray-800 rounded-full ${isLarge ? 'w-3 h-3' : 'w-2 h-2'}`}
              />
            </div>
            <div className={`absolute ${isLarge ? 'top-[55%]' : 'top-[52%]'} left-1/2 -translate-x-1/2 ${isLarge ? 'w-8 h-4' : 'w-5 h-3'} border-b-3 border-gray-800 rounded-b-full`} style={{ borderBottomWidth: '2px' }} />
          </div>
          
          {/* Hair */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-full">
            <div className={`bg-gray-800 ${isLarge ? 'h-6' : 'h-4'} rounded-t-full`} />
          </div>
        </div>

        {mood === "celebrating" && (
          <>
            <motion.div
              animate={{ y: [-10, -20, -10], x: [-5, 5, -5], opacity: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-4 -right-4 text-2xl"
            >
              ✨
            </motion.div>
            <motion.div
              animate={{ y: [-10, -20, -10], x: [5, -5, 5], opacity: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -top-4 -left-4 text-2xl"
            >
              ✨
            </motion.div>
          </>
        )}
      </motion.div>

      {/* Body */}
      <motion.div
        animate={{ scaleY: [1, 1.02, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute ${isLarge ? 'top-20 w-32 h-28' : 'top-14 w-20 h-20'} left-1/2 -translate-x-1/2`}
      >
        <div className={`w-full h-full rounded-t-3xl rounded-b-2xl ${currentMood.bodyColor} border-4 border-white shadow-xl relative overflow-hidden`}>
          <div className="absolute inset-0 opacity-20">
            <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 w-full ${isLarge ? 'h-1' : 'h-0.5'} bg-white`} />
          </div>
        </div>
      </motion.div>

      {/* Arms */}
      <motion.div
        animate={currentMood.armAnimation}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute ${isLarge ? 'top-24 -left-4 w-8 h-20' : 'top-16 -left-2 w-5 h-14'} origin-top`}
      >
        <div className={`w-full h-full rounded-full bg-gradient-to-b ${currentMood.color} border-2 border-white shadow-lg`} />
        <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 ${isLarge ? 'w-6 h-6' : 'w-4 h-4'} rounded-full bg-gradient-to-br ${currentMood.color} border-2 border-white`} />
      </motion.div>

      <motion.div
        animate={currentMood.armAnimation}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className={`absolute ${isLarge ? 'top-24 -right-4 w-8 h-20' : 'top-16 -right-2 w-5 h-14'} origin-top`}
      >
        <div className={`w-full h-full rounded-full bg-gradient-to-b ${currentMood.color} border-2 border-white shadow-lg`} />
        <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 ${isLarge ? 'w-6 h-6' : 'w-4 h-4'} rounded-full bg-gradient-to-br ${currentMood.color} border-2 border-white`} />
      </motion.div>
    </div>
  );
}

function CatCharacter({ mood, isLarge, currentMood }) {
  return (
    <div className={`relative ${isLarge ? 'w-48 h-56' : 'w-32 h-40'} flex items-center justify-center`}>
      <motion.div
        animate={{
          y: [0, -5, 0],
          rotate: [-1, 1, -1]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className={`relative ${isLarge ? 'w-40 h-40' : 'w-28 h-28'}`}
      >
        {/* Cat body */}
        <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 ${isLarge ? 'w-32 h-28' : 'w-24 h-20'} bg-gradient-to-br from-yellow-300 to-yellow-400 rounded-t-[60px] rounded-b-3xl shadow-2xl border-4 border-white`}>
          {/* Stripes */}
          <div className={`absolute ${isLarge ? 'top-8 left-4 w-6' : 'top-4 left-2 w-4'} h-1 bg-yellow-600 rounded opacity-50`} />
          <div className={`absolute ${isLarge ? 'top-12 left-6 w-8' : 'top-7 left-4 w-6'} h-1 bg-yellow-600 rounded opacity-50`} />
          <div className={`absolute ${isLarge ? 'top-8 right-4 w-6' : 'top-4 right-2 w-4'} h-1 bg-yellow-600 rounded opacity-50`} />
          <div className={`absolute ${isLarge ? 'top-12 right-6 w-8' : 'top-7 right-4 w-6'} h-1 bg-yellow-600 rounded opacity-50`} />
        </div>

        {/* Cat head */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 ${isLarge ? 'w-28 h-28' : 'w-20 h-20'} bg-gradient-to-br from-yellow-300 to-yellow-400 rounded-full shadow-xl border-4 border-white`}>
          {/* Ears */}
          <div className={`absolute ${isLarge ? '-top-2 left-2 w-8 h-10' : '-top-1 left-1 w-6 h-7'} bg-gradient-to-br from-yellow-300 to-yellow-400 border-2 border-white`} style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
          <div className={`absolute ${isLarge ? '-top-2 right-2 w-8 h-10' : '-top-1 right-1 w-6 h-7'} bg-gradient-to-br from-yellow-300 to-yellow-400 border-2 border-white`} style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
          
          {/* Inner ears */}
          <div className={`absolute ${isLarge ? 'top-1 left-4 w-4 h-5' : 'top-1 left-2 w-3 h-3'} bg-pink-200`} style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
          <div className={`absolute ${isLarge ? 'top-1 right-4 w-4 h-5' : 'top-1 right-2 w-3 h-3'} bg-pink-200`} style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />

          {/* Face */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Eyes - happy closed eyes */}
            <div className={`absolute ${isLarge ? 'top-10' : 'top-7'} left-1/2 -translate-x-1/2 ${isLarge ? 'gap-4' : 'gap-3'} flex`}>
              <div className={`${isLarge ? 'w-5 h-2' : 'w-3 h-1.5'} border-b-2 border-gray-800 rounded-full`} />
              <div className={`${isLarge ? 'w-5 h-2' : 'w-3 h-1.5'} border-b-2 border-gray-800 rounded-full`} />
            </div>
            
            {/* Nose */}
            <div className={`absolute ${isLarge ? 'top-14' : 'top-10'} left-1/2 -translate-x-1/2 ${isLarge ? 'w-2 h-2' : 'w-1.5 h-1.5'} bg-pink-400 rounded-sm rotate-45`} />
            
            {/* Mouth - smile */}
            <div className={`absolute ${isLarge ? 'top-16' : 'top-12'} left-1/2 -translate-x-1/2`}>
              <div className={`flex ${isLarge ? 'gap-3' : 'gap-2'}`}>
                <div className={`${isLarge ? 'w-3 h-2' : 'w-2 h-1.5'} border-b-2 border-gray-800 rounded-b-full`} />
                <div className={`${isLarge ? 'w-3 h-2' : 'w-2 h-1.5'} border-b-2 border-gray-800 rounded-b-full`} />
              </div>
            </div>

            {/* Whiskers */}
            <div className={`absolute ${isLarge ? 'top-12 -left-2 w-8' : 'top-8 -left-1 w-6'} h-0.5 bg-gray-600`} />
            <div className={`absolute ${isLarge ? 'top-14 -left-2 w-8' : 'top-10 -left-1 w-6'} h-0.5 bg-gray-600`} />
            <div className={`absolute ${isLarge ? 'top-12 -right-2 w-8' : 'top-8 -right-1 w-6'} h-0.5 bg-gray-600`} />
            <div className={`absolute ${isLarge ? 'top-14 -right-2 w-8' : 'top-10 -right-1 w-6'} h-0.5 bg-gray-600`} />
          </div>
        </div>

        {/* Tail - wagging animation */}
        <motion.div
          animate={{
            rotate: [45, 60, 45],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className={`absolute ${isLarge ? 'bottom-4 -right-6 w-16 h-6' : 'bottom-2 -right-4 w-12 h-4'} bg-gradient-to-r from-yellow-300 to-yellow-400 rounded-full shadow-lg border-2 border-white origin-left`}
        />

        {mood === "celebrating" && (
          <>
            <motion.div
              animate={{ y: [-10, -20, -10], x: [-5, 5, -5], opacity: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-4 -right-4 text-2xl"
            >
              ✨
            </motion.div>
            <motion.div
              animate={{ y: [-10, -20, -10], x: [5, -5, 5], opacity: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -top-4 -left-4 text-2xl"
            >
              ✨
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
}

function DogCharacter({ mood, isLarge, currentMood }) {
  return (
    <div className={`relative ${isLarge ? 'w-48 h-56' : 'w-32 h-40'} flex items-center justify-center`}>
      <motion.div
        animate={{
          y: [0, -5, 0],
          rotate: [-1, 1, -1]
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className={`relative ${isLarge ? 'w-40 h-40' : 'w-28 h-28'}`}
      >
        {/* Dog body */}
        <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 ${isLarge ? 'w-32 h-28' : 'w-24 h-20'} bg-gradient-to-br from-amber-400 to-amber-500 rounded-t-[60px] rounded-b-3xl shadow-2xl border-4 border-white`}>
          {/* Spots */}
          <div className={`absolute ${isLarge ? 'top-6 left-6 w-5 h-5' : 'top-4 left-4 w-3 h-3'} rounded-full bg-amber-700 opacity-40`} />
          <div className={`absolute ${isLarge ? 'top-12 right-8 w-4 h-4' : 'top-8 right-6 w-3 h-3'} rounded-full bg-amber-700 opacity-40`} />
        </div>

        {/* Dog head */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 ${isLarge ? 'w-28 h-28' : 'w-20 h-20'} bg-gradient-to-br from-amber-400 to-amber-500 rounded-full shadow-xl border-4 border-white`}>
          {/* Floppy Ears */}
          <motion.div
            animate={{ rotate: [-12, -8, -12] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className={`absolute ${isLarge ? 'top-2 -left-3 w-10 h-16' : 'top-1 -left-2 w-7 h-12'} bg-gradient-to-br from-amber-500 to-amber-600 rounded-full border-2 border-white origin-top`}
          />
          <motion.div
            animate={{ rotate: [12, 8, 12] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className={`absolute ${isLarge ? 'top-2 -right-3 w-10 h-16' : 'top-1 -right-2 w-7 h-12'} bg-gradient-to-br from-amber-500 to-amber-600 rounded-full border-2 border-white origin-top`}
          />

          {/* Face */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Eyes - big happy eyes */}
            <div className={`absolute ${isLarge ? 'top-9' : 'top-6'} left-1/2 -translate-x-1/2 ${isLarge ? 'gap-4' : 'gap-3'} flex`}>
              <div className={`${isLarge ? 'w-3 h-3' : 'w-2 h-2'} bg-gray-800 rounded-full`} />
              <div className={`${isLarge ? 'w-3 h-3' : 'w-2 h-2'} bg-gray-800 rounded-full`} />
            </div>
            
            {/* Snout area */}
            <div className={`absolute ${isLarge ? 'top-13 w-16 h-12' : 'top-9 w-12 h-8'} left-1/2 -translate-x-1/2 bg-gradient-to-b from-amber-300 to-amber-400 rounded-full`} />
            
            {/* Nose */}
            <div className={`absolute ${isLarge ? 'top-14 w-3 h-3' : 'top-10 w-2 h-2'} left-1/2 -translate-x-1/2 bg-gray-800 rounded-full`} />
            
            {/* Mouth - big smile */}
            <div className={`absolute ${isLarge ? 'top-17 w-8 h-3' : 'top-12 w-6 h-2'} left-1/2 -translate-x-1/2 border-b-2 border-gray-800 rounded-b-full`} />
            
            {/* Tongue */}
            <div className={`absolute ${isLarge ? 'top-[4.5rem] w-3 h-4' : 'top-[3rem] w-2 h-3'} left-1/2 -translate-x-1/2 bg-pink-400 rounded-b-full`} />
          </div>
        </div>



        {mood === "celebrating" && (
          <>
            <motion.div
              animate={{ y: [-10, -20, -10], x: [-5, 5, -5], opacity: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-4 -right-4 text-2xl"
            >
              ✨
            </motion.div>
            <motion.div
              animate={{ y: [-10, -20, -10], x: [5, -5, 5], opacity: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -top-4 -left-4 text-2xl"
            >
              ✨
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
}

function OrbCharacter({ mood, isLarge }) {
  const moodColors = {
    supportive: "from-purple-500 via-teal-500 to-blue-500",
    celebrating: "from-yellow-400 via-pink-500 to-purple-500",
    working: "from-teal-500 via-blue-500 to-purple-500",
    calm: "from-blue-400 via-purple-400 to-teal-400"
  };

  const currentColor = moodColors[mood] || moodColors.supportive;

  return (
    <div className={`relative ${isLarge ? 'w-48 h-56' : 'w-32 h-40'} flex items-center justify-center`}>
      <motion.div
        animate={{
          y: [0, -8, 0],
          scale: [1, 1.05, 1]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="relative"
      >
        {/* Glow effect */}
        <motion.div 
          animate={{ 
            opacity: [0.4, 0.6, 0.4],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute inset-0 ${isLarge ? 'w-32 h-32' : 'w-20 h-20'} bg-gradient-to-br ${currentColor} rounded-full blur-xl`} 
        />
        
        {/* Main orb */}
        <div className={`relative ${isLarge ? 'w-32 h-32' : 'w-20 h-20'} bg-gradient-to-br ${currentColor} rounded-full shadow-2xl border-4 border-white flex items-center justify-center overflow-hidden`}>
          {/* Inner glow */}
          <div className="absolute inset-4 bg-gradient-to-br from-white/40 to-transparent rounded-full" />
          
          {/* Face */}
          <div className="relative z-10">
            {/* Eyes */}
            <div className={`flex ${isLarge ? 'gap-4' : 'gap-2'} mb-2`}>
              <motion.div 
                animate={{ scaleY: mood === "celebrating" ? [1, 0.3, 1] : 1 }}
                transition={{ duration: 0.3, repeat: mood === "celebrating" ? Infinity : 0, repeatDelay: 2 }}
                className={`${isLarge ? 'w-3 h-3' : 'w-2 h-2'} bg-white rounded-full shadow-lg`} 
              />
              <motion.div 
                animate={{ scaleY: mood === "celebrating" ? [1, 0.3, 1] : 1 }}
                transition={{ duration: 0.3, repeat: mood === "celebrating" ? Infinity : 0, repeatDelay: 2 }}
                className={`${isLarge ? 'w-3 h-3' : 'w-2 h-2'} bg-white rounded-full shadow-lg`} 
              />
            </div>
            {/* Smile */}
            <div className={`${isLarge ? 'w-8 h-3' : 'w-5 h-2'} border-b-2 border-white rounded-b-full mx-auto`} />
          </div>
          
          {/* Sparkle effects */}
          <motion.div 
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className={`absolute ${isLarge ? 'top-4 right-6 w-2 h-2' : 'top-2 right-4 w-1.5 h-1.5'} bg-white rounded-full`} 
          />
          <motion.div 
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            className={`absolute ${isLarge ? 'top-8 right-4 w-1 h-1' : 'top-5 right-3 w-1 h-1'} bg-white rounded-full`} 
          />
        </div>
        
        {/* Floating particles */}
        <motion.div 
          animate={{ y: [-5, 5, -5], x: [-2, 2, -2] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute ${isLarge ? '-top-2 -left-2 w-3 h-3' : '-top-1 -left-1 w-2 h-2'} bg-purple-300 rounded-full opacity-70`} 
        />
        <motion.div 
          animate={{ y: [3, -3, 3], x: [2, -2, 2] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className={`absolute ${isLarge ? '-bottom-1 -right-3 w-2 h-2' : 'bottom-0 -right-2 w-1.5 h-1.5'} bg-teal-300 rounded-full opacity-70`} 
        />
        <motion.div 
          animate={{ y: [2, -4, 2] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className={`absolute ${isLarge ? 'top-1/2 -right-4 w-2 h-2' : 'top-1/2 -right-3 w-1.5 h-1.5'} bg-blue-300 rounded-full opacity-70`} 
        />

        {mood === "celebrating" && (
          <>
            <motion.div
              animate={{ y: [-10, -25, -10], rotate: [0, 180, 360], opacity: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-6 -right-4 text-2xl"
            >
              ✨
            </motion.div>
            <motion.div
              animate={{ y: [-10, -25, -10], rotate: [360, 180, 0], opacity: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -top-6 -left-4 text-2xl"
            >
              ✨
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function VirtualCompanion({ 
  mood = "supportive", 
  message, 
  size = "large",
  showActivity = false,
  characterType = "human",
  userProgress = null
}) {
  const level = userProgress?.level || 1;
  const upgrades = getCompanionUpgrades(level);
  const [currentActivity, setCurrentActivity] = useState(activities[0]);
  const [showActivityMessage, setShowActivityMessage] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    if (!showActivity) return;

    const activityInterval = setInterval(() => {
      const randomActivity = activities[Math.floor(Math.random() * activities.length)];
      setCurrentActivity(randomActivity);
      setShowActivityMessage(true);
      
      setTimeout(() => setShowActivityMessage(false), 4000);
    }, 15000);

    return () => clearInterval(activityInterval);
  }, [showActivity]);

  // Blinking animation
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    }, 3000 + Math.random() * 2000);

    return () => clearInterval(blinkInterval);
  }, []);

  const moods = {
    supportive: {
      color: "from-purple-400 to-pink-400",
      armAnimation: { rotate: [0, 10, 0] },
      bodyColor: "bg-gradient-to-br from-purple-100 to-pink-100"
    },
    celebrating: {
      color: "from-yellow-400 to-orange-400",
      armAnimation: { rotate: [-20, 20, -20], y: [-5, 5, -5] },
      bodyColor: "bg-gradient-to-br from-yellow-100 to-orange-100"
    },
    working: {
      color: "from-teal-400 to-blue-400",
      armAnimation: { rotate: [0, -15, 0] },
      bodyColor: "bg-gradient-to-br from-teal-100 to-blue-100"
    },
    calm: {
      color: "from-purple-300 to-teal-300",
      armAnimation: { y: [0, 3, 0] },
      bodyColor: "bg-gradient-to-br from-purple-100 to-teal-100"
    }
  };

  const currentMood = moods[mood] || moods.supportive;
  const isLarge = size === "large";

  const ActivityIcon = currentActivity.icon;

  const getAuraClass = () => {
    if (!upgrades.aura) return "";
    const auras = {
      bronze: "shadow-[0_0_20px_rgba(205,127,50,0.5)]",
      silver: "shadow-[0_0_25px_rgba(192,192,192,0.6)]",
      gold: "shadow-[0_0_30px_rgba(255,215,0,0.7)]",
      rainbow: "shadow-[0_0_40px_rgba(147,51,234,0.5)]"
    };
    return auras[upgrades.aura] || "";
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`relative ${getAuraClass()} rounded-full`}
      >
        {/* Level Badge */}
        {upgrades.badge && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`absolute -top-2 -right-2 z-20 px-2 py-1 rounded-full text-xs font-bold shadow-lg ${
              upgrades.badge.color === "rainbow" 
                ? "bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white"
                : upgrades.badge.color === "purple"
                ? "bg-purple-500 text-white"
                : upgrades.badge.color === "gold"
                ? "bg-yellow-500 text-white"
                : upgrades.badge.color === "silver"
                ? "bg-gray-400 text-white"
                : "bg-amber-600 text-white"
            }`}
          >
            Lv.{level}
          </motion.div>
        )}

        {/* Crown for level 10+ */}
        {upgrades.accessories.includes("crown") && (
          <motion.div
            animate={{ y: [0, -3, 0], rotate: [-5, 5, -5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`absolute ${isLarge ? '-top-8' : '-top-6'} left-1/2 -translate-x-1/2 z-10`}
          >
            <Crown className={`${isLarge ? 'w-10 h-10' : 'w-7 h-7'} text-yellow-500 fill-yellow-400`} />
          </motion.div>
        )}

        {/* Sparkle effects for level 5+ */}
        {upgrades.accessories.includes("sparkle") && (
          <>
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className={`absolute ${isLarge ? '-left-4 top-4' : '-left-2 top-2'}`}
            >
              <Sparkles className={`${isLarge ? 'w-5 h-5' : 'w-3 h-3'} text-yellow-400`} />
            </motion.div>
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
              className={`absolute ${isLarge ? '-right-4 top-8' : '-right-2 top-6'}`}
            >
              <Star className={`${isLarge ? 'w-4 h-4' : 'w-3 h-3'} text-purple-400 fill-purple-300`} />
            </motion.div>
          </>
        )}

        {/* Legendary glow for level 25+ */}
        {upgrades.specialEffects.includes("legendary_glow") && (
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 blur-xl -z-10`}
          />
        )}

        {/* Particle effects for level 20+ */}
        {upgrades.specialEffects.includes("particles") && (
          <>
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  y: [-20, -40],
                  x: [Math.random() * 20 - 10, Math.random() * 40 - 20],
                  opacity: [0, 1, 0],
                  scale: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.4,
                }}
                className="absolute bottom-0 left-1/2"
              >
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400" />
              </motion.div>
            ))}
          </>
        )}
        {characterType === "human" ? (
          <HumanCharacter 
            mood={mood} 
            isLarge={isLarge} 
            isBlinking={isBlinking}
            currentMood={currentMood}
          />
        ) : characterType === "dog" ? (
          <DogCharacter 
            mood={mood} 
            isLarge={isLarge}
            currentMood={currentMood}
          />
        ) : characterType === "orb" ? (
          <OrbCharacter 
            mood={mood} 
            isLarge={isLarge}
          />
        ) : (
          <CatCharacter 
            mood={mood} 
            isLarge={isLarge}
            currentMood={currentMood}
          />
        )}

        {/* Activity indicator */}
        {showActivity && (
          <motion.div
            animate={{
              y: [0, -5, 0],
              rotate: [0, 10, -10, 0]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className={`absolute ${isLarge ? '-right-6 top-8' : '-right-4 top-6'} ${isLarge ? 'w-12 h-12' : 'w-8 h-8'} bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-purple-200`}
          >
            <ActivityIcon className={`${isLarge ? 'w-6 h-6' : 'w-4 h-4'} text-purple-600`} />
          </motion.div>
        )}

        {/* Halo for level 20+ */}
        {upgrades.accessories.includes("halo") && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className={`absolute ${isLarge ? '-top-6' : '-top-4'} left-1/2 -translate-x-1/2 ${isLarge ? 'w-16 h-3' : 'w-12 h-2'} rounded-full border-2 border-yellow-400 bg-gradient-to-r from-yellow-200 to-yellow-300 opacity-80`}
          />
        )}
      </motion.div>

      {/* Main message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 backdrop-blur-sm px-6 py-3 rounded-2xl shadow-lg border border-purple-100 max-w-md text-center relative"
        >
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/90 rotate-45 border-l border-t border-purple-100" />
          <p className="text-sm text-gray-700 font-medium">{message}</p>
        </motion.div>
      )}

      {/* Activity message */}
      <AnimatePresence>
        {showActivity && showActivityMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="bg-gradient-to-r from-purple-50 to-teal-50 px-4 py-2 rounded-xl shadow-md border border-purple-100"
          >
            <p className="text-xs text-gray-600 flex items-center gap-2">
              <span className="text-lg">{currentActivity.emoji}</span>
              <span>I'm {currentActivity.text}...</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}