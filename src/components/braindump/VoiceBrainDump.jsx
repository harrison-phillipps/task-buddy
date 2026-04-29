import { useState, useRef, useEffect } from "react";
import { Mic, Square, RotateCcw, Sparkles, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const SUPPORTED = typeof window !== "undefined" &&
  !!(window.SpeechRecognition || window.webkitSpeechRecognition);

// Animated bars that react to recording state
function WaveformBars({ isListening }) {
  const bars = Array.from({ length: 12 });
  return (
    <div className="flex items-center justify-center gap-1 h-10">
      {bars.map((_, i) => (
        <motion.div
          key={i}
          className={`w-1.5 rounded-full ${isListening ? "bg-red-400" : "bg-purple-300"}`}
          animate={isListening ? {
            height: ["8px", `${Math.random() * 28 + 8}px`, "8px"],
          } : { height: "6px" }}
          transition={isListening ? {
            duration: 0.4 + Math.random() * 0.3,
            repeat: Infinity,
            repeatType: "mirror",
            delay: i * 0.05,
          } : { duration: 0.2 }}
        />
      ))}
    </div>
  );
}

export default function VoiceBrainDump({ onTranscriptReady, onRequestParse, isProcessing }) {
  const [isListening, setIsListening] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState("");
  const recognitionRef = useRef(null);
  const finalRef = useRef("");

  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  const start = () => {
    if (!SUPPORTED) {
      setError("Speech recognition isn't supported in this browser. Try Chrome or Edge.");
      return;
    }
    setError("");
    setFinalText("");
    setInterimText("");
    finalRef.current = "";

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalRef.current += t + " ";
          setFinalText(finalRef.current);
        } else {
          interim += t;
        }
      }
      setInterimText(interim);
    };

    recognition.onerror = (e) => {
      if (e.error !== "no-speech") setError(`Mic error: ${e.error}`);
      setIsListening(false);
      setInterimText("");
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText("");
      const captured = finalRef.current.trim();
      if (captured) {
        onTranscriptReady(captured);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stop = () => {
    recognitionRef.current?.stop();
  };

  const reset = () => {
    recognitionRef.current?.stop();
    setFinalText("");
    setInterimText("");
    finalRef.current = "";
    onTranscriptReady("");
  };

  const hasText = finalText.trim().length > 0;

  return (
    <div className="space-y-4">
      {/* Main recording area */}
      <div className={`relative flex flex-col items-center gap-4 p-6 rounded-2xl border-2 transition-all duration-300 ${
        isListening
          ? "border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-700"
          : "border-purple-200 bg-gradient-to-br from-purple-50 to-teal-50 dark:from-purple-900/20 dark:to-teal-900/20 dark:border-purple-700"
      }`}>
        <WaveformBars isListening={isListening} />

        {/* Big mic button */}
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={isListening ? stop : start}
          disabled={isProcessing}
          className={`relative flex items-center justify-center w-24 h-24 rounded-full shadow-xl transition-all duration-300 disabled:opacity-50 ${
            isListening
              ? "bg-red-500 hover:bg-red-600"
              : "bg-gradient-to-br from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600"
          }`}
          aria-label={isListening ? "Stop recording" : "Start recording"}
        >
          {isListening && (
            <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40" />
          )}
          {isListening ? (
            <Square className="w-9 h-9 text-white fill-white" />
          ) : (
            <Mic className="w-9 h-9 text-white" />
          )}
        </motion.button>

        <p className={`text-sm font-semibold ${isListening ? "text-red-600 dark:text-red-400" : "text-purple-700 dark:text-purple-300"}`}>
          {isListening ? "🔴 Listening… tap to stop" : hasText ? "Tap to record more" : "Tap to start speaking"}
        </p>

        {!SUPPORTED && (
          <p className="text-xs text-amber-600 text-center">
            ⚠️ Speech recognition requires Chrome or Edge on desktop.
          </p>
        )}
        {error && <p className="text-xs text-red-500 text-center">{error}</p>}
      </div>

      {/* Live + final transcript display */}
      <AnimatePresence>
        {(hasText || interimText) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="relative min-h-[80px] p-4 bg-white dark:bg-gray-800 rounded-xl border border-purple-100 dark:border-gray-700 text-sm leading-relaxed text-gray-800 dark:text-gray-200"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Volume2 className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs text-purple-500 font-medium uppercase tracking-wide">Transcript</span>
            </div>
            <span>{finalText}</span>
            {interimText && (
              <span className="text-gray-400 italic"> {interimText}</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <AnimatePresence>
        {hasText && !isListening && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex gap-3"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              className="flex-1 gap-2"
              disabled={isProcessing}
            >
              <RotateCcw className="w-4 h-4" />
              Re-record
            </Button>
            <Button
              size="sm"
              onClick={() => onRequestParse(finalText)}
              disabled={isProcessing}
              className="flex-1 gap-2 bg-gradient-to-r from-purple-500 to-teal-500 text-white hover:from-purple-600 hover:to-teal-600"
            >
              {isProcessing ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Organising…
                </span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Organise into Tasks
                </>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}