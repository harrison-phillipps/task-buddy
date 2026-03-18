import { useEffect, useRef, useState } from "react";

/**
 * Hook to manage background-safe timer for focus sessions
 * Uses timestamp-based calculation to work even when app is backgrounded
 */
export function useBackgroundTimer({ 
  initialTime, 
  isActive, 
  onComplete,
  sessionId 
}) {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const startTimeRef = useRef(null);
  const targetTimeRef = useRef(null);
  const wakeLockRef = useRef(null);

  // Request wake lock to keep screen/device awake
  useEffect(() => {
    if (!isActive) {
      releaseWakeLock();
      return;
    }

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          console.log('Wake Lock active');
        }
      } catch (err) {
        console.log('Wake Lock not supported or denied:', err);
      }
    };

    requestWakeLock();

    // Re-request wake lock if visibility changes
    const handleVisibilityChange = () => {
      if (wakeLockRef.current !== null && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isActive]);

  const releaseWakeLock = () => {
    if (wakeLockRef.current !== null) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };

  // Timestamp-based timer (works in background)
  useEffect(() => {
    if (isActive) {
      const now = Date.now();
      
      if (!startTimeRef.current) {
        startTimeRef.current = now;
        targetTimeRef.current = now + (timeLeft * 1000);
        
        // Save to localStorage for persistence
        localStorage.setItem(`focus_session_${sessionId}`, JSON.stringify({
          startTime: startTimeRef.current,
          targetTime: targetTimeRef.current,
          sessionId
        }));
      }

      const interval = setInterval(() => {
        const currentTime = Date.now();
        const remaining = Math.max(0, Math.ceil((targetTimeRef.current - currentTime) / 1000));
        
        setTimeLeft(remaining);
        
        if (remaining <= 0) {
          clearInterval(interval);
          releaseWakeLock();
          onComplete?.();
          
          // Clear localStorage
          localStorage.removeItem(`focus_session_${sessionId}`);
          
          // Show notification if app is backgrounded
          if (document.hidden) {
            showNotification('Focus Session Complete!', 'Great work! Time to take a break.');
          }
        }
      }, 1000);

      return () => clearInterval(interval);
    } else {
      // Paused - clear start time
      startTimeRef.current = null;
      targetTimeRef.current = null;
      localStorage.removeItem(`focus_session_${sessionId}`);
    }
  }, [isActive, onComplete, sessionId]);

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`focus_session_${sessionId}`);
    if (stored) {
      try {
        const { targetTime } = JSON.parse(stored);
        const remaining = Math.max(0, Math.ceil((targetTime - Date.now()) / 1000));
        
        if (remaining > 0) {
          setTimeLeft(remaining);
          targetTimeRef.current = targetTime;
          startTimeRef.current = targetTime - (remaining * 1000);
        } else {
          localStorage.removeItem(`focus_session_${sessionId}`);
        }
      } catch (e) {
        console.error('Failed to restore session:', e);
      }
    }
  }, [sessionId]);

  return { timeLeft, setTimeLeft };
}

/**
 * Request notification permission and show notifications
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

export async function showNotification(title, body, options = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  // Prefer SW-based notification (works when app is backgrounded / on smartwatch)
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: options.vibrate || [200, 100, 200],
        tag: options.tag || 'focus-session',
        requireInteraction: options.requireInteraction || false,
        silent: false,
        renotify: true,
        ...options,
      });
      return;
    }
  } catch (_) {}

  // Fallback: basic Notification API
  try {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200],
      tag: options.tag || 'focus-session',
      requireInteraction: options.requireInteraction || false,
    });
    notification.onclick = () => { window.focus(); notification.close(); };
    setTimeout(() => notification.close(), 8000);
  } catch (error) {
    console.error('Failed to show notification:', error);
  }
}

/**
 * Schedule encouragement notifications
 */
export function scheduleEncouragementNotification(message, delayMs) {
  return setTimeout(() => {
    if (document.hidden) {
      showNotification('Keep Going! 💪', message);
    }
  }, delayMs);
}