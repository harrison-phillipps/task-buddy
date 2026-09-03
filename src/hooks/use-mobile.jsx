import { useState, useEffect } from "react"

const MOBILE_BREAKPOINT = 768
const NATIVE_MOBILE_BREAKPOINT = 1280

/**
 * Synchronous native-wrapper detection — true only inside the native iOS
 * (BuildNatively / WKWebView) app, never on the public website (including
 * iPad Safari). Evaluated at first render so there is no flash-of-wrong-layout.
 */
function isRunningNatively() {
  if (typeof window === "undefined" || !window.navigator) return false;
  const ua = window.navigator.userAgent || "";
  // BuildNatively wrapper injects this UA token
  if (ua.includes("BuildNatively")) return true;
  // Any iOS WKWebView bridge (covers iPad inside the wrapper)
  if (window.webkit && window.webkit.messageHandlers) return true;
  return false;
}

export function useIsMobile() {
  const compute = () => {
    if (typeof window === "undefined") return false;
    const width = window.innerWidth;
    if (width < MOBILE_BREAKPOINT) return true;
    if (isRunningNatively() && width < NATIVE_MOBILE_BREAKPOINT) return true;
    return false;
  };

  const [isMobile, setIsMobile] = useState(compute);

  useEffect(() => {
    const recompute = () => setIsMobile(compute());
    const mqlMobile = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    mqlMobile.addEventListener("change", recompute);
    let mqlNative;
    if (isRunningNatively()) {
      mqlNative = window.matchMedia(`(max-width: ${NATIVE_MOBILE_BREAKPOINT - 1}px)`);
      mqlNative.addEventListener("change", recompute);
    }
    return () => {
      mqlMobile.removeEventListener("change", recompute);
      if (mqlNative) mqlNative.removeEventListener("change", recompute);
    };
  }, []);

  return isMobile
}