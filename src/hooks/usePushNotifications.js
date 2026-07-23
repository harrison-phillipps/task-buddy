import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const [permission, setPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default');
  const [subscription, setSubscription] = useState(null);
  const [isSupported] = useState('serviceWorker' in navigator && 'PushManager' in window);
  const [isRegistering, setIsRegistering] = useState(false);

  // Load existing subscription on mount
  useEffect(() => {
    if (!isSupported) return;
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        if (sub) setSubscription(sub);
      });
    });
  }, [isSupported]);

  const requestPermissionAndSubscribe = useCallback(async (vapidPublicKeyFromServer) => {
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
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!subscription) return;
    await subscription.unsubscribe();
    setSubscription(null);
    await base44.auth.updateMe({ push_subscription: null });
    setPermission('default');
  }, [subscription]);

  const sendTestNotification = useCallback(async (sub) => {
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
  }, [subscription]);

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