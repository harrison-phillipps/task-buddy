import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

// AUD price IDs
const PRICES = {
  pro: {
    monthly: 'price_1T6kMQGYED6zM9vpitH2naNL',
    yearly: 'price_1T6kMQGYED6zM9vpFgNxNJ7F',
  },
  premium: {
    monthly: 'price_1T6kMQGYED6zM9vphlxkavnW',
    yearly: 'price_1T6kMQGYED6zM9vpFFCQDt1E',
  },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { tier, billingPeriod } = await req.json();

    const priceId = PRICES[tier]?.[billingPeriod];
    if (!priceId) return Response.json({ error: 'Invalid plan selected' }, { status: 400 });

    const origin = req.headers.get('origin') || 'https://app.base44.com';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/Subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/Subscription?cancelled=true`,
      customer_email: user.email,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        user_id: user.id,
        tier,
        billing_period: billingPeriod,
      },
      subscription_data: {
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          user_id: user.id,
          tier,
        },
      },
    });

    console.log(`Checkout session created for user ${user.id}, tier=${tier}, period=${billingPeriod}`);
    return Response.json({ url: session.url });
  } catch (error) {
    console.error('createCheckout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});