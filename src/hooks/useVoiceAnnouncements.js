/**
 * useVoiceAnnouncements — speaks timer milestones via the Web Speech API.
 * Audio routes through the system's selected output (AirPods, headphones, etc.)
 */
import { useRef, useCallback } from "react";

const MILESTONES_SECONDS = [600, 300, 60, 30, 10]; // 10min, 5min, 1min, 30s, 10s

export function useVoiceAnnouncements(enabled) {
  const announcedRef = useRef(new Set());
  const utteranceRef = useRef(null);

  const speak = useCallback((text) => {
    if (!enabled || !window.speechSynthesis) return;
    // Cancel any in-progress speech
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95;
    utt.pitch = 1;
    utt.volume = 1;
    utteranceRef.current = utt;
    window.speechSynthesis.speak(utt);
  }, [enabled]);

  /**
   * Call this every second with the current timeLeft (seconds).
   * Pass the phase label ("focus", "break") so announcements are contextual.
   */
  const checkMilestone = useCallback((timeLeft, phase = "focus") => {
    if (!enabled) return;

    if (MILESTONES_SECONDS.includes(timeLeft) && !announcedRef.current.has(timeLeft)) {
      announcedRef.current.add(timeLeft);
      const mins = Math.floor(timeLeft / 60);
      const secs = timeLeft % 60;
      let msg;
      if (timeLeft === 10) {
        msg = `${phase === "break" ? "Break" : "Focus"} time ending in 10 seconds`;
      } else if (secs === 0) {
        msg = `${mins} minute${mins !== 1 ? "s" : ""} remaining`;
      } else {
        msg = `30 seconds remaining`;
      }
      speak(msg);
    }
  }, [enabled, speak]);

  /** Announce a phase transition, e.g. "Break time!" or "Back to focus!" */
  const announcePhase = useCallback((message) => {
    announcedRef.current.clear(); // reset milestones for the new phase
    speak(message);
  }, [speak]);

  /** Reset milestone tracking (call when timer is reset or session ends) */
  const reset = useCallback(() => {
    announcedRef.current.clear();
    window.speechSynthesis?.cancel();
  }, []);

  return { checkMilestone, announcePhase, reset };
}