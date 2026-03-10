import React from "react";
import { Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ThemeToggle() {
  const [isDark, setIsDark] = React.useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("theme");
    if (stored === "dark") return true;
    if (stored === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  React.useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(d => !d)}
      aria-label="Toggle theme"
      className="relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
      style={{ background: isDark ? "#4C1D95" : "#E9D5FF" }}
    >
      {/* Track icons */}
      <Sun className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-yellow-400 opacity-70" />
      <Moon className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-purple-200 opacity-70" />

      {/* Thumb */}
      <motion.span
        layout
        animate={{ x: isDark ? 28 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-1 w-5 h-5 rounded-full shadow-md flex items-center justify-center"
        style={{ background: isDark ? "#7C3AED" : "#FBBF24" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.span key="moon" initial={{ rotate: -30, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 30, opacity: 0 }} transition={{ duration: 0.15 }}>
              <Moon className="w-3 h-3 text-white" />
            </motion.span>
          ) : (
            <motion.span key="sun" initial={{ rotate: 30, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -30, opacity: 0 }} transition={{ duration: 0.15 }}>
              <Sun className="w-3 h-3 text-white" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.span>
    </button>
  );
}