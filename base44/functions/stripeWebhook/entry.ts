import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  
  if (!signature || !webhookSecret) {
    console.error("Missing signature or webhook secret");
    return Response.json({ error: 'Webhook validation failed' }, { status: 400 });
  }

  let event;
  
  try {
    const body = await req.text();
    
    // Initialize base44 client
    const base44 = createClientFromRequest(req);
    
    // Verify webhook signature (async in Deno)
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );
    
    console.log(`Received webhook event: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata.user_id;
        const tier = session.metadata.tier;
        
        if (userId && tier) {
          console.log(`Upgrading user ${userId} to ${tier}`);
          
          // Update user's subscription tier
          const users = await base44.asServiceRole.entities.User.filter({ id: userId });
          if (users.length > 0) {
            await base44.asServiceRole.entities.User.update(userId, {
              subscription_tier: tier,
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription
            });
            console.log(`Successfully upgraded user ${userId} to ${tier}`);
          } else {
            console.error(`User not found: ${userId}`);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userId = subscription.metadata.user_id;
        
        if (userId) {
          const status = subscription.status;
          console.log(`Subscription updated for user ${userId}: ${status}`);
          
          if (status === 'canceled' || status === 'past_due' || status === 'unpaid') {
            await base44.asServiceRole.entities.User.update(userId, {
              subscription_tier: 'free'
            });
            console.log(`Downgraded user ${userId} to free (status: ${status})`);
          } else if (status === 'active') {
            // Re-activate if previously downgraded (e.g. payment recovered after past_due)
            const tier = subscription.metadata.tier;
            if (tier) {
              await base44.asServiceRole.entities.User.update(userId, {
                subscription_tier: tier,
                stripe_subscription_id: subscription.id,
                subscription_cancel_at: null
              });
              console.log(`Re-activated user ${userId} to ${tier}`);
              }
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = subscription.metadata.user_id;
        
        if (userId) {
          console.log(`Subscription cancelled for user ${userId}`);
          await base44.asServiceRole.entities.User.update(userId, {
            subscription_tier: 'free',
            stripe_subscription_id: null,
            subscription_cancel_at: null
          });
          console.log(`Downgraded user ${userId} to free`);
        }
        break;
      }

      case 'invoice.paid': {
        // Confirm tier on successful renewal
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const userId = sub.metadata.user_id;
          const tier = sub.metadata.tier;
          if (userId && tier) {
            await base44.asServiceRole.entities.User.update(userId, {
              subscription_tier: tier
            });
            console.log(`Confirmed renewal for user ${userId}, tier: ${tier}`);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log(`Payment failed for invoice ${invoice.id}, customer: ${invoice.customer}`);
        // Stripe will retry and eventually fire subscription.updated with past_due — no action needed here
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error(`Webhook error: ${error.message}`);
    return Response.json({ 
      error: 'Webhook processing failed',
      details: error.message 
    }, { status: 400 });
  }
});