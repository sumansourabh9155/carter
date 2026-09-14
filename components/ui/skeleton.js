import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }) {
  return <div data-slot="skeleton" className={cn("animate-pulse rounded-md bg-black/5", className)} {...props} />;
}

export { Skeleton };
