import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

const PRICE_IDS = {
  pro_monthly: "price_1SwE0OGWwMNXSBYQu2NSZgQh",
  pro_yearly: "price_1SwE0OGWwMNXSBYQUg2Ol7ry",
  premium_monthly: "price_1SwE0OGWwMNXSBYQIbGaXrLA",
  premium_yearly: "price_1SwE0OGWwMNXSBYQCfZqO7ZR"
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tier, billingPeriod } = await req.json();

    if (!tier || !billingPeriod) {
      return Response.json({ error: 'Missing tier or billingPeriod' }, { status: 400 });
    }

    if (tier === 'free') {
      return Response.json({ error: 'Free tier does not require checkout' }, { status: 400 });
    }

    const priceKey = `${tier}_${billingPeriod}`;
    const priceId = PRICE_IDS[priceKey];

    if (!priceId) {
      console.error(`Invalid price key: ${priceKey}`);
      return Response.json({ error: 'Invalid tier or billing period' }, { status: 400 });
    }

    // Get the app origin from the request
    const origin = req.headers.get('origin') || req.headers.get('referer');
    const successUrl = origin ? `${origin}/#/Subscription?success=true` : 'https://app.base44.com';
    const cancelUrl = origin ? `${origin}/#/Subscription?cancelled=true` : 'https://app.base44.com';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        user_id: user.id,
        tier: tier,
        billing_period: billingPeriod
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          tier: tier
        }
      }
    });

    console.log(`Created checkout session for user ${user.email}, tier: ${tier}, billing: ${billingPeriod}`);

    return Response.json({ 
      url: session.url,
      sessionId: session.id 
    });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return Response.json({ 
      error: 'Failed to create checkout session',
      details: error.message 
    }, { status: 500 });
  }
});