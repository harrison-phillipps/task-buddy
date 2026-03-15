import React from 'react';
import { motion } from 'framer-motion';

const companionImages = {
  dog: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ff06728f59128717455ed3/54eeab095_generated_image.png',
  cat: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ff06728f59128717455ed3/53f69aa8d_generated_image.png',
};

export default function CompanionImage({ type, size = 120, mood = "supportive" }) {
  const imageUrl = companionImages[type];
  
  if (!imageUrl) {
    return null;
  }

  // Different animations based on mood
  const animations = {
    supportive: {
      y: [0, -8, 0],
      rotate: [0, 2, 0, -2, 0],
    },
    celebrating: {
      y: [0, -15, 0],
      rotate: [0, 5, -5, 0],
      scale: [1, 1.05, 1],
    },
    working: {
      y: [0, -5, 0],
      rotate: [0, 1, 0],
    },
    calm: {
      y: [0, -6, 0],
    }
  };

  const currentAnimation = animations[mood] || animations.supportive;

  return (
    <motion.div
      animate={currentAnimation}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <img 
        src={imageUrl} 
        alt={`${type} companion`}
        className="w-full h-full object-contain drop-shadow-2xl"
        style={{
          filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.2))'
        }}
      />
      
      {/* Celebration sparkles */}
      {mood === "celebrating" && (
        <>
          <motion.div
            animate={{ 
              y: [-10, -25, -10], 
              x: [-5, 5, -5], 
              opacity: [0, 1, 0],
              rotate: [0, 180, 360]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-4 -right-4 text-3xl"
          >
            ✨
          </motion.div>
          <motion.div
            animate={{ 
              y: [-10, -25, -10], 
              x: [5, -5, 5], 
              opacity: [0, 1, 0],
              rotate: [360, 180, 0]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -top-4 -left-4 text-3xl"
          >
            ✨
          </motion.div>
        </>
      )}

      {/* Subtle breathing/living effect */}
      <motion.div
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)`,
        }}
      />
    </motion.div>
  );
}