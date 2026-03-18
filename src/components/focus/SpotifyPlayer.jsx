import { useState } from "react";
import { Music, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PLAYLISTS = [
  { name: "Deep Focus", id: "37i9dQZF1DWZeKCadgRdKQ", emoji: "🧠" },
  { name: "Lo-Fi Beats", id: "37i9dQZF1DX8Uebhn9wzrS", emoji: "🎵" },
  { name: "Peaceful Piano", id: "37i9dQZF1DX4sWSpwq3LiO", emoji: "🎹" },
  { name: "Productive Morning", id: "37i9dQZF1DX0UrRvztWcAU", emoji: "☀️" },
  { name: "Instrumental Study", id: "37i9dQZF1DX9sIqqvKsjEL", emoji: "📚" },
  { name: "Nature Sounds", id: "37i9dQZF1DX4PP3DA4J0N8", emoji: "🌿" },
];

export default function SpotifyPlayer({ isSessionActive = false, compact = false }) {
  // Keep isOpen stable — don't re-initialize from `compact` on re-render
  const [isOpen, setIsOpen] = useState(true);
  const [selectedPlaylist, setSelectedPlaylist] = useState(PLAYLISTS[0]);
  const [volume, setVolume] = useState(80);

  // effectiveVolume only used for display hints — iframe volume is controlled inside Spotify
  const effectiveVolume = isSessionActive ? Math.min(volume, 40) : volume;

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-green-100 dark:border-green-900/40 overflow-hidden shadow-sm">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">Focus Music</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{selectedPlaylist.emoji} {selectedPlaylist.name}</p>
          </div>
          {isSessionActive && (
            <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-full">
              🔉 Auto-dimmed
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Playlist Selector */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {PLAYLISTS.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => setSelectedPlaylist(pl)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedPlaylist.id === pl.id
                        ? "bg-green-500 text-white shadow-sm"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900/30"
                    }`}
                  >
                    {pl.emoji} {pl.name}
                  </button>
                ))}
              </div>

              {/* Spotify Embed — no `key` prop so it never remounts mid-session */}
              <div className="rounded-xl overflow-hidden">
                <iframe
                  src={`https://open.spotify.com/embed/playlist/${selectedPlaylist.id}?utm_source=generator&theme=0`}
                  width="100%"
                  height="152"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="rounded-xl"
                />
              </div>

              {/* Volume hint when session active */}
              {isSessionActive && (
                <p className="text-xs text-center text-gray-400 dark:text-gray-500">
                  💡 Tip: Use Spotify's volume control above. Music dims automatically during focus.
                </p>
              )}

              <a
                href={`https://open.spotify.com/playlist/${selectedPlaylist.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 text-xs text-green-600 dark:text-green-400 hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                Open in Spotify
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}