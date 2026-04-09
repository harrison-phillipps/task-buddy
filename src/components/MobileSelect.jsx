import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

function useIsMobile() {
  return typeof window !== 'undefined' && window.innerWidth < 768;
}

/**
 * Drop-in replacement for Select that renders as a bottom-sheet Drawer on mobile.
 * Props match shadcn Select: value, onValueChange, placeholder, options [{value, label}], className
 */
export default function MobileSelect({ value, onValueChange, placeholder = "Select...", options = [], className, disabled }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const selectedLabel = options.find(o => o.value === value)?.label || placeholder;

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]",
          className
        )}
      >
        <span className={value ? "" : "text-muted-foreground"}>{selectedLabel}</span>
        <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{placeholder}</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-1 pb-8">
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onValueChange(opt.value); setOpen(false); }}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px]",
                  opt.value === value
                    ? "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}