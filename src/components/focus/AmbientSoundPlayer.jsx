import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Volume2, VolumeX, Volume1 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SOUND_URLS = {
  rain: "https://cdn.freesound.org/previews/531/531947_5765212-lq.mp3",
  cafe: "https://cdn.freesound.org/previews/459/459977_5765212-lq.mp3",
  forest: "https://cdn.freesound.org/previews/587/587560_7037-lq.mp3",
  ocean: "https://cdn.freesound.org/previews/527/527604_2524422-lq.mp3",
  white_noise: "https://cdn.freesound.org/previews/133/133099_2337290-lq.mp3",
  brown_noise: "https://cdn.freesound.org/previews/560/560615_7648543-lq.mp3",
  fireplace: "https://cdn.freesound.org/previews/412/412015_5121236-lq.mp3",
  thunderstorm: "https://cdn.freesound.org/previews/446/446753_9159316-lq.mp3",
};

const ambientSounds = {
  none: { name: "None", emoji: "🔇" },
  rain: { name: "Rain", emoji: "🌧️" },
  cafe: { name: "Café", emoji: "☕" },
  forest: { name: "Forest", emoji: "🌲" },
  ocean: { name: "Ocean", emoji: "🌊" },
  white_noise: { name: "White Noise", emoji: "📻" },
  brown_noise: { name: "Brown Noise", emoji: "🎵" },
};

export default function AmbientSoundPlayer({ 
  selectedSound, 
  setSelectedSound,
  isPlaying,
  compact = false 
}) {
  const [volume, setVolume] = useState(50);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  useEffect(() => {
    if (!audioRef.current) return;

    if (selectedSound !== "none" && isPlaying && isAudioPlaying) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [selectedSound, isPlaying, isAudioPlaying]);

  useEffect(() => {
    if (selectedSound !== "none" && SOUND_URLS[selectedSound]) {
      if (audioRef.current) {
        audioRef.current.src = SOUND_URLS[selectedSound];
        audioRef.current.loop = true;
        if (isPlaying && isAudioPlaying) {
          audioRef.current.play().catch(() => {});
        }
      }
    }
  }, [selectedSound]);

  const toggleAudio = () => {
    setIsAudioPlaying(!isAudioPlaying);
  };

  const VolumeIcon = volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-teal-50 dark:bg-teal-900/30 rounded-lg">
        <audio ref={audioRef} loop />
        
        <Button
          variant="outline"
          size="sm"
          onClick={toggleAudio}
          disabled={selectedSound === "none"}
          className="flex items-center gap-2"
        >
          {isAudioPlaying ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          {isAudioPlaying ? "Sound On" : "Sound Off"}
        </Button>
        
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {ambientSounds[selectedSound]?.emoji} {ambientSounds[selectedSound]?.name}
        </span>

        <div className="relative ml-auto">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowVolumeSlider(!showVolumeSlider)}
          >
            <VolumeIcon className="w-4 h-4" />
          </Button>
          
          <AnimatePresence>
            {showVolumeSlider && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full right-0 mb-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-10"
              >
                <Slider
                  value={[volume]}
                  onValueChange={(v) => setVolume(v[0])}
                  max={100}
                  step={5}
                  className="w-24"
                />
                <p className="text-xs text-center mt-1 text-gray-500">{volume}%</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-teal-50 dark:bg-teal-900/30 rounded-lg border border-teal-200 dark:border-teal-800">
      <audio ref={audioRef} loop />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <span className="text-base font-semibold text-gray-800 dark:text-gray-200">Ambient Sound</span>
        </div>
        
        {selectedSound !== "none" && (
          <div className="flex items-center gap-2">
            <Slider
              value={[volume]}
              onValueChange={(v) => setVolume(v[0])}
              max={100}
              step={5}
              className="w-20"
            />
            <span className="text-xs text-gray-500 w-8">{volume}%</span>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {Object.entries(ambientSounds).map(([key, { name, emoji }]) => (
          <Button
            key={key}
            variant={selectedSound === key ? "default" : "outline"}
            onClick={() => {
              setSelectedSound(key);
              if (key !== "none") {
                setIsAudioPlaying(true);
              } else {
                setIsAudioPlaying(false);
              }
            }}
            className={`flex items-center gap-2 ${
              selectedSound === key 
                ? "bg-gradient-to-r from-teal-500 to-blue-500 text-white" 
                : ""
            }`}
          >
            <span>{emoji}</span>
            <span className="text-sm">{name}</span>
          </Button>
        ))}
      </div>
      
      <div className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-700 p-2 rounded">
        🎵 Ambient sounds help mask distractions and improve focus
      </div>
    </div>
  );
}