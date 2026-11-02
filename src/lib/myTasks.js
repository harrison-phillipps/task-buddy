import { base44 } from "@/api/base44Client";
import { TIER_LIMITS } from "@/components/subscription/FeatureGate";

/**
 * Every task that belongs to a user: created by them, owned via owner_user_id,
 * or assigned to them. The three queries overlap — a task you created and own
 * arrives twice — so the result is deduped by id.
 *
 * Use this anywhere a task COUNT decides something (free-tier limits), so the
 * number is the same on every screen.
 */
export async function fetchMyTasks(user) {
  if (!user?.id) return [];

  const [created, owned, assigned] = await Promise.all([
    base44.entities.Task.filter({ created_by_id: user.id }, '-created_date'),
    base44.entities.Task.filter({ owner_user_id: user.id }, '-created_date'),
    base44.entities.Task.filter({ assigned_to: user.id }, '-created_date'),
  ]);

  const seen = new Set();
  const tasks = [];
  for (const task of [...created, ...owned, ...assigned]) {
    if (!task?.id || seen.has(task.id)) continue;
    seen.add(task.id);
    tasks.push(task);
  }
  return tasks;
}

export const countActiveTasks = (tasks = []) =>
  tasks.filter(task => task.status !== 'completed').length;

/** The tier's active-task ceiling, or Infinity when the tier has no ceiling. */
export function taskLimitFor(tier) {
  const limit = TIER_LIMITS[tier || 'free']?.max_tasks;
  return limit === undefined || limit === Infinity ? Infinity : limit;
}

/**
 * How many of `requested` new tasks the tier still has room for. Returns the
 * number to save — the caller saves that many and prompts for the rest.
 */
export function slotsForNewTasks(tier, activeCount, requested) {
  const limit = taskLimitFor(tier);
  if (limit === Infinity) return requested;
  return Math.max(0, Math.min(requested, limit - activeCount));
}