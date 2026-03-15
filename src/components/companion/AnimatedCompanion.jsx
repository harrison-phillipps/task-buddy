import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const DogCompanion = ({ size, mood }) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const [tongueOut, setTongueOut] = useState(true);

  useEffect(() => {
    // Random blinking
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    }, 3000 + Math.random() * 2000);

    // Tongue panting
    const tongueInterval = setInterval(() => {
      setTongueOut(prev => !prev);
    }, 500);

    return () => {
      clearInterval(blinkInterval);
      clearInterval(tongueInterval);
    };
  }, []);

  const excited = mood === "celebrating";
  const happy = mood === "supportive" || mood === "calm";

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Body */}
      <ellipse cx="100" cy="130" rx="40" ry="45" fill="#F59E0B" />
      
      {/* Tail - wagging */}
      <motion.path
        d="M 135 120 Q 155 110 160 90"
        stroke="#F59E0B"
        strokeWidth="12"
        fill="none"
        strokeLinecap="round"
        animate={{ rotate: excited ? [-20, 20, -20] : [-10, 10, -10] }}
        transition={{ duration: excited ? 0.3 : 0.8, repeat: Infinity }}
        style={{ transformOrigin: '135px 120px' }}
      />
      
      {/* Head */}
      <motion.g
        animate={excited ? { rotate: [0, -5, 5, 0] } : {}}
        transition={{ duration: 1, repeat: Infinity }}
        style={{ transformOrigin: '100px 75px' }}
      >
        {/* Main head - more oval shaped */}
        <ellipse cx="100" cy="70" rx="42" ry="38" fill="#F59E0B" />
        
        {/* Floppy ears - characteristic dog feature */}
        <motion.ellipse
          cx="68" cy="75" rx="18" ry="30" fill="#D97706"
          animate={{ rotate: [-8, 2, -8] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          style={{ transformOrigin: '68px 65px' }}
        />
        <motion.ellipse
          cx="132" cy="75" rx="18" ry="30" fill="#D97706"
          animate={{ rotate: [8, -2, 8] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
          style={{ transformOrigin: '132px 65px' }}
        />
        
        {/* Inner ear detail */}
        <ellipse cx="68" cy="78" rx="10" ry="18" fill="#FCD34D" />
        <ellipse cx="132" cy="78" rx="10" ry="18" fill="#FCD34D" />
        
        {/* Extended snout - key dog feature */}
        <ellipse cx="100" cy="85" rx="28" ry="20" fill="#F59E0B" />
        <ellipse cx="100" cy="90" rx="22" ry="16" fill="#FCD34D" />
        
        {/* Nose - wider and more prominent */}
        <ellipse cx="100" cy="95" rx="8" ry="6" fill="#1F2937" />
        
        {/* Eyes - rounder, friendly dog eyes */}
        <circle cx="85" cy="68" r="9" fill="#1F2937" />
        <circle cx="115" cy="68" r="9" fill="#1F2937" />
        {!isBlinking && (
          <>
            <circle cx="87" cy="66" r="4" fill="white" />
            <circle cx="117" cy="66" r="4" fill="white" />
          </>
        )}
        {isBlinking && (
          <>
            <line x1="78" y1="68" x2="92" y2="68" stroke="#1F2937" strokeWidth="3" strokeLinecap="round" />
            <line x1="108" y1="68" x2="122" y2="68" stroke="#1F2937" strokeWidth="3" strokeLinecap="round" />
          </>
        )}
        
        {/* Eyebrows for expression */}
        <path d="M 78 62 Q 85 60 92 62" stroke="#D97706" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 108 62 Q 115 60 122 62" stroke="#D97706" strokeWidth="2" fill="none" strokeLinecap="round" />
        
        {/* Mouth line from nose */}
        <line x1="100" y1="95" x2="100" y2="100" stroke="#1F2937" strokeWidth="2" />
        
        {/* Tongue */}
        {tongueOut && (
          <motion.ellipse
            cx="100" cy="105" rx="10" ry="14" fill="#FB7185"
            animate={{ scaleY: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
        
        {/* Happy mouth - wider smile */}
        <path
          d="M 85 100 Q 100 106 115 100"
          stroke="#1F2937"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </motion.g>
      
      {/* Front legs */}
      <rect x="80" y="165" width="12" height="25" rx="6" fill="#F59E0B" />
      <rect x="108" y="165" width="12" height="25" rx="6" fill="#F59E0B" />
      
      {/* Celebration sparkles */}
      {excited && (
        <>
          <motion.text
            x="140" y="50" fontSize="20"
            animate={{ y: [50, 35, 50], opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >✨</motion.text>
          <motion.text
            x="45" y="50" fontSize="20"
            animate={{ y: [50, 35, 50], opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1 }}
          >✨</motion.text>
        </>
      )}
    </motion.svg>
  );
};

const CatCompanion = ({ size, mood }) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const [tailCurl, setTailCurl] = useState(0);

  useEffect(() => {
    // Random blinking
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    }, 3500 + Math.random() * 2000);

    // Tail movement
    const tailInterval = setInterval(() => {
      setTailCurl(prev => (prev + 1) % 3);
    }, 1500);

    return () => {
      clearInterval(blinkInterval);
      clearInterval(tailInterval);
    };
  }, []);

  const purr = mood === "calm" || mood === "supportive";
  const playful = mood === "celebrating";

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Body - warm brown */}
      <ellipse cx="100" cy="120" rx="45" ry="50" fill="#A0826D" />
      <ellipse cx="100" cy="125" rx="30" ry="35" fill="#EDD5C8" />
      
      {/* Tail - brown */}
      <motion.path
        d="M 140 110 Q 160 100 165 80 Q 168 60 160 50"
        stroke="#A0826D"
        strokeWidth="14"
        fill="none"
        strokeLinecap="round"
        animate={{ d: tailCurl === 0 
          ? "M 140 110 Q 160 100 165 80 Q 168 60 160 50"
          : tailCurl === 1
          ? "M 140 110 Q 165 105 170 85 Q 168 65 165 55"
          : "M 140 110 Q 155 95 160 75 Q 165 55 155 45"
        }}
        transition={{ duration: 0.8 }}
      />
      
      {/* Head */}
      <motion.g
        animate={playful ? { rotate: [0, -3, 3, 0] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ transformOrigin: '100px 70px' }}
      >
        {/* Rounder, cuter cat face - brown color */}
        <circle cx="100" cy="72" r="42" fill="#A0826D" />
        
        {/* Softer, rounder pointy ears - warm brown */}
        <motion.path
          d="M 68 48 L 60 22 L 78 52 Z"
          fill="#A0826D"
          animate={playful ? { rotate: [-2, 2, -2] } : {}}
          transition={{ duration: 2.5, repeat: Infinity }}
          style={{ transformOrigin: '68px 48px' }}
        />
        <motion.path
          d="M 132 48 L 140 22 L 122 52 Z"
          fill="#A0826D"
          animate={playful ? { rotate: [2, -2, 2] } : {}}
          transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
          style={{ transformOrigin: '132px 48px' }}
        />
        
        {/* Softer pink inner ears */}
        <path d="M 68 48 L 64 30 L 74 50 Z" fill="#FDB8B8" />
        <path d="M 132 48 L 136 30 L 126 50 Z" fill="#FDB8B8" />
        
        {/* Cream facial markings - rounder and softer */}
        <ellipse cx="100" cy="78" rx="28" ry="20" fill="#EDD5C8" />
        
        {/* Forehead marking - cute M shape */}
        <path d="M 88 60 Q 92 58 96 60 Q 100 57 104 60 Q 108 58 112 60" 
          stroke="#8B6F5C" strokeWidth="2" fill="none" strokeLinecap="round" />
        
        {/* Big, cute round eyes - similar to dog */}
        {!isBlinking ? (
          <>
            {/* Outer eye - warm amber */}
            <circle cx="85" cy="70" r="9" fill="#D97706" />
            <circle cx="115" cy="70" r="9" fill="#D97706" />
            {/* Inner eye - lighter amber */}
            <circle cx="85" cy="70" r="7" fill="#F59E0B" />
            <circle cx="115" cy="70" r="7" fill="#F59E0B" />
            {/* Small pupils for cute look */}
            <circle cx="85" cy="70" r="3" fill="#1F2937" />
            <circle cx="115" cy="70" r="3" fill="#1F2937" />
            {/* Big sparkly highlights */}
            <circle cx="87" cy="68" r="2.5" fill="white" />
            <circle cx="117" cy="68" r="2.5" fill="white" />
            <circle cx="84" cy="72" r="1" fill="white" opacity="0.6" />
            <circle cx="114" cy="72" r="1" fill="white" opacity="0.6" />
          </>
        ) : (
          <>
            <path d="M 78 70 Q 85 73 92 70" stroke="#1F2937" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M 108 70 Q 115 73 122 70" stroke="#1F2937" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        )}
        
        {/* Cute pink nose - rounder */}
        <ellipse cx="100" cy="83" rx="4" ry="3.5" fill="#F8A5C2" />
        
        {/* Delicate whiskers - softer appearance */}
        <line x1="60" y1="78" x2="35" y2="75" stroke="#6B5A4D" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
        <line x1="60" y1="82" x2="35" y2="84" stroke="#6B5A4D" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
        <line x1="60" y1="86" x2="35" y2="90" stroke="#6B5A4D" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
        <line x1="140" y1="78" x2="165" y2="75" stroke="#6B5A4D" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
        <line x1="140" y1="82" x2="165" y2="84" stroke="#6B5A4D" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
        <line x1="140" y1="86" x2="165" y2="90" stroke="#6B5A4D" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
        
        {/* Sweet gentle smile - similar to dog friendliness */}
        <line x1="100" y1="83" x2="100" y2="87" stroke="#6B5A4D" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M 90 87 Q 100 92 110 87"
          stroke="#6B5A4D"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        
        {/* Rosy cheeks for extra cuteness */}
        <circle cx="75" cy="80" r="6" fill="#F8A5C2" opacity="0.3" />
        <circle cx="125" cy="80" r="6" fill="#F8A5C2" opacity="0.3" />
      </motion.g>
      
      {/* Front paws - brown */}
      <ellipse cx="85" cy="165" rx="10" ry="8" fill="#A0826D" />
      <ellipse cx="115" cy="165" rx="10" ry="8" fill="#A0826D" />
      <ellipse cx="85" cy="167" rx="7" ry="5" fill="#EDD5C8" />
      <ellipse cx="115" cy="167" rx="7" ry="5" fill="#EDD5C8" />
      
      {/* Toe beans for extra cuteness */}
      <circle cx="82" cy="168" r="1.5" fill="#F8A5C2" />
      <circle cx="88" cy="168" r="1.5" fill="#F8A5C2" />
      <circle cx="112" cy="168" r="1.5" fill="#F8A5C2" />
      <circle cx="118" cy="168" r="1.5" fill="#F8A5C2" />
      
      {/* Purring heart */}
      {purr && (
        <motion.text
          x="95" y="100" fontSize="16"
          animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >💕</motion.text>
      )}
      
      {/* Celebration sparkles */}
      {playful && (
        <>
          <motion.text
            x="140" y="50" fontSize="20"
            animate={{ y: [50, 35, 50], opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >✨</motion.text>
          <motion.text
            x="45" y="50" fontSize="20"
            animate={{ y: [50, 35, 50], opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1 }}
          >✨</motion.text>
        </>
      )}
    </motion.svg>
  );
};

const RobotCompanion = ({ size, mood }) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const [antennaGlow, setAntennaGlow] = useState(0);

  useEffect(() => {
    // Random blinking
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 100);
    }, 4000 + Math.random() * 2000);

    // Antenna pulse
    const glowInterval = setInterval(() => {
      setAntennaGlow(prev => (prev + 1) % 2);
    }, 1000);

    return () => {
      clearInterval(blinkInterval);
      clearInterval(glowInterval);
    };
  }, []);

  const processing = mood === "working";
  const excited = mood === "celebrating";

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Body */}
      <rect x="60" y="110" width="80" height="70" rx="8" fill="#6B7280" />
      <rect x="65" y="115" width="70" height="60" rx="5" fill="#9CA3AF" />
      
      {/* Chest panel */}
      <rect x="85" y="130" width="30" height="35" rx="3" fill="#4B5563" />
      <circle cx="100" cy="147" r="8" fill={processing ? "#3B82F6" : "#10B981"} opacity={processing ? 0.8 : 0.6} />
      <motion.circle
        cx="100" cy="147" r="8"
        fill={processing ? "#3B82F6" : "#10B981"}
        animate={{ opacity: processing ? [0.3, 1, 0.3] : 0.6 }}
        transition={{ duration: 1, repeat: Infinity }}
      />
      
      {/* Head */}
      <motion.g
        animate={excited ? { rotate: [0, -8, 8, 0] } : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{ transformOrigin: '100px 70px' }}
      >
        <rect x="70" y="45" width="60" height="60" rx="10" fill="#6B7280" />
        <rect x="75" y="50" width="50" height="50" rx="8" fill="#9CA3AF" />
        
        {/* Antenna */}
        <rect x="97" y="35" width="6" height="15" rx="3" fill="#4B5563" />
        <motion.circle
          cx="100" cy="30" r="5"
          fill="#EF4444"
          animate={{ opacity: antennaGlow === 0 ? [0.5, 1, 0.5] : 0.5 }}
          transition={{ duration: 1 }}
        />
        
        {/* Eyes - screen-like */}
        {!isBlinking ? (
          <>
            <rect x="80" y="65" width="15" height="12" rx="2" fill="#3B82F6" />
            <rect x="105" y="65" width="15" height="12" rx="2" fill="#3B82F6" />
            {processing && (
              <>
                <motion.rect
                  x="80" y="65" width="15" height="12" rx="2"
                  fill="#60A5FA"
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                />
                <motion.rect
                  x="105" y="65" width="15" height="12" rx="2"
                  fill="#60A5FA"
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: 0.25 }}
                />
              </>
            )}
            <circle cx="85" cy="69" r="2" fill="#DBEAFE" />
            <circle cx="110" cy="69" r="2" fill="#DBEAFE" />
          </>
        ) : (
          <>
            <line x1="80" y1="71" x2="95" y2="71" stroke="#3B82F6" strokeWidth="2" />
            <line x1="105" y1="71" x2="120" y2="71" stroke="#3B82F6" strokeWidth="2" />
          </>
        )}
        
        {/* Mouth - LED display style */}
        <rect x="82" y="85" width="36" height="8" rx="2" fill="#4B5563" />
        {excited ? (
          <path d="M 85 89 L 90 87 L 95 89 L 100 87 L 105 89 L 110 87 L 115 89" 
            stroke="#10B981" strokeWidth="2" fill="none" strokeLinecap="round" />
        ) : (
          <line x1="85" y1="89" x2="115" y2="89" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
        )}
      </motion.g>
      
      {/* Arms */}
      <motion.rect
        x="45" y="120" width="15" height="40" rx="7" fill="#6B7280"
        animate={excited ? { rotate: [-15, 15, -15] } : {}}
        transition={{ duration: 1, repeat: Infinity }}
        style={{ transformOrigin: '52px 120px' }}
      />
      <motion.rect
        x="140" y="120" width="15" height="40" rx="7" fill="#6B7280"
        animate={excited ? { rotate: [15, -15, 15] } : {}}
        transition={{ duration: 1, repeat: Infinity }}
        style={{ transformOrigin: '147px 120px' }}
      />
      
      {/* Hands */}
      <circle cx="52" cy="160" r="8" fill="#9CA3AF" />
      <circle cx="147" cy="160" r="8" fill="#9CA3AF" />
      
      {/* Legs */}
      <rect x="75" y="180" width="18" height="15" rx="4" fill="#6B7280" />
      <rect x="107" y="180" width="18" height="15" rx="4" fill="#6B7280" />
      
      {/* Celebration sparkles */}
      {excited && (
        <>
          <motion.text
            x="140" y="50" fontSize="20"
            animate={{ y: [50, 35, 50], opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >⚡</motion.text>
          <motion.text
            x="45" y="50" fontSize="20"
            animate={{ y: [50, 35, 50], opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1 }}
          >⚡</motion.text>
        </>
      )}
    </motion.svg>
  );
};

const OrbCompanion = ({ size, mood }) => {
  const moodColors = {
    supportive: "from-purple-500 via-teal-500 to-blue-500",
    celebrating: "from-yellow-400 via-pink-500 to-purple-500",
    working: "from-teal-500 via-blue-500 to-purple-500",
    calm: "from-blue-400 via-purple-400 to-teal-400"
  };

  const currentColor = moodColors[mood] || moodColors.supportive;

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      animate={{ y: [0, -8, 0], scale: [1, 1.05, 1] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Glow effect */}
      <motion.ellipse
        cx="100" cy="100" rx="50" ry="50"
        fill="url(#glowGradient)"
        opacity="0.5"
        animate={{ opacity: [0.4, 0.6, 0.4], scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ filter: 'blur(20px)' }}
      />
      
      {/* Main orb */}
      <circle cx="100" cy="100" r="50" fill="url(#orbGradient)" />
      
      {/* Inner glow layers */}
      <ellipse cx="100" cy="100" rx="40" ry="40" fill="url(#innerGlow1)" opacity="0.4" />
      <ellipse cx="100" cy="100" rx="35" ry="35" fill="url(#innerGlow2)" opacity="0.3" />
      
      {/* Face */}
      <g transform="translate(100, 100)">
        {/* Eyes */}
        <motion.circle
          cx="-10" cy="-5" r="4" fill="white"
          animate={{ scaleY: mood === "celebrating" ? [1, 0.3, 1] : 1 }}
          transition={{ duration: 0.3, repeat: mood === "celebrating" ? Infinity : 0, repeatDelay: 2 }}
        />
        <motion.circle
          cx="10" cy="-5" r="4" fill="white"
          animate={{ scaleY: mood === "celebrating" ? [1, 0.3, 1] : 1 }}
          transition={{ duration: 0.3, repeat: mood === "celebrating" ? Infinity : 0, repeatDelay: 2 }}
        />
        {/* Smile */}
        <path d="M -12 5 Q 0 12 12 5" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>
      
      {/* Sparkle effects */}
      <motion.circle
        cx="130" cy="75" r="3" fill="white"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <motion.circle
        cx="140" cy="90" r="2" fill="white"
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
      />
      
      {/* Floating particles */}
      <motion.circle
        cx="85" cy="80" r="4" fill="#A78BFA" opacity="0.7"
        animate={{ y: [-5, 5, -5], x: [-2, 2, -2] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <motion.circle
        cx="115" cy="125" r="3" fill="#5EEAD4" opacity="0.7"
        animate={{ y: [3, -3, 3], x: [2, -2, 2] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
      />
      <motion.circle
        cx="125" cy="100" r="3" fill="#60A5FA" opacity="0.7"
        animate={{ y: [2, -4, 2] }}
        transition={{ duration: 2, repeat: Infinity, delay: 1 }}
      />

      {/* Celebration sparkles */}
      {mood === "celebrating" && (
        <>
          <motion.text
            x="135" y="60" fontSize="20"
            animate={{ y: [60, 45, 60], rotate: [0, 180, 360], opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >✨</motion.text>
          <motion.text
            x="50" y="60" fontSize="20"
            animate={{ y: [60, 45, 60], rotate: [360, 180, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1 }}
          >✨</motion.text>
        </>
      )}
      
      <defs>
        <radialGradient id="glowGradient">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="50%" stopColor="#5EEAD4" />
          <stop offset="100%" stopColor="#60A5FA" />
        </radialGradient>
        <radialGradient id="orbGradient">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="50%" stopColor="#5EEAD4" />
          <stop offset="100%" stopColor="#60A5FA" />
        </radialGradient>
        <radialGradient id="innerGlow1">
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <radialGradient id="innerGlow2">
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
    </motion.svg>
  );
};

export default function AnimatedCompanion({ type, size = 120, mood = "supportive" }) {
  if (type === "dog") {
    return <DogCompanion size={size} mood={mood} />;
  }
  
  if (type === "cat") {
    return <CatCompanion size={size} mood={mood} />;
  }
  
  if (type === "robot") {
    return <RobotCompanion size={size} mood={mood} />;
  }
  
  if (type === "orb") {
    return <OrbCompanion size={size} mood={mood} />;
  }
  
  return null;
}