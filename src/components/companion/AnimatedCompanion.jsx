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
        <circle cx="100" cy="75" r="45" fill="#F59E0B" />
        
        {/* Ears */}
        <motion.ellipse
          cx="70" cy="60" rx="15" ry="25" fill="#D97706"
          animate={{ rotate: [-5, 5, -5] }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{ transformOrigin: '70px 60px' }}
        />
        <motion.ellipse
          cx="130" cy="60" rx="15" ry="25" fill="#D97706"
          animate={{ rotate: [5, -5, 5] }}
          transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
          style={{ transformOrigin: '130px 60px' }}
        />
        
        {/* Snout */}
        <ellipse cx="100" cy="85" rx="20" ry="15" fill="#FCD34D" />
        <circle cx="100" cy="90" r="6" fill="#1F2937" />
        
        {/* Eyes */}
        <circle cx="85" cy="70" r="8" fill="#1F2937" />
        <circle cx="115" cy="70" r="8" fill="#1F2937" />
        {!isBlinking && (
          <>
            <circle cx="87" cy="68" r="3" fill="white" />
            <circle cx="117" cy="68" r="3" fill="white" />
          </>
        )}
        {isBlinking && (
          <>
            <line x1="80" y1="70" x2="90" y2="70" stroke="#1F2937" strokeWidth="2" />
            <line x1="110" y1="70" x2="120" y2="70" stroke="#1F2937" strokeWidth="2" />
          </>
        )}
        
        {/* Tongue */}
        {tongueOut && (
          <motion.ellipse
            cx="100" cy="95" rx="8" ry="12" fill="#FB7185"
            animate={{ scaleY: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
        
        {/* Happy mouth */}
        <path
          d="M 90 85 Q 100 90 110 85"
          stroke="#1F2937"
          strokeWidth="2"
          fill="none"
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
        <circle cx="100" cy="70" r="40" fill="#F97316" />
        
        {/* Ears */}
        <motion.path
          d="M 70 45 L 60 20 L 80 40 Z"
          fill="#F97316"
          animate={playful ? { rotate: [-5, 5, -5] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ transformOrigin: '70px 40px' }}
        />
        <motion.path
          d="M 130 45 L 140 20 L 120 40 Z"
          fill="#F97316"
          animate={playful ? { rotate: [5, -5, 5] } : {}}
          transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
          style={{ transformOrigin: '130px 40px' }}
        />
        
        {/* Inner ears */}
        <path d="M 70 45 L 65 28 L 75 42 Z" fill="#FED7AA" />
        <path d="M 130 45 L 135 28 L 125 42 Z" fill="#FED7AA" />
        
        {/* White chest patch */}
        <ellipse cx="100" cy="80" rx="18" ry="12" fill="#FED7AA" />
        
        {/* Eyes */}
        {!isBlinking ? (
          <>
            <ellipse cx="85" cy="65" rx="8" ry="12" fill="#10B981" />
            <ellipse cx="115" cy="65" rx="8" ry="12" fill="#10B981" />
            <ellipse cx="85" cy="65" rx="4" ry="8" fill="#1F2937" />
            <ellipse cx="115" cy="65" rx="4" ry="8" fill="#1F2937" />
            <circle cx="86" cy="62" r="2" fill="white" />
            <circle cx="116" cy="62" r="2" fill="white" />
          </>
        ) : (
          <>
            <path d="M 80 65 Q 85 67 90 65" stroke="#1F2937" strokeWidth="2" fill="none" />
            <path d="M 110 65 Q 115 67 120 65" stroke="#1F2937" strokeWidth="2" fill="none" />
          </>
        )}
        
        {/* Nose */}
        <path d="M 100 75 L 95 78 L 100 80 L 105 78 Z" fill="#FB7185" />
        
        {/* Whiskers */}
        <line x1="60" y1="72" x2="40" y2="70" stroke="#1F2937" strokeWidth="1.5" />
        <line x1="60" y1="75" x2="40" y2="77" stroke="#1F2937" strokeWidth="1.5" />
        <line x1="140" y1="72" x2="160" y2="70" stroke="#1F2937" strokeWidth="1.5" />
        <line x1="140" y1="75" x2="160" y2="77" stroke="#1F2937" strokeWidth="1.5" />
        
        {/* Content smile */}
        <path
          d="M 92 82 Q 100 85 108 82"
          stroke="#1F2937"
          strokeWidth="1.5"
          fill="none"
        />
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

export default function AnimatedCompanion({ type, size = 120, mood = "supportive" }) {
  if (type === "dog") {
    return <DogCompanion size={size} mood={mood} />;
  }
  
  if (type === "cat") {
    return <CatCompanion size={size} mood={mood} />;
  }
  
  return null;
}