/* global NativelyInfo, NativelyNotifications */
import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

/**
 * Returns true only when the Natively SDK is loaded AND it reports we are
 * running inside the native app wrapper (iOS or Android). In a regular browser
 * the SDK still loads (inert) but browserInfo().isNativeApp is false, so this
 * stays false and the VAPID/Web Push path is used instead.
 */
function getNativelyNativeFlag() {
  try {
    if (typeof window === 'undefined' || typeof NativelyInfo === 'undefined') return false;
    const info = new NativelyInfo();
    const bi = info.browserInfo();
    return !!(bi && bi.isNativeApp);
  } catch {
    return false;
  }
}

export function usePushNotifications() {
  const isVapidSupported =
    typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;

  // The Natively SDK loads asynchronously via a <script> tag in index.html.
  // Track readiness so the UI can reveal the "Enable Reminders" control once
  // the native bridge is available.
  const [nativelyReady, setNativelyReady] = useState(() => getNativelyNativeFlag());

  useEffect(() => {
    if (nativelyReady) return;
    const check = () => { if (getNativelyNativeFlag()) setNativelyReady(true); };
    check();
    window.addEventListener('natively-loaded', check);
    // Fallback poll in case the SDK becomes ready before the event fires.
    const iv = setInterval(() => {
      if (getNativelyNativeFlag()) { setNativelyReady(true); clearInterval(iv); }
    }, 300);
    const stop = setTimeout(() => clearInterval(iv), 6000);
    return () => {
      window.removeEventListener('natively-loaded', check);
      clearInterval(iv);
      clearTimeout(stop);
    };
  }, [nativelyReady]);

  const isNative = nativelyReady;
  const isSupported = isVapidSupported || isNative;

  const [permission, setPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default');
  const [subscription, setSubscription] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // Load existing VAPID subscription on mount (browser/PWA only)
  useEffect(() => {
    if (!isVapidSupported) return;
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        if (sub) setSubscription(sub);
      });
    });
  }, [isVapidSupported]);

  // Rehydrate state for native (Natively) users: the browser Notification.permission
  // value is meaningless inside the WebView, so read the real permission from the
  // Natively SDK and restore any persisted OneSignal Player ID from the user record.
  useEffect(() => {
    if (!isNative || typeof NativelyNotifications === 'undefined') return;
    let cancelled = false;
    (async () => {
      try {
        const user = await base44.auth.me();
        if (cancelled) return;
        if (user && user.onesignal_player_id) {
          setSubscription({ playerId: user.onesignal_player_id });
        }

        const notifications = new NativelyNotifications();
        const granted = await new Promise((resolve) => {
          notifications.getPermissionStatus((resp) => resolve(!!(resp && resp.status)));
        });
        if (cancelled) return;
        setPermission(granted ? 'granted' : 'default');
      } catch (err) {
        console.error('Native permission rehydration error:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [isNative]);

  const requestNativePermission = useCallback(async () => {
    if (typeof NativelyNotifications === 'undefined') {
      return { success: false, reason: 'natively_sdk_not_loaded' };
    }
    setIsRegistering(true);
    try {
      const notifications = new NativelyNotifications();

      // 1. Prompt for permission (fallbackToSettings = false on first attempt)
      const granted = await new Promise((resolve) => {
        notifications.requestPermission(false, (resp) => resolve(!!(resp && resp.status)));
      });
      setPermission(granted ? 'granted' : 'denied');
      if (!granted) return { success: false, reason: 'denied' };

      // 2. Retrieve OneSignal Player ID
      const playerId = await new Promise((resolve) => {
        notifications.getOneSignalId((resp) => resolve((resp && resp.playerId) || null));
      });
      if (!playerId) return { success: false, reason: 'no_player_id' };

      // 3. Persist Player ID to the user record
      await base44.auth.updateMe({ onesignal_player_id: playerId });
      setSubscription({ playerId });

      return { success: true, native: true, playerId };
    } catch (err) {
      console.error('Natively push subscription error:', err);
      return { success: false, reason: (err && err.message) || 'native_error' };
    } finally {
      setIsRegistering(false);
    }
  }, []);

  const requestPermissionAndSubscribe = useCallback(async (vapidPublicKeyFromServer) => {
    if (isNative) return requestNativePermission();
    if (typeof Notification === 'undefined') {
      return { success: false, reason: 'not_supported' };
    }
    if (!isSupported) return { success: false, reason: 'not_supported' };
    setIsRegistering(true);

    try {
      // Register SW
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return { success: false, reason: 'denied' };

      // Subscribe
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKeyFromServer);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      setSubscription(sub);

      // Persist subscription to user profile
      await base44.auth.updateMe({
        push_subscription: JSON.stringify(sub.toJSON()),
      });

      return { success: true, subscription: sub };
    } catch (err) {
      console.error('Push subscription error:', err);
      return { success: false, reason: err.message };
    } finally {
      setIsRegistering(false);
    }
  }, [isSupported, isNative, requestNativePermission]);

  const unsubscribe = useCallback(async () => {
    if (isNative) {
      await base44.auth.updateMe({ onesignal_player_id: null });
      setSubscription(null);
      setPermission('default');
      return;
    }
    if (!subscription) return;
    await subscription.unsubscribe();
    setSubscription(null);
    await base44.auth.updateMe({ push_subscription: null });
    setPermission('default');
  }, [subscription, isNative]);

  const sendTestNotification = useCallback(async (sub) => {
    if (isNative) return; // native test pushes are sent via the OneSignal dashboard / REST API
    const activeSub = sub || subscription;
    if (!activeSub) return;
    await base44.functions.invoke('sendPushNotification', {
      subscription: activeSub.toJSON(),
      payload: {
        title: '✅ TaskBuddy Notifications Active',
        body: "You'll now receive smart reminders for your Must Do tasks!",
        taskId: null,
        taskTitle: 'Test',
      },
    });
  }, [subscription, isNative]);

  return {
    isSupported,
    permission,
    subscription,
    isRegistering,
    requestPermissionAndSubscribe,
    unsubscribe,
    sendTestNotification,
  };
}