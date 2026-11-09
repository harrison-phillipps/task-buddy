/* global NativelyNotifications */
import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { isNativeShell } from '@/lib/nativelyNative';

/**
 * Keeps the stored OneSignal id in step with the device, on app launch only.
 *
 * Reads the OS permission state and never prompts. If permission is not
 * granted, nothing happens at all — no dialog, no write. When it is granted,
 * the current player id is written to the user record only if it differs from
 * what is already stored, so a reinstall or reset re-registers itself.
 */
export function useOneSignalIdRefresh() {
  useEffect(() => {
    let cancelled = false;
    let timer = null;
    const startedAt = Date.now();

    const attempt = async () => {
      if (cancelled) return;

      // The Natively SDK loads asynchronously, so wait for it before giving up.
      if (typeof NativelyNotifications === 'undefined' || !isNativeShell()) {
        if (Date.now() - startedAt < 8000) timer = setTimeout(attempt, 500);
        return;
      }

      try {
        const notifications = new NativelyNotifications();
        const granted = await new Promise((resolve) => {
          notifications.getPermissionStatus((resp) => resolve(!!(resp && resp.status)));
        });
        if (!granted || cancelled) return;

        const playerId = await new Promise((resolve) => {
          notifications.getOneSignalId((resp) => resolve((resp && resp.playerId) || null));
        });
        if (!playerId || cancelled) return;

        const user = await base44.auth.me();
        if (cancelled || !user) return;

        if (user.onesignal_player_id !== playerId) {
          await base44.auth.updateMe({ onesignal_player_id: playerId });
        }
      } catch (err) {
        console.error('OneSignal id refresh failed:', err);
      }
    };

    attempt();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);
}