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
        {/* Rounder cat face */}
        <circle cx="100" cy="72" r="42" fill="#F97316" />
        
        {/* Distinctive pointy cat ears - larger and more prominent */}
        <motion.path
          d="M 65 45 L 55 15 L 75 50 Z"
          fill="#F97316"
          animate={playful ? { rotate: [-3, 3, -3] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ transformOrigin: '65px 45px' }}
        />
        <motion.path
          d="M 135 45 L 145 15 L 125 50 Z"
          fill="#F97316"
          animate={playful ? { rotate: [3, -3, 3] } : {}}
          transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
          style={{ transformOrigin: '135px 45px' }}
        />
        
        {/* Pink inner ears - distinctive cat feature */}
        <path d="M 65 45 L 60 25 L 72 47 Z" fill="#FB7185" />
        <path d="M 135 45 L 140 25 L 128 47 Z" fill="#FB7185" />
        
        {/* White/cream facial markings - common in orange cats */}
        <ellipse cx="100" cy="78" rx="25" ry="18" fill="#FED7AA" />
        
        {/* Distinctive cat eyes - almond shaped with slit pupils */}
        {!isBlinking ? (
          <>
            {/* Outer eye color - bright green */}
            <ellipse cx="82" cy="68" rx="10" ry="13" fill="#10B981" />
            <ellipse cx="118" cy="68" rx="10" ry="13" fill="#10B981" />
            {/* Slit pupils - characteristic cat feature */}
            <ellipse cx="82" cy="68" rx="2" ry="10" fill="#1F2937" />
            <ellipse cx="118" cy="68" rx="2" ry="10" fill="#1F2937" />
            {/* Highlights */}
            <circle cx="83" cy="64" r="2" fill="white" />
            <circle cx="119" cy="64" r="2" fill="white" />
          </>
        ) : (
          <>
            <path d="M 75 68 Q 82 70 89 68" stroke="#1F2937" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M 111 68 Q 118 70 125 68" stroke="#1F2937" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        )}
        
        {/* Small pink nose - triangular cat nose */}
        <path d="M 100 80 L 96 84 L 100 85 L 104 84 Z" fill="#FB7185" />
        
        {/* Prominent whiskers - key cat feature */}
        <line x1="55" y1="76" x2="30" y2="73" stroke="#1F2937" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="55" y1="80" x2="30" y2="82" stroke="#1F2937" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="55" y1="84" x2="30" y2="88" stroke="#1F2937" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="145" y1="76" x2="170" y2="73" stroke="#1F2937" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="145" y1="80" x2="170" y2="82" stroke="#1F2937" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="145" y1="84" x2="170" y2="88" stroke="#1F2937" strokeWidth="1.5" strokeLinecap="round" />
        
        {/* Mouth - small cat smile */}
        <line x1="100" y1="85" x2="100" y2="88" stroke="#1F2937" strokeWidth="1.5" />
        <path
          d="M 92 88 Q 100 91 108 88"
          stroke="#1F2937"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
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