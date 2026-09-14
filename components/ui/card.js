import { cn } from "@/lib/utils";

function Card({ className, ...props }) {
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-[0_1px_2px_rgba(28,25,23,0.04),0_1px_10px_-4px_rgba(28,25,23,0.06)] transition-shadow",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }) {
  return <div data-slot="card-header" className={cn("flex flex-col gap-1 p-5", className)} {...props} />;
}

function CardTitle({ className, ...props }) {
  return <div data-slot="card-title" className={cn("text-sm font-semibold leading-none", className)} {...props} />;
}

function CardDescription({ className, ...props }) {
  return <div data-slot="card-description" className={cn("text-xs text-muted-foreground", className)} {...props} />;
}

function CardContent({ className, ...props }) {
  return <div data-slot="card-content" className={cn("p-5 pt-0", className)} {...props} />;
}

function CardFooter({ className, ...props }) {
  return <div data-slot="card-footer" className={cn("flex items-center p-5 pt-0", className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
