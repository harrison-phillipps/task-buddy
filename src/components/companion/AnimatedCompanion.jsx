import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const DogCompanion = ({ size, mood }) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const [tailWag, setTailWag] = useState(0);

  useEffect(() => {
    // Random blinking
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    }, 3000 + Math.random() * 2000);

    // Tail wagging based on mood
    const wagInterval = setInterval(() => {
      setTailWag(Math.random() > 0.5 ? 1 : -1);
      setTimeout(() => setTailWag(0), 300);
    }, mood === "celebrating" ? 500 : 2000);

    return () => {
      clearInterval(blinkInterval);
      clearInterval(wagInterval);
    };
  }, [mood]);

  const headBob = mood === "celebrating" ? { y: [0, -10, 0] } : { y: [0, -3, 0] };
  const tongueOut = mood === "celebrating" || mood === "working";

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      animate={headBob}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Body */}
      <ellipse cx="100" cy="130" rx="50" ry="45" fill="#F59E0B" />
      
      {/* Tail */}
      <motion.path
        d="M 145 120 Q 165 110 170 95"
        stroke="#F59E0B"
        strokeWidth="12"
        fill="none"
        strokeLinecap="round"
        animate={{ rotate: tailWag * 15 }}
        transition={{ duration: 0.3 }}
        style={{ transformOrigin: '145px 120px' }}
      />
      
      {/* Head */}
      <motion.g
        animate={mood === "celebrating" ? { rotate: [0, -5, 5, 0] } : {}}
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
      
      {/* Legs */}
      <rect x="75" y="160" width="12" height="30" rx="6" fill="#F59E0B" />
      <rect x="113" y="160" width="12" height="30" rx="6" fill="#F59E0B" />
      
      {/* Paws */}
      <ellipse cx="81" cy="185" rx="8" ry="6" fill="#FCD34D" />
      <ellipse cx="119" cy="185" rx="8" ry="6" fill="#FCD34D" />
      
      {/* Celebration sparkles */}
      {mood === "celebrating" && (
        <>
          <motion.text
            x="140" y="50" fontSize="24"
            animate={{ y: [50, 30, 50], opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >✨</motion.text>
          <motion.text
            x="50" y="50" fontSize="24"
            animate={{ y: [50, 30, 50], opacity: [0, 1, 0] }}
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
      {/* Body */}
      <ellipse cx="100" cy="120" rx="45" ry="50" fill="#F97316" />
      
      {/* Tail */}
      <motion.path
        d="M 140 110 Q 160 100 165 80 Q 168 60 160 50"
        stroke="#F97316"
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
      
      {/* Front paws */}
      <ellipse cx="85" cy="165" rx="10" ry="8" fill="#F97316" />
      <ellipse cx="115" cy="165" rx="10" ry="8" fill="#F97316" />
      <ellipse cx="85" cy="167" rx="7" ry="5" fill="#FED7AA" />
      <ellipse cx="115" cy="167" rx="7" ry="5" fill="#FED7AA" />
      
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
  
  return null;
}