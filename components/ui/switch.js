"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

/*
  Carter Toggle. The track picks up the INTERACTIVE ramp — filled with
  interactive-background-primary when on, and the gray wash
  (rgba(108,132,157,.12)) when off. The knob rides on elevation-control.
*/
function Switch({ className, ...props }) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors outline-none",
        "focus-visible:ring-[3px] focus-visible:ring-border-focus/40 disabled:cursor-not-allowed disabled:opacity-40",
        "data-[state=checked]:bg-ia-primary data-[state=unchecked]:bg-ia-gray-hover",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-4 rounded-full bg-white shadow-control transition-transform",
          "data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5"
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
