import Link from "next/link";
import { AlertTriangle, TrendingDown, TrendingUp, Info, Database, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SEVERITY = {
  critical: { icon: AlertTriangle, tone: "text-destructive", ring: "border-destructive/30", chip: "bg-destructive/15 text-destructive" },
  warning: { icon: TrendingDown, tone: "text-warning", ring: "border-warning/30", chip: "bg-warning/15 text-warning" },
  opportunity: { icon: TrendingUp, tone: "text-success", ring: "border-success/30", chip: "bg-success/15 text-success" },
  info: { icon: Info, tone: "text-primary", ring: "border-primary/30", chip: "bg-primary/15 text-primary" },
  data: { icon: Database, tone: "text-primary", ring: "border-primary/30", chip: "bg-primary/15 text-primary" },
};

export function InsightCard({ insight }) {
  const s = SEVERITY[insight.severity] || SEVERITY.info;
  const Icon = s.icon;
  return (
    <Card className={cn("flex flex-col gap-3 p-5 transition-colors hover:border-border", s.ring)}>
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 grid size-9 shrink-0 place-items-center rounded-input bg-ia-gray", s.tone)}>
          <Icon className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold leading-snug">{insight.title}</h3>
            {insight.metric && (
              <span className={cn("tabular shrink-0 rounded-button px-2 py-0.5 text-xs font-semibold", s.chip)}>{insight.metric}</span>
            )}
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{insight.body}</p>
        </div>
      </div>
      {insight.action && (
        <div className="flex justify-end">
          <Button asChild variant="ghost" size="sm" className="text-primary hover:text-primary">
            <Link href={insight.action.href}>
              {insight.action.label}
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      )}
    </Card>
  );
}
