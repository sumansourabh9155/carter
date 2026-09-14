"use client";

import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { ChevronLeft, Sparkles, PackageSearch } from "lucide-react";
import { getProduct } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { useAIPanel } from "@/context/AIPanelContext";
import { QUADRANT_META } from "@/lib/compute/margin";
import { FUNNEL_VERDICT_META } from "@/lib/compute/funnel";
import { PageContainer } from "@/components/PageHeader";
import { ProductThumb } from "@/components/ProductThumb";
import { KpiCard } from "@/components/ui/KpiCard";
import { ChartCard } from "@/components/ChartCard";
import { MarginWaterfall } from "@/components/charts/MarginWaterfall";
import { RankBars } from "@/components/charts/RankBars";
import { Sparkline } from "@/components/ui/Sparkline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { money, pct, multiple, signed } from "@/lib/format";
import { cn } from "@/lib/utils";

const SPLIT_COLORS = ["#eb6834", "#2a78d6", "#4a3aa7", "#e87ba4", "#1baf7a"];

// Compact horizontal split (device or age) for the product audience card.
function SplitBars({ title, segments }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold text-muted-foreground">{title}</div>
      <div className="space-y-2">
        {segments.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-xs">{s.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/[0.05]">
              <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: SPLIT_COLORS[i % SPLIT_COLORS.length] }} />
            </div>
            <span className="tabular w-9 shrink-0 text-right text-xs font-medium">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildWaterfall(p) {
  return [
    { name: "Revenue", value: p.revenue, fill: "#eb6834" },
    { name: "− COGS", value: -p.cogs, fill: "#d6d3d1" },
    { name: "− Ship/Fees/Ret", value: -(p.shipping + p.fees + p.returns), fill: "#d6d3d1" },
    { name: "CM1", value: p.cm1, fill: "#2a78d6", marker: true },
    { name: "− Ad spend", value: -p.adSpend, fill: "#eda100" },
    { name: "CM2", value: p.cm2, fill: "#4a3aa7", marker: true },
    { name: "− Overhead", value: -p.overheadAlloc, fill: "#d6d3d1" },
    { name: "CM3", value: p.cm3, fill: "#1baf7a", marker: true },
  ];
}

