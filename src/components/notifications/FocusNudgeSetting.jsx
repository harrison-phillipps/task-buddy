import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { browserTimezone, isTimeInQuietHours, quietWindowLabel } from "@/lib/focusNudgeClient";

/**
 * Settings card for the gentle focus nudge: the time, and an off switch.
 * Only rendered for beta accounts (see FOCUS_NUDGE_BETA_EMAILS).
 */
export default function FocusNudgeSetting({ user, prefs, onSaved }) {
  const [time, setTime] = useState(prefs?.focus_nudge_time || "");
  const [busy, setBusy] = useState(false);

  // A row can arrive after this card mounts (the preferences query resolves), so
  // the saved time is adopted whenever the row changes.
  useEffect(() => {
    if (prefs?.focus_nudge_time) setTime(prefs.focus_nudge_time);
  }, [prefs?.focus_nudge_time]);

  if (!prefs?.id) return null;

  const enabled = prefs.focus_nudge_enabled === true;
  const paused = prefs.focus_nudge_paused === true;
  const timezone = prefs.timezone || browserTimezone();
  const insideQuietHours = !!time && isTimeInQuietHours({ ...prefs, timezone }, time);

  const patch = async (changes, message) => {
    setBusy(true);
    try {
      const updated = await base44.entities.NotificationPreferences.update(prefs.id, changes);
      toast.success(message);
      onSaved?.(updated);
    } catch (error) {
      console.error("Could not update the focus nudge:", error);
      toast.error("That change could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = (next) => {
    if (next) {
      if (!time || insideQuietHours) {
        toast.error("Pick a time outside your quiet hours first.");
        return;
      }
      patch(
        {
          focus_nudge_enabled: true,
          focus_nudge_time: time,
          focus_nudge_paused: false,
          focus_nudge_ignored_count: 0,
          ...(prefs.timezone ? {} : { timezone }),
        },
        `Your nudge will arrive around ${time}.`,
      );
      return;
    }
    // Switching off keeps the chosen time, so turning it back on needs one tap
    // and the one-time prompt never comes back.
    patch(
      { focus_nudge_enabled: false, focus_nudge_paused: false, focus_nudge_ignored_count: 0 },
      "Focus nudge turned off.",
    );
  };

  const handleTimeChange = (value) => {
    setTime(value);
    if (!enabled || !value) return;
    if (isTimeInQuietHours({ ...prefs, timezone }, value)) return; // wait for a usable time
    patch({ focus_nudge_time: value }, `Your nudge will arrive around ${value}.`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          Gentle focus nudge
        </CardTitle>
        <CardDescription>
          One short, gentle reminder to start a focus session, at a time you choose.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="focus-nudge">Send me a nudge</Label>
          <Switch
            id="focus-nudge"
            checked={enabled}
            disabled={busy}
            onCheckedChange={handleToggle}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="focus-nudge-time-setting">Nudge me at</Label>
          <Input
            id="focus-nudge-time-setting"
            type="time"
            value={time}
            disabled={busy}
            onChange={(event) => handleTimeChange(event.target.value)}
            className="dark:bg-gray-800 dark:border-gray-600"
          />
          {insideQuietHours && (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {`That time is inside your quiet hours (${quietWindowLabel({ ...prefs, timezone })}). Pick a time outside them.`}
            </p>
          )}
        </div>

        {paused && (
          <p className="text-sm text-gray-600 dark:text-gray-300 bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900 rounded-lg px-3 py-2">
            Your nudge paused itself after three in a row went unanswered. Switch it back on whenever you want it again.
          </p>
        )}

        <p className="text-xs text-gray-500 dark:text-gray-400">
          At most one nudge a day, never during quiet hours, and only on days you have something open.
        </p>
      </CardContent>
    </Card>
  );
}