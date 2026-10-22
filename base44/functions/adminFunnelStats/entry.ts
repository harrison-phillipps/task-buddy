import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Test and internal accounts are excluded from every number below.
const EXCLUDED_EMAILS = new Set([
  'test.taskbuddyapp@outlook.com',
  'harrison.phillipps219@schools.sa.edu.au',
  'harrison.phillipps@hotmail.com',
  'harrison.phillipps@outlook.com',
]);

const PAGE_SIZE = 200;

const asArray = (result) => (Array.isArray(result) ? result : (result?.items ?? []));

const toBuckets = (values) =>
  values.reduce((acc, key) => {
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

// Monday-start week key (YYYY-MM-DD), computed in UTC.
const weekKey = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'unknown';
  const diff = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (caller.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Optional `since` (ISO date). When supplied, only users created on or
    // after it are counted — every user-based number below narrows with it.
    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }
    const sinceInput = typeof body?.since === 'string' && body.since ? body.since : null;
    const sinceMs = sinceInput ? Date.parse(sinceInput) : null;
    if (sinceInput && Number.isNaN(sinceMs)) {
      return Response.json(
        { error: 'Invalid "since" — expected an ISO date, e.g. 2026-01-01' },
        { status: 400 }
      );
    }

    // User.list({ limit }) is rejected by the SDK ("Not available for the User
    // entity"), and base44.users exposes only inviteUser, so users cannot be
    // paged — list() returns the full set in one array.
    const allUsers = asArray(await base44.asServiceRole.entities.User.list());
    const liveUsers = allUsers.filter((u) => !u.deleted_at);
    const emailFiltered = liveUsers.filter(
      (u) => !EXCLUDED_EMAILS.has(String(u.email || '').toLowerCase())
    );
    const users = sinceMs === null
      ? emailFiltered
      : emailFiltered.filter((u) => Date.parse(u.created_date) >= sinceMs);

    // Task ownership, paged, requesting only the ownership fields.
    // owner_user_id covers recurring instances whose created_by_id is stamped
    // as service-role; otherwise created_by_id is the owner.
    const ownerIds = new Set();
    let cursor = null;
    let tasksScanned = 0;
    let taskPagesRead = 0;
    for (;;) {
      const options = { limit: PAGE_SIZE, fields: ['created_by_id', 'owner_user_id'] };
      if (cursor) options.cursor = cursor;
      const page = await base44.asServiceRole.entities.Task.list(options);
      const rows = page?.items ?? [];
      tasksScanned += rows.length;
      taskPagesRead += 1;
      for (const t of rows) {
        const owner = t.owner_user_id || t.created_by_id;
        if (owner) ownerIds.add(String(owner));
      }
      // Stop once a page comes back short, or there is nothing left to follow.
      if (rows.length < PAGE_SIZE || !page?.has_more || !page?.next_cursor) break;
      cursor = page.next_cursor;
    }

    const aiConsent = { true: 0, false: 0, null: 0 };
    const byTier = { free: 0, pro: 0, premium: 0, unset: 0 };
    const byPlatform = { ios: 0, android: 0, web: 0, unset: 0 };
    const byTierAndPlatform = {};
    let paidPlatformUnset = 0;
    let usersWithTask = 0;

    for (const u of users) {
      const consent = u.ai_consent_given === true ? 'true' : u.ai_consent_given === false ? 'false' : 'null';
      aiConsent[consent] += 1;

      const tier = ['free', 'pro', 'premium'].includes(u.subscription_tier) ? u.subscription_tier : 'unset';
      const platform = ['ios', 'android', 'web'].includes(u.subscription_platform) ? u.subscription_platform : 'unset';
      byTier[tier] += 1;
      byPlatform[platform] += 1;
      byTierAndPlatform[tier] = byTierAndPlatform[tier] || {};
      byTierAndPlatform[tier][platform] = (byTierAndPlatform[tier][platform] || 0) + 1;

      // Paid subscribers whose purchase platform isn't recorded — its own count.
      if ((tier === 'pro' || tier === 'premium') && platform === 'unset') paidPlatformUnset += 1;

      if (ownerIds.has(String(u.id))) usersWithTask += 1;
    }

    return Response.json({
      generated_at: new Date().toISOString(),
      users: {
        counted: users.length,
        excluded: allUsers.length - users.length,
        excluded_by_email: liveUsers.length - emailFiltered.length,
        excluded_before_since: emailFiltered.length - users.length,
        excluded_emails: [...EXCLUDED_EMAILS],
        since: sinceInput,
        signups_per_week: toBuckets(users.map((u) => weekKey(u.created_date))),
      },
      task_adoption: {
        users_with_at_least_one_task: usersWithTask,
        percentage: users.length ? Math.round((usersWithTask / users.length) * 1000) / 10 : 0,
        tasks_scanned: tasksScanned,
        task_pages_read: taskPagesRead,
        note: 'A user counts as adopted when they own at least one task (owner_user_id, else created_by_id).',
      },
      ai_consent: aiConsent,
      ai_breakdown_usage: {
        available: false,
        note: 'NOT available from the data. No entity field records whether a user ran an AI breakdown, and no reliable proxy exists (tasks with subtasks also include manually added ones). This metric is only readable from the first_ai_breakdown_used event on the Analytics page, and only from the point that event started firing.',
      },
      subscriptions: {
        by_tier: byTier,
        by_platform: byPlatform,
        paid_platform_unset: paidPlatformUnset,
        by_tier_and_platform: byTierAndPlatform,
        note: 'Accounts with no subscription_tier value are counted as "unset", which is not the same as free. paid_platform_unset counts pro+premium subscribers with no subscription_platform recorded.',
      },
    });
  } catch (error) {
    console.error('adminFunnelStats failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}