/**
 * Quick-start focus session: which task it runs on, and what the URL asked for.
 *
 * The focus nudge push cannot deep-link (the native shell has no link handler),
 * so the way back into a session is a card that opens
 * /FocusSession?minutes=10&quickStart=1 — no task id. This picks the task.
 */

/**
 * The most important open task: must-do first, then the nearest due date.
 * Untimed and undated tasks sort last; ties fall back to oldest first so the
 * same task is chosen every time the card is opened.
 */
export function pickQuickStartTask(tasks) {
  const open = (tasks || []).filter((task) => task && task.status !== "completed");
  if (open.length === 0) return null;

  const importance = (task) => (task.task_priority === "must_do" ? 0 : 1);
  const dueKey = (task) => (task.due_date ? String(task.due_date) : "9999-12-31");

  return [...open].sort((a, b) => {
    const byImportance = importance(a) - importance(b);
    if (byImportance !== 0) return byImportance;
    const byDue = dueKey(a).localeCompare(dueKey(b));
    if (byDue !== 0) return byDue;
    return String(a.created_date || "").localeCompare(String(b.created_date || ""));
  })[0];
}

/** The focus-session URL params this app understands. */
export function parseFocusParams(search) {
  const params = new URLSearchParams(search || "");
  const rawMinutes = Number(params.get("minutes"));
  const quickStartRaw = params.get("quickStart");
  return {
    taskId: params.get("taskId") || null,
    taskTitle: params.get("taskTitle") ? decodeURIComponent(params.get("taskTitle")) : null,
    quickStart: quickStartRaw === "1" || params.get("autostart") === "true",
    // Only a whole, positive number of minutes is honoured.
    minutes: Number.isFinite(rawMinutes) && rawMinutes > 0 ? Math.round(rawMinutes) : null,
  };
}