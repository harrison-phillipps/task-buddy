/**
 * useNativelyNative — authoritative native-wrapper detection for the
 * Subscription payment gate.
 *
 * Why not bare window.NativelyPurchases presence? The Natively SDK script
 * (index.html) loads unconditionally, including regular browsers, and defines
 * its classes inertly — so `typeof window.NativelyPurchases === 'function'`
 * is true in a plain browser too. The reliable signal is
 * NativelyInfo().browserInfo().isNativeApp (true only when bridged to a real
 * native shell).
 *
 * Timing: the SDK loads via <script async>, so it is NOT present at first
 * render. Three states keep the gate fail-closed:
 *   'checking' → SDK still loading; render neither payment path.
 *   'native'   → confirmed native wrapper; render MobilePaymentGate.
 *   'web'      → confirmed browser (or SDK absent/failed); render Stripe path.
 *
 * Resolution: sync check → 'natively-loaded' event (dispatched by index.html)
 * → 3s safety timeout → 'web'. The createCheckout backend guard is the
 * fail-closed backstop for the timeout case.
 *
 * Returns { status, platform }:
 *   status:   'checking' | 'native' | 'web'
 *   platform: 'ios' | 'android' | null  (null until browserInfo resolves;
 *             meaningful when status === 'native')
 */
import { useState, useEffect } from "react";

export function useNativelyNative(timeoutMs = 3000) {
  const [state, setState] = useState({ status: "checking", platform: null });

  useEffect(() => {
    let resolved = false;
    const resolve = (s, p) => { if (resolved) return; resolved = true; setState({ status: s, platform: p }); };

    const evaluate = () => {
      if (typeof window === "undefined") return false;
      if (typeof window.NativelyInfo !== "function") return false;
      try {
        const bi = new window.NativelyInfo().browserInfo();
        if (!bi || typeof bi.isNativeApp === "undefined") return false; // not ready
        const platform = bi.isIOSApp ? "ios" : bi.isAndroidApp ? "android" : null;
        resolve(bi.isNativeApp ? "native" : "web", platform);
        return true;
      } catch (e) {
        return false;
      }
    };

    if (evaluate()) return;

    const onLoaded = () => evaluate();
    window.addEventListener("natively-loaded", onLoaded, { once: true });

    const t = setTimeout(() => {
      if (evaluate()) return;
      // Fail closed: if the userAgent looks like a BuildNatively wrapper,
      // never resolve to "web" — treat the unresponsive bridge as native
      // (platform unknown) so the IAP path renders, not Stripe. Mirrors
      // useIsBuildNatively()'s synchronous userAgent test. A genuine web
      // user has no "BuildNatively" token, so this can only shift resolution
      // away from "web" on devices that are already native.
      const looksNative =
        typeof window !== "undefined" && window.navigator &&
        (window.navigator.userAgent || "").includes("BuildNatively");
      resolve(looksNative ? "native" : "web", null);
    }, timeoutMs);

    return () => {
      window.removeEventListener("natively-loaded", onLoaded);
      clearTimeout(t);
    };
  }, [timeoutMs]);

  return state;
}