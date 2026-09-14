"use client";

import * as SheetPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

function Sheet(props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}
function SheetTrigger(props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetContent({ className, children, side = "right", ...props }) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl",
          "animate-in slide-in-from-right duration-300 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right",
          className
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="absolute right-4 top-4 grid size-8 place-items-center rounded-md text-muted-foreground outline-none transition hover:bg-black/[0.04] hover:text-foreground">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }) {
  return <div className={cn("border-b border-border p-5", className)} {...props} />;
}
function SheetTitle({ className, ...props }) {
  return <SheetPrimitive.Title className={cn("text-base font-semibold", className)} {...props} />;
}
function SheetDescription({ className, ...props }) {
  return <SheetPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />;
}
function SheetFooter({ className, ...props }) {
  return <div className={cn("mt-auto flex justify-end gap-2 border-t border-border p-5", className)} {...props} />;
}

export { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter };
