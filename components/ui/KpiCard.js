import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "@/components/ui/Sparkline";
import { money, multiple, pct, signed } from "@/lib/format";
import { cn } from "@/lib/utils";

function fmt(value, unit) {
  if (unit === "money") return money(value);
  if (unit === "mult") return multiple(value);
  if (unit === "pct") return pct(value);
  return value;
}

// Props-only. No data imports — the page fetches and passes values down.
export function KpiCard({ label, value, unit = "money", sub, delta, verdict = false, spark, estimated = false, freshness }) {
  const d = signed(delta);
  const negativeValue = typeof value === "number" && value < 0;
  const verdictTone = verdict ? (negativeValue ? "neg" : "pos") : null;

  return (
    <Card
      className={cn(
        "p-4 transition-colors hover:border-black/15",
        verdictTone === "pos" && "border-success/30 bg-success/[0.04]",
        verdictTone === "neg" && "border-destructive/30 bg-destructive/[0.04]"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {estimated && <Badge variant="warning">Estimated</Badge>}
        {verdict && !estimated && <Badge variant={verdictTone === "neg" ? "destructive" : "success"}>{verdictTone === "neg" ? "Losing" : "Healthy"}</Badge>}
      </div>

      <div className="mt-2 flex items-end justify-between gap-2">
        <span className={cn("tabular text-2xl font-semibold tracking-tight", negativeValue && "text-destructive")}>
          {fmt(value, unit)}
        </span>
        {spark && <Sparkline data={spark} color={verdictTone === "neg" ? "#ef4444" : "#eb6834"} />}
      </div>

      <div className="mt-2 flex items-center gap-2">
        {delta != null && (
          <span
            className={cn(
              "tabular text-xs font-medium",
              d.dir === "up" && "text-success",
              d.dir === "down" && "text-destructive",
              d.dir === "flat" && "text-muted-foreground"
            )}
          >
            {d.text}
          </span>
        )}
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>

      {freshness && <div className="mt-2 text-[10px] text-muted-foreground/70">{freshness}</div>}
    </Card>
  );
}
