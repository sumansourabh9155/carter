import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Title-as-question wrapper for any chart/visual block.
export function ChartCard({ title, subtitle, action, children, className }) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}
