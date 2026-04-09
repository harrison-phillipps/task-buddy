import { useState, useRef, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 72;

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const pulling = useRef(false);

  const handleTouchStart = useCallback((e) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (startY.current === null || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0 && window.scrollY === 0) {
      pulling.current = true;
      setPullDistance(Math.min(delta * 0.45, THRESHOLD + 24));
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      try { await onRefresh(); } finally { setRefreshing(false); }
    }
    setPullDistance(0);
    startY.current = null;
  }, [pullDistance, onRefresh]);

  useEffect(() => {
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const isTriggered = pullDistance >= THRESHOLD;
  const visible = pullDistance > 0 || refreshing;

  return (
    <div className="relative">
      {/* Pull indicator — sits above content */}
      <div
        className="absolute top-0 left-0 right-0 flex justify-center z-40 pointer-events-none transition-all duration-150"
        style={{ height: refreshing ? THRESHOLD : pullDistance, overflow: "hidden" }}
      >
        {visible && (
          <div
            className={`self-center rounded-full p-2.5 shadow-lg ${isTriggered || refreshing ? "bg-purple-100 dark:bg-purple-900" : "bg-white dark:bg-gray-800"}`}
            style={{ opacity: Math.max(progress, refreshing ? 1 : 0), transform: `scale(${0.5 + progress * 0.5})` }}
          >
            <RefreshCw
              className={`w-5 h-5 text-purple-600 dark:text-purple-400 ${refreshing ? "animate-spin" : ""}`}
              style={{ transform: refreshing ? undefined : `rotate(${progress * 270}deg)` }}
            />
          </div>
        )}
      </div>
      {/* Push content down while pulling */}
      <div style={{ transform: `translateY(${refreshing ? THRESHOLD : pullDistance}px)`, transition: refreshing || pullDistance === 0 ? "transform 0.2s ease" : "none" }}>
        {children}
      </div>
    </div>
  );
}