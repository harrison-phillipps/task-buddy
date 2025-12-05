import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Leaf, Smile, Zap } from "lucide-react";

const personalities = [
  {
    id: "motivational",
    name: "Motivational",
    icon: Sparkles,
    emoji: "🔥",
    color: "from-orange-400 to-red-500",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-300",
    description: "High energy, pump-you-up vibes!",
    sample: "You're CRUSHING it! Let's GO! 💪"
  },
  {
    id: "calm",
    name: "Calm",
    icon: Leaf,
    emoji: "🧘",
    color: "from-teal-400 to-green-500",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-300",
    description: "Gentle, peaceful encouragement",
    sample: "Take a breath. You're doing wonderfully."
  },
  {
    id: "witty",
    name: "Witty",
    icon: Smile,
    emoji: "😄",
    color: "from-purple-400 to-pink-500",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-300",
    description: "Playful humor and fun",
    sample: "Another task? You're on fire! 🎉"
  },
  {
    id: "direct",
    name: "Direct",
    icon: Zap,
    emoji: "⚡",
    color: "from-blue-400 to-indigo-500",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-300",
    description: "Straight to the point",
    sample: "Task ready. Let's get it done."
  }
];

export default function CompanionPersonalitySelector({ selected, onSelect, compact = false }) {
  if (compact) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {personalities.map((p) => {
          const Icon = p.icon;
          const isSelected = selected === p.id;
          
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`p-3 rounded-xl border-2 transition-all text-left ${
                isSelected
                  ? `${p.borderColor} ${p.bgColor} shadow-md`
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{p.emoji}</span>
                <span className="font-medium text-sm">{p.name}</span>
              </div>
              <p className="text-xs text-gray-500">{p.description}</p>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {personalities.map((p, index) => {
        const Icon = p.icon;
        const isSelected = selected === p.id;
        
        return (
          <motion.button
            key={p.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onSelect(p.id)}
            className={`p-5 rounded-2xl border-3 transition-all text-left ${
              isSelected
                ? `border-4 ${p.borderColor} ${p.bgColor} shadow-xl scale-[1.02]`
                : "border-2 border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center shadow-lg`}>
                <Icon className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg text-gray-900">{p.name}</h3>
                  <span className="text-xl">{p.emoji}</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{p.description}</p>
                <div className="p-2 bg-white/80 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500 italic">"{p.sample}"</p>
                </div>
              </div>
            </div>
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
              >
                <span className="text-white text-sm">✓</span>
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

export { personalities };