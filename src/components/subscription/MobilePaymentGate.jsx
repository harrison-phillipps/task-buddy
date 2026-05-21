/**
 * MobilePaymentGate
 *
 * Shown on the Subscription page when the app is running inside a native
 * iOS or Android wrapper. It:
 *
 *  • iOS  — blocks Stripe checkout (App Store rules require IAP for digital
 *            goods) and instead tells the native wrapper to trigger an IAP
 *            purchase via window.ReactNativeWebView / postMessage bridge.
 *
 *  • Android — Google Play allows users to pay via the web, so we redirect
 *              to the external subscription page. If you later integrate Play
 *              Billing, swap the button for the IAP bridge call.
 *
 * The native wrapper must listen for window messages:
 *   { type: 'IAP_PURCHASE', productId: '...' }
 * and call the verifyMobileReceipt backend function with the receipt after
 * the native purchase flow completes.
 */

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone, ExternalLink, Apple, Check } from "lucide-react";

// iOS product IDs — must match exactly what's registered in App Store Connect
const IOS_PRODUCTS = {
  pro: {
    monthly: { id: 'com.taskbuddy.pro.monthly',     label: 'Pro Monthly',  price: 'A$9.99/mo'  },
    yearly:  { id: 'com.taskbuddy.pro.yearly',      label: 'Pro Yearly',   price: 'A$99/yr'    },
  },
  premium: {
    monthly: { id: 'com.taskbuddy.premium.monthly', label: 'Premium Monthly', price: 'A$19.99/mo' },
    yearly:  { id: 'com.taskbuddy.premium.yearly',  label: 'Premium Yearly',  price: 'A$199/yr'   },
  },
};

function triggerIOSPurchase(productId) {
  // Bridge call to native wrapper (React Native WebView / Capacitor / etc.)
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'IAP_PURCHASE', productId }));
  } else {
    // Fallback: standard postMessage for Capacitor / custom native shell
    window.postMessage(JSON.stringify({ type: 'IAP_PURCHASE', productId }), '*');
  }
}

// ── iOS IAP panel ────────────────────────────────────────────────────────────
export function IOSPaymentPanel({ tier, billingPeriod }) {
  const product = IOS_PRODUCTS[tier]?.[billingPeriod];
  if (!product) return null;

  return (
    <div className="mt-4 space-y-3">
      <Button
        onClick={() => triggerIOSPurchase(product.id)}
        className="w-full bg-black hover:bg-gray-900 text-white flex items-center justify-center gap-2 h-12 rounded-xl"
      >
        <Apple className="w-5 h-5" />
        Subscribe with Apple — {product.price}
      </Button>
      <p className="text-center text-xs text-gray-500">
        Payment will be charged to your Apple ID. Subscription auto-renews unless cancelled at least 24 hours before the end of the current period. Manage or cancel in your iPhone Settings → Apple ID → Subscriptions.
      </p>
    </div>
  );
}

// ── Android redirect panel ───────────────────────────────────────────────────
export function AndroidPaymentPanel() {
  return (
    <div className="mt-4">
      <Button
        onClick={() => window.open('https://taskbuddy.app/Subscription', '_blank')}
        className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 h-12 rounded-xl"
      >
        <ExternalLink className="w-4 h-4" />
        Manage Subscription on Web
      </Button>
      <p className="text-center text-xs text-gray-500 mt-2">
        You'll be taken to taskbuddy.app to complete your purchase securely.
      </p>
    </div>
  );
}

// ── Full gate card (used on Subscription page) ───────────────────────────────
export default function MobilePaymentGate({ platform, tier, billingPeriod }) {
  const isIOS = platform === 'ios';

  return (
    <Card className={`border-2 mt-4 ${isIOS ? 'border-gray-900 bg-gray-50 dark:bg-gray-900/30' : 'border-green-500 bg-green-50 dark:bg-green-900/20'}`}>
      <CardContent className="py-5 space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone className={`w-5 h-5 ${isIOS ? 'text-gray-800 dark:text-gray-200' : 'text-green-700 dark:text-green-400'}`} />
          <span className={`font-semibold text-sm ${isIOS ? 'text-gray-900 dark:text-gray-100' : 'text-green-800 dark:text-green-300'}`}>
            {isIOS ? 'Subscribe via App Store' : 'Subscribe via Google Play'}
          </span>
        </div>

        <ul className="space-y-1">
          {[
            'Secure payment through your device',
            'Manage subscription in device settings',
            'Cancel anytime',
          ].map(f => (
            <li key={f} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        {isIOS
          ? <IOSPaymentPanel tier={tier} billingPeriod={billingPeriod} />
          : <AndroidPaymentPanel />
        }
      </CardContent>
    </Card>
  );
}