import React, { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import {
  buildNewPreferencesRow,
  buildNudgeOptInPayload,
  browserTimezone,
  isTimeInQuietHours,
  quietWindowLabel,
  snoozeNudgePrompt,
} from "@/lib/focusNudgeClient";
import toast from "react-hot-toast";

/**
 * The one-time gentle-nudge opt-in, shown once after a first completed task or
 * focus session. The time is the only decision; the notification permission is
 * requested when Save is tapped, never before.
 */
export default function FocusNudgeOptInSheet({ open, onOpenChange, user, prefs, onSaved }) {
  const [time, setTime] = useState(prefs?.focus_nudge_time || "");
  const [saving, setSaving] = useState(false);
  const { requestPermissionAndSubscribe, sendTestNotification } = usePushNotifications();

  const timezone = prefs?.timezone || browserTimezone();
  const insideQuietHours = !!time && isTimeInQuietHours({ ...prefs, timezone }, time);

  const handleSave = async () => {
    if (!time || insideQuietHours || !user?.id) return;
    setSaving(true);
    try {
      // 1. Save the choice first, so a declined permission never loses the time
      //    they picked. A row that does not exist yet is created with every other
      //    notification flag off — opting in here must not switch on email.
      const saved = prefs?.id
        ? await base44.entities.NotificationPreferences.update(
            prefs.id,
            buildNudgeOptInPayload({
              userId: user.id,
              time,
              // Only stamp a timezone when the row has none, and only the real one.
              timezone: prefs.timezone ? null : timezone,
            }),
          )
        : await base44.entities.NotificationPreferences.create(
            buildNewPreferencesRow({ userId: user.id, time, timezone }),
          );

      // 2. Permission and the OneSignal id, now that they have asked for this.
      //    This is the existing Enable flow: the native path registers the id and
      //    sends one test notification through sendTestPush.
      let vapidKey = "";
      try {
        const keyRes = await base44.functions.invoke("getVapidPublicKey", {});
        vapidKey = keyRes?.data?.key || "";
      } catch {
        vapidKey = "";
      }

      const result = await requestPermissionAndSubscribe(vapidKey);
      if (!result?.success) {
        toast(
          result?.reason === "denied"
            ? "Saved. Allow notifications whenever you are ready and the nudge will start."
            : "Saved. We could not turn on notifications yet — you can enable them in Settings.",
          { duration: 6000 },
        );
      } else {
        if (!result.native) await sendTestNotification(result.subscription);
        toast.success(`Your nudge will arrive around ${time}.`);
      }

      onSaved?.(saved);
      onOpenChange(false);
    } catch (error) {
      console.error("Could not save the focus nudge:", error);
      toast.error("That time could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleNotNow = () => {
    snoozeNudgePrompt();
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DrawerContent className="dark:bg-gray-900">
        <DrawerHeader className="text-left">
          <DrawerTitle className="dark:text-gray-100">A gentle nudge to start?</DrawerTitle>
          <DrawerDescription className="dark:text-gray-400">
            Want a gentle nudge to start a short focus session? Pick a time that suits you.
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-2 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="focus-nudge-time">Nudge me at</Label>
            <Input
              id="focus-nudge-time"
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className="dark:bg-gray-800 dark:border-gray-600"
            />
          </div>

          {insideQuietHours && (
            <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
              {`That time is inside your quiet hours (${quietWindowLabel({ ...prefs, timezone })}). Pick a time outside them.`}
            </p>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400">
            One nudge a day at most, and only on days you have something open. You can turn it off any time in Settings.
          </p>
        </div>

        <DrawerFooter className="gap-2">
          <Button
            onClick={handleSave}
            disabled={!time || insideQuietHours || saving}
            className="bg-gradient-to-r from-purple-500 to-teal-500 text-white"
          >
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button variant="ghost" onClick={handleNotNow} disabled={saving}>
            Not now
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}