export default function ProductDetailPage() {
  const { sku } = useParams();
  const { data: p, loading } = useAsync(() => getProduct(sku), [sku]);
  const { openPanel } = useAIPanel();

  if (!loading && !p) notFound();

  if (loading || !p) {
    return (
      <PageContainer>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
        <Skeleton className="h-72 w-full" />
      </PageContainer>
    );
  }

  const meta = QUADRANT_META[p.quadrant];
  const takeaway = p.losingMoney
    ? `After ad spend, ${p.name} loses ${money(Math.abs(p.cm2PerOrder), { decimals: 2 })} per order. Cut its ads or raise price to clear break-even.`
    : `${p.name} earns ${money(p.cm2PerOrder, { decimals: 2 })} per order after ads — a ${meta.label.toLowerCase()} worth ${p.quadrant === "hero" ? "scaling" : "holding"}.`;
  const prompt = p.losingMoney ? `Why does ${p.name} lose money?` : `Should I scale ads on ${p.name}?`;

  const cp = p.channelPerformance;
  let channelTakeaway = null;
  if (cp?.best && cp?.worst && cp.best.id !== cp.worst.id) {
    const worstSpendPct = pct((cp.worst.spend / p.adSpend) * 100);
    const bestSpendPct = pct((cp.best.spend / p.adSpend) * 100);
    channelTakeaway = cp.worst.cmRoas != null && cp.worst.cmRoas < 1
      ? `${cp.worst.name} is getting ${worstSpendPct} of this product's ad budget but returns only ${multiple(cp.worst.cmRoas)} — below break-even. ${cp.best.name} converts the same product at ${multiple(cp.best.cmRoas)} for ${bestSpendPct} of spend. Worth shifting budget for this SKU specifically, even if ${cp.worst.name} looks fine on the Marketing tab overall.`
      : `${cp.best.name} converts this product into ${multiple(cp.best.cmRoas)} profit per ad dollar — the strongest channel for this specific SKU — while getting just ${bestSpendPct} of its budget. There may be room to scale it here.`;
  }

  return (
    <PageContainer>
      <Link href="/products" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Products
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <ProductThumb id={p.id} name={p.name} size={56} rounded="rounded-lg" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{p.name}</h1>
              {p.estimated && <Badge variant="warning">Estimated COGS</Badge>}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
              <span>{p.sku}</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: meta.color }} /> {meta.label}
              </span>
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => openPanel(prompt)}>
          <Sparkles className="size-4" /> Ask Tally
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="CM1" value={p.cm1} sub={pct(p.cm1Pct)} verdict />
        <KpiCard label="CM2 (after ads)" value={p.cm2} sub={pct(p.cm2Pct)} verdict />
        <KpiCard label="CM3 (net)" value={p.cm3} sub={pct(p.cm3Pct)} verdict />
        <KpiCard label="CM-ROAS" value={p.cmRoas} unit="mult" sub={`${multiple(p.revRoas)} revenue ROAS`} />
      </div>

      <ChartCard title="Where this SKU's money goes" subtitle={`${p.units.toLocaleString()} units · ${money(p.revenue)} revenue`}>
        <MarginWaterfall data={buildWaterfall(p)} height={240} />
        <p className="mt-4 rounded-lg border border-border bg-black/[0.02] px-4 py-3 text-sm text-foreground/90">{takeaway}</p>
      </ChartCard>

      {cp && (
        <ChartCard
          title="How this product's paid sales split by channel"
          subtitle="CM-ROAS on the ad-attributed slice only — small order counts per channel, so read the numbers as directional"
        >
          {/* Paid vs earned first — ads only move the paid slice. */}
          <div className="mb-4">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">Where this SKU's units come from</span>
              <span className="tabular text-muted-foreground">
                {cp.paidUnits.toLocaleString()} paid ({pct(cp.paidSharePct)}) · {cp.earnedUnits.toLocaleString()} earned
              </span>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-black/[0.06]">
              <div className="h-full bg-primary" style={{ width: `${cp.paidSharePct}%` }} />
              <div className="h-full bg-emerald-500/70" style={{ width: `${100 - cp.paidSharePct}%` }} />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Ad budget can only move the <span className="font-medium text-primary">paid</span> slice — the rest is <span className="font-medium text-emerald-600">earned</span> (organic, direct, email) and doesn't scale with spend.
            </p>
          </div>

          <RankBars
            items={cp.channels.map((c) => ({
              name: c.name,
              value: c.cmRoas ?? 0,
              color: c.color,
              sub: `${money(c.spend)} spend · ${money(c.revenue)} paid revenue · ${signed(c.trendPct).text}${c.confidence === "low" ? " · low sample" : ""}`,
            }))}
            breakeven={1}
          />
          {channelTakeaway && (
            <p className="mt-4 rounded-lg border border-border bg-black/[0.02] px-4 py-3 text-sm text-foreground/90">{channelTakeaway}</p>
          )}
        </ChartCard>
      )}

      {p.funnel && (
        <ChartCard
          title="On-site behavior — from the Tally Web Pixel"
          subtitle="How visitors move from viewing this product to buying it, this period"
          action={
            <span
              className="rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ color: FUNNEL_VERDICT_META[p.funnel.verdict].color, background: `${FUNNEL_VERDICT_META[p.funnel.verdict].color}1a` }}
            >
              {FUNNEL_VERDICT_META[p.funnel.verdict].label}
            </span>
          }
        >
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">Product views</div>
              <div className="tabular mt-0.5 text-lg font-semibold">{p.funnel.views.toLocaleString()}</div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">Added to cart</div>
              <div className="tabular mt-0.5 text-lg font-semibold">{p.funnel.atc.toLocaleString()}</div>
              <div className="text-[11px] text-muted-foreground">{pct(p.funnel.viewToAtcPct)} of views</div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">Reached checkout</div>
              <div className="tabular mt-0.5 text-lg font-semibold">{p.funnel.checkout.toLocaleString()}</div>
              <div className="text-[11px] text-muted-foreground">{pct(p.funnel.atcToCheckoutPct)} of cart</div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">View → purchase</div>
              <div className="tabular mt-0.5 text-lg font-semibold">{pct(p.funnel.overallConvPct)}</div>
              <div className="text-[11px] text-muted-foreground">{p.units.toLocaleString()} units sold</div>
            </div>
          </div>
          <p className="mt-4 rounded-lg border border-border bg-black/[0.02] px-4 py-3 text-sm text-foreground/90">
            {FUNNEL_VERDICT_META[p.funnel.verdict].desc}
          </p>
        </ChartCard>
      )}

      {p.audience && (
        <ChartCard
          title="Who buys this — from ad-platform audience data"
          subtitle="The paid-buyer profile your ad platforms report for this SKU"
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <SplitBars title="Device" segments={p.audience.device} />
            <SplitBars title="Age" segments={p.audience.age} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs">
            <span className="text-muted-foreground">Top regions:</span>
            {p.audience.topRegions.map((r) => (
              <span key={r} className="rounded-full border border-border bg-card px-2.5 py-1 font-medium">{r}</span>
            ))}
            <span className="ml-auto text-muted-foreground">
              Skews <span className="font-medium text-foreground">{p.audience.topAge.label}</span> · <span className="font-medium text-foreground">{p.audience.topDevice.label}</span>
            </span>
          </div>
        </ChartCard>
      )}

      <ChartCard
        title="Demand & supply"
        subtitle="Projected from recent sales trend — a directional estimate, not a guarantee"
        action={p.supplyEstimated && <Badge variant="warning">Estimated</Badge>}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Recent demand trend</div>
            <div className="mt-1 flex items-center gap-2">
              <Sparkline data={p.spark} color={p.trendPct < 0 ? "#ef4444" : "#eb6834"} />
              <span className={cn("tabular text-sm font-medium", signed(p.trendPct).dir === "up" ? "text-success" : signed(p.trendPct).dir === "down" ? "text-destructive" : "text-muted-foreground")}>
                {signed(p.trendPct).text}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Days until stockout</div>
            <div className={cn("tabular mt-1 text-2xl font-semibold", p.stockoutRisk ? "text-destructive" : p.needsReorderNow && "text-warning")}>
              {p.projectedDaysToStockout ?? "—"}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs text-muted-foreground">On hand</div>
            <div className="tabular mt-0.5 text-sm font-semibold">{p.onHand?.toLocaleString() ?? "—"} units</div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs text-muted-foreground">Reorder point</div>
            <div className="tabular mt-0.5 text-sm font-semibold">{p.reorderPointUnits?.toLocaleString() ?? "—"} units</div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs text-muted-foreground">Lead time used</div>
            <div className="tabular mt-0.5 text-sm font-semibold">{p.leadTimeDaysUsed} days</div>
          </div>
        </div>

        <div className={cn(
          "mt-4 flex items-start gap-3 rounded-lg border p-3.5",
          p.stockoutRisk ? "border-destructive/25 bg-destructive/[0.04]" : p.needsReorderNow ? "border-warning/25 bg-warning/[0.04]" : "border-success/25 bg-success/[0.04]"
        )}>
          <PackageSearch className={cn("mt-0.5 size-4 shrink-0", p.stockoutRisk ? "text-destructive" : p.needsReorderNow ? "text-warning" : "text-success")} />
          <p className="text-sm">
            {p.stockoutRisk
              ? <>Order <span className="tabular font-semibold">~{p.suggestedReorderQty?.toLocaleString()} units</span> today — at the current pace this sells out in {p.projectedDaysToStockout} days, sooner than a {p.leadTimeDaysUsed}-day reorder can land. Expedite if possible.</>
              : p.needsReorderNow
              ? <>Time to place a routine reorder — <span className="tabular font-semibold">~{p.suggestedReorderQty?.toLocaleString()} units</span> would cover the next {p.leadTimeDaysUsed + 30} days. No rush, but don't let it slide.</>
              : <>Covered for {p.projectedDaysToStockout} more days at the current pace — no reorder needed yet.</>}
            {p.supplyEstimated && <span className="mt-1 block text-xs text-muted-foreground">Using a default lead time / safety stock buffer — add {p.supplier ? `${p.supplier}'s` : "the supplier's"} real numbers on Data Collection for a sharper estimate.</span>}
          </p>
        </div>
      </ChartCard>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Landed COGS</div>
          <div className="tabular mt-1 text-lg font-semibold">{money(p.cogs)}</div>
          <div className="text-[11px] text-muted-foreground">{money(p.unitCost, { decimals: 2 })}/unit · {p.cogsSource}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Ad spend</div>
          <div className="tabular mt-1 text-lg font-semibold">{money(p.adSpend)}</div>
          <div className="text-[11px] text-muted-foreground">{multiple(p.cmRoas)} CM-ROAS</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Returns</div>
          <div className="tabular mt-1 text-lg font-semibold">{money(p.returns)}</div>
          <div className="text-[11px] text-muted-foreground">{pct((p.returns / p.revenue) * 100)} of revenue</div>
        </Card>
      </div>
    </PageContainer>
  );
}
