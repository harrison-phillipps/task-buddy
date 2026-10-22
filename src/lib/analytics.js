import { base44 } from "@/api/base44Client";

// Events this app is allowed to send. Anything else is ignored, so a typo or
// a future call site can never introduce an unreviewed event.
export const ALLOWED_EVENTS = [
  "paywall_viewed",
  "purchase_started",
  "first_ai_breakdown_used",
];

// Only these keys may appear in a payload. Task titles, descriptions,
// reflections, names and emails are deliberately absent, so personal data
// cannot reach analytics even if it is passed in by mistake.
const ALLOWED_PROPS = new Set([
  "feature_key",    // paywall_viewed
  "required_tier",  // paywall_viewed
  "surface",        // paywall_viewed
  "platform",       // paywall_viewed, purchase_started
  "tier",           // purchase_started
  "billing_period", // purchase_started
  "source",         // first_ai_breakdown_used
  "subtask_count",  // first_ai_breakdown_used
]);

// A paywall key is a short identifier ("habit_tracking"), never the display
// sentence a component uses for its heading. Anything that doesn't match is
// sent as "unknown", so a sentence can never reach analytics.
const PAYWALL_KEY_PATTERN = /^[a-z0-9_]{1,40}$/;

const MAX_STRING_LENGTH = 60;

/**
 * Coarse platform label: 'ios' | 'android' | 'web' | 'unknown'.
 *
 * The BuildNatively wrapper marker is the primary signal — the same one this
 * app's payment gating already trusts. Inside that wrapper the OS comes from
 * the UA: iPhone/iPad/iPod for iOS, Android for Android, and a Mac-style UA on
 * a touch device for iPadOS (which reports itself as a Mac). Anything else
 * under the wrapper is 'unknown'.
 */
export function currentPlatform() {
  if (typeof window === "undefined" || !window.navigator) return "unknown";
  const ua = window.navigator.userAgent || "";
  if (!ua.includes("BuildNatively")) return "web";
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Macintosh/.test(ua) && (window.navigator.maxTouchPoints || 0) > 1) return "ios";
  return "unknown";
}

/**
 * Send one allowlisted analytics event with a whitelisted payload.
 * Non-whitelisted keys, and any value that is not a string, number or
 * boolean (objects, arrays, null), are dropped before the call.
 */
export function trackEvent(eventName, properties = {}) {
  if (!ALLOWED_EVENTS.includes(eventName)) return;

  const payload = {};
  for (const [key, value] of Object.entries(properties)) {
    if (!ALLOWED_PROPS.has(key)) continue;
    if (key === "feature_key") {
      payload[key] = typeof value === "string" && PAYWALL_KEY_PATTERN.test(value) ? value : "unknown";
      continue;
    }
    if (typeof value === "string") payload[key] = value.slice(0, MAX_STRING_LENGTH);
    else if (typeof value === "number" && Number.isFinite(value)) payload[key] = value;
    else if (typeof value === "boolean") payload[key] = value;
  }

  base44.analytics.track({ eventName, properties: payload });
}