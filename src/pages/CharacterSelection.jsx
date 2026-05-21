import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Check } from "lucide-react";

// ── Companion visual components ──────────────────────────────────────────────

function RobotCompanion({ selected }) {
  return (
    <motion.div
      className="relative flex items-end justify-center"
      style={{ height: 180, paddingTop: 24 }}
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Glow */}
      <motion.div
        className="absolute bottom-0 w-24 h-6 bg-blue-400/30 rounded-full blur-md"
        animate={{ scaleX: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      <div className="relative">
        {/* Antenna */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <motion.div
            className="w-3 h-3 bg-red-500 rounded-full shadow-lg shadow-red-400/60"
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          <div className="w-1 h-5 bg-slate-400" />
        </div>

        {/* Head */}
        <div className="w-20 h-20 bg-gradient-to-br from-slate-300 via-slate-200 to-slate-400 rounded-2xl shadow-xl border-2 border-white/80 relative overflow-hidden mx-auto">
          {/* Sheen */}
          <div className="absolute top-1 left-1 w-6 h-3 bg-white/40 rounded-full rotate-12" />
          {/* Face screen */}
          <div className="absolute inset-3 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
            {/* Eyes */}
            <div className="flex gap-3 relative z-10">
              <motion.div
                className="w-3 h-3 bg-white rounded-full shadow-md"
                animate={{ scaleY: [1, 0.1, 1] }}
                transition={{ duration: 4, repeat: Infinity, times: [0, 0.5, 1] }}
              />
              <motion.div
                className="w-3 h-3 bg-white rounded-full shadow-md"
                animate={{ scaleY: [1, 0.1, 1] }}
                transition={{ duration: 4, repeat: Infinity, times: [0, 0.5, 1], delay: 0.05 }}
              />
            </div>
            {/* Smile */}
            <div className="absolute bottom-2 w-8 h-2 border-b-2 border-white/80 rounded-b-full" />
          </div>
          {/* Side panels */}
          <div className="absolute top-6 -left-1.5 w-2 h-5 bg-slate-400 rounded-l-full border border-white/50" />
          <div className="absolute top-6 -right-1.5 w-2 h-5 bg-slate-400 rounded-r-full border border-white/50" />
        </div>

        {/* Body */}
        <div className="w-24 h-24 bg-gradient-to-br from-slate-400 via-slate-300 to-slate-500 rounded-2xl shadow-xl border-2 border-white/60 relative mx-auto -mt-1 overflow-hidden">
          <div className="absolute top-1 left-2 w-8 h-2 bg-white/20 rounded-full" />
          {/* Chest panel */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-14 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg border border-slate-600/50 flex items-center justify-center">
            <motion.div
              className="w-8 h-8 bg-cyan-300/60 rounded"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
          {/* Buttons */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            <div className="w-2 h-2 bg-green-400 rounded-full shadow shadow-green-400/60" />
            <div className="w-2 h-2 bg-yellow-400 rounded-full shadow shadow-yellow-400/60" />
            <div className="w-2 h-2 bg-red-400 rounded-full shadow shadow-red-400/60" />
          </div>
          {/* Arms */}
          <motion.div
            className="absolute top-2 -left-3 w-3 h-14 bg-gradient-to-b from-slate-300 to-slate-500 rounded-full border border-white/40"
            animate={{ rotate: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ originY: 0 }}
          />
          <motion.div
            className="absolute top-2 -right-3 w-3 h-14 bg-gradient-to-b from-slate-300 to-slate-500 rounded-full border border-white/40"
            animate={{ rotate: [0, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            style={{ originY: 0 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function CatCompanion({ selected }) {
  return (
    <motion.div
      className="relative flex items-end justify-center"
      style={{ height: 180, paddingTop: 24 }}
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Shadow */}
      <motion.div
        className="absolute bottom-0 w-20 h-4 bg-yellow-400/30 rounded-full blur-md"
        animate={{ scaleX: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      />

      <div className="relative">
        {/* Head */}
        <div className="relative w-24 h-24 mx-auto">
          {/* Ears */}
          <div className="absolute -top-4 left-3 w-8 h-10 bg-gradient-to-br from-yellow-300 to-amber-400 rounded-t-full border-2 border-white/60 overflow-hidden">
            <div className="absolute inset-1.5 bottom-0 bg-pink-300 rounded-t-full opacity-70" />
          </div>
          <div className="absolute -top-4 right-3 w-8 h-10 bg-gradient-to-br from-yellow-300 to-amber-400 rounded-t-full border-2 border-white/60 overflow-hidden">
            <div className="absolute inset-1.5 bottom-0 bg-pink-300 rounded-t-full opacity-70" />
          </div>

          {/* Head circle */}
          <div className="w-24 h-24 bg-gradient-to-br from-yellow-200 via-yellow-300 to-amber-400 rounded-full border-2 border-white/80 shadow-xl relative overflow-hidden">
            <div className="absolute top-1 left-3 w-8 h-3 bg-white/30 rounded-full rotate-12" />
            {/* Eyes */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-3">
              <motion.div
                className="w-4 h-4 bg-emerald-500 rounded-full border-2 border-gray-800 shadow relative"
                animate={{ scaleY: [1, 0.05, 1] }}
                transition={{ duration: 3.5, repeat: Infinity, times: [0, 0.5, 1] }}
              >
                <div className="w-2 h-2 bg-gray-900 rounded-full absolute top-0.5 left-0.5" />
                <div className="w-1 h-1 bg-white rounded-full absolute top-0.5 right-0.5" />
              </motion.div>
              <motion.div
                className="w-4 h-4 bg-emerald-500 rounded-full border-2 border-gray-800 shadow relative"
                animate={{ scaleY: [1, 0.05, 1] }}
                transition={{ duration: 3.5, repeat: Infinity, times: [0, 0.5, 1], delay: 0.05 }}
              >
                <div className="w-2 h-2 bg-gray-900 rounded-full absolute top-0.5 left-0.5" />
                <div className="w-1 h-1 bg-white rounded-full absolute top-0.5 right-0.5" />
              </motion.div>
            </div>
            {/* Nose */}
            <div className="absolute top-14 left-1/2 -translate-x-1/2 w-2.5 h-2 bg-pink-400 rounded-sm rotate-45" />
            {/* Mouth */}
            <div className="absolute top-[3.8rem] left-1/2 -translate-x-1/2 flex gap-2">
              <div className="w-3 h-2 border-b-2 border-gray-600 rounded-b-full" />
              <div className="w-3 h-2 border-b-2 border-gray-600 rounded-b-full" />
            </div>
            {/* Whiskers */}
            <div className="absolute top-12 left-1 w-7 h-px bg-gray-500 opacity-60" />
            <div className="absolute top-[3.2rem] left-1 w-7 h-px bg-gray-500 opacity-60" />
            <div className="absolute top-12 right-1 w-7 h-px bg-gray-500 opacity-60" />
            <div className="absolute top-[3.2rem] right-1 w-7 h-px bg-gray-500 opacity-60" />
          </div>
        </div>

        {/* Body */}
        <div className="w-20 h-20 bg-gradient-to-br from-yellow-200 to-amber-400 rounded-t-3xl rounded-b-2xl border-2 border-white/60 shadow-lg mx-auto -mt-2 relative">
          {/* Stripes */}
          <div className="absolute top-4 left-3 w-5 h-1 bg-amber-600/40 rounded" />
          <div className="absolute top-7 left-5 w-7 h-1 bg-amber-600/40 rounded" />
          <div className="absolute top-4 right-3 w-5 h-1 bg-amber-600/40 rounded" />
          <div className="absolute top-7 right-5 w-7 h-1 bg-amber-600/40 rounded" />
          {/* Belly */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-10 h-8 bg-yellow-100/60 rounded-full" />
          {/* Tail */}
          <motion.div
            className="absolute bottom-2 -right-8 w-14 h-5 bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full border border-white/40 -z-10"
            animate={{ rotate: [10, 30, 10] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ originX: 0, originY: 0.5 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function DogCompanion({ selected }) {
  return (
    <motion.div
      className="relative flex items-end justify-center"
      style={{ height: 180, paddingTop: 20 }}
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Shadow */}
      <motion.div
        className="absolute bottom-0 w-20 h-4 bg-amber-400/30 rounded-full blur-md"
        animate={{ scaleX: [1, 1.2, 1], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      />

      <div className="relative">
        {/* Head */}
        <div className="relative w-24 h-24 mx-auto">
          {/* Floppy ears */}
          <motion.div
            className="absolute top-3 -left-4 w-10 h-16 bg-gradient-to-b from-amber-500 to-amber-600 rounded-b-full border-2 border-white/60 shadow"
            animate={{ rotate: [-5, 5, -5] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            style={{ originY: 0 }}
          />
          <motion.div
            className="absolute top-3 -right-4 w-10 h-16 bg-gradient-to-b from-amber-500 to-amber-600 rounded-b-full border-2 border-white/60 shadow"
            animate={{ rotate: [5, -5, 5] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
            style={{ originY: 0 }}
          />

          <div className="w-24 h-24 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 rounded-full border-2 border-white/80 shadow-xl relative overflow-hidden">
            <div className="absolute top-1 left-3 w-8 h-3 bg-white/30 rounded-full rotate-12" />
            {/* Eyes */}
            <div className="absolute top-7 left-1/2 -translate-x-1/2 flex gap-4">
              <motion.div
                className="w-4 h-4 bg-gray-800 rounded-full"
                animate={{ scaleY: [1, 0.1, 1] }}
                transition={{ duration: 3, repeat: Infinity, times: [0, 0.5, 1] }}
              >
                <div className="w-1.5 h-1.5 bg-white rounded-full absolute top-0.5 right-0.5" />
              </motion.div>
              <motion.div
                className="w-4 h-4 bg-gray-800 rounded-full"
                animate={{ scaleY: [1, 0.1, 1] }}
                transition={{ duration: 3, repeat: Infinity, times: [0, 0.5, 1], delay: 0.05 }}
              >
                <div className="w-1.5 h-1.5 bg-white rounded-full absolute top-0.5 right-0.5" />
              </motion.div>
            </div>
            {/* Snout */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-14 h-9 bg-amber-200/70 rounded-full" />
            {/* Nose */}
            <div className="absolute bottom-9 left-1/2 -translate-x-1/2 w-4 h-3 bg-gray-800 rounded-full" />
            {/* Tongue */}
            <motion.div
              className="absolute bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 bg-pink-400 rounded-b-full border-t-2 border-pink-500"
              animate={{ y: [0, 2, 0] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="w-20 h-20 bg-gradient-to-br from-amber-300 to-amber-500 rounded-t-3xl rounded-b-2xl border-2 border-white/60 shadow-lg mx-auto -mt-2 relative">
          <div className="absolute top-4 left-4 w-5 h-5 bg-amber-700/30 rounded-full" />
          <div className="absolute top-8 right-5 w-4 h-4 bg-amber-700/30 rounded-full" />
          {/* Tail */}
          <motion.div
            className="absolute top-2 -right-6 w-5 h-16 bg-gradient-to-b from-amber-400 to-amber-500 rounded-full border border-white/40 shadow -z-10"
            animate={{ rotate: [20, 50, 20] }}
            transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ originY: 0 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function OrbCompanion({ selected }) {
  return (
    <motion.div
      className="relative flex items-center justify-center"
      style={{ height: 180 }}
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Outer glow */}
      <motion.div
        className="absolute w-36 h-36 rounded-full bg-gradient-to-br from-purple-400 via-teal-400 to-blue-400 blur-2xl"
        animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.9, 1.1, 0.9] }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      {/* Orbiting particles */}
      {[0, 120, 240].map((deg, i) => (
        <motion.div
          key={i}
          className="absolute w-3 h-3 rounded-full"
          style={{ background: ["#a78bfa", "#2dd4bf", "#60a5fa"][i] }}
          animate={{ rotate: [deg, deg + 360] }}
          transition={{ duration: 6 + i, repeat: Infinity, ease: "linear" }}
          initial={{ x: 55, y: 0, rotate: deg }}
        />
      ))}

      {/* Main orb */}
      <div className="relative w-32 h-32 bg-gradient-to-br from-violet-500 via-purple-500 to-teal-400 rounded-full shadow-2xl border-2 border-white/40 flex items-center justify-center overflow-hidden">
        {/* Inner shimmer layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent rounded-full" />
        <motion.div
          className="absolute inset-4 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-sm"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />

        {/* Face */}
        <div className="relative z-10 flex flex-col items-center gap-2">
          <div className="flex gap-4">
            <motion.div
              className="w-3.5 h-3.5 bg-white rounded-full shadow-lg shadow-white/50"
              animate={{ scaleY: [1, 0.1, 1] }}
              transition={{ duration: 5, repeat: Infinity, times: [0, 0.5, 1] }}
            />
            <motion.div
              className="w-3.5 h-3.5 bg-white rounded-full shadow-lg shadow-white/50"
              animate={{ scaleY: [1, 0.1, 1] }}
              transition={{ duration: 5, repeat: Infinity, times: [0, 0.5, 1], delay: 0.05 }}
            />
          </div>
          <div className="w-9 h-2.5 border-b-2 border-white/90 rounded-b-full" />
        </div>

        {/* Sparkles */}
        {[
          { top: "15%", left: "70%", size: "w-2 h-2", delay: 0 },
          { top: "60%", left: "15%", size: "w-1.5 h-1.5", delay: 0.7 },
          { top: "25%", left: "20%", size: "w-1 h-1", delay: 1.4 },
        ].map((s, i) => (
          <motion.div
            key={i}
            className={`absolute ${s.size} bg-white rounded-full`}
            style={{ top: s.top, left: s.left }}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: s.delay }}
          />
        ))}
      </div>

      {/* Ground shadow */}
      <motion.div
        className="absolute bottom-2 w-16 h-3 bg-purple-400/30 rounded-full blur-sm"
        animate={{ scaleX: [1, 0.8, 1], opacity: [0.4, 0.2, 0.4] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
    </motion.div>
  );
}

// ── Companion data ────────────────────────────────────────────────────────────

const companions = [
  {
    id: "robot",
    name: "Friendly Robot",
    tagline: "Precise, reliable, and always ready",
    color: "blue",
    ring: "ring-blue-500",
    checkBg: "bg-blue-500",
    cardBg: "from-blue-50 to-slate-50",
    Component: RobotCompanion,
  },
  {
    id: "cat",
    name: "Cozy Cat",
    tagline: "Calm, gentle, and full of warmth",
    color: "yellow",
    ring: "ring-yellow-400",
    checkBg: "bg-yellow-400",
    cardBg: "from-yellow-50 to-amber-50",
    Component: CatCompanion,
  },
  {
    id: "dog",
    name: "Playful Dog",
    tagline: "Energetic, loyal, and endlessly cheerful",
    color: "amber",
    ring: "ring-amber-500",
    checkBg: "bg-amber-500",
    cardBg: "from-amber-50 to-orange-50",
    Component: DogCompanion,
  },
  {
    id: "orb",
    name: "Magic Orb",
    tagline: "Mystical, wise, and otherworldly",
    color: "purple",
    ring: "ring-purple-500",
    checkBg: "bg-purple-500",
    cardBg: "from-purple-50 to-teal-50",
    Component: OrbCompanion,
  },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CharacterSelection() {
  const navigate = useNavigate();
  const [selectedCompanion, setSelectedCompanion] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const user = await base44.auth.me();
        if (!user.display_name) navigate(createPageUrl("Onboarding"));
        else setSelectedCompanion(user.companion_type || null);
      } catch {}
    };
    checkUser();
  }, [navigate]);

  const updateUserMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => navigate(createPageUrl("Dashboard")),
  });

  const handleSelection = () => {
    if (!selectedCompanion) return;
    updateUserMutation.mutate({ companion_type: selectedCompanion });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-violet-100 via-purple-50 to-teal-100 dark:from-[#1a1025] dark:via-[#12101f] dark:to-[#0f1a1f]">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-5xl w-full space-y-10"
      >
        {/* Header */}
        <div className="text-center space-y-3">
          <motion.h1
            className="text-3xl sm:text-5xl font-bold text-gray-900 dark:text-gray-100"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Choose your companion
          </motion.h1>
          <motion.p
            className="text-base sm:text-lg text-gray-500 dark:text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Your buddy stays with you while you work. Change anytime.
          </motion.p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {companions.map((c, idx) => {
            const isSelected = selectedCompanion === c.id;
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + idx * 0.08 }}
                whileHover={{ scale: 1.03, y: -4 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedCompanion(c.id)}
                className={`
                  relative cursor-pointer rounded-3xl border-2 transition-all duration-300 overflow-hidden
                  bg-gradient-to-b ${c.cardBg}
                  dark:bg-gray-800/60 dark:from-gray-800/60 dark:to-gray-900/60
                  ${isSelected ? `${c.ring} ring-4 shadow-2xl` : "border-white/60 dark:border-gray-700 hover:shadow-xl"}
                `}
              >
                {/* Selected check */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className={`absolute top-3 right-3 w-8 h-8 ${c.checkBg} rounded-full flex items-center justify-center shadow-lg z-10`}
                    >
                      <Check className="w-4 h-4 text-white stroke-[3]" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="p-4 sm:p-6 flex flex-col items-center text-center gap-3">
                  {/* Companion visual */}
                  <div className="w-full flex items-center justify-center overflow-visible" style={{ height: 180 }}>
                    <c.Component selected={isSelected} />
                  </div>

                  {/* Name & tagline */}
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">{c.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">{c.tagline}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              onClick={handleSelection}
              disabled={!selectedCompanion || updateUserMutation.isPending}
              className="px-12 py-6 text-lg font-semibold rounded-full bg-gradient-to-r from-purple-500 via-violet-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white shadow-2xl shadow-purple-400/30 transition-all duration-300"
            >
              {updateUserMutation.isPending ? "Saving..." : "Let's go! ✨"}
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}