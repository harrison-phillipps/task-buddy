import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function VoiceToText({ onTranscript, onDictationEnd, disabled = false }) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [pulseLevel, setPulseLevel] = useState(0);
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const silenceTimerRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      // Animate pulse on speech activity
      setPulseLevel(Math.random() * 3 + 1);
      setTimeout(() => setPulseLevel(0), 300);

      // Reset silence timer on new speech
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (isListeningRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          // Auto-stop after 3s of silence
          if (isListeningRef.current) stopListening();
        }, 3000);
      }

      setInterimTranscript(interim);
      if (finalTranscript) {
        onTranscript(finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') setIsSupported(false);
      setIsListening(false);
      isListeningRef.current = false;
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        recognition.start();
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [onTranscript]);

  const stopListening = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsListening(false);
    isListeningRef.current = false;
    setInterimTranscript("");
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (onDictationEnd) onDictationEnd();
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      stopListening();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      isListeningRef.current = true;
    }
  };

  if (!isSupported) {
    return (
      <Button variant="outline" size="sm" disabled className="text-gray-400" title="Voice input not supported in this browser">
        <MicOff className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isListening ? "default" : "outline"}
        size="sm"
        onClick={toggleListening}
        disabled={disabled}
        className={isListening ? "bg-red-500 hover:bg-red-600 text-white" : ""}
      >
        {isListening ? (
          <>
            <Square className="w-3 h-3 mr-1 fill-current" />
            Stop
          </>
        ) : (
          <>
            <Mic className="w-4 h-4 mr-1" />
            Voice Input
          </>
        )}
      </Button>

      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1"
          >
            {[1, 2, 3, 4, 5].map((bar) => (
              <motion.div
                key={bar}
                className="w-1 bg-red-400 rounded-full"
                animate={{
                  height: pulseLevel > 0
                    ? `${Math.max(6, Math.random() * 20 + 4)}px`
                    : "6px",
                }}
                transition={{ duration: 0.15, delay: bar * 0.03 }}
              />
            ))}
            <span className="text-xs text-red-500 font-medium ml-1">Listening…</span>
          </motion.div>
        )}
        {!isListening && interimTranscript && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm text-gray-500 italic max-w-xs truncate"
          >
            {interimTranscript}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}