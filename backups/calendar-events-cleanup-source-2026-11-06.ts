/**
 * calendarEventsCleanup — admin-only, one-off reconciliation of the calendar
 * events written by pushTaskToCalendar.
 *
 * Scope: the same rows the 2026-11-06 index lists — live tasks with
 * calendar_synced set. (The index file is a report of these tasks; a deployed
 * function cannot read the repo, so it re-queries the same rows.) Narrow it with
 * { task_ids: [...] } if ever needed.
 *
 * Dry run (default): fetch each stored external event id, decide whether it
 * belongs to its task, and report counts. Never writes anything.
 *
 * { execute: true }: same walk, but a matching event is deleted and that task's
 * calendar_synced / calendar_event_id are cleared. An event is only deleted when
 * eventMatchesTask() agrees: the event's title equals the task's title (📋 prefix
 * allowed) or its description carries "TaskBuddy task ID: <task_id>". Everything
 * else is skipped and reported by id. A task flagged with no stored event id only
 * has its stray flag cleared.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { requireAdmin } from '../../shared/authGuard.ts';
import { eventMatchesTask } from '../../shared/calendarEventMatch.ts';

const GCAL_BASE = 'https://www.googleapis.com/calendar/v3';
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const MAX_IDS = 200;
const DEFAULT_CONCURRENCY = 2;

function classifyEventId(id: string): 'google' | 'outlook' | 'unknown' {
  const s = String(id || '');
  if (!s) return 'unknown';
  // Graph ids are long, base64url-ish and prefixed AAMk/AQMk.
  if (/^(AAMk|AQMk)/.test(s) || (/[-_=]/.test(s) && s.length > 60)) return 'outlook';
  // Google event ids are short lowercase base32hex.
  if (/^[a-z0-9]{5,60}$/.test(s)) return 'google';
  return 'unknown';
}

function eventUrl(provider: string, eventId: string): string {
  return provider === 'google'
    ? `${GCAL_BASE}/calendars/primary/events/${encodeURIComponent(eventId)}`
    : `${GRAPH_BASE}/me/events/${encodeURIComponent(eventId)}`;
}

const RETRY_STATUS = new Set([429, 503]);

/** fetch, retrying a throttled request with backoff. Never retries another status. */
async function requestWithRetry(url: string, init: RequestInit, attempts = 3): Promise<Response> {
  let res = await fetch(url, init);
  for (let attempt = 1; attempt < attempts && RETRY_STATUS.has(res.status); attempt++) {
    const retryAfter = Number(res.headers.get('Retry-After'));
    const waitMs =
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 800 * 2 ** (attempt - 1);
    console.log(`calendarEventsCleanup: ${res.status} from ${init.method || 'GET'} — retry ${attempt} in ${waitMs}ms`);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    res = await fetch(url, init);
  }
  return res;
}

async function fetchEvent(provider: string, eventId: string, accessToken: string) {
  const res = await requestWithRetry(eventUrl(provider, eventId), {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10000),
  });
  if (res.status === 404 || res.status === 410) return { status: 'not_found' as const };
  if (!res.ok) return { status: 'error' as const, http_status: res.status };
  const event = await res.json().catch(() => null);
  if (!event) return { status: 'error' as const, http_status: res.status };
  return { status: 'found' as const, event };
}

async function deleteEvent(provider: string, eventId: string, accessToken: string) {
  const res = await requestWithRetry(eventUrl(provider, eventId), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15000),
  });
  if (res.ok) return { ok: true as const };
  if (res.status === 404 || res.status === 410) return { ok: false as const, status: 'not_found' as const };
  return { ok: false as const, status: 'error' as const, http_status: res.status };
}

