import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Look up customer via stored stripe_customer_id, with email fallback backfill
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (!customers.data.length) {
        return Response.json({ status: 'none' });
      }
      customerId = customers.data[0].id;
      await base44.auth.updateMe({ stripe_customer_id: customerId });
      console.log(`Backfilled stripe_customer_id ${customerId} for user ${user.id}`);
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 1,
      expand: ['data.items.data.price'],
    });

    if (!subscriptions.data.length) {
      return Response.json({ status: 'none' });
    }

    const sub = subscriptions.data[0];
    if (sub.metadata?.user_id && sub.metadata.user_id !== user.id) {
      console.error(`Subscription ${sub.id} user_id mismatch: ${sub.metadata.user_id} vs ${user.id}`);
      return Response.json({ error: 'Forbidden: subscription does not belong to this user' }, { status: 403 });
    }

    const price = sub.items.data[0]?.price;
    const tier = sub.metadata?.tier || 'unknown';

    return Response.json({
      status: sub.status,
      tier,
      billing_interval: price?.recurring?.interval || 'month',
      amount: ((price?.unit_amount || 0) / 100).toFixed(2),
      currency: (price?.currency || 'aud').toUpperCase(),
      current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
      cancel_at_period_end: sub.cancel_at_period_end,
      cancel_at: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
      subscription_id: sub.id,
    });
  } catch (error) {
    console.error('getSubscriptionStatus error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});