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
          let existing;
          try {
            existing = await base44.asServiceRole.entities.User.get(userId);
          } catch (err) {
            console.warn(`User ${userId} not found for checkout.session.completed (possibly deleted account) — skipping update:`, err.message);
            break;
          }
          const update = { subscription_tier: tier };
          if (session.customer && !existing?.stripe_customer_id) {
            update.stripe_customer_id = session.customer;
          }
          try {
            await base44.asServiceRole.entities.User.update(userId, update);
            console.log(`User ${userId} upgraded to ${tier}`);
          } catch (err) {
            console.warn(`Failed to update user ${userId} during checkout.session.completed — skipping:`, err.message);
          }
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
          try {
            await base44.asServiceRole.entities.User.update(userId, {
              subscription_tier: tier,
              subscription_cancel_at: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
            });
            console.log(`User ${userId} subscription updated to ${tier}`);
          } catch (err) {
            console.warn(`Failed to update user ${userId} during customer.subscription.updated (possibly deleted account) — skipping:`, err.message);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const userId = sub.metadata?.user_id;
        if (userId) {
          try {
            await base44.asServiceRole.entities.User.update(userId, {
              subscription_tier: 'free',
              subscription_cancel_at: null,
            });
            console.log(`User ${userId} downgraded to free`);
          } catch (err) {
            console.warn(`Failed to downgrade user ${userId} during customer.subscription.deleted (possibly deleted account) — skipping:`, err.message);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.warn(`Payment failed for customer ${invoice.customer}, subscription ${invoice.subscription}`);

        // Look up user via stripe_customer_id (not email) — consistent with
        // the ownership-verification pattern in cancelSubscription / getSubscriptionStatus.
        const users = await base44.asServiceRole.entities.User.filter({
          stripe_customer_id: invoice.customer,
        });
        const user = users[0];
        if (!user) {
          console.warn(`No user found for stripe_customer_id ${invoice.customer} — cannot notify`);
          break;
        }

        const notifMessage = "Your subscription payment didn't go through. Please update your billing details to avoid losing access to your premium features.";

        // 1. In-app notification
        await base44.asServiceRole.entities.Notification.create({
          user_id: user.id,
          type: 'general',
          title: '⚠️ Payment Failed',
          message: notifMessage,
          priority: 'high',
          is_read: false,
          action_url: '/Subscription',
          sent_at: new Date().toISOString(),
        });

        // 2. Email notification
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: user.email,
            subject: '⚠️ Action needed: Your TaskBuddy payment failed',
            body: `
              <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 24px;">
                <h2 style="color: #FB7185;">Payment Failed</h2>
                <p>Hi ${user.full_name || 'there'},</p>
                <p>${notifMessage}</p>
                <p>Stripe will automatically retry the payment, but if it keeps failing your subscription will be cancelled and your account will revert to the free plan.</p>
                <a href="https://taskbuddyapp.online/Subscription" style="background: #8B5CF6; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 12px;">
                  Update Billing Details
                </a>
                <p style="font-size: 12px; color: #999; margin-top: 24px;">
                  You can manage your subscription in your TaskBuddy settings.
                </p>
              </div>
            `,
          });
          console.log(`Payment failure email sent to ${user.email}`);
        } catch (emailErr) {
          console.error(`Failed to send payment failure email to ${user.email}:`, emailErr.message);
        }

        console.log(`Payment failure notification sent to user ${user.id} (${user.email})`);
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