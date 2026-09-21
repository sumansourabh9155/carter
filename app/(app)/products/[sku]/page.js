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
import { Card, CardHeading } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { money, pct, multiple, signed, signedMoney, signedMultiple } from "@/lib/format";
import { cn } from "@/lib/utils";

const SPLIT_COLORS = ["#2238b0", "#0277bd", "#7b1fa2", "#7b1fa2", "#2e7d32"];

// Compact horizontal split (device or age) for the product audience card.
function SplitBars({ title, segments }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold text-muted-foreground">{title}</div>
      <div className="space-y-2">
        {segments.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-xs">{s.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-ia-gray">
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
    { name: "Revenue", value: p.revenue, fill: "#2238b0" },
    { name: "− COGS", value: -p.cogs, fill: "#e4eaed" },
    { name: "− Ship/Fees/Ret", value: -(p.shipping + p.fees + p.returns), fill: "#e4eaed" },
    { name: "CM1", value: p.cm1, fill: "#0277bd", marker: true },
    { name: "− Ad spend", value: -p.adSpend, fill: "#ef6c00" },
    { name: "CM2", value: p.cm2, fill: "#7b1fa2", marker: true },
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
  // Two sentences because there are two verdicts: what the SKU contributes,
  // and whether its MEDIA pays. A product can be a strong contributor whose
  // ad spend is still destroying value, and collapsing that into one line is
  // how the old copy called four such SKUs healthy.
  const takeaway = p.mediaLosing
    ? `Its ads are underwater: ${money(p.adSpend)} of spend against ${money(p.paidCm1)} of attributed CM1 — ${money(p.mediaCm2)} on the media at ${multiple(p.cmRoas)} CM-ROAS. The SKU itself still contributes ${money(p.cm2)} CM2, so this is a budget decision, not a product one.`
    : `${p.name} earns ${money(p.cm2PerUnit, { decimals: 2 })} of CM2 per unit and its media returns ${multiple(p.cmRoas)} — a ${meta.label.toLowerCase()} worth ${p.quadrant === "hero" ? "scaling" : "holding"}.`;
  const prompt = p.mediaLosing ? `Why are the ads on ${p.name} losing money?` : `Should I scale ads on ${p.name}?`;

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
          <ProductThumb id={p.id} name={p.name} size={56} rounded="rounded-input" />
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
          <Sparkles className="size-4" /> Ask Carter
        </Button>
      </div>

      {/* Levels with their movement. "CM2 is $17,245" is a fact; "CM2 is
          $17,245, up $2,042" is the beginning of a decision. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="CM1" value={p.cm1} sub={pct(p.cm1Pct)} verdict
          delta={p.delta?.cm1.pct} deltaNote={p.delta ? "vs prior 30d" : undefined}
        />
        <KpiCard
          label="CM2 (after ads)" value={p.cm2} sub={pct(p.cm2Pct)} verdict
          delta={p.delta?.cm2.pct} deltaNote={p.delta ? "vs prior 30d" : undefined}
        />
        <KpiCard
          label="CM-ROAS" value={p.cmRoas} unit="mult" sub={`${multiple(p.revRoas)} revenue ROAS`}
          verdict breakEven={1} verdictLabels={{ good: "Ads pay", bad: "Ads underwater" }}
          deltaText={p.delta?.cmRoas.abs != null ? signedMultiple(p.delta.cmRoas.abs).text : undefined}
          deltaDir={p.delta?.cmRoas.dir}
          deltaNote={p.delta ? "vs prior 30d" : undefined}
        />
        <KpiCard
          label="Ad spend" value={p.adSpend} sub={`${p.units.toLocaleString()} units sold`}
          delta={p.delta?.adSpend.pct} deltaNote={p.delta ? "vs prior 30d" : undefined} deltaInverse
        />
      </div>

      {/* WHAT CHANGED — the question a media team opens a SKU to answer.
          Both periods run through the same margin engine, so the prior
          column can never disagree with the current one. */}
      {p.prev && (
        <Card className="overflow-hidden p-0">
          <CardHeading
            title="This period vs. last"
            description="Same engine, same unit economics — only the period's own raw inputs differ."
          />
          <div className="grid grid-cols-4 gap-3 border-t border-border bg-[#f8fafb] px-6 py-2.5 text-[12px] font-semibold leading-4 text-[#7d929e]">
            <span>Metric</span>
            <span className="text-right">Prior 30d</span>
            <span className="text-right">This period</span>
            <span className="text-right">Change</span>
          </div>
          {[
            { label: "Revenue", now: money(p.revenue), was: money(p.prev.revenue), d: signedMoney(p.delta.revenue.abs), pctText: p.delta.revenue.pct },
            { label: "Ad spend", now: money(p.adSpend), was: money(p.prev.adSpend), d: signedMoney(p.delta.adSpend.abs), pctText: p.delta.adSpend.pct, inverse: true },
            { label: "CM1", now: money(p.cm1), was: money(p.prev.cm1), d: signedMoney(p.delta.cm1.abs), pctText: p.delta.cm1.pct },
            { label: "CM2", now: money(p.cm2), was: money(p.prev.cm2), d: signedMoney(p.delta.cm2.abs), pctText: p.delta.cm2.pct },
            { label: "CM-ROAS", now: multiple(p.cmRoas), was: multiple(p.prev.cmRoas), d: signedMultiple(p.delta.cmRoas.abs) },
          ].map((r) => (
            <div key={r.label} className="grid grid-cols-4 items-center gap-3 border-t border-border-subtle px-6 py-2.5">
              <span className="text-[13px] font-medium">{r.label}</span>
              <span className="tabular text-right text-[13px] text-muted-foreground">{r.was}</span>
              <span className="tabular text-right text-[13px] font-medium">{r.now}</span>
              <span className="text-right">
                {/* Rising ad spend is not "good" the way rising margin is —
                    the cost rows read their colour inverted. */}
                <span className={cn(
                  "tabular text-[13px] font-semibold",
                  r.d.dir === "flat" && "text-muted-foreground",
                  r.d.dir !== "flat" && ((r.d.dir === "up") !== Boolean(r.inverse) ? "text-ia-positive" : "text-ia-negative")
                )}>
                  {r.d.text}
                </span>
                {r.pctText != null && (
                  <span className="tabular ml-1.5 text-[11px] text-muted-foreground">{signed(r.pctText).text}</span>
                )}
              </span>
            </div>
          ))}
        </Card>
      )}

      <ChartCard
        title="Where this SKU's money goes"
        subtitle={`${p.units.toLocaleString()} units · ${money(p.revenue)} revenue · ads are credited with ${pct(p.paidSharePct)} of it`}
      >
        <MarginWaterfall data={buildWaterfall(p)} height={240} />
        <p className="mt-4 rounded-input shadow-ring bg-ia-gray-faded px-4 py-3 text-sm text-foreground/90">{takeaway}</p>
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
            <div className="flex h-2.5 overflow-hidden rounded-full bg-ia-gray">
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
            <p className="mt-4 rounded-input shadow-ring bg-ia-gray-faded px-4 py-3 text-sm text-foreground/90">{channelTakeaway}</p>
          )}
        </ChartCard>
      )}

      {p.funnel && (
        <ChartCard
          title="On-site behavior — from the Carter Web Pixel"
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
            <div className="rounded-input shadow-ring p-3">
              <div className="text-xs text-muted-foreground">Product views</div>
              <div className="tabular mt-0.5 text-lg font-semibold">{p.funnel.views.toLocaleString()}</div>
            </div>
            <div className="rounded-input shadow-ring p-3">
              <div className="text-xs text-muted-foreground">Added to cart</div>
              <div className="tabular mt-0.5 text-lg font-semibold">{p.funnel.atc.toLocaleString()}</div>
              <div className="text-[11px] text-muted-foreground">{pct(p.funnel.viewToAtcPct)} of views</div>
            </div>
            <div className="rounded-input shadow-ring p-3">
              <div className="text-xs text-muted-foreground">Reached checkout</div>
              <div className="tabular mt-0.5 text-lg font-semibold">{p.funnel.checkout.toLocaleString()}</div>
              <div className="text-[11px] text-muted-foreground">{pct(p.funnel.atcToCheckoutPct)} of cart</div>
            </div>
            <div className="rounded-input shadow-ring p-3">
              <div className="text-xs text-muted-foreground">View → purchase</div>
              <div className="tabular mt-0.5 text-lg font-semibold">{pct(p.funnel.overallConvPct)}</div>
              <div className="text-[11px] text-muted-foreground">{p.units.toLocaleString()} units sold</div>
            </div>
          </div>
          <p className="mt-4 rounded-input shadow-ring bg-ia-gray-faded px-4 py-3 text-sm text-foreground/90">
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
              <span key={r} className="rounded-full shadow-ring bg-card px-2.5 py-1 font-medium">{r}</span>
            ))}
            <span className="ml-auto text-muted-foreground">
              Skews <span className="font-medium text-foreground">{p.audience.topAge.label}</span> · <span className="font-medium text-foreground">{p.audience.topDevice.label}</span>
            </span>
          </div>
        </ChartCard>
      )}

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
