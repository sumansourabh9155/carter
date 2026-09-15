"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

/*
  Carter Tabs — Figma node 79:14926.
    list     2px padding (Spacing/01) on Neutral/100, 4px radius
    trigger  12px x / 8px y padding, 4px radius
    active   Brand/100 fill with Brand/700 label (NOT a white raised chip)
    focus    Border/Focus #3b5bdb
*/
function Tabs({ className, ...props }) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-3", className)} {...props} />;
}

function TabsList({ className, ...props }) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex w-fit items-center justify-center gap-1 rounded-button bg-neutral-100 p-0.5 text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-button px-3 py-2 text-[14px] leading-5 font-medium whitespace-nowrap transition-colors outline-none",
        "text-muted-foreground hover:bg-neutral-200 hover:text-foreground",
        "focus-visible:ring-[2px] focus-visible:ring-border-focus/40 disabled:opacity-40",
        "data-[state=active]:bg-brand-100 data-[state=active]:font-semibold data-[state=active]:text-brand-700",
        "[&_svg]:size-3.5 [&_svg]:pointer-events-none",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("flex-1 outline-none", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
