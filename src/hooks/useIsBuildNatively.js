/**
 * Detects whether the app is running inside the BuildNatively iOS wrapper.
 * Used to hide in-app Stripe payment UI per Apple's IAP guidelines.
 */
export function useIsBuildNatively() {
  if (typeof window === 'undefined' || !window.navigator) return false;
  const ua = window.navigator.userAgent || '';
  return ua.includes('BuildNatively');
}