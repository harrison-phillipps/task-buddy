/**
 * MobilePopover — Popover on desktop, bottom-sheet Drawer on mobile.
 * Drop-in replacement for shadcn Popover with the same API.
 */
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

export function MobilePopover({ children, content, title, open, onOpenChange, className, ...props }) {
  const isMobile = useIsMobile();
  const [internalOpen, setInternalOpen] = useState(false);

  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  if (isMobile) {
    const trigger = Array.isArray(children) ? children[0] : children;
    return (
      <>
        <span onClick={() => setIsOpen(true)}>{trigger}</span>
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerContent className="max-h-[85vh]">
            {title && (
              <DrawerHeader>
                <DrawerTitle>{title}</DrawerTitle>
              </DrawerHeader>
            )}
            <div className="px-4 pb-6 overflow-y-auto">{content}</div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} {...props}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className={className}>{content}</PopoverContent>
    </Popover>
  );
}