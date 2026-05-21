import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";

// ── Theme palette definitions ─────────────────────────────────────────────────

const ROBOT_THEMES = [
  { id: "classic",    label: "Classic Steel",   body: ["#94a3b8","#64748b","#475569"],  screen: ["#06b6d4","#0284c7","#0369a1"], accent: "#ef4444" },
  { id: "crimson",    label: "Crimson Unit",    body: ["#fca5a5","#ef4444","#b91c1c"],  screen: ["#fbbf24","#f59e0b","#d97706"], accent: "#7c3aed" },
  { id: "emerald",    label: "Emerald Bot",     body: ["#6ee7b7","#34d399","#059669"],  screen: ["#a78bfa","#7c3aed","#5b21b6"], accent: "#f43f5e" },
  { id: "midnight",   label: "Midnight",        body: ["#475569","#1e293b","#0f172a"],  screen: ["#818cf8","#6366f1","#4338ca"], accent: "#f472b6" },
  { id: "gold",       label: "Golden Guard",    body: ["#fde68a","#fbbf24","#d97706"],  screen: ["#fb923c","#f97316","#ea580c"], accent: "#10b981" },
  { id: "neon",       label: "Neon Cyber",      body: ["#a78bfa","#7c3aed","#5b21b6"],  screen: ["#34d399","#10b981","#059669"], accent: "#f472b6" },
];

const CAT_THEMES = [
  { id: "golden",     label: "Golden Tabby",    fur: ["#fde68a","#fbbf24","#f59e0b"],  inner: "#fbcfe8", nose: "#f472b6" },
  { id: "grey",       label: "Grey Mist",       fur: ["#d1d5db","#9ca3af","#6b7280"],  inner: "#fecdd3", nose: "#f9a8d4" },
  { id: "orange",     label: "Ginger Snap",     fur: ["#fed7aa","#fb923c","#ea580c"],  inner: "#fde68a", nose: "#ec4899" },
  { id: "black",      label: "Midnight Cat",    fur: ["#4b5563","#1f2937","#111827"],  inner: "#fda4af", nose: "#fb7185" },
  { id: "lavender",   label: "Lavender Dream",  fur: ["#e9d5ff","#c084fc","#a855f7"],  inner: "#fce7f3", nose: "#f0abfc" },
  { id: "teal",       label: "Ocean Tabby",     fur: ["#99f6e4","#2dd4bf","#0d9488"],  inner: "#fef9c3", nose: "#f472b6" },
];

const DOG_THEMES = [
  { id: "golden",     label: "Golden Retriever",  fur: ["#fbbf24","#f59e0b","#d97706"],  muzzle: ["#fef3c7","#fde68a"] },
  { id: "chocolate",  label: "Chocolate Lab",     fur: ["#92400e","#78350f","#451a03"],  muzzle: ["#d97706","#b45309"] },
  { id: "husky",      label: "Husky",             fur: ["#e2e8f0","#94a3b8","#475569"],  muzzle: ["#f1f5f9","#e2e8f0"] },
  { id: "dalmatian",  label: "Dalmatian",         fur: ["#f8fafc","#f1f5f9","#e2e8f0"],  muzzle: ["#ffffff","#f8fafc"] },
  { id: "corgi",      label: "Corgi",             fur: ["#fde68a","#fbbf24","#ef4444"],  muzzle: ["#fef3c7","#fff7ed"] },
  { id: "aussie",     label: "Blue Merle",        fur: ["#a5b4fc","#818cf8","#4f46e5"],  muzzle: ["#e0e7ff","#c7d2fe"] },
];

const ORB_THEMES = [
  { id: "cosmic",     label: "Cosmic",    gradient: "from-violet-500 via-purple-500 to-teal-400",   glow: "rgba(139,92,246,0.5)" },
  { id: "solar",      label: "Solar",     gradient: "from-yellow-400 via-orange-500 to-red-500",    glow: "rgba(249,115,22,0.5)" },
  { id: "ocean",      label: "Ocean",     gradient: "from-cyan-400 via-blue-500 to-indigo-600",     glow: "rgba(59,130,246,0.5)" },
  { id: "forest",     label: "Forest",    gradient: "from-emerald-400 via-green-500 to-teal-600",   glow: "rgba(16,185,129,0.5)" },
  { id: "rose",       label: "Rose Gold", gradient: "from-rose-400 via-pink-500 to-purple-500",     glow: "rgba(244,114,182,0.5)" },
  { id: "aurora",     label: "Aurora",    gradient: "from-green-400 via-teal-400 to-purple-600",    glow: "rgba(45,212,191,0.5)" },
];

