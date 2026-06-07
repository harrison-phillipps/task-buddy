import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Brand colours for particles
const COLOURS = [
  "#8B5CF6", "#7C3AED", "#6D28D9", // purple family
  "#14B8A6", "#0D9488", "#0F766E", // teal family
  "#A78BFA", "#5EEAD4", "#C4B5FD", // light purple / light teal
  "#F9A8D4", "#FDE68A",            // accent pops
];

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

function Particle({ style }) {
  return <div className="absolute rounded-full pointer-events-none" style={style} />;
}

function useParticles(count = 60) {
  return Array.from({ length: count }, (_, i) => {
    const size = randomBetween(5, 12);
    const angle = randomBetween(0, 360);
    const distance = randomBetween(80, 280);
    const rad = (angle * Math.PI) / 180;
    const x = Math.cos(rad) * distance;
    const y = Math.sin(rad) * distance;
    const color = COLOURS[i % COLOURS.length];
    const delay = randomBetween(0, 0.3);
    const duration = randomBetween(0.8, 1.4);
    return { size, x, y, color, delay, duration, id: i };
  });
}

export default function SessionCelebration({ visible, onDone }) {
  const particles = useParticles(70);
  const timerRef = useRef(null);

  useEffect(() => {
    if (visible) {
      timerRef.current = setTimeout(() => {
        onDone?.();
      }, 2000);
    }
    return () => clearTimeout(timerRef.current);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="celebration"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onDone}
        >
          {/* Particles */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                animate={{
                  x: p.x,
                  y: p.y,
                  scale: [0, 1, 0.8, 0],
                  opacity: [1, 1, 0.6, 0],
                }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  ease: "easeOut",
                }}
                className="absolute rounded-full"
                style={{
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                }}
              />
            ))}
          </div>

          {/* Central icon */}
          <div className="relative flex flex-col items-center gap-4">
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: [0, 1.3, 1], rotate: [0, 10, 0] }}
              transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
              className="text-8xl select-none"
            >
              🔥
            </motion.div>

            {/* Pulse ring */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0.8 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
              className="absolute w-24 h-24 rounded-full border-4 border-purple-400 pointer-events-none"
            />

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-white text-xl font-bold tracking-wide"
            >
              Session complete!
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}