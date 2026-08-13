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

        const previousTier = user.subscription_tier;
        const notifMessage = `Your ${previousTier} subscription has expired and your account has moved to the free plan. Resubscribe to keep your premium features.`;

        // 1. In-app notification — matches stripeWebhook invoice.payment_failed pattern
        try {
          await client.entities.Notification.create({
            user_id: user.id,
            type: 'general',
            title: 'Subscription Expired',
            message: notifMessage,
            priority: 'high',
            is_read: false,
            action_url: '/Subscription',
            sent_at: new Date().toISOString(),
          });
          console.log(`Expiry notification sent to user ${user.id} (${user.email})`);
        } catch (notifErr) {
          console.error(`Failed to send expiry notification to ${user.email || user.id}:`, notifErr.message);
        }

        // 2. Email notification
        try {
          await client.integrations.Core.SendEmail({
            to: user.email,
            subject: 'Your TaskBuddy subscription has expired',
            body: `
              <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 24px;">
                <h2 style="color: #FB7185;">Subscription Expired</h2>
                <p>Hi ${user.full_name || 'there'},</p>
                <p>${notifMessage}</p>
                <p>You can resubscribe any time to restore access to your premium features.</p>
                <a href="https://taskbuddyapp.online/Subscription" style="background: #8B5CF6; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 12px;">
                  Resubscribe
                </a>
                <p style="font-size: 12px; color: #999; margin-top: 24px;">
                  You can manage your subscription in your TaskBuddy settings.
                </p>
              </div>
            `,
          });
          console.log(`Expiry email sent to ${user.email}`);
        } catch (emailErr) {
          console.error(`Failed to send expiry email to ${user.email}:`, emailErr.message);
        }
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