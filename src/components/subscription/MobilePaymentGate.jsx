/**
 * MobilePaymentGate
 *
 * Shown on the Subscription page when the app runs inside the BuildNatively
 * wrapper (iOS or Android). Uses the NativelyPurchases bridge (RevenueCat
 * under the hood) to:
 *   1. login(currentUser.id, email)  — attributes the purchase to our user
 *      so the RevenueCatWebhook's app_user_id matches a real User.id.
 *   2. getOfferings()                — fetch real localized pricing.
 *   3. purchasePackage(packageId)    — trigger the native IAP sheet.
 *   4. restore()                     — required by Apple App Review.
 *
 * The RevenueCatWebhook backend function updates subscription_tier on
 * purchase/renewal/expiry; on SUCCESS we just refresh local user state.
 * Android proration / upgrade-downgrade is intentionally out of scope.
 */

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// RevenueCat package identifiers — must match the Package identifiers
// configured in the RevenueCat dashboard (Product Catalog → Offerings).
const PACKAGE_IDS = {
  pro:     { monthly: "pro_monthly",     yearly: "pro_yearly" },
  premium: { monthly: "premium_monthly", yearly: "premium_yearly" },
};

// The bridge is injected onto window by the BuildNatively wrapper.
// A bare global would also resolve via window, so this covers both cases.
function getPurchasesCtor() {
  if (typeof window === "undefined") return null;
  return window.NativelyPurchases || null;
}

export default function MobilePaymentGate({ platform, tier, billingPeriod, currentUser, onPurchased }) {
  const packageId = PACKAGE_IDS[tier]?.[billingPeriod];

  const [bridge, setBridge] = useState(null);
  const [priceLabel, setPriceLabel] = useState(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState(null);

  // ── Mount: instantiate, login, fetch offerings ──────────────────────────
  useEffect(() => {
    const Ctor = getPurchasesCtor();
    if (!Ctor) {
      setError("In-app purchases aren't available in this build.");
      return;
    }
    let p;
    try {
      p = new Ctor();
    } catch (err) {
      console.error("NativelyPurchases init failed:", err);
      setError("In-app purchases aren't available in this build.");
      return;
    }
    setBridge(p);

    // login() — SUCCESS/FAILED only (no CANCELLED). Only fetch offerings
    // once a customer identity is genuinely resolved, so RevenueCat never
    // sees getOfferings before login completes ("Missing login/customerId").
    p.login(currentUser?.id, currentUser?.email, (loginResp) => {
      if (loginResp?.status !== "SUCCESS") {
        console.warn("NativelyPurchases.login failed:", loginResp?.error || loginResp);
        setError("Couldn't sign in to the store. Please reopen the screen and try again.");
        return;
      }
      // getOfferings() — resolve localized price for our package.
      p.getOfferings((resp) => {
        if (resp?.status !== "SUCCESS") {
          console.warn("NativelyPurchases.getOfferings failed:", resp?.error || resp);
          return;
        }
        const packages =
          resp?.offerings?.current?.availablePackages ||
          resp?.current?.availablePackages ||
          [];
        const pkg = packages.find(
          (pk) => pk.packageId === packageId || pk.identifier === packageId
        );
        if (pkg) setPriceLabel(pkg.localizedPriceString || pkg.priceString || null);
      });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Purchase ─────────────────────────────────────────────────────────────
  const handlePurchase = useCallback(() => {
    if (!bridge || !packageId) return;
    setIsPurchasing(true);
    setError(null);
    bridge.purchasePackage(packageId, (resp) => {
      const status = resp?.status;
      if (status === "SUCCESS") {
        setIsPurchasing(false);
        // Webhook updates subscription_tier server-side; refresh local state.
        onPurchased?.();
      } else if (status === "CANCELLED") {
        // Normal user behaviour — silent return to the purchase screen.
        setIsPurchasing(false);
      } else {
        // FAILED
        setIsPurchasing(false);
        setError(
          resp?.error ||
          "Purchase couldn't be completed. Please try again."
        );
      }
    });
  }, [bridge, packageId, onPurchased]);

  // ── Restore (required by Apple App Review) ────────────────────────────────
  const handleRestore = useCallback(() => {
    if (!bridge) return;
    setIsRestoring(true);
    setError(null);
    bridge.restore((resp) => {
      setIsRestoring(false);
      if (resp?.status === "SUCCESS") {
        onPurchased?.();
      } else {
        setError(
          resp?.error ||
          "No previous purchases were found to restore."
        );
      }
    });
  }, [bridge, onPurchased]);

  if (!packageId) return null;

  const storeAccount = platform === "ios" ? "Apple ID" : "Google Account";

  return (
    <div className="mt-4 space-y-3">
      <Button
        onClick={handlePurchase}
        disabled={isPurchasing}
        className="w-full bg-black hover:bg-gray-900 text-white flex items-center justify-center gap-2 h-12 rounded-xl"
      >
        {isPurchasing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Processing…
          </>
        ) : (
          <>Subscribe{priceLabel ? ` — ${priceLabel}` : ""}</>
        )}
      </Button>

      <button
        onClick={handleRestore}
        disabled={isRestoring}
        className="w-full text-center text-sm text-purple-600 dark:text-purple-400 hover:underline disabled:opacity-50"
      >
        {isRestoring ? "Restoring…" : "Restore Purchases"}
      </button>

      {error && (
        <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <p className="text-center text-xs text-gray-500">
        Payment is charged to your {storeAccount}. Subscription auto-renews unless
        cancelled at least 24 hours before the end of the current period. Manage or
        cancel in your device settings.
      </p>
    </div>
  );
}