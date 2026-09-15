import { cn } from "@/lib/utils";

// Loading placeholder — Carter's neutral gray wash
// (interactive-background-gray-faded) rather than a warm black alpha.
function Skeleton({ className, ...props }) {
  return <div data-slot="skeleton" className={cn("animate-pulse rounded-button bg-ia-gray", className)} {...props} />;
}

export { Skeleton };
