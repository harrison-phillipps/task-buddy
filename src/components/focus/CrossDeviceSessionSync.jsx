import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";

// Stable device ID for this browser tab/device
const DEVICE_ID = (() => {
  let id = sessionStorage.getItem("taskbuddy_device_id");
  if (!id) {
    id = `device_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem("taskbuddy_device_id", id);
  }
  return id;
})();

/**
 * Mounted globally in Layout.
 * Subscribes to ActiveSession entity changes in real-time.
 * If another device belonging to the same user starts a session,
 * automatically navigates to /FocusSession so the page is ready to receive state.
 */
export default function CrossDeviceSessionSync({ currentUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const userRef = useRef(currentUser);
  const locationRef = useRef(location);
  userRef.current = currentUser;
  locationRef.current = location;

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = base44.entities.ActiveSession.subscribe((event) => {
      if (event.type === "delete") return;
      const data = event.data;
      if (!data) return;

      // Only react to sessions owned by THIS user on a DIFFERENT device
      if (data.user_id !== userRef.current?.id) return;
      if (data.device_id === DEVICE_ID) return;

      // Only react if the session is active
      if (!data.is_active) return;

      // Ignore stale updates (older than 15s)
      const age = Date.now() - new Date(data.last_updated_at).getTime();
      if (age > 15000) return;

      // If we're not already on the FocusSession page, navigate there
      if (!location.pathname.includes("FocusSession")) {
        navigate("/FocusSession");
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  return null;
}