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
} from "@/components/ui/dropdown-menu";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

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