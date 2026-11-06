import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";

const FALLBACK_TIMEZONE = "Australia/Adelaide";

const COMMON_ZONES = [
  "Australia/Adelaide",
  "Australia/Sydney",
  "Australia/Brisbane",
  "Australia/Melbourne",
  "Australia/Perth",
  "Pacific/Auckland",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
];

/** Read-only timezone line with a change option. Quiet hours read this zone. */
export default function TimezoneSetting({ value, onChange }) {
  const [editing, setEditing] = useState(false);

  const detected = useMemo(() => {
    try {
      return Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone || null;
    } catch {
      return null;
    }
  }, []);

  const zones = useMemo(() => {
    const list = new Set([detected, value, ...COMMON_ZONES].filter(Boolean));
    return Array.from(list);
  }, [detected, value]);

  const handleSelect = (next) => {
    onChange(next);
    setEditing(false);
  };

  return (
    <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Label className="flex items-center gap-2 text-sm">
            <Globe className="w-4 h-4 text-gray-500" />
            Timezone
          </Label>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 truncate">
            {value || `${FALLBACK_TIMEZONE} (default)`}
          </p>
          {!value && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Not set on this account yet — quiet hours use {FALLBACK_TIMEZONE}.
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditing(!editing)} className="shrink-0">
          {editing ? "Cancel" : "Change"}
        </Button>
      </div>

      {editing && (
        <Select value={value || detected || FALLBACK_TIMEZONE} onValueChange={handleSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a timezone" />
          </SelectTrigger>
          <SelectContent>
            {zones.map((zone) => (
              <SelectItem key={zone} value={zone}>
                {zone}
                {zone === detected ? " (this device)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}