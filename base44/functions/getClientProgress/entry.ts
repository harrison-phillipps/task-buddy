import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { asRows, readAll } from '../../shared/entityResults.ts';

// Returns an aggregate progress summary for one client, but only if the caller's
// own ClinicianProfile lists that client. Task and UserProgress are read with the
// service role so the clinician sees the client's rows without either entity
// being opened up. Nothing identifying the client's work leaves this function:
// no titles, no notes, no ids — only counts, rates and time-of-day buckets.
const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE = 200;
const MAX_PAGES = 25;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const clientUserId = typeof body?.client_user_id === 'string' ? body.client_user_id.trim() : '';
    if (!clientUserId) {
      return Response.json({ error: 'client_user_id is required' }, { status: 400 });
    }

    const profiles = asRows(await base44.asServiceRole.entities.ClinicianProfile.filter({ user_id: user.id }));
    const profile = profiles?.[0];
    const clients = Array.isArray(profile?.clients) ? profile.clients : [];
    if (!profile || !clients.some((c) => c.client_user_id === clientUserId)) {
      console.warn(`[getClientProgress] user ${user.id} is not linked to client ${clientUserId}`);
      return Response.json({ error: 'This client is not linked to you' }, { status: 403 });
    }

    const now = new Date();
    const since = new Date(now.getTime() - 60 * DAY_MS).toISOString();

    // Every task the client created in the last 60 days, paginated — not a
    // "latest N" slice, which would skew the month-on-month comparison.
    const tasks = await readAll(
      base44.asServiceRole.entities.Task,
      { created_by_id: clientUserId, created_date: { $gte: since } },
      { limit: PAGE, maxPages: MAX_PAGES, sort: '-created_date' }
    );
    console.log(`[getClientProgress] client ${clientUserId}: ${tasks.length} tasks in 60-day window`);

    const progressList = asRows(await base44.asServiceRole.entities.UserProgress.filter({ user_id: clientUserId }));
    const progress = progressList[0] || null;

    // Bucket by the client's own clock; the browser passes minutes east of UTC.
    const offsetMinutes = Number.isFinite(Number(body?.tz_offset_minutes)) ? Number(body.tz_offset_minutes) : 0;
    const localHour = (iso) => {
      const ms = new Date(iso).getTime();
      if (!Number.isFinite(ms)) return null;
      return new Date(ms + offsetMinutes * 60000).getUTCHours();
    };

    const createdMs = (t) => new Date(t.created_date).getTime();
    const cutoff30 = now.getTime() - 30 * DAY_MS;
    const thisMonth = tasks.filter((t) => createdMs(t) >= cutoff30);
    const lastMonth = tasks.filter((t) => createdMs(t) < cutoff30);
    const completedThisMonth = thisMonth.filter((t) => t.status === 'completed').length;

    // Prefer the explicit completed_at stamp. Tasks finished before that field
    // existed fall back to updated_date, which only approximates completion time
    // because any later edit moves it — so the split is reported, not hidden.
    const bestTimeOfDay = { morning: 0, afternoon: 0, evening: 0 };
    const completionTimeBasis = { completed_at: 0, approximate_updated_date: 0 };
    tasks.forEach((t) => {
      if (t.status !== 'completed') return;
      const stamp = t.completed_at || t.updated_date;
      if (!stamp) return;
      const h = localHour(stamp);
      if (h === null) return;
      if (h >= 6 && h < 12) bestTimeOfDay.morning++;
      else if (h >= 12 && h < 17) bestTimeOfDay.afternoon++;
      else if (h >= 17 && h < 21) bestTimeOfDay.evening++;
      if (t.completed_at) completionTimeBasis.completed_at++;
      else completionTimeBasis.approximate_updated_date++;
    });

    return Response.json({
      period_days: 60,
      tasks_in_window: tasks.length,
      tasks_initiated_this_month: thisMonth.length,
      tasks_initiated_last_month: lastMonth.length,
      tasks_completed_this_month: completedThisMonth,
      completion_rate: thisMonth.length > 0 ? Math.round((completedThisMonth / thisMonth.length) * 100) : 0,
      current_streak: progress?.current_streak ?? 0,
      best_time_of_day: bestTimeOfDay,
      completion_time_basis: completionTimeBasis,
    });
  } catch (error) {
    console.error('[getClientProgress] error:', error.message);
    return Response.json({ error: 'Could not load client progress' }, { status: 500 });
  }
});