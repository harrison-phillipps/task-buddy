import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, BookOpen, Coffee, Music, Palette, Code, Dumbbell, Heart, Crown, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { getCompanionUpgrades } from "@/components/companionUtils";
import MessageFeedback from "./companion/MessageFeedback";

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

function RobotCharacter({ mood, isLarge }) {
  const size = isLarge ? 160 : 112;
  return (
    <div className={`relative ${isLarge ? 'w-48 h-56' : 'w-28 sm:w-32 h-36 sm:h-40'} flex items-center justify-center flex-shrink-0`}>
      <motion.div
        animate={{
          y: [0, -5, 0],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className={`relative ${isLarge ? 'w-40 h-40' : 'w-28 h-28'}`}
      >
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 160 160" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-2xl"
        >
          <defs>
            <linearGradient id="robotBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
            <linearGradient id="robotHead" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <linearGradient id="screenGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
            <filter id="softGlow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Body */}
          <rect x="46" y="80" width="68" height="70" rx="20" fill="url(#robotBody)"/>
          <ellipse cx="80" cy="80" rx="34" ry="10" fill="#1e293b" opacity="0.3"/>
          
          {/* Chest Screen */}
          <rect x="62" y="92" width="36" height="36" rx="8" fill="url(#screenGlow)" filter="url(#softGlow)"/>
          <rect x="66" y="96" width="28" height="28" rx="6" fill="#22d3ee" opacity="0.3"/>
          <circle cx="70" cy="100" r="4" fill="#ffffff" opacity="0.7"/>
          
          {/* Status Lights */}
          <motion.circle 
            cx="72" cy="138" r="3" fill="#4ade80"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <circle cx="80" cy="138" r="3" fill="#fbbf24"/>
          <circle cx="88" cy="138" r="3" fill="#f87171"/>
          
          {/* Head */}
          <rect x="56" y="30" width="48" height="50" rx="16" fill="url(#robotHead)"/>
          
          {/* Antenna */}
          <line x1="80" y1="30" x2="80" y2="18" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round"/>
          <motion.circle 
            cx="80" cy="15" r="5" fill="#ef4444"
            animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          
          {/* Face Screen */}
          <rect x="62" y="38" width="36" height="34" rx="8" fill="#1e293b"/>
          <rect x="64" y="40" width="32" height="30" rx="6" fill="#0f172a"/>
          
          {/* Eyes */}
          <motion.circle 
            cx="72" cy="52" r="4" fill="#22d3ee"
            animate={{ 
              scaleY: mood === "celebrating" ? [1, 0.3, 1] : 1,
              opacity: [0.9, 1, 0.9]
            }}
            transition={{ 
              scaleY: { duration: 0.3, repeat: mood === "celebrating" ? Infinity : 0, repeatDelay: 2 },
              opacity: { duration: 1.5, repeat: Infinity }
            }}
            filter="url(#softGlow)"
          />
          <motion.circle 
            cx="88" cy="52" r="4" fill="#22d3ee"
            animate={{ 
              scaleY: mood === "celebrating" ? [1, 0.3, 1] : 1,
              opacity: [0.9, 1, 0.9]
            }}
            transition={{ 
              scaleY: { duration: 0.3, repeat: mood === "celebrating" ? Infinity : 0, repeatDelay: 2 },
              opacity: { duration: 1.5, repeat: Infinity }
            }}
            filter="url(#softGlow)"
          />
          
          {/* Smile */}
          <path d="M 70 60 Q 80 66 90 60" stroke="#22d3ee" strokeWidth="2" fill="none" strokeLinecap="round" filter="url(#softGlow)"/>
          
          {/* Ear Panels */}
          <ellipse cx="54" cy="52" rx="4" ry="10" fill="#94a3b8"/>
          <ellipse cx="106" cy="52" rx="4" ry="10" fill="#94a3b8"/>
          
          {/* Arms */}
          <motion.rect 
            x="34" y="86" width="8" height="40" rx="4" fill="url(#robotBody)"
            animate={{ rotate: [-5, 5, -5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: '38px 86px' }}
          />
          <motion.rect 
            x="118" y="86" width="8" height="40" rx="4" fill="url(#robotBody)"
            animate={{ rotate: [5, -5, 5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            style={{ transformOrigin: '122px 86px' }}
          />
          <circle cx="38" cy="126" r="5" fill="#475569"/>
          <circle cx="122" cy="126" r="5" fill="#475569"/>
        </svg>

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

function CatCharacter({ mood, isLarge }) {
  const size = isLarge ? 160 : 112;
  return (
    <div className={`relative ${isLarge ? 'w-48 h-56' : 'w-28 sm:w-32 h-36 sm:h-40'} flex items-center justify-center flex-shrink-0`}>
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
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 160 160" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-2xl"
        >
          <defs>
            <linearGradient id="catFur" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <radialGradient id="catBelly">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="100%" stopColor="#fde68a" />
            </radialGradient>
            <filter id="softShadow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Body */}
          <ellipse cx="80" cy="105" rx="40" ry="35" fill="url(#catFur)" filter="url(#softShadow)"/>
          <ellipse cx="80" cy="110" rx="30" ry="25" fill="url(#catBelly)" opacity="0.6"/>
          
          {/* Stripes */}
          <path d="M 65 95 Q 75 97 85 95" stroke="#b45309" strokeWidth="2" opacity="0.4" strokeLinecap="round"/>
          <path d="M 60 105 Q 70 108 80 105" stroke="#b45309" strokeWidth="2" opacity="0.4" strokeLinecap="round"/>
          <path d="M 75 95 Q 85 97 95 95" stroke="#b45309" strokeWidth="2" opacity="0.4" strokeLinecap="round"/>
          <path d="M 80 105 Q 90 108 100 105" stroke="#b45309" strokeWidth="2" opacity="0.4" strokeLinecap="round"/>
          
          {/* Head */}
          <circle cx="80" cy="60" r="32" fill="url(#catFur)" filter="url(#softShadow)"/>
          
          {/* Ears */}
          <path d="M 56 42 L 48 25 L 62 38 Z" fill="url(#catFur)" filter="url(#softShadow)"/>
          <path d="M 104 42 L 112 25 L 98 38 Z" fill="url(#catFur)" filter="url(#softShadow)"/>
          <path d="M 56 38 L 52 28 L 60 36 Z" fill="#fbcfe8" opacity="0.8"/>
          <path d="M 104 38 L 108 28 L 100 36 Z" fill="#fbcfe8" opacity="0.8"/>
          
          {/* Face Details */}
          <ellipse cx="68" cy="56" rx="3" ry="1.5" fill="#1f2937"/>
          <ellipse cx="92" cy="56" rx="3" ry="1.5" fill="#1f2937"/>
          
          {/* Nose */}
          <ellipse cx="80" cy="64" r="4" fill="#f472b6"/>
          <path d="M 80 64 L 78 68 L 80 67 L 82 68 Z" fill="#1f2937" opacity="0.3"/>
          
          {/* Mouth */}
          <path d="M 76 68 Q 76 72 74 74" stroke="#1f2937" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          <path d="M 84 68 Q 84 72 86 74" stroke="#1f2937" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          
          {/* Whiskers */}
          <line x1="45" y1="62" x2="62" y2="60" stroke="#64748b" strokeWidth="1.5" opacity="0.7" strokeLinecap="round"/>
          <line x1="45" y1="66" x2="62" y2="65" stroke="#64748b" strokeWidth="1.5" opacity="0.7" strokeLinecap="round"/>
          <line x1="115" y1="62" x2="98" y2="60" stroke="#64748b" strokeWidth="1.5" opacity="0.7" strokeLinecap="round"/>
          <line x1="115" y1="66" x2="98" y2="65" stroke="#64748b" strokeWidth="1.5" opacity="0.7" strokeLinecap="round"/>
          
          {/* Cheek Blush */}
          <ellipse cx="62" cy="66" rx="6" ry="4" fill="#f472b6" opacity="0.2"/>
          <ellipse cx="98" cy="66" rx="6" ry="4" fill="#f472b6" opacity="0.2"/>
          
          {/* Paws */}
          <ellipse cx="65" cy="135" rx="8" ry="6" fill="#f59e0b"/>
          <ellipse cx="95" cy="135" rx="8" ry="6" fill="#f59e0b"/>
          
          {/* Tail */}
          <motion.path
            d="M 115 110 Q 130 105 135 115 Q 140 125 135 130"
            fill="none"
            stroke="url(#catFur)"
            strokeWidth="12"
            strokeLinecap="round"
            animate={{ d: ["M 115 110 Q 130 105 135 115 Q 140 125 135 130", "M 115 110 Q 130 100 138 112 Q 143 122 138 128", "M 115 110 Q 130 105 135 115 Q 140 125 135 130"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>

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

function DogCharacter({ mood, isLarge }) {
  const size = isLarge ? 160 : 112;
  return (
    <div className={`relative ${isLarge ? 'w-48 h-56' : 'w-28 sm:w-32 h-36 sm:h-40'} flex items-center justify-center flex-shrink-0`}>
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
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 160 160" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-2xl"
        >
          <defs>
            <linearGradient id="dogFur" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="dogMuzzle" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="100%" stopColor="#fde68a" />
            </linearGradient>
            <radialGradient id="dogBelly">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="100%" stopColor="#fde68a" />
            </radialGradient>
            <filter id="fluffyShadow">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Body */}
          <ellipse cx="80" cy="105" rx="42" ry="36" fill="url(#dogFur)" filter="url(#fluffyShadow)"/>
          <ellipse cx="80" cy="115" rx="32" ry="26" fill="url(#dogBelly)" opacity="0.5"/>
          
          {/* Spots */}
          <ellipse cx="65" cy="95" rx="10" ry="8" fill="#d97706" opacity="0.3"/>
          <ellipse cx="100" cy="100" rx="8" ry="7" fill="#d97706" opacity="0.3"/>
          
          {/* Head */}
          <circle cx="80" cy="55" r="34" fill="url(#dogFur)" filter="url(#fluffyShadow)"/>
          
          {/* Ears */}
          <motion.ellipse
            cx="50" cy="52" rx="12" ry="28" fill="#f59e0b" filter="url(#fluffyShadow)"
            animate={{ rotate: [-12, -8, -12] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: '50px 40px' }}
          />
          <motion.ellipse
            cx="110" cy="52" rx="12" ry="28" fill="#f59e0b" filter="url(#fluffyShadow)"
            animate={{ rotate: [12, 8, 12] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            style={{ transformOrigin: '110px 40px' }}
          />
          
          {/* Inner Ears */}
          <ellipse cx="50" cy="52" rx="6" ry="18" fill="#fde68a" opacity="0.6"/>
          <ellipse cx="110" cy="52" rx="6" ry="18" fill="#fde68a" opacity="0.6"/>
          
          {/* Eyes */}
          <circle cx="68" cy="50" r="5" fill="#1f2937"/>
          <circle cx="92" cy="50" r="5" fill="#1f2937"/>
          <circle cx="70" cy="48" r="2" fill="#ffffff" opacity="0.8"/>
          <circle cx="94" cy="48" r="2" fill="#ffffff" opacity="0.8"/>
          
          {/* Muzzle */}
          <ellipse cx="80" cy="65" rx="20" ry="16" fill="url(#dogMuzzle)" filter="url(#fluffyShadow)"/>
          
          {/* Nose */}
          <ellipse cx="80" cy="62" rx="6" ry="5" fill="#1f2937"/>
          <ellipse cx="78" cy="60" rx="2" ry="2" fill="#ffffff" opacity="0.5"/>
          
          {/* Mouth */}
          <path d="M 80 62 L 80 70" stroke="#1f2937" strokeWidth="2" strokeLinecap="round"/>
          <path d="M 70 70 Q 80 76 90 70" stroke="#1f2937" strokeWidth="2" fill="none" strokeLinecap="round"/>
          
          {/* Tongue */}
          <ellipse cx="80" cy="76" rx="6" ry="8" fill="#f472b6"/>
          <path d="M 80 68 Q 80 72 80 76" stroke="#f472b6" strokeWidth="4" opacity="0.7" strokeLinecap="round"/>
          
          {/* Paws */}
          <ellipse cx="62" cy="136" rx="10" ry="7" fill="#f59e0b"/>
          <ellipse cx="98" cy="136" rx="10" ry="7" fill="#f59e0b"/>
          
          {/* Tail - behind the body, curling upward */}
          <motion.path
            d="M 112 120 Q 130 125 138 112 Q 144 100 135 92"
            fill="none"
            stroke="#d97706"
            strokeWidth="13"
            strokeLinecap="round"
            opacity="0.7"
            animate={{ 
              d: [
                "M 112 120 Q 130 125 138 112 Q 144 100 135 92",
                "M 112 120 Q 132 122 142 108 Q 150 94 140 86",
                "M 112 120 Q 130 125 138 112 Q 144 100 135 92"
              ] 
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.path
            d="M 112 120 Q 130 125 138 112 Q 144 100 135 92"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="9"
            strokeLinecap="round"
            opacity="0.6"
            animate={{ 
              d: [
                "M 112 120 Q 130 125 138 112 Q 144 100 135 92",
                "M 112 120 Q 132 122 142 108 Q 150 94 140 86",
                "M 112 120 Q 130 125 138 112 Q 144 100 135 92"
              ] 
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>

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
    <div className={`relative ${isLarge ? 'w-48 h-56' : 'w-28 sm:w-32 h-36 sm:h-40'} flex items-center justify-center flex-shrink-0`}>
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
        <div className={`relative ${isLarge ? 'w-32 h-32' : 'w-20 h-20'} bg-gradient-to-br ${currentColor} rounded-full flex items-center justify-center overflow-hidden`}
             style={{ 
               boxShadow: '0 15px 50px -10px rgba(0,0,0,0.3), 0 5px 20px rgba(139,92,246,0.3), inset 0 -20px 30px -20px rgba(255,255,255,0.4), inset 0 20px 30px -20px rgba(0,0,0,0.15)'
             }}>
          {/* Inner glow layers */}
          <div className="absolute inset-4 bg-gradient-to-br from-white/50 via-white/20 to-transparent rounded-full" />
          <div className="absolute inset-6 bg-gradient-to-tl from-white/30 to-transparent rounded-full" />
          
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
  userProgress = null,
  context = "general",
  enableFeedback = false
}) {
  const level = userProgress?.level || 1;
  const upgrades = getCompanionUpgrades(level);
  const [currentActivity, setCurrentActivity] = useState(activities[0]);
  const [showActivityMessage, setShowActivityMessage] = useState(false);

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
    <div className="flex flex-col items-center gap-4 w-full max-w-full overflow-hidden">
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
        {characterType === "robot" ? (
          <RobotCharacter mood={mood} isLarge={isLarge} />
        ) : characterType === "dog" ? (
          <DogCharacter mood={mood} isLarge={isLarge} />
        ) : characterType === "orb" ? (
          <OrbCharacter mood={mood} isLarge={isLarge} />
        ) : (
          <CatCharacter mood={mood} isLarge={isLarge} />
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
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-4 md:px-6 py-3 rounded-2xl shadow-lg border border-purple-100 dark:border-gray-700 max-w-full md:max-w-md text-center relative mx-4"
        >
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/90 dark:bg-gray-800/90 rotate-45 border-l border-t border-purple-100 dark:border-gray-700" />
          <p className="text-sm text-gray-700 dark:text-gray-200 font-medium break-words">{message}</p>
          {enableFeedback && (
            <MessageFeedback 
              message={message} 
              context={context}
              onFeedbackSubmitted={() => console.log("Feedback submitted")}
            />
          )}
        </motion.div>
      )}

      {/* Activity message */}
      <AnimatePresence>
        {showActivity && showActivityMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="bg-gradient-to-r from-purple-50 to-teal-50 dark:from-purple-900/30 dark:to-teal-900/30 px-4 py-2 rounded-xl shadow-md border border-purple-100 dark:border-purple-700"
          >
            <p className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-2">
              <span className="text-lg">{currentActivity.emoji}</span>
              <span>I'm {currentActivity.text}...</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}