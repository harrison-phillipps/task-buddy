/**
 * RevenueCatWebhook
 *
 * Receives RevenueCat webhook events and keeps the user's subscription_tier
 * in sync for native (App Store / Play Store) purchases. Runs in parallel
 * to the Stripe webhook — does NOT touch stripe_customer_id or
 * subscription_cancel_at, which are Stripe-only fields.
 *
 * Auth: RevenueCat sends a bearer token in the Authorization header; verify
 * it against REVENUECAT_WEBHOOK_SECRET before processing.
 *
 * Entitlement → tier mapping reuses the same pro/premium values as
 * verifyMobileReceipt's PRODUCT_TIER_MAP and FeatureGate.jsx.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Entitlement IDs (configured in the RevenueCat dashboard) → internal tier.
// Reuses the exact tier values FeatureGate.jsx and verifyMobileReceipt expect.
const ENTITLEMENT_TIER_MAP = {
  pro: 'pro',
  premium: 'premium',
};

// Fallback: product ID → tier (mirrors verifyMobileReceipt's PRODUCT_TIER_MAP
// for cases where entitlement_ids is null but product_id is present).
const PRODUCT_TIER_MAP = {
  'com.taskbuddy.pro.monthly':     'pro',
  'com.taskbuddy.pro.yearly':      'pro',
  'com.taskbuddy.premium.monthly': 'premium',
  'com.taskbuddy.premium.yearly':  'premium',
  'taskbuddy_pro_monthly':         'pro',
  'taskbuddy_pro_yearly':          'pro',
  'taskbuddy_premium_monthly':     'premium',
  'taskbuddy_premium_yearly':      'premium',
  // Play Store products in this project use a colon. They carry no
  // entitlement in RevenueCat, so this map is the only tier resolver.
  'taskbuddy_pro:monthly':         'pro',
  'taskbuddy_pro:yearly':          'pro',
  'taskbuddy_premium:monthly':     'premium',
  'taskbuddy_premium:yearly':      'premium',
};

// Tier ordering for promo comparisons: free < pro < premium.
const TIER_RANK = { free: 0, pro: 1, premium: 2 };

// RevenueCat store → internal platform label
const STORE_PLATFORM_MAP = {
  APP_STORE: 'ios',
  MAC_APP_STORE: 'ios',
  PLAY_STORE: 'android',
};

// Events that grant or update access
const GRANT_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
]);

// Events that remove access
const REVOKE_EVENTS = new Set(['EXPIRATION']);

// CANCELLATION is logged only — per RevenueCat docs, auto-renewal may still
// be active through the period end, so we don't downgrade until EXPIRATION.

function resolveTier(event) {
  // Prefer entitlement_ids (RevenueCat's source of truth for access)
  const entitlements = event.entitlement_ids || [];
  for (const id of entitlements) {
    if (ENTITLEMENT_TIER_MAP[id]) return ENTITLEMENT_TIER_MAP[id];
  }
  // Fall back to product_id mapping
  if (event.product_id && PRODUCT_TIER_MAP[event.product_id]) {
    return PRODUCT_TIER_MAP[event.product_id];
  }
  return null;
}

function resolveUserId(event) {
  // app_user_id should be our internal user id (set at RevenueCat SDK init).
  // original_app_user_id is the first id RevenueCat saw for this user.
  return event.app_user_id || event.original_app_user_id || null;
}

// Base44 throws a Base44Error with status 404 and message "<Entity> not found"
// for a missing record. Match only that shape — transient errors (timeout,
// rate limit, network) have a different name/status and must return 500.
function isNotFound(err) {
  return err?.name === 'Base44Error' && err?.status === 404;
}

Deno.serve(async (req) => {
  // ── Auth: verify bearer token ──
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  if (!secret) {
    console.error('REVENUECAT_WEBHOOK_SECRET not set');
    return new Response('Webhook secret not configured', { status: 500 });
  }
  if (!token || token !== secret) {
    console.warn('RevenueCat webhook: unauthorized — missing or invalid token');
    return new Response('Unauthorized', { status: 401 });
  }

  let payload;
  try {
    payload = await req.json();
  } catch (err) {
    console.error('RevenueCat webhook: invalid JSON body:', err.message);
    return new Response('Invalid JSON', { status: 400 });
  }

  const event = payload?.event;
  if (!event || !event.type) {
    console.warn('RevenueCat webhook: missing event.type — raw payload:', JSON.stringify(payload));
    return new Response('Missing event', { status: 400 });
  }

  // ── RAW PAYLOAD LOG ──────────────────────────────────────────────
  // Logged before any processing so we can always see what RevenueCat
  // actually delivered. Lets us distinguish:
  //   (a) nothing delivered at all        → no log line appears
  //   (b) anonymous/mismatched app_user_id → app_user_id is null / anonymous /
  //       doesn't look like a Base44 id, or original_app_user_id differs
  //   (c) entitlement_ids don't map      → entitlement_ids is null/empty/
  //       contains an id not in ENTITLEMENT_TIER_MAP
  console.log('[RevenueCat RAW] ========================================');
  console.log(`[RevenueCat RAW] event.type=${event.type}`);
  console.log(`[RevenueCat RAW] event.environment=${event.environment || '(none)'}`);
  console.log(`[RevenueCat RAW] event.store=${event.store || '(none)'}`);
  console.log(`[RevenueCat RAW] event.app_user_id=${event.app_user_id ?? '(null)'}`);
  console.log(`[RevenueCat RAW] event.original_app_user_id=${event.original_app_user_id ?? '(null)'}`);
  console.log(`[RevenueCat RAW] event.aliases=${JSON.stringify(event.aliases ?? null)}`);
  console.log(`[RevenueCat RAW] event.entitlement_ids=${JSON.stringify(event.entitlement_ids ?? null)}`);
  console.log(`[RevenueCat RAW] event.product_id=${event.product_id ?? '(null)'}`);
  console.log(`[RevenueCat RAW] event.subscribed_at_ms=${event.subscribed_at_ms ?? '(null)'}`);
  console.log(`[RevenueCat RAW] event.expiration_at_ms=${event.expiration_at_ms ?? '(null)'}`);
  console.log(`[RevenueCat RAW] full payload=${JSON.stringify(payload)}`);
  console.log('[RevenueCat RAW] ========================================');

  const env = event.environment || 'UNKNOWN';
  const store = event.store || 'UNKNOWN';

  // A comped promotional grant. RevenueCat reports these as
  // NON_RENEWING_PURCHASE from the PROMOTIONAL store; only that exact
  // combination is a grant. Any other NON_RENEWING_PURCHASE stays ignored.
  const isPromoStore = String(event.store || '').toUpperCase() === 'PROMOTIONAL';
  const isPromoGrant = event.type === 'NON_RENEWING_PURCHASE' && isPromoStore;

  // ── Only act on known event types; log and no-op on everything else ──
  if (
    !isPromoGrant &&
    !GRANT_EVENTS.has(event.type) &&
    !REVOKE_EVENTS.has(event.type) &&
    event.type !== 'CANCELLATION'
  ) {
    console.log(`RevenueCat: ignoring event type ${event.type}`);
    return Response.json({ received: true, ignored: true });
  }

  const base44 = createClientFromRequest(req);

  try {
    // ── CANCELLATION: log only, no tier change ──
    if (event.type === 'CANCELLATION') {
      console.log(`RevenueCat CANCELLATION for ${event.app_user_id} — access retained until EXPIRATION (env=${env})`);
      return Response.json({ received: true, cancelled: true });
    }

    const userId = resolveUserId(event);
    if (!userId) {
      console.warn(`RevenueCat webhook: no app_user_id for event ${event.type} — cannot resolve user`);
      return Response.json({ received: true, error: 'no_app_user_id' }, { status: 200 });
    }

    // ── Ignore events for users who have deleted their account. Only treat a
    // genuine not-found as "deleted"; any other User.get error (timeout, rate
    // limit, network) returns 500 so RevenueCat retries the delivery.
    let existingUser = null;
    try {
      const u = await base44.asServiceRole.entities.User.get(userId);
      existingUser = u;
      if (u?.deleted_at) {
        console.log(`RevenueCat ${event.type}: user ${userId} has deleted_at set — ignoring`);
        return Response.json({ received: true, ignored: true, deleted: true });
      }
    } catch (err) {
      if (isNotFound(err)) {
        console.log(`RevenueCat ${event.type}: user ${userId} not found (deleted) — ignoring`);
        return Response.json({ received: true, ignored: true, deleted: true });
      }
      console.error(`RevenueCat ${event.type}: User.get error for ${userId} (non-not-found):`, err.message);
      return new Response('Handler error', { status: 500 });
    }

    // Promo grants must carry an end date: without one nothing would ever
    // expire them, so refuse rather than grant access with no expiry.
    if (isPromoGrant && !event.expiration_at_ms) {
      console.warn(`RevenueCat PROMOTIONAL: user ${userId} has no expiration_at_ms — not granting (entitlements=${JSON.stringify(event.entitlement_ids ?? null)})`);
      return Response.json({ received: true, error: 'promo_missing_expiration' }, { status: 200 });
    }

    // A promo must never replace or shorten paid access, and a lower tier must
    // never replace a higher one. It applies only to a free/unset account, or
    // extends an existing promo when it runs later AND is the same or higher tier.
    if (isPromoGrant) {
      const newTier = resolveTier(event);
      const currentTier = existingUser?.subscription_tier || null;
      const currentPlatform = existingUser?.subscription_platform || null;
      const currentExpiryMs = existingUser?.subscription_expires_at
        ? new Date(existingUser.subscription_expires_at).getTime()
        : null;
      const rank = (t) => TIER_RANK[t] ?? -1;

      let skipReason = null;
      if (currentTier && currentTier !== 'free') {
        if (currentPlatform !== 'promo') skipReason = 'paid_subscription_present';
        else if (currentExpiryMs === null) skipReason = 'promo_current_expiry_missing';
        else if (!(event.expiration_at_ms > currentExpiryMs)) skipReason = 'promo_not_extending_current_expiry';
        else if (rank(newTier) < rank(currentTier)) skipReason = 'promo_lower_tier_than_current';
      }

      if (skipReason) {
        console.log(`RevenueCat PROMOTIONAL: promo skipped for user ${userId} — reason=${skipReason} (current_tier=${currentTier} current_platform=${currentPlatform ?? '(none)'} current_expires=${existingUser?.subscription_expires_at ?? '(none)'} new_tier=${newTier ?? '(unresolved)'} new_expires=${new Date(event.expiration_at_ms).toISOString()})`);
        return Response.json({ received: true, ignored: true, reason: skipReason });
      }
    }

    // ── EXPIRATION: downgrade to free ──
    if (event.type === 'EXPIRATION') {
      // A PROMOTIONAL expiration must only affect an account that actually holds
      // promo access, and only once its stored promo has genuinely lapsed.
      if (isPromoStore) {
        if (existingUser?.subscription_platform !== 'promo') {
          console.log(`RevenueCat EXPIRATION (PROMOTIONAL): promo ignored for user ${userId} — platform=${existingUser?.subscription_platform ?? '(none)'}, not a promo account`);
          return Response.json({ received: true, ignored: true, reason: 'expiration_not_promo_platform' });
        }
        const storedExpiryMs = existingUser?.subscription_expires_at
          ? new Date(existingUser.subscription_expires_at).getTime()
          : null;
        if (storedExpiryMs !== null && storedExpiryMs > Date.now()) {
          console.log(`RevenueCat EXPIRATION (PROMOTIONAL): promo ignored for user ${userId} — stored subscription_expires_at=${existingUser.subscription_expires_at} is still in the future`);
          return Response.json({ received: true, ignored: true, reason: 'promo_not_yet_expired' });
        }
      }
      try {
        await base44.asServiceRole.entities.User.update(userId, {
          subscription_tier: 'free',
          subscription_expires_at: null,
          subscription_platform: STORE_PLATFORM_MAP[store] || null,
        });
        console.log(`RevenueCat EXPIRATION: user ${userId} downgraded to free (env=${env})`);
      } catch (err) {
        console.warn(`RevenueCat EXPIRATION: failed to update user ${userId} (possibly deleted account):`, err.message);
      }
      return Response.json({ received: true, expired: true });
    }

    // ── Grant events (INITIAL_PURCHASE, RENEWAL, PRODUCT_CHANGE, UNCANCELLATION) ──
    const tier = resolveTier(event);
    if (!tier) {
      console.error(`RevenueCat ${event.type}: could not resolve tier — store=${store} product_id=${event.product_id ?? '(none)'} entitlement_ids=${JSON.stringify(event.entitlement_ids ?? null)}`);
      return Response.json({ received: true, error: 'tier_not_resolved' }, { status: 200 });
    }

    const platform = isPromoGrant ? 'promo' : (STORE_PLATFORM_MAP[store] || null);
    const expiresAt = event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : null;

    try {
      await base44.asServiceRole.entities.User.update(userId, {
        subscription_tier: tier,
        subscription_platform: platform,
        subscription_expires_at: expiresAt,
      });
      console.log(
        isPromoGrant
          ? `RevenueCat PROMOTIONAL GRANT: user ${userId} → tier=${tier} platform=promo expires=${expiresAt} (entitlements=${JSON.stringify(event.entitlement_ids ?? null)})`
          : `RevenueCat ${event.type}: user ${userId} → tier=${tier} platform=${platform} expires=${expiresAt} (env=${env})`
      );
    } catch (err) {
      console.warn(`RevenueCat ${event.type}: failed to update user ${userId} (possibly deleted account):`, err.message);
    }

    return Response.json({ received: true, tier, platform, expiresAt });
  } catch (err) {
    console.error(`RevenueCat webhook error handling ${event.type}:`, err.message);
    return new Response('Handler error', { status: 500 });
  }
});