import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const client = base44.asServiceRole;

    const now = new Date();
    console.log(`Checking expired mobile subscriptions at ${now.toISOString()}`);

    // Fetch all users (subscription_* fields aren't in the declared schema,
    // so filter in JS — same approach sendUpcomingTaskReminders uses for users)
    const users = await client.entities.User.list();

    const expired = users.filter(u =>
      (u.subscription_platform === 'ios' || u.subscription_platform === 'android') &&
      u.subscription_tier &&
      u.subscription_tier !== 'free' &&
      u.subscription_expires_at &&
      new Date(u.subscription_expires_at) <= now
    );

    if (expired.length === 0) {
      console.log('No expired mobile subscriptions found');
      return Response.json({ checked: users.length, downgraded: 0 });
    }

    let downgraded = 0;
    for (const user of expired) {
      try {
        await client.entities.User.update(user.id, { subscription_tier: 'free' });
        downgraded++;
        console.log(`Downgraded user ${user.email || user.id}: ${user.subscription_tier} -> free (platform: ${user.subscription_platform}, expired: ${user.subscription_expires_at})`);
      } catch (err) {
        console.error(`Failed to downgrade user ${user.email || user.id}:`, err.message);
      }
    }

    console.log(`Done. Downgraded ${downgraded} of ${expired.length} expired mobile subscriptions.`);
    return Response.json({ checked: users.length, downgraded });
  } catch (error) {
    console.error('checkExpiredMobileSubscriptions error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});