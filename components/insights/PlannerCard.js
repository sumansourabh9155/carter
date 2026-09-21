"use client";

/*
  THE BUDGET PLANNER — an allocation, not a two-channel swap.

  The old recommendation was "move $8,150 from Google to Meta", priced at
  constant CM-ROAS. Constant returns imply you should move the ENTIRE budget
  to the best channel, which nobody does, which is why a linear suggestion
  reads as naive to anyone who buys media for a living.

  This shows the allocation that maximises CM2 under diminishing returns, and
  it is allowed to recommend spending LESS — which on this data it does. That
  is the honest output and the most valuable thing on the screen: the curves
  say $26,700 earns more profit than $54,708.

  The ladder underneath answers the question that always follows: not "what
  split" but "how much at all". It is plotted in CM2, because in gross CM the
  answer is always "spend more" and the curve never turns over.
*/

import { Sliders } from "lucide-react";
import { Card, CardHeading } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { money, multiple, signedMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PlannerCard({ plan, ladder }) {
  if (!plan) return <Skeleton className="h-[340px] w-full rounded-card" />;

  const uplift = signedMoney(plan.upliftCm2);
  const maxCm2 = Math.max(...(ladder ?? []).map((l) => l.cm2), plan.plannedCm2, 1);
  const maxSpend = Math.max(...plan.rows.map((r) => Math.max(r.currentSpend, r.plannedSpend)), 1);

  return (
    <Card className="overflow-hidden p-0">
      <CardHeading
        title="Budget plan"
        description="The split that maximises CM2 under diminishing returns — not a swap between two channels."
      >
        <Badge variant={plan.upliftCm2 > 0 ? "positive" : "neutral"}>
          <Sliders className="size-3" /> {uplift.text} CM2
        </Badge>
      </CardHeading>

      {/* The headline: what to spend, and what it earns after spend. */}
      <div className="grid gap-3 border-y border-border bg-surface-subtle px-6 py-3 sm:grid-cols-3">
        <Stat label="Recommended spend" value={money(plan.allocated)}
          hint={plan.spendCutFromCurrent > 0
            ? `${money(plan.spendCutFromCurrent)} less than today`
            : `${money(Math.abs(plan.spendCutFromCurrent))} more than today`} />
        <Stat label="CM2 today" value={money(plan.currentCm2)} hint={`on ${money(plan.currentSpend)} of spend`} />
        <Stat label="CM2 on plan" value={money(plan.plannedCm2)} hint={`at ${multiple(plan.plannedCmRoas)} CM-ROAS`}
          tone={plan.upliftCm2 > 0 ? "pos" : undefined} />
      </div>

      {plan.stoppedEarly && (
        <p className="border-b border-border bg-ia-notice-faded px-6 py-2.5 text-[12px] leading-relaxed">
          The curves refuse {money(plan.unallocated)} of the plan: past {money(plan.allocated)} no channel returns a
          dollar of margin for a dollar of spend. The recommendation is to spend less, not to find somewhere to put it.
        </p>
      )}

      {/* Per channel: now vs plan, with the marginal return that justifies it. */}
      <div className="px-6 py-3">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Channel</span>
          <span className="text-right">Now → plan</span>
          <span className="text-right">Last $ earns</span>
        </div>
        {plan.rows.map((r) => {
          const d = signedMoney(r.deltaSpend);
          return (
            <div key={r.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-t border-border-subtle py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 shrink-0 rounded-full" style={{ background: r.color }} />
                  <span className="truncate text-[13px] font-medium">{r.name}</span>
                  {/* Saturation is the whole mechanism, so it is on screen. */}
                  <span className="shrink-0 text-[10px] text-muted-foreground">α {r.alpha}</span>
                </div>
                {/* Two bars: today, and the plan. Same scale, so the
                    reallocation is visible rather than described. */}
                <div className="mt-1 space-y-0.5">
                  <Bar value={r.currentSpend} max={maxSpend} className="bg-neutral-300" />
                  <Bar value={r.plannedSpend} max={maxSpend} color={r.color} />
                </div>
              </div>
              <div className="text-right">
                <div className="tabular text-[12px]">
                  {money(r.currentSpend)} → <span className="font-semibold">{money(r.plannedSpend)}</span>
                </div>
                <div className={cn("tabular text-[11px]", d.dir === "up" ? "text-ia-positive" : d.dir === "down" ? "text-ia-negative" : "text-muted-foreground")}>
                  {d.text}
                </div>
              </div>
              <div className="text-right">
                <div className={cn("tabular text-[13px] font-semibold", (r.marginalCmRoas ?? 0) < 1 && "text-muted-foreground")}>
                  {r.marginalCmRoas != null ? multiple(r.marginalCmRoas) : "—"}
                </div>
                <div className="text-[10px] text-muted-foreground">marginal</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* HOW MUCH, not just where. */}
      {ladder?.length > 0 && (
        <div className="border-t border-border px-6 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            CM2 at different budgets
          </div>
          <div className="mt-2 space-y-1.5">
            {ladder.map((l) => (
              <div key={l.budget} className="flex items-center gap-3">
                <span className="tabular w-16 shrink-0 text-right text-[11px] text-muted-foreground">{money(l.budget)}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-ia-gray">
                  <div
                    className={cn("h-full rounded-full", l.isOptimum ? "bg-ia-positive" : "bg-primary/60")}
                    style={{ width: `${(l.cm2 / maxCm2) * 100}%` }}
                  />
                </div>
                <span className="tabular w-20 shrink-0 text-right text-[11px] font-medium">{money(l.cm2)}</span>
                {l.isOptimum && <Badge variant="positive" size="sm">Optimum</Badge>}
                {l.isCurrentPlan && !l.isOptimum && <Badge variant="outline" size="sm">Your plan</Badge>}
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Plotted in CM2 — margin after the spend. In gross margin the answer is always &ldquo;spend more&rdquo;, which
            is why that framing cannot find a ceiling.
          </p>
        </div>
      )}

      <div className="border-t border-border bg-surface-subtle px-6 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">What this assumes</div>
        <ul className="mt-1 space-y-0.5">
          {plan.assumptions.map((a, i) => (
            <li key={i} className="flex gap-2 text-[11px] leading-relaxed text-muted-foreground">
              <span className="mt-[6px] size-1 shrink-0 rounded-full bg-muted-foreground/50" />
              {a}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

function Bar({ value, max, color, className }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ia-gray">
      <div
        className={cn("h-full rounded-full", className)}
        style={{ width: `${(value / max) * 100}%`, background: className ? undefined : color }}
      />
    </div>
  );
}

function Stat({ label, value, hint, tone }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("tabular text-[20px] font-semibold leading-7", tone === "pos" && "text-success")}>{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
