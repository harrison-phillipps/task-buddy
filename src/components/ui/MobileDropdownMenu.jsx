/**
 * MobileDropdownMenu — DropdownMenu on desktop, bottom-sheet Drawer on mobile.
 * Usage: replace DropdownMenu/DropdownMenuTrigger/DropdownMenuContent with this component.
 *
 * <MobileDropdownMenu trigger={<Button>Open</Button>}>
 *   <DropdownMenuItem>Item</DropdownMenuItem>
 * </MobileDropdownMenu>
 */
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function MobileDropdownMenu({
  trigger,
  children,
  title,
  open,
  onOpenChange,
  align = "end",
  className,
  ...props
}) {
  const isMobile = useIsMobile();
  const [internalOpen, setInternalOpen] = useState(false);

  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  if (isMobile) {
    return (
      <>
        <span onClick={() => setIsOpen(true)}>{trigger}</span>
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerContent className="max-h-[80vh]">
            {title && (
              <DrawerHeader>
                <DrawerTitle>{title}</DrawerTitle>
              </DrawerHeader>
            )}
            <div
              className="flex flex-col gap-1 px-4 pb-8"
              onClick={() => setIsOpen(false)}
            >
              {children}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen} {...props}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className={className}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * MobileDropdownMenuItem — context-agnostic menu item.
 * Renders as a Radix DropdownMenuItem on desktop (inside DropdownMenu context),
 * and as a plain styled button inside the Drawer on mobile (no context needed).
 * Does NOT call stopPropagation/preventDefault — click bubbles to the parent
 * div's onClick to close the drawer, preserving existing close-on-select behavior.
 */
export function MobileDropdownMenuItem({ onClick, className, children, ...props }) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex items-center gap-2 rounded-lg px-4 py-3 text-sm text-left w-full transition-colors hover:bg-accent focus:bg-accent focus:outline-none [&_svg]:size-4 [&_svg]:shrink-0",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
  return (
    <DropdownMenuItem onClick={onClick} className={className} {...props}>
      {children}
    </DropdownMenuItem>
  );
}