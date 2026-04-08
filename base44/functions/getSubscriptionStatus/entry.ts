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
      return Response.json({
        status: 'none',
        tier: user.subscription_tier || 'free',
        cancel_at: null,
        current_period_end: null,
        billing_interval: null,
      });
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price.product']
    });

    const item = subscription.items.data[0];
    const price = item?.price;
    const interval = price?.recurring?.interval || null;
    const amount = price ? (price.unit_amount / 100).toFixed(2) : null;
    const currency = price?.currency?.toUpperCase() || 'AUD';

    console.log(`Fetched subscription status for user ${user.id}: ${subscription.status}`);

    return Response.json({
      status: subscription.status,
      tier: user.subscription_tier || 'free',
      cancel_at_period_end: subscription.cancel_at_period_end,
      cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      billing_interval: interval,
      amount,
      currency,
    });
  } catch (error) {
    console.error(`Get subscription status error: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});