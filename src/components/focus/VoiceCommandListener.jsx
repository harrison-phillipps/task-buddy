import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const COMMANDS = {
  start:      /\b(start|begin|go|resume)\b/i,
  pause:      /\b(pause|stop|hold|wait)\b/i,
  skip:       /\b(skip|next( step)?|skip step)\b/i,
  complete:   /\b(complete|done|finish|mark complete)\b/i,
  addTime:    /\b(add time|more time|extend|need more)\b/i,
  endSession: /\b(end session|finish session|stop session)\b/i,
};

export default function VoiceCommandListener({
  isSessionActive,
  isActive,
  onStart,
  onPause,
  onSkip,
  onComplete,
  onAddTime,
  onEndSession,
}) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(false);
  const [lastCommand, setLastCommand] = useState(null);
  const recognitionRef = useRef(null);
  const restartRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(!!SpeechRecognition);
  }, []);

  const stopListening = useCallback(() => {
    clearTimeout(restartRef.current);
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
    setTranscript("");
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript.trim();
      setTranscript(text);

      if (result.isFinal) {
        processCommand(text);
        setTranscript("");
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed") {
        toast.error("Microphone access denied.");
        stopListening();
      }
    };

    recognition.onend = () => {
      // Auto-restart to keep continuous listening
      if (listening || recognitionRef.current) {
        restartRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            try { recognitionRef.current.start(); } catch (_) {}
          }
        }, 300);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch (_) {}
  }, [listening, stopListening]);

  // Stop when session ends
  useEffect(() => {
    if (!isSessionActive) stopListening();
  }, [isSessionActive, stopListening]);

  // Cleanup on unmount
  useEffect(() => () => stopListening(), [stopListening]);

  const processCommand = (text) => {
    if (COMMANDS.start.test(text) && !isActive) {
      setLastCommand("▶ Start");
      onStart?.();
    } else if (COMMANDS.pause.test(text) && isActive) {
      setLastCommand("⏸ Pause");
      onPause?.();
    } else if (COMMANDS.skip.test(text)) {
      setLastCommand("⏭ Skip Step");
      onSkip?.();
    } else if (COMMANDS.complete.test(text)) {
      setLastCommand("✅ Complete");
      onComplete?.();
    } else if (COMMANDS.addTime.test(text)) {
      setLastCommand("⏱ +More Time");
      onAddTime?.();
    } else if (COMMANDS.endSession.test(text)) {
      setLastCommand("🛑 End Session");
      onEndSession?.();
    } else {
      return; // no match, don't show anything
    }
    setTimeout(() => setLastCommand(null), 2500);
  };

  if (!supported || !isSessionActive) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={listening ? stopListening : startListening}
        title={listening ? "Stop voice commands" : "Enable voice commands"}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all shadow-sm border ${
          listening
            ? "bg-red-50 border-red-300 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:border-red-700 dark:text-red-400"
            : "bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-100 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-400"
        }`}
      >
        {listening ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <MicOff className="w-4 h-4" />
            Voice On
          </>
        ) : (
          <>
            <Mic className="w-4 h-4" />
            Voice Commands
          </>
        )}
      </button>

      <AnimatePresence>
        {listening && transcript && (
          <motion.div
            key="transcript"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="text-xs text-gray-400 dark:text-gray-500 italic truncate max-w-xs"
          >
            "{transcript}"
          </motion.div>
        )}
        {lastCommand && (
          <motion.div
            key="command"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold"
          >
            {lastCommand}
          </motion.div>
        )}
      </AnimatePresence>

      {listening && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          Say: <span className="text-gray-500 dark:text-gray-400 font-medium">"start", "pause", "skip", "complete", "add time", "end session"</span>
        </p>
      )}
    </div>
  );
}