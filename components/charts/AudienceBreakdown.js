import { multiple, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

// One audience dimension (device / age / geography) as decision-grade rows:
// the bar is SHARE OF AD SPEND (where the money goes), the chip is CM-ROAS
// (whether it pays off), colored against the blended rate. Seeing a fat
// spend bar next to a red chip is the whole point — that's wasted budget.
export function AudienceBreakdown({ segments, blendedCmRoas, compact = false }) {
  if (!segments?.length) return null;
  const maxSpend = Math.max(...segments.map((s) => s.spendSharePct), 1);
  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {segments.map((s) => {
        const below = s.cmRoas != null && blendedCmRoas != null && s.cmRoas < blendedCmRoas;
        return (
          <div key={s.id}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="size-2 rounded-full" style={{ background: s.color }} />
                {s.label}
              </span>
              {s.cmRoas != null && (
                <span
                  className={cn(
                    "tabular rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                    below ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
                  )}
                  title={below ? "Below your blended CM-ROAS — dragging the average down" : "Above your blended CM-ROAS — pulling its weight"}
                >
                  {multiple(s.cmRoas)}
                </span>
              )}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/[0.05]">
              <div className="h-full rounded-full" style={{ width: `${(s.spendSharePct / maxSpend) * 100}%`, background: s.color }} />
            </div>
            {!compact && (
              <div className="mt-1 text-[11px] text-muted-foreground">
                {pct(s.spendSharePct)} of ad spend · {pct(s.orderSharePct)} of paid orders
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
