import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { showRichNotification } from "./FocusNotificationSettings";

const LAST_SEEN_KEY = "taskbuddy_last_session_id";

/**
 * Subscribes to FocusSession entity changes in real-time.
 * When a new session is created by the same user on ANOTHER device:
 *  1. Fires a browser notification
 *  2. Stores the session in localStorage so on next app open we auto-navigate
 * 
 * Also on mount: if there's a pending cross-device session stored, navigate to FocusSession.
 */
export default function CrossDeviceSessionSync({ currentUser }) {
  const navigate = useNavigate();
  const userRef = useRef(currentUser);
  userRef.current = currentUser;

  // On mount: check if we were directed here from a cross-device notification
  useEffect(() => {
    const pending = localStorage.getItem("taskbuddy_crossdevice_session");
    if (pending) {
      localStorage.removeItem("taskbuddy_crossdevice_session");
      navigate("/FocusSession");
    }
  }, []);

  // Subscribe to real-time FocusSession creates
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = base44.entities.FocusSession.subscribe(async (event) => {
      if (event.type !== "create") return;

      const session = event.data;
      if (!session) return;

      // Only react to sessions created by THIS user (cross-device means same user, different tab/device)
      if (session.created_by !== userRef.current?.email) return;

      // Ignore if this is the session we just created on THIS device
      // We detect "this device" by checking if the page is visible/focused
      if (!document.hidden && document.hasFocus()) return;

      // Store so that when the user opens the app from the notification, we navigate
      localStorage.setItem("taskbuddy_crossdevice_session", session.id);

      // Fire a push notification
      showRichNotification(
        "Focus Session Started 🎯",
        `"${session.task_title}" is now active on another device. Tap to join.`,
        {
          tag: "crossdevice-session",
          requireInteraction: true,
          data: { url: "/FocusSession" },
        }
      );
    });

    return () => unsubscribe();
  }, [currentUser]);

  return null;
}