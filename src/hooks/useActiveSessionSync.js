import { useEffect, useRef, useCallback } from "react";
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

// How often (ms) the controlling device pushes state
const PUSH_INTERVAL = 5000;

/**
 * useActiveSessionSync
 * 
 * Two modes:
 *  - CONTROLLER (isController=true): pushes state every PUSH_INTERVAL ms
 *  - FOLLOWER   (isController=false): subscribes and receives state updates
 * 
 * @param {object} options
 * @param {object}   options.currentUser
 * @param {boolean}  options.isController  - true on the device that started the session
 * @param {object}   options.sessionState  - current local state to push (controller only)
 * @param {function} options.onRemoteState - called with remote state when follower receives update
 * @param {boolean}  options.enabled       - only subscribe/push when a session is active
 */
export function useActiveSessionSync({
  currentUser,
  isController,
  sessionState,
  onRemoteState,
  enabled,
}) {
  const activeSessionIdRef = useRef(null);
  const pushIntervalRef = useRef(null);
  const sessionStateRef = useRef(sessionState);
  sessionStateRef.current = sessionState;

  // ── CONTROLLER: create/update the ActiveSession record ────────────────────

  const pushState = useCallback(async () => {
    if (!currentUser || !sessionStateRef.current?.taskId) return;
    const payload = {
      user_id: currentUser.id,
      task_id: sessionStateRef.current.taskId,
      task_title: sessionStateRef.current.taskTitle || "",
      is_active: sessionStateRef.current.isActive,
      is_break_time: sessionStateRef.current.isBreakTime,
      time_left: sessionStateRef.current.timeLeft,
      current_subtask_index: sessionStateRef.current.currentSubtaskIndex,
      focus_technique: sessionStateRef.current.focusTechnique,
      work_interval: sessionStateRef.current.workInterval,
      break_interval: sessionStateRef.current.breakInterval,
      pomodoros_completed: sessionStateRef.current.pomodorosCompleted,
      last_updated_at: new Date().toISOString(),
      device_id: DEVICE_ID,
    };

    if (activeSessionIdRef.current) {
      await base44.entities.ActiveSession.update(activeSessionIdRef.current, payload);
    } else {
      // Check if one already exists for this user (from a previous session)
      const existing = await base44.entities.ActiveSession.filter({ user_id: currentUser.id });
      if (existing.length > 0) {
        activeSessionIdRef.current = existing[0].id;
        await base44.entities.ActiveSession.update(existing[0].id, payload);
      } else {
        const created = await base44.entities.ActiveSession.create(payload);
        activeSessionIdRef.current = created.id;
      }
    }
  }, [currentUser]);

  const clearSession = useCallback(async () => {
    if (activeSessionIdRef.current) {
      await base44.entities.ActiveSession.update(activeSessionIdRef.current, {
        is_active: false,
        last_updated_at: new Date().toISOString(),
      }).catch(() => {});
      activeSessionIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled || !isController || !currentUser) return;

    // Push immediately, then on interval
    pushState();
    pushIntervalRef.current = setInterval(pushState, PUSH_INTERVAL);

    return () => {
      clearInterval(pushIntervalRef.current);
    };
  }, [enabled, isController, currentUser, pushState]);

  // On session end (controller), mark inactive
  useEffect(() => {
    if (!isController || !currentUser) return;
    if (!enabled) {
      clearSession();
    }
  }, [enabled, isController]);

  // ── FOLLOWER: subscribe to real-time updates ──────────────────────────────
  // NOTE: Follower subscribes regardless of `enabled` so it can receive state
  // from the controlling device and auto-join the session.

  useEffect(() => {
    if (isController || !currentUser || !onRemoteState) return;

    const unsubscribe = base44.entities.ActiveSession.subscribe((event) => {
      if (event.type === "delete") return;
      const data = event.data;
      if (!data) return;

      // Only listen to sessions from THIS user on a DIFFERENT device
      if (data.user_id !== currentUser.id) return;
      if (data.device_id === DEVICE_ID) return;

      // Ignore stale updates (older than 15s)
      const age = Date.now() - new Date(data.last_updated_at).getTime();
      if (age > 15000) return;

      onRemoteState({
        taskId: data.task_id,
        taskTitle: data.task_title,
        isActive: data.is_active,
        isBreakTime: data.is_break_time,
        timeLeft: data.time_left,
        currentSubtaskIndex: data.current_subtask_index,
        focusTechnique: data.focus_technique,
        workInterval: data.work_interval,
        breakInterval: data.break_interval,
        pomodorosCompleted: data.pomodoros_completed,
      });
    });

    return () => unsubscribe();
  }, [enabled, isController, currentUser, onRemoteState]);

  return { pushState, clearSession };
}