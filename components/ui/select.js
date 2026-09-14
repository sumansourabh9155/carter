import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// A plain native <select> for filters — dropdowns, not tabs, when there are
// more than a couple of mutually-exclusive options to choose from.
function Select({ className, ...props }) {
  return (
    <div className="relative inline-block">
      <select
        data-slot="select"
        className={cn(
          "h-9 cursor-pointer appearance-none rounded-md border border-input bg-transparent py-1 pl-3 pr-8 text-sm text-foreground transition-colors outline-none",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export { Select };