export default async function (req: Request): Promise<Response> {
  let stage = 'init';
  try {
    const base44 = createClientFromRequest(req);

    // Admin only: 401 with no session, 403 for any non-admin caller.
    const gate = await requireAdmin(base44);
    if (!gate.ok) return gate.response;

    const body = await req.json().catch(() => ({}));

    // Deletion happens only on an explicit execute run. Anything else is a dry run.
    const execute = body?.execute === true;

    // Keep the in-flight count small: both calendar APIs throttle aggressively.
    const requestedConcurrency = Number(body?.concurrency);
    const concurrency = Number.isFinite(requestedConcurrency) && requestedConcurrency > 0
      ? Math.min(Math.trunc(requestedConcurrency), 6)
      : DEFAULT_CONCURRENCY;

    const explicitIds: string[] = Array.isArray(body?.task_ids)
      ? body.task_ids.filter((x: unknown) => typeof x === 'string' && x).slice(0, MAX_IDS)
      : [];

    // Default scope: every flagged task (with or without a stored event id).
    stage = 'task_query';
    const query = explicitIds.length
      ? { id: { $in: explicitIds } }
      : { calendar_synced: true };
    const selected = await base44.asServiceRole.entities.Task.filter(query);
    const records = (selected.items || selected).slice(0, MAX_IDS);
    stage = 'task_query_done';

    const targets = records
      .filter((t: any) => t.calendar_event_id)
      .map((t: any) => ({
        task_id: t.id,
        title: t.title,
        provider: classifyEventId(t.calendar_event_id),
        event_id: String(t.calendar_event_id),
      }));

    // Resolve only the connections we actually need.
    const tokens: Record<string, string | null> = { google: null, outlook: null };
    for (const provider of ['google', 'outlook']) {
      if (!targets.some((t: any) => t.provider === provider)) continue;
      try {
        const { accessToken } = await base44.asServiceRole.connectors.getConnection(
          provider === 'google' ? 'googlecalendar' : 'outlook'
        );
        tokens[provider] = accessToken;
      } catch (error: any) {
        console.log(`calendarEventsCleanup: ${provider} not connected — ${error.message}`);
      }
    }

    const counts = {
      deleted: 0,
      skipped_mismatch: 0,
      not_found: 0,
      errors: 0,
      flags_cleared: 0,
    };
    let would_delete = 0;
    const mismatches: Array<{ task_id: string; event_id: string }> = [];
    const error_ids: Array<{ task_id: string; event_id?: string; http_status?: number }> = [];

    // Walk in small concurrent batches to stay inside the connection limit.
    for (let i = 0; i < targets.length; i += concurrency) {
      const chunk = targets.slice(i, i + concurrency);
      await Promise.all(
        chunk.map(async (t: any) => {
          if (t.provider === 'unknown') {
            counts.errors++;
            error_ids.push({ task_id: t.task_id, event_id: t.event_id });
            return;
          }
          const token = tokens[t.provider];
          if (!token) {
            counts.errors++;
            error_ids.push({ task_id: t.task_id, event_id: t.event_id });
            return;
          }
          try {
            const fetched = await fetchEvent(t.provider, t.event_id, token);

            if (fetched.status === 'not_found') {
              counts.not_found++;
              return;
            }
            if (fetched.status === 'error') {
              counts.errors++;
              error_ids.push({ task_id: t.task_id, event_id: t.event_id, http_status: fetched.http_status });
              return;
            }

            // The only thing that can authorise a delete.
            const reason = eventMatchesTask(fetched.event, { id: t.task_id, title: t.title });
            if (!reason) {
              counts.skipped_mismatch++;
              mismatches.push({ task_id: t.task_id, event_id: t.event_id });
              return;
            }

            if (!execute) {
              would_delete++;
              return;
            }

            const outcome = await deleteEvent(t.provider, t.event_id, token);
            if (outcome.ok) {
              counts.deleted++;
              await base44.asServiceRole.entities.Task.update(t.task_id, {
                calendar_synced: false,
                calendar_event_id: null,
              });
              counts.flags_cleared++;
            } else if (outcome.status === 'not_found') {
              counts.not_found++;
            } else {
              counts.errors++;
              error_ids.push({ task_id: t.task_id, event_id: t.event_id, http_status: outcome.http_status });
            }
          } catch (error: any) {
            counts.errors++;
            error_ids.push({ task_id: t.task_id, event_id: t.event_id });
            console.log(`calendarEventsCleanup: ${t.provider} ${t.event_id} failed — ${error.message}`);
          }
        })
      );
    }

    // Stray flags: set but with no stored event id, so nothing was ever checkable.
    // Counted on every run regardless of the task_ids scope; cleared only on execute.
    const flagged = await base44.asServiceRole.entities.Task.filter({ calendar_synced: true });
    const strayFlags = (flagged.items || flagged).filter((t: any) => !t.calendar_event_id);
    if (execute) {
      for (const t of strayFlags) {
        await base44.asServiceRole.entities.Task.update(t.id, { calendar_synced: false });
        counts.flags_cleared++;
      }
    }

    return Response.json({
      dry_run: !execute,
      execute,
      scope: explicitIds.length ? 'explicit_task_ids' : 'all_flagged_tasks',
      entries_considered: targets.length,
      stray_flags_found: strayFlags.length,
      counts,
      ...(execute ? {} : { would_delete }),
      // Ids only, never titles or descriptions.
      mismatches,
      error_ids,
    });
  } catch (error: any) {
    console.error(`calendarEventsCleanup error at stage "${stage}":`, error);
    return Response.json({ error: error.message, stage }, { status: 500 });
  }
}