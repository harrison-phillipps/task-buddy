/**
 * Focus-session persistence — one localStorage record so a running timer
 * survives a locked phone, a backgrounded tab or a killed app.
 *
 * The countdown is never a stored counter: `targetEndMs` is an absolute
 * wall-clock instant and every remaining-time value is derived from it, so
 * time that passed while the page was not running is accounted for exactly.
 *
 * Every storage access is wrapped: if localStorage is missing, full or blocked
 * (private mode, blocked cookies), the timer still works for the life of the
 * page — only cross-restart recovery is lost.
 */

export const FOCUS_STORAGE_KEY = "taskbuddy_focus_session_v1";

/** A record older than this is treated as stale and thrown away. */
export const MAX_RECORD_AGE_MS = 24 * 60 * 60 * 1000;

const PHASES = ["work", "break"];
const STATUSES = ["running", "paused"];

const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const isStr = (v) => typeof v === "string" && v.length > 0;

/** Seconds left, floored at zero. Never negative, never NaN. */
export function deriveRemainingSec(targetEndMs, nowMs = Date.now()) {
  if (!isNum(targetEndMs) || !isNum(nowMs)) return 0;
  return Math.max(0, Math.ceil((targetEndMs - nowMs) / 1000));
}

function getStorage(storage) {
  if (storage !== undefined) return storage;
  try {
    // Reading the property can itself throw (Safari private mode, blocked
    // third-party storage), so the lookup stays inside the guard.
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

/**
 * Keep only known keys with known shapes. Returns null when the record cannot
 * be trusted — a half-written or hand-edited record must never hijack a session.
 */
export function normalizeRecord(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (!isStr(raw.taskId)) return null;
  if (!PHASES.includes(raw.phase)) return null;
  if (!STATUSES.includes(raw.status)) return null;
  if (!isStr(raw.focusTechnique)) return null;
  if (!isNum(raw.sessionStartMs)) return null;
  if (!isNum(raw.workInterval) || raw.workInterval <= 0) return null;
  if (!isNum(raw.breakInterval) || raw.breakInterval <= 0) return null;

  const record = {
    taskId: raw.taskId,
    phase: raw.phase,
    status: raw.status,
    targetEndMs: isNum(raw.targetEndMs) ? raw.targetEndMs : null,
    remainingAtPauseSec:
      isNum(raw.remainingAtPauseSec) && raw.remainingAtPauseSec >= 0
        ? raw.remainingAtPauseSec
        : null,
    focusTechnique: raw.focusTechnique,
    workInterval: raw.workInterval,
    breakInterval: raw.breakInterval,
    pomodorosCompleted:
      isNum(raw.pomodorosCompleted) && raw.pomodorosCompleted >= 0
        ? raw.pomodorosCompleted
        : 0,
    sessionStartMs: raw.sessionStartMs,
  };

  // A running record needs a deadline; a paused one needs a frozen remainder.
  if (record.status === "running" && record.targetEndMs == null) return null;
  if (record.status === "paused" && record.remainingAtPauseSec == null) return null;

  return record;
}

/** True when the record is malformed, from the future, or older than a day. */
export function isStaleRecord(record, nowMs = Date.now()) {
  if (!record) return true;
  if (!isNum(record.sessionStartMs)) return true;
  // A start time in the future means the device clock moved; do not trust it.
  if (record.sessionStartMs > nowMs + 5 * 60 * 1000) return true;
  return nowMs - record.sessionStartMs > MAX_RECORD_AGE_MS;
}

/** Writes the record. Returns false when storage is unavailable or refused. */
export function saveFocusRecord(record, storage) {
  const store = getStorage(storage);
  const clean = normalizeRecord(record);
  if (!store || !clean) return false;
  try {
    store.setItem(FOCUS_STORAGE_KEY, JSON.stringify(clean));
    return true;
  } catch {
    // Quota exceeded or access refused — the in-memory session continues.
    return false;
  }
}

/** The stored record, or null. Malformed and stale records are dropped. */
export function loadFocusRecord(nowMs = Date.now(), storage) {
  const store = getStorage(storage);
  if (!store) return null;

  let raw = null;
  try {
    raw = store.getItem(FOCUS_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    clearFocusRecord(storage);
    return null;
  }

  const record = normalizeRecord(parsed);
  if (isStaleRecord(record, nowMs)) {
    clearFocusRecord(storage);
    return null;
  }
  return record;
}

export function clearFocusRecord(storage) {
  const store = getStorage(storage);
  if (!store) return;
  try {
    store.removeItem(FOCUS_STORAGE_KEY);
  } catch {
    /* nothing to do — the record is unreachable anyway */
  }
}

/**
 * What the screen should do with a record it just loaded.
 *   running — deadline still ahead: resume the countdown from the clock
 *   paused  — frozen at remainingAtPauseSec
 *   expired — deadline passed while away: show the completion state once
 */
export function restoreFocusSession(record, nowMs = Date.now()) {
  if (!record) return null;
  if (record.status === "paused") {
    return { status: "paused", remainingSec: record.remainingAtPauseSec ?? 0 };
  }
  const remainingSec = deriveRemainingSec(record.targetEndMs, nowMs);
  return { status: remainingSec > 0 ? "running" : "expired", remainingSec };
}