const AURA_OPTIONS = [
  { id: "none",     label: "None",          class: "" },
  { id: "soft",     label: "Soft Glow",     class: "shadow-[0_0_20px_rgba(139,92,246,0.4)]" },
  { id: "teal",     label: "Teal Haze",     class: "shadow-[0_0_20px_rgba(20,184,166,0.5)]" },
  { id: "gold",     label: "Golden Aura",   class: "shadow-[0_0_24px_rgba(251,191,36,0.6)]" },
  { id: "pink",     label: "Pink Glow",     class: "shadow-[0_0_20px_rgba(244,114,182,0.5)]" },
  { id: "rainbow",  label: "Rainbow",       class: "shadow-[0_0_30px_rgba(147,51,234,0.5)] ring-2 ring-purple-400/30" },
];

const ACCESSORY_OPTIONS = [
  { id: "none",     label: "None",          emoji: "—" },
  { id: "crown",    label: "Crown",         emoji: "👑" },
  { id: "halo",     label: "Halo",          emoji: "😇" },
  { id: "sparkle",  label: "Sparkles",      emoji: "✨" },
  { id: "bow",      label: "Bow",           emoji: "🎀" },
  { id: "glasses",  label: "Glasses",       emoji: "🕶️" },
];

// ── Mini preview of each companion with its theme colors ──────────────────────

