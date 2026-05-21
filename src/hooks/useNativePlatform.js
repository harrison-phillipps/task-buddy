/**
 * useNativePlatform
 *
 * Detects whether the app is running inside a native iOS or Android wrapper.
 *
 * Returns: { isNative: bool, isIOS: bool, isAndroid: bool, platform: 'ios'|'android'|'web' }
 *
 * Detection strategy:
 *  • iOS native:     window.ReactNativeWebView exists, OR
 *                    userAgent contains 'TaskBuddyIOS' (set by your native shell), OR
 *                    the legacy useIsNativeIOS heuristic (standalone + iOS UA)
 *  • Android native: window.ReactNativeWebView exists AND userAgent contains 'Android', OR
 *                    userAgent contains 'TaskBuddyAndroid'
 *
 * Adjust the custom UA tokens to match whatever your native wrapper injects.
 */

import { useMemo } from 'react';

export function useNativePlatform() {
  return useMemo(() => {
    const ua = navigator.userAgent || '';
    const hasRNBridge = !!window.ReactNativeWebView;
    const isStandalone = window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;

    const isIOSUA = /iPhone|iPad|iPod/.test(ua);
    const isAndroidUA = /Android/.test(ua);

    // Custom UA tokens injected by your native shell (recommended approach)
    const hasIOSToken = ua.includes('TaskBuddyIOS');
    const hasAndroidToken = ua.includes('TaskBuddyAndroid');

    const isIOS =
      hasIOSToken ||
      (hasRNBridge && isIOSUA) ||
      (isStandalone && isIOSUA);  // PWA on iOS fallback

    const isAndroid =
      hasAndroidToken ||
      (hasRNBridge && isAndroidUA);

    const isNative = isIOS || isAndroid;
    const platform = isIOS ? 'ios' : isAndroid ? 'android' : 'web';

    return { isNative, isIOS, isAndroid, platform };
  }, []);
}