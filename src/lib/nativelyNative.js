/* global NativelyInfo */

/**
 * True only when the Natively SDK is loaded AND it reports we are running inside
 * the native app wrapper (iOS or Android). In a regular browser the SDK still
 * loads (inert) but browserInfo().isNativeApp is false, so this stays false and
 * the VAPID / Web Push path is used instead.
 */
export function isNativeShell() {
  try {
    if (typeof window === 'undefined' || typeof NativelyInfo === 'undefined') return false;
    const info = new NativelyInfo();
    const bi = info.browserInfo();
    return !!(bi && bi.isNativeApp);
  } catch {
    return false;
  }
}