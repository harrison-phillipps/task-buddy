/**
 * calendarEventsCleanup — admin-only, one-off reconciliation probe.
 *
 * Default (and only) behaviour: fetch every stored external event id from the
 * connected Google / Outlook calendar and report found / not found / error
 * counts. It NEVER deletes, moves or edits anything.
 *
 * A later run must pass { execute: true } explicitly. Until deletion is
 * implemented and reviewed, that returns 400 and does no work at all.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { requireAdmin } from '../../shared/authGuard.ts';

const GCAL_BASE = 'https://www.googleapis.com/calendar/v3';
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const MAX_IDS = 200;

function classifyEventId(id: string): 'google' | 'outlook' | 'unknown' {
  const s = String(id || '');
  if (!s) return 'unknown';
  // Graph ids are long, base64url-ish and prefixed AAMk/AQMk.
  if (/^(AAMk|AQMk)/.test(s) || (/[-_=]/.test(s) && s.length > 60)) return 'outlook';
  // Google event ids are short lowercase base32hex.
  if (/^[a-z0-9]{5,60}$/.test(s)) return 'google';
  return 'unknown';
}

async function probeEvent(url: string, accessToken: string) {
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10000),
  });
  if (res.ok) return { status: 'found' as const };
  if (res.status === 404 || res.status === 410) return { status: 'not_found' as const };
  return { status: 'error' as const, http_status: res.status };
}

export default async function (req: Request): Promise<Response> {
  let stage = 'init';
  try {
    const base44 = createClientFromRequest(req);

    // Admin only: 401 with no session, 403 for any non-admin caller.
    const gate = await requireAdmin(base44);
    if (!gate.ok) return gate.response;

    const body = await req.json().catch(() => ({}));

    // Deletion is deliberately not implemented yet. An explicit execute run is
    // refused before any API call, so this build can never destroy anything.
    if (body?.execute === true) {
      return Response.json(
        {
          error: 'execute_not_implemented',
          message: 'This build only probes. Deletion is not implemented yet — call without execute to get the report.',
          deleted: 0,
        },
        { status: 400 }
      );
    }

    const explicitIds: string[] = Array.isArray(body?.task_ids)
      ? body.task_ids.filter((x: unknown) => typeof x === 'string' && x).slice(0, MAX_IDS)
      : [];

    // Default scope: every flagged task that stores an external event id.
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

    // Probe in small concurrent batches to stay inside the connection limit.
    const results: any[] = [];
    for (let i = 0; i < targets.length; i += 6) {
      const chunk = targets.slice(i, i + 6);
      const probed = await Promise.all(
        chunk.map(async (t: any) => {
          if (t.provider === 'unknown') return { task_id: t.task_id, provider: t.provider, status: 'unknown_provider' };
          const token = tokens[t.provider];
          if (!token) return { task_id: t.task_id, provider: t.provider, status: 'no_connection' };
          try {
            const url =
              t.provider === 'google'
                ? `${GCAL_BASE}/calendars/primary/events/${encodeURIComponent(t.event_id)}`
                : `${GRAPH_BASE}/me/events/${encodeURIComponent(t.event_id)}`;
            const outcome = await probeEvent(url, token);
            return { task_id: t.task_id, provider: t.provider, ...outcome };
          } catch (error: any) {
            return { task_id: t.task_id, provider: t.provider, status: 'error', error: error.message };
          }
        })
      );
      results.push(...probed);
    }

    const counts: Record<string, number> = {};
    const byProvider: Record<string, Record<string, number>> = {};
    for (const r of results) {
      counts[r.status] = (counts[r.status] || 0) + 1;
      byProvider[r.provider] = byProvider[r.provider] || {};
      byProvider[r.provider][r.status] = (byProvider[r.provider][r.status] || 0) + 1;
    }

    return Response.json({
      dry_run: true,
      execute_requested: false,
      scope: explicitIds.length ? 'explicit_task_ids' : 'all_flagged_tasks',
      probed: results.length,
      counts,
      by_provider: byProvider,
      // Only the rows worth acting on: everything that is not a clean "found".
      not_found_or_error: results.filter((r) => r.status !== 'found'),
      deleted: 0,
    });
  } catch (error: any) {
    console.error(`calendarEventsCleanup error at stage "${stage}":`, error);
    return Response.json({ error: error.message, stage }, { status: 500 });
  }
}