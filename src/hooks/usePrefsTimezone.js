import { useEffect } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Silently records the browser's IANA timezone on the signed-in user's
 * notification preferences row when it has none yet.
 *
 * Only an existing row is stamped — a row is never created here, because
 * creating one would switch on digest email for someone who never opted in.
 * A missing timezone is harmless: the backend treats it as Australia/Adelaide.
 */
export function usePrefsTimezone() {
  useEffect(() => {
    let detected = null;
    try {
      detected = Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone || null;
    } catch {
      detected = null;
    }
    if (!detected) return;

    let cancelled = false;
    (async () => {
      try {
        const me = await base44.auth.me();
        if (!me?.id || cancelled) return;
        const rows = await base44.entities.NotificationPreferences.filter({ user_id: me.id });
        const pref = rows[0];
        if (!pref || pref.timezone || cancelled) return;
        await base44.entities.NotificationPreferences.update(pref.id, { timezone: detected });
      } catch (error) {
        console.error("Could not record notification timezone:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);
}

export default usePrefsTimezone;