/**
 * verifyMobileReceipt
 *
 * Validates Apple App Store or Google Play purchase receipts and updates
 * the user's subscription_tier accordingly.
 *
 * Called by the native app wrapper after a successful IAP purchase.
 *
 * Payload:
 *   { platform: "ios" | "android", receipt: string, productId: string }
 *
 * iOS:  receipt = base64-encoded App Store receipt data
 * Android: receipt = JSON string of the purchase token / purchase data
 *
 * Environment variables needed (set in dashboard → Settings → Secrets):
 *   APPLE_SHARED_SECRET   — App Store Connect shared secret (for receipt validation)
 *   GOOGLE_SERVICE_ACCOUNT_JSON — Google Play service account JSON (for Android)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Map your App Store / Play Store product IDs to internal tiers
const PRODUCT_TIER_MAP = {
  // iOS product IDs (set these in App Store Connect)
  'com.taskbuddy.pro.monthly':     { tier: 'pro',     period: 'monthly' },
  'com.taskbuddy.pro.yearly':      { tier: 'pro',     period: 'yearly'  },
  'com.taskbuddy.premium.monthly': { tier: 'premium', period: 'monthly' },
  'com.taskbuddy.premium.yearly':  { tier: 'premium', period: 'yearly'  },

  // Android product IDs (set these in Google Play Console)
  'taskbuddy_pro_monthly':         { tier: 'pro',     period: 'monthly' },
  'taskbuddy_pro_yearly':          { tier: 'pro',     period: 'yearly'  },
  'taskbuddy_premium_monthly':     { tier: 'premium', period: 'monthly' },
  'taskbuddy_premium_yearly':      { tier: 'premium', period: 'yearly'  },
};

// ── Apple receipt validation ─────────────────────────────────────────────────
async function verifyAppleReceipt(receipt) {
  const sharedSecret = Deno.env.get('APPLE_SHARED_SECRET');
  if (!sharedSecret) throw new Error('APPLE_SHARED_SECRET not set');

  const body = JSON.stringify({ 'receipt-data': receipt, password: sharedSecret });

  // Try production first, fall back to sandbox
  let res = await fetch('https://buy.itunes.apple.com/verifyReceipt', {
    method: 'POST', body, headers: { 'Content-Type': 'application/json' },
  });
  let data = await res.json();

  // status 21007 = sandbox receipt sent to production endpoint → retry sandbox
  if (data.status === 21007) {
    res = await fetch('https://sandbox.itunes.apple.com/verifyReceipt', {
      method: 'POST', body, headers: { 'Content-Type': 'application/json' },
    });
    data = await res.json();
  }

  if (data.status !== 0) {
    throw new Error(`Apple receipt validation failed with status ${data.status}`);
  }

  // Find the most recent active in-app purchase
  const inApp = data.receipt?.in_app || [];
  const latest = data.latest_receipt_info || [];
  const allPurchases = [...inApp, ...latest];
  const now = Date.now();

  // Filter to non-expired subscriptions
  const active = allPurchases.filter(p => {
    const expiry = parseInt(p.expires_date_ms || '0', 10);
    return expiry > now;
  });

  if (active.length === 0) throw new Error('No active Apple subscription found');

  // Pick the one expiring latest
  active.sort((a, b) => parseInt(b.expires_date_ms) - parseInt(a.expires_date_ms));
  const purchase = active[0];

  return {
    productId: purchase.product_id,
    expiresAt: new Date(parseInt(purchase.expires_date_ms)).toISOString(),
    transactionId: purchase.transaction_id,
  };
}

// ── Google Play receipt validation ───────────────────────────────────────────
async function verifyGoogleReceipt(receipt) {
  const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
  if (!serviceAccountJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set');

  let parsed;
  try {
    parsed = JSON.parse(receipt);
  } catch {
    throw new Error('Invalid Android receipt JSON');
  }

  const { packageName, productId, purchaseToken, subscriptionId } = parsed;
  if (!packageName || !purchaseToken) throw new Error('Missing packageName or purchaseToken in Android receipt');

  const sa = JSON.parse(serviceAccountJson);

  // Build a JWT for Google OAuth2
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encode = obj => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signingInput = `${encode(header)}.${encode(claim)}`;

  // Import private key and sign
  const pemBody = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const keyDer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );
  const sigBytes = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBytes))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const jwt = `${signingInput}.${sig}`;

  // Exchange JWT for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error('Failed to obtain Google access token');

  const pid = subscriptionId || productId;
  const validateUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${pid}/tokens/${purchaseToken}`;
  const validateRes = await fetch(validateUrl, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const sub = await validateRes.json();

  if (sub.error) throw new Error(`Google validation error: ${sub.error.message}`);
  if (sub.paymentState !== 1) throw new Error('Google subscription not paid');

  return {
    productId: pid,
    expiresAt: new Date(parseInt(sub.expiryTimeMillis)).toISOString(),
    transactionId: purchaseToken,
  };
}

// ── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { platform, receipt, productId } = await req.json();

    if (!platform || !receipt) {
      return Response.json({ error: 'platform and receipt are required' }, { status: 400 });
    }

    let purchaseInfo;
    if (platform === 'ios') {
      purchaseInfo = await verifyAppleReceipt(receipt);
    } else if (platform === 'android') {
      purchaseInfo = await verifyGoogleReceipt(receipt);
    } else {
      return Response.json({ error: 'Invalid platform. Use "ios" or "android"' }, { status: 400 });
    }

    const mapping = PRODUCT_TIER_MAP[purchaseInfo.productId] || PRODUCT_TIER_MAP[productId];
    if (!mapping) {
      console.error(`Unknown productId: ${purchaseInfo.productId}`);
      return Response.json({ error: `Unknown product: ${purchaseInfo.productId}` }, { status: 400 });
    }

    // Update the user's subscription tier
    await base44.auth.updateMe({
      subscription_tier: mapping.tier,
      subscription_platform: platform,
      subscription_expires_at: purchaseInfo.expiresAt,
    });

    console.log(`Mobile IAP verified: user=${user.id} platform=${platform} tier=${mapping.tier} expires=${purchaseInfo.expiresAt}`);

    return Response.json({
      success: true,
      tier: mapping.tier,
      period: mapping.period,
      expiresAt: purchaseInfo.expiresAt,
      transactionId: purchaseInfo.transactionId,
    });
  } catch (error) {
    console.error('verifyMobileReceipt error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});