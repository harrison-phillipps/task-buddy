import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscriptionId = user.stripe_subscription_id;
    if (!subscriptionId) {
      return Response.json({ error: 'No active subscription found' }, { status: 400 });
    }

    console.log(`Cancelling subscription ${subscriptionId} for user ${user.id}`);

    // Cancel at period end (not immediately)
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });

    const cancelAt = new Date(subscription.current_period_end * 1000).toISOString();

    // Store the cancel_at date on the user record
    await base44.asServiceRole.entities.User.update(user.id, {
      subscription_cancel_at: cancelAt
    });

    console.log(`Subscription set to cancel at ${cancelAt} for user ${user.id}`);

    return Response.json({
      success: true,
      cancel_at: cancelAt
    });
  } catch (error) {
    console.error(`Cancel subscription error: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});