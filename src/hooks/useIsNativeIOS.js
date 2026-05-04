/**
 * Detects whether the app is running inside a native iOS WKWebView
 * (i.e. wrapped in an iOS app where Stripe checkout is not allowed by App Store rules).
 *
 * Detection strategy (most reliable signals):
 *   1. window.webkit?.messageHandlers exists  — injected by WKWebView bridges
 *   2. navigator.standalone is undefined       — only defined in Mobile Safari, not WKWebView
 *   3. iOS UA + NOT Safari (no "Safari" in UA) — WKWebView UA omits "Safari"
 *
 * Falls back to false on all other platforms.
 */
export function useIsNativeIOS() {
  if (typeof window === 'undefined') return false;

  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  if (!isIOS) return false;

  // Signal 1: WKWebView bridge present
  if (window.webkit?.messageHandlers) return true;

  // Signal 2: UA is iOS but "Safari" is absent (WKWebView omits it)
  const hasSafariToken = /Safari\//.test(ua);
  if (!hasSafariToken) return true;

  // Signal 3: standalone is undefined (Safari PWA sets it to true/false)
  if (typeof navigator.standalone === 'undefined') return true;

  return false;
}