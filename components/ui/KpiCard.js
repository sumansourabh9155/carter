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

/**
 * Props-only. No data imports — the page fetches and passes values down.
 *
 * `delta` is a percentage change. Ratio metrics (CM-ROAS) have no meaningful
 * percentage change, so they pass `deltaText` + `deltaDir` instead and the
 * card renders those verbatim — "▼ 0.27×" rather than a percent-of-a-multiple.
 * `deltaNote` names the comparison window; a delta with no stated basis is
 * a number the reader has to take on trust.
 *
 * `deltaInverse` is for COST metrics. Ad spend falling is good news, and
 * colouring it red the way a margin drop is coloured red tells the reader the
 * opposite of what happened. The arrow still points down — only the sentiment
 * flips.
 */
export function KpiCard({ label, value, unit = "money", sub, delta, deltaText, deltaDir, deltaNote, deltaInverse = false, verdict = false, breakEven = 0, verdictLabels, spark, estimated = false, freshness }) {
  const raw = deltaText ? { text: deltaText, dir: deltaDir ?? "flat" } : signed(delta);
  const d = deltaInverse && raw.dir !== "flat"
    ? { ...raw, dir: raw.dir === "up" ? "down" : "up" }
    : raw;
  const hasDelta = deltaText != null || delta != null;
  // Break-even is 0 for a margin and 1.0 for a RATIO. Judging CM-ROAS against
  // zero marked a 0.78x — money going in and less coming back — as "Healthy",
  // sitting in green next to two other green badges on the same card row.
  const negativeValue = typeof value === "number" && value < breakEven;
  const verdictTone = verdict ? (negativeValue ? "neg" : "pos") : null;

  return (
    <Card
      className={cn(
        // Tints, not borders: these cards draw their edge with an inset ring,
        // so a `border-*` colour has no width to land on and renders nothing.
        "p-4",
        verdictTone === "pos" && "bg-ia-positive-faded",
        verdictTone === "neg" && "bg-ia-negative-faded"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {estimated && <Badge variant="warning">Estimated</Badge>}
        {verdict && !estimated && (
          <Badge variant={verdictTone === "neg" ? "destructive" : "success"}>
            {verdictTone === "neg" ? (verdictLabels?.bad ?? "Losing") : (verdictLabels?.good ?? "Healthy")}
          </Badge>
        )}
      </div>

      <div className="mt-2 flex items-end justify-between gap-2">
        <span className={cn("tabular text-2xl font-semibold tracking-tight", negativeValue && "text-destructive")}>
          {fmt(value, unit)}
        </span>
        {spark && <Sparkline data={spark} color={verdictTone === "neg" ? "#d32f2f" : "#2238b0"} />}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
        {hasDelta && (
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
        {/* The note names the comparison window, so it only makes sense next
            to an actual comparison. Viewing the prior period has nothing
            before it, and "vs prior 30d" floating alone reads as a delta that
            failed to load. */}
        {deltaNote && hasDelta && <span className="text-xs text-muted-foreground">{deltaNote}</span>}
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>

      {freshness && <div className="mt-2 text-[10px] text-muted-foreground/70">{freshness}</div>}
    </Card>
  );
}
