/**
 * Match rule for the one-off calendar reconciliation: may this calendar event be
 * deleted on behalf of this task?
 *
 * Both conditions mirror exactly what pushTaskToCalendar writes:
 *   summary / subject   → `📋 ${task.title}`
 *   description / body  → a line `TaskBuddy task ID: ${task.id}` (Outlook sends it
 *                         inside HTML, joined with <br>, so the tag text itself
 *                         stays contiguous and needs no HTML parsing).
 *
 * Pure and dependency-free so tests/calendarEventMatch.test.mjs can pin the rule
 * without touching a calendar.
 */

const TITLE_MARKER = /^\s*📋\s*/;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** A calendar title without its 📋 marker, whitespace-collapsed and lowercased. */
export function normalizeTitle(value: unknown): string {
  return String(value ?? '')
    .replace(TITLE_MARKER, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export type MatchReason = 'title' | 'description' | null;

export function eventMatchesTask(
  event:
    | { summary?: unknown; subject?: unknown; description?: unknown; body?: { content?: unknown } }
    | null
    | undefined,
  task: { id?: unknown; title?: unknown } | null | undefined
): MatchReason {
  if (!event || !task) return null;

  // Rule 1: the event's title is the task's title (📋 prefix allowed).
  const eventTitle = normalizeTitle(event.summary ?? event.subject);
  const taskTitle = normalizeTitle(task.title);
  if (eventTitle && taskTitle && eventTitle === taskTitle) return 'title';

  // Rule 2: the event's description carries this task's id tag. The id must
  // appear whole — a tag for 6a23… never authorises 6a2305… or the reverse.
  const taskId = String(task.id ?? '').trim();
  if (!taskId) return null;

  const haystack = `${String(event.description ?? '')}\n${String(event.body?.content ?? '')}`;
  const tag = new RegExp(
    `taskbuddy\\s+task\\s+id\\s*:\\s*${escapeRegExp(taskId)}(?![a-z0-9])`,
    'i'
  );
  return tag.test(haystack) ? 'description' : null;
}