function RobotPreview({ theme }) {
  const t = ROBOT_THEMES.find(t => t.id === theme) || ROBOT_THEMES[0];
  return (
    <svg width="72" height="72" viewBox="0 0 160 160" fill="none">
      <defs>
        <linearGradient id={`rb-${t.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={t.body[0]} />
          <stop offset="50%" stopColor={t.body[1]} />
          <stop offset="100%" stopColor={t.body[2]} />
        </linearGradient>
        <linearGradient id={`rs-${t.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={t.screen[0]} />
          <stop offset="100%" stopColor={t.screen[2]} />
        </linearGradient>
      </defs>
      <rect x="46" y="80" width="68" height="70" rx="20" fill={`url(#rb-${t.id})`}/>
      <rect x="62" y="92" width="36" height="36" rx="8" fill={`url(#rs-${t.id})`} opacity="0.9"/>
      <rect x="56" y="30" width="48" height="50" rx="16" fill={t.body[0]}/>
      <rect x="62" y="38" width="36" height="34" rx="8" fill="#0f172a"/>
      <circle cx="72" cy="52" r="4" fill={t.screen[0]}/>
      <circle cx="88" cy="52" r="4" fill={t.screen[0]}/>
      <circle cx="80" cy="15" r="5" fill={t.accent}/>
      <line x1="80" y1="30" x2="80" y2="18" stroke={t.body[1]} strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

function CatPreview({ theme }) {
  const t = CAT_THEMES.find(t => t.id === theme) || CAT_THEMES[0];
  return (
    <svg width="72" height="72" viewBox="0 0 160 160" fill="none">
      <defs>
        <linearGradient id={`cf-${t.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={t.fur[0]} />
          <stop offset="100%" stopColor={t.fur[2]} />
        </linearGradient>
      </defs>
      <ellipse cx="80" cy="105" rx="40" ry="35" fill={`url(#cf-${t.id})`}/>
      <circle cx="80" cy="60" r="32" fill={`url(#cf-${t.id})`}/>
      <path d="M 56 42 L 48 25 L 62 38 Z" fill={t.fur[1]}/>
      <path d="M 104 42 L 112 25 L 98 38 Z" fill={t.fur[1]}/>
      <path d="M 56 38 L 52 28 L 60 36 Z" fill={t.inner} opacity="0.8"/>
      <path d="M 104 38 L 108 28 L 100 36 Z" fill={t.inner} opacity="0.8"/>
      <ellipse cx="68" cy="56" rx="3" ry="1.5" fill="#1f2937"/>
      <ellipse cx="92" cy="56" rx="3" ry="1.5" fill="#1f2937"/>
      <ellipse cx="80" cy="64" r="4" fill={t.nose}/>
    </svg>
  );
}

function DogPreview({ theme }) {
  const t = DOG_THEMES.find(t => t.id === theme) || DOG_THEMES[0];
  return (
    <svg width="72" height="72" viewBox="0 0 160 160" fill="none">
      <defs>
        <linearGradient id={`df-${t.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={t.fur[0]} />
          <stop offset="100%" stopColor={t.fur[2]} />
        </linearGradient>
        <linearGradient id={`dm-${t.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={t.muzzle[0]} />
          <stop offset="100%" stopColor={t.muzzle[1]} />
        </linearGradient>
      </defs>
      <ellipse cx="80" cy="105" rx="42" ry="36" fill={`url(#df-${t.id})`}/>
      <circle cx="80" cy="55" r="34" fill={`url(#df-${t.id})`}/>
      <ellipse cx="50" cy="52" rx="12" ry="28" fill={t.fur[1]}/>
      <ellipse cx="110" cy="52" rx="12" ry="28" fill={t.fur[1]}/>
      <circle cx="68" cy="50" r="5" fill="#1f2937"/>
      <circle cx="92" cy="50" r="5" fill="#1f2937"/>
      <ellipse cx="80" cy="65" rx="20" ry="16" fill={`url(#dm-${t.id})`}/>
      <ellipse cx="80" cy="62" rx="6" ry="5" fill="#1f2937"/>
    </svg>
  );
}

function OrbPreview({ theme }) {
  const t = ORB_THEMES.find(t => t.id === theme) || ORB_THEMES[0];
  return (
    <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center shadow-lg`}
         style={{ boxShadow: `0 0 20px ${t.glow}` }}>
      <div className="flex gap-2">
        <div className="w-2 h-2 bg-white rounded-full" />
        <div className="w-2 h-2 bg-white rounded-full" />
      </div>
    </div>
  );
}

// ── Theme grid ────────────────────────────────────────────────────────────────

function ThemeGrid({ options, selected, onSelect, renderPreview }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {options.map(opt => (
        <motion.button
          key={opt.id}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(opt.id)}
          className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
            selected === opt.id
              ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30"
              : "border-transparent bg-white dark:bg-gray-800 hover:border-purple-300"
          }`}
        >
          <div className="relative">
            {renderPreview(opt.id)}
            {selected === opt.id && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-white stroke-[3]" />
              </div>
            )}
          </div>
          <span className="text-xs text-center text-gray-600 dark:text-gray-400 leading-tight">{opt.label}</span>
        </motion.button>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CompanionAppearanceEditor({ currentUser, onUpdate }) {
  const companionType = currentUser?.companion_type || "robot";
  const appearance = currentUser?.companion_appearance || {};

  const [theme, setTheme] = useState(appearance.theme || "classic");
  const [aura, setAura] = useState(appearance.aura || "none");
  const [accessory, setAccessory] = useState(appearance.accessory || "none");
  const [saving, setSaving] = useState(false);

  const themeOptions = {
    robot: ROBOT_THEMES,
    cat: CAT_THEMES,
    dog: DOG_THEMES,
    orb: ORB_THEMES,
  }[companionType] || ROBOT_THEMES;

  const previewRenderer = {
    robot: (id) => <RobotPreview theme={id} />,
    cat:   (id) => <CatPreview theme={id} />,
    dog:   (id) => <DogPreview theme={id} />,
    orb:   (id) => <OrbPreview theme={id} />,
  }[companionType];

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({
      companion_appearance: { theme, aura, accessory }
    });
    setSaving(false);
    toast.success("Companion appearance saved! ✨");
    onUpdate?.();
  };

  const companionLabel = { robot: "Friendly Robot", cat: "Cozy Cat", dog: "Playful Dog", orb: "Magic Orb" }[companionType];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Companion Appearance
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Customizing: <span className="font-medium text-purple-600 dark:text-purple-400">{companionLabel}</span>
            {" · "}
            <a href="/CharacterSelection" className="underline hover:text-purple-600">Change companion</a>
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-purple-500 to-teal-500 text-white">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>

      {/* Color Theme */}
      <section className="space-y-3">
        <div>
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Color Theme</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Choose a color palette for your companion</p>
        </div>
        <ThemeGrid
          options={themeOptions}
          selected={theme}
          onSelect={setTheme}
          renderPreview={previewRenderer}
        />
      </section>

      {/* Aura */}
      <section className="space-y-3">
        <div>
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Aura / Glow</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Add a glow effect around your companion</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {AURA_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setAura(opt.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                aura === opt.id
                  ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-purple-300"
              }`}
            >
              {aura === opt.id && "✓ "}{opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Accessory */}
      <section className="space-y-3">
        <div>
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Accessory</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Give your companion a little flair</p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {ACCESSORY_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setAccessory(opt.id)}
              className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all text-sm ${
                accessory === opt.id
                  ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-300"
              }`}
            >
              <span className="text-2xl">{opt.emoji}</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">{opt.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Live preview strip */}
      <section className="p-4 bg-gradient-to-r from-purple-50 to-teal-50 dark:from-purple-900/20 dark:to-teal-900/20 rounded-2xl border border-purple-100 dark:border-purple-800 space-y-2">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current selection</p>
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
            {themeOptions.find(t => t.id === theme)?.label || theme}
          </Badge>
          <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
            {AURA_OPTIONS.find(a => a.id === aura)?.label || aura} aura
          </Badge>
          <Badge className="bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300">
            {ACCESSORY_OPTIONS.find(a => a.id === accessory)?.emoji} {ACCESSORY_OPTIONS.find(a => a.id === accessory)?.label}
          </Badge>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">Save to apply. Color themes take effect wherever your companion appears.</p>
      </section>
    </div>
  );
}