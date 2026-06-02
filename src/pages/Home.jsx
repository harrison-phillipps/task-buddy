import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

export default function Home() {
  const [task, setTask] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = task.trim();
    if (!trimmed) return;
    navigate(`/GuestSession?task=${encodeURIComponent(trimmed)}`);
  };

  const examples = ["clean the kitchen", "finish that report", "go for a walk", "reply to emails"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-teal-50 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-3 mb-12"
      >
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ff06728f59128717455ed3/947e987fc_Screenshot2025-12-08at84335AM.png"
          alt="TaskBuddy"
          className="w-10 h-10 rounded-2xl shadow-md object-cover"
        />
        <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
          TaskBuddy
        </span>
      </motion.div>

      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-center mb-10 max-w-xl"
      >
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
          What's one thing you've been{" "}
          <span className="bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">
            putting off?
          </span>
        </h1>
        <p className="text-gray-500 text-lg">
          No signup. No setup. Just type it and we'll help you start — right now.
        </p>
      </motion.div>

      {/* Input form */}
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="w-full max-w-lg"
      >
        <div className="flex flex-col sm:flex-row gap-3 shadow-xl rounded-2xl overflow-hidden bg-white border border-purple-100 p-2">
          <input
            type="text"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="e.g. clean the kitchen..."
            className="flex-1 px-4 py-3 text-gray-800 text-lg outline-none bg-transparent placeholder-gray-400"
            autoFocus
          />
          <button
            type="submit"
            disabled={!task.trim()}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-teal-500 text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 whitespace-nowrap"
          >
            Let's break it down
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.form>

      {/* Example chips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex flex-wrap gap-2 mt-6 justify-center"
      >
        {examples.map((ex) => (
          <button
            key={ex}
            onClick={() => setTask(ex)}
            className="text-sm px-3 py-1.5 rounded-full border border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors"
          >
            "{ex}"
          </button>
        ))}
      </motion.div>

      {/* Already have account */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-12 text-sm text-gray-400"
      >
        Already have an account?{" "}
        <a
          href="/Dashboard"
          className="text-purple-600 hover:underline font-medium"
        >
          Sign in
        </a>
      </motion.p>

      {/* Social proof */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-8 flex items-center gap-2 text-xs text-gray-400"
      >
        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
        <span>Trusted by thousands of people who just needed a little push</span>
      </motion.div>
    </div>
  );
}