import { multiple, money } from "@/lib/format";
import { cn } from "@/lib/utils";

const FORMATTERS = { multiple, money, number: (v) => Math.round(v).toLocaleString() };

// Horizontal ranked bars (e.g. channels by CM-ROAS, or products by returns
// $). Div-based, no Recharts. showBreakeven/format let it double as a plain
// ranked-value chart (e.g. returns $) where a CM-ROAS break-even line
// wouldn't make sense.
export function RankBars({ items, breakeven = 1, showBreakeven = true, format = "multiple" }) {
  const fmt = FORMATTERS[format] || multiple;
  const max = Math.max(...items.map((i) => i.value), showBreakeven ? breakeven : 0, 0.1);
  return (
    <div className="space-y-3">
      {items.map((it) => {
        const below = showBreakeven && it.value < breakeven;
        return (
          <div key={it.name}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium">{it.name}</span>
              <span className={cn("tabular font-semibold", below ? "text-destructive" : "text-success")}>
                {fmt(it.value)}
              </span>
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-full bg-ia-gray">
              <div
                className="h-full rounded-full"
                style={{ width: `${(it.value / max) * 100}%`, background: it.color || (below ? "#d32f2f" : "#2e7d32") }}
              />
              {showBreakeven && (
                <div className="absolute inset-y-0 w-px bg-neutral-900/30" style={{ left: `${(breakeven / max) * 100}%` }} />
              )}
            </div>
            {it.sub && <div className="mt-1 text-[11px] text-muted-foreground">{it.sub}</div>}
          </div>
        );
      })}
      {showBreakeven && (
        <div className="flex items-center gap-1.5 pt-1 text-[10px] text-muted-foreground">
          <span className="inline-block h-2.5 w-px bg-neutral-900/30" /> break-even ({multiple(breakeven)} CM-ROAS)
        </div>
      )}
    </div>
  );
}
