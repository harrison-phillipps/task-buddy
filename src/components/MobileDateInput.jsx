import { cn } from "@/lib/utils";

/**
 * Consistent date or time input that matches MobileSelect styling.
 * Uses native <input type="date|time"> which renders the native picker on mobile.
 */
export default function MobileDateInput({ type = "date", value, onChange, className, min, max, placeholder, disabled }) {
  return (
    <input
      type={type}
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      min={min}
      max={max}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm",
        "ring-offset-background placeholder:text-muted-foreground",
        "focus:outline-none focus:ring-1 focus:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "min-h-[44px]",
        // Ensure the native calendar/clock icon is visible in dark mode
        "[color-scheme:light] dark:[color-scheme:dark]",
        className
      )}
    />
  );
}