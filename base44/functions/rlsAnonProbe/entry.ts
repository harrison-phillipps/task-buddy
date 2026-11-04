import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { secrets } from 'base44:runtime';

/**
 * TEMPORARY security probe — reports STATUS CODES AND ROW COUNTS ONLY.
 *
 * Asks the platform's own entity REST endpoint for four entities while sending
 * NO Authorization header (an anonymous visitor holding only the app id), and
 * again with a deliberately invalid token. Never returns row contents: only
 * http status, a row count, and the service-role row count for reference.
 *
 * Admin-only, read-only. Delete once the finding is recorded.
 */

const ENTITIES = ['CalendarEvent', 'TeamTemplate', 'Task', 'Team'];

async function read(url: string, headers: Record<string, string>) {
  try {
    const res = await fetch(url, { method: 'GET', headers, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return { status: res.status, rows: null };
    const body = await res.json().catch(() => null);
    const rows = Array.isArray(body) ? body : (body?.items ?? body?.data ?? []);
    return { status: res.status, rows: Array.isArray(rows) ? rows.length : null };
  } catch (error) {
    return { status: null, rows: null, network_error: String((error as Error)?.message ?? error) };
  }
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e: any) => (e?.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admins only' }, { status: 403 });

    const appId = secrets.get('BASE44_APP_ID');
    const base = `https://base44.app/api/apps/${appId}/entities`;

    const results = [];
    for (const entity of ENTITIES) {
      const url = `${base}/${entity}?limit=500`;
      const anonymous = await read(url, { Accept: 'application/json' });
      const invalidToken = await read(url, { Accept: 'application/json', Authorization: 'Bearer invalid-probe-token' });
      const serviceRows = await base44.asServiceRole.entities[entity].count().catch(() => null);
      results.push({
        entity,
        no_auth_status: anonymous.status,
        no_auth_rows: anonymous.rows,
        invalid_token_status: invalidToken.status,
        invalid_token_rows: invalidToken.rows,
        service_role_rows: serviceRows,
        network_error: anonymous.network_error ?? null,
      });
    }

    return Response.json({ checked_against: 'platform entity REST endpoint', results });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}