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
        return Response.json({ error: 'No active subscription found', code: 'NO_SUBSCRIPTION' }, { status: 404 });
      }
      customerId = customers.data[0].id;
      await base44.auth.updateMe({ stripe_customer_id: customerId });
      console.log(`Backfilled stripe_customer_id ${customerId} for user ${user.id}`);
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    if (!subscriptions.data.length) {
      return Response.json({ error: 'No active subscription found', code: 'NO_SUBSCRIPTION' }, { status: 404 });
    }

    const sub = subscriptions.data[0];
    if (sub.metadata?.user_id && sub.metadata.user_id !== user.id) {
      console.error(`Subscription ${sub.id} user_id mismatch: ${sub.metadata.user_id} vs ${user.id}`);
      return Response.json({ error: 'Forbidden: subscription does not belong to this user' }, { status: 403 });
    }

    const cancelled = await stripe.subscriptions.update(sub.id, {
      cancel_at_period_end: true,
    });

    console.log(`Subscription ${sub.id} scheduled for cancellation for user ${user.id}`);
    return Response.json({
      success: true,
      cancel_at: new Date(cancelled.current_period_end * 1000).toISOString(),
    });
  } catch (error) {
    console.error('cancelSubscription error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});