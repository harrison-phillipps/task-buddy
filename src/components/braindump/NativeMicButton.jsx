import { useState, useRef } from "react";
import { Mic, MicOff, Square } from "lucide-react";
import { toast } from "sonner";

export default function NativeMicButton({ onTranscript, onDone }) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      if (final) onTranscript(final);
    };

    recognition.onerror = (e) => {
      console.error("Speech recognition error:", e);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (recognitionRef.current) {
        const finalText = recognitionRef.current._finalText || "";
        onDone(finalText);
        recognitionRef.current._finalText = "";
      }
    };

    recognitionRef.current = recognition;
    recognitionRef.current._finalText = "";

    // Accumulate final text for onDone
    const origOnResult = recognition.onresult;
    recognition.onresult = (event) => {
      origOnResult(event);
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          recognitionRef.current._finalText += event.results[i][0].transcript + " ";
        }
      }
    };

    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  return (
    <button
      onClick={isListening ? stopListening : startListening}
      className={`relative flex items-center justify-center w-20 h-20 rounded-full shadow-lg transition-all duration-200 active:scale-95 ${
        isListening
          ? "bg-red-500 hover:bg-red-600"
          : "bg-gradient-to-br from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600"
      }`}
      aria-label={isListening ? "Stop recording" : "Start recording"}
    >
      {isListening && (
        <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-50" />
      )}
      {isListening ? (
        <Square className="w-8 h-8 text-white fill-white" />
      ) : (
        <Mic className="w-8 h-8 text-white" />
      )}
    </button>
  );
}