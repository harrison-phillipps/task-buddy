import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const TIER_BY_PRODUCT = {
  'prod_U4sEVdoJbRr7kg': 'pro',
  'prod_U4sEu0kX769K7F': 'premium',
};

Deno.serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        const tier = session.metadata?.tier;
        if (userId && tier) {
          await base44.asServiceRole.entities.User.update(userId, { subscription_tier: tier });
          console.log(`User ${userId} upgraded to ${tier}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const userId = sub.metadata?.user_id;
        if (!userId) break;
        const productId = sub.items.data[0]?.price?.product;
        const tier = TIER_BY_PRODUCT[productId];
        if (sub.status === 'active' && tier) {
          await base44.asServiceRole.entities.User.update(userId, {
            subscription_tier: tier,
            subscription_cancel_at: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
          });
          console.log(`User ${userId} subscription updated to ${tier}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const userId = sub.metadata?.user_id;
        if (userId) {
          await base44.asServiceRole.entities.User.update(userId, {
            subscription_tier: 'free',
            subscription_cancel_at: null,
          });
          console.log(`User ${userId} downgraded to free`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.warn(`Payment failed for customer ${invoice.customer}, subscription ${invoice.subscription}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`Error handling event ${event.type}:`, err.message);
    return new Response('Handler error', { status: 500 });
  }

  return Response.json({ received: true });
});