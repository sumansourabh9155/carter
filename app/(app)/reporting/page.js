"use client";

import { useState } from "react";
import { ArrowRight, Check, Sparkles, MousePointerClick } from "lucide-react";
import Link from "next/link";
import { getMarketing, getWebsite, applyRecommendation } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { PageHeader, PageContainer } from "@/components/PageHeader";
import { ProductThumb } from "@/components/ProductThumb";
import { KpiCard } from "@/components/ui/KpiCard";
import { ChartCard } from "@/components/ChartCard";
import { RankBars } from "@/components/charts/RankBars";
import { CmRoasTrend } from "@/components/charts/CmRoasTrend";
import { AudienceBreakdown } from "@/components/charts/AudienceBreakdown";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogPrimitive } from "@/components/ui/dialog";
import { money, multiple, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

// The platforms this dashboard unifies — one command center instead of
// tab-switching between ad managers.
const CONNECTED = [
  { name: "Shopify", logo: "shopify.svg" },
  { name: "Meta Ads", logo: "meta.svg" },
  { name: "Google Ads", logo: "google.svg" },
  { name: "TikTok Ads", logo: "tiktok.svg" },
  { name: "Snapchat Ads", logo: "snapchat.svg" },
  { name: "X (Twitter) Ads", logo: "x.svg" },
];

function ConnectedStrip() {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-card shadow-ring bg-card px-3 py-2.5">
      <span className="text-xs font-medium text-muted-foreground">Unified from</span>
      {CONNECTED.map((c) => (
        <span key={c.name} className="inline-flex items-center gap-1.5 rounded-full shadow-ring bg-card px-2.5 py-1">
          <img src={`/logos/${c.logo}`} alt="" className="size-3.5 object-contain" />
          <span className="text-xs font-medium">{c.name}</span>
        </span>
      ))}
      <Badge variant="success" className="ml-auto">All connected</Badge>
    </div>
  );
}

// The honest frame for everything below: ads only drive part of the store's
// orders. Every number and suggestion on this page covers the PAID slice.
function PaidVsEarnedStrip() {
  const { data: web, loading } = useAsync(() => getWebsite(), []);
  if (loading || !web) return <Skeleton className="h-20 w-full" />;

  const paid = web.sources.filter((s) => s.paid).reduce((a, s) => a + s.orders, 0);
  const paidPct = Math.round((paid / web.orders) * 1000) / 10;

  return (
    <Card className="p-4">
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">Ads drive {pct(paidPct)} of your orders — this page manages that slice</span>
        <span className="tabular text-xs text-muted-foreground">
          {paid.toLocaleString()} paid · {(web.orders - paid).toLocaleString()} earned of {web.orders.toLocaleString()} orders
        </span>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-ia-gray">
        <div className="h-full bg-primary" style={{ width: `${paidPct}%` }} />
        <div className="h-full bg-emerald-500/70" style={{ width: `${100 - paidPct}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        The other {pct(Math.round((100 - paidPct) * 10) / 10)} comes from organic, direct, and email — earned demand that ad budget can't buy.{" "}
        <Link href="/pixel/funnel" className="font-medium text-primary hover:underline">See where sessions come from →</Link>
      </p>
    </Card>
  );
}

function RecommendationCard({ rec }) {
  const [applied, setApplied] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [applying, setApplying] = useState(false);

  if (!rec || dismissed) return null;

  async function confirmApply() {
    setApplying(true);
    await applyRecommendation({ from: rec.from.id, to: rec.to.id, amount: rec.amount });
    setApplying(false);
    setApplied(true);
  }

  return (
    <Card className={cn("p-5", rec.urgent ? "border-destructive/25 bg-destructive/[0.03]" : "border-primary/25 bg-primary/[0.03]")}>
      <div className="flex items-start gap-3">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-input", rec.urgent ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary")}>
          <Sparkles className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recommended move</span>
            <Badge variant="outline">Directional estimate</Badge>
          </div>

          {applied ? (
            <div className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-success" />
              <span>
                Applied — shifted <span className="tabular font-semibold">{money(rec.amount)}/week</span> from {rec.from.name} to {rec.to.name}. We'll flag it here if this doesn't pay off.
              </span>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: rec.from.color }} />
                  {rec.from.name}
                  <span className="tabular text-sm font-normal text-muted-foreground">({multiple(rec.from.cmRoas)})</span>
                </span>
                <ArrowRight className="size-4 text-muted-foreground" />
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: rec.to.color }} />
                  {rec.to.name}
                  <span className="tabular text-sm font-normal text-muted-foreground">({multiple(rec.to.cmRoas)})</span>
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{rec.note}</p>

              <div className="mt-3 flex items-center gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">Shift {money(rec.amount)}/week</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirm budget shift</DialogTitle>
                      <DialogDescription>
                        This moves {money(rec.amount)}/week from {rec.from.name} to {rec.to.name} across your connected ad accounts. A person has to confirm this — Carter won't do it on its own yet.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="rounded-input shadow-ring bg-ia-gray-faded p-3 text-sm">
                      <p>{rec.note}</p>
                      <p className="mt-1.5 text-xs text-muted-foreground">This is a directional estimate based on this period's performance — not a guaranteed outcome.</p>
                    </div>
                    <DialogFooter>
                      <DialogPrimitive.Close asChild><Button variant="ghost">Cancel</Button></DialogPrimitive.Close>
                      <DialogPrimitive.Close asChild>
                        <Button onClick={confirmApply} disabled={applying}>{applying ? "Applying…" : "Confirm & apply"}</Button>
                      </DialogPrimitive.Close>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>Dismiss</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

function CustomerMixBar({ label, newPct, returningPct }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="tabular text-muted-foreground">{pct(newPct)} new · {pct(returningPct)} returning</span>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-ia-gray">
        <div className="h-full bg-primary" style={{ width: `${newPct}%` }} />
        <div className="h-full bg-sky-400" style={{ width: `${returningPct}%` }} />
      </div>
    </div>
  );
}

export default function MarketingPage() {
  const { data, loading } = useAsync(() => getMarketing(), []);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Your ad platforms, unified"
        title="Reporting"
        description="The paid slice of your business in one command center — profit-true (CM-ROAS), honest about what platforms overclaim, and honest that ads are only part of how you sell."
      />

      <ConnectedStrip />

      <PaidVsEarnedStrip />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {loading || !data
          ? [0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 w-full" />)
          : (
            <>
              <KpiCard label="CM-ROAS (blended)" value={data.totals.cmRoas} unit="mult" sub="profit per ad $" verdict delta={-3.0} />
              <KpiCard label="MER (blended)" value={data.totals.revRoas} unit="mult" sub="revenue ÷ spend, the vanity number" delta={-1.1} />
              <KpiCard label="Store revenue" value={data.totals.storeRevenue} sub="this period, all channels" delta={4.4} />
              <KpiCard label="Ad spend" value={data.totals.spend} sub={`${data.totals.orders.toLocaleString()} attributed orders`} delta={2.0} />
              <KpiCard label="Blended CAC" value={data.totals.cac} sub="per new order" delta={1.2} />
            </>
          )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Which channels are actually profitable?" subtitle="Ranked by CM-ROAS · below break-even = losing money">
          {loading || !data ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <RankBars items={data.channels.map((c) => ({ name: c.name, value: c.cmRoas, color: c.color, sub: `${money(c.spend)} spend · ${multiple(c.revRoas)} revenue ROAS` }))} breakeven={1} />
          )}
        </ChartCard>
        <ChartCard title="CM-ROAS trend" subtitle="Profit per ad dollar, last 6 weeks">
          {loading || !data ? <Skeleton className="h-[220px] w-full" /> : <CmRoasTrend data={data.weekly} />}
        </ChartCard>
      </div>

      {!loading && data && <RecommendationCard rec={data.recommendation} />}

      <ChartCard title="Where the platforms disagree with your own data" subtitle="What each channel claims vs. what Carter can verify against real orders">
        {loading || !data ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : (
          <div className="space-y-3">
            {[...data.channels]
              .sort((a, b) => b.platformGapPct - a.platformGapPct)
              .map((c) => (
                <div key={c.id} className="rounded-input shadow-ring p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                      <span className="size-2 rounded-full" style={{ background: c.color }} />
                      {c.name}
                    </span>
                    <Badge variant={c.trackingConfidence === "high" ? "success" : c.trackingConfidence === "medium" ? "warning" : "destructive"}>
                      {c.trackingConfidence === "high" ? "High" : c.trackingConfidence === "medium" ? "Medium" : "Low"} confidence
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
                    <span className="text-muted-foreground">Platform claims <span className="tabular font-semibold text-foreground">{money(c.platformReportedRevenue)}</span></span>
                    <span className="text-muted-foreground">Carter verified <span className="tabular font-semibold text-foreground">{money(c.attributedRevenue)}</span></span>
                    <span className={cn("tabular font-semibold", c.platformGapPct > 30 ? "text-destructive" : c.platformGapPct > 10 ? "text-warning" : "text-success")}>
                      +{pct(c.platformGapPct)} gap
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{c.confidenceNote}</p>
                </div>
              ))}
          </div>
        )}
      </ChartCard>

      <ChartCard title="New vs. returning customers" subtitle="Who's actually driving revenue this period">
        {loading || !data ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="space-y-4">
            <CustomerMixBar label="Revenue" newPct={data.customerMix.newRevenuePct} returningPct={data.customerMix.returningRevenuePct} />
            <CustomerMixBar label="Orders (ad-attributed)" newPct={data.customerMix.newOrdersPct} returningPct={data.customerMix.returningOrdersPct} />
            <div className="flex flex-wrap gap-4 pt-1 text-xs text-muted-foreground">
              <span><span className="mr-1.5 inline-block size-2 rounded-full bg-primary" />New — {money(data.customerMix.newRevenue)}</span>
              <span><span className="mr-1.5 inline-block size-2 rounded-full bg-sky-400" />Returning — {money(data.customerMix.returningRevenue)}</span>
            </div>
          </div>
        )}
      </ChartCard>

      {/* Audience — who ads reach vs. who actually pays off. Bars are share
          of ad spend; the CM-ROAS chip says whether that spend is worth it. */}
      <div>
        <div className="mb-3">
          <h2 className="text-sm font-semibold">Who your ad dollars reach — and who actually pays off</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            From your ad platforms' audience reporting (paid orders only). Bar = share of ad spend · chip = CM-ROAS, colored against your {loading || !data ? "blended" : `${multiple(data.audience.blendedCmRoas)} blended`} rate.
          </p>
        </div>

        {!loading && data?.audienceLeak && (
          <Card className="mb-4 flex items-start gap-3 border-destructive/25 bg-destructive/[0.04] p-4">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-input bg-destructive/15 text-destructive">
              <MousePointerClick className="size-4" />
            </span>
            <p className="text-sm">
              <span className="font-semibold">{data.audienceLeak.dim}: {data.audienceLeak.label}</span> takes {pct(data.audienceLeak.spendSharePct)} of your ad spend but returns only{" "}
              <span className="tabular font-semibold">{multiple(data.audienceLeak.cmRoas)}</span> CM-ROAS — below your {multiple(data.audienceLeak.blendedCmRoas)} blended. It drives just {pct(data.audienceLeak.orderSharePct)} of paid orders. Trim its budget and shift toward the segments already beating the blend.
            </p>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          {loading || !data ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-64 w-full" />)
          ) : (
            [
              { key: "device", title: "By device" },
              { key: "age", title: "By age" },
              { key: "geography", title: "By geography" },
            ].map(({ key, title }) => (
              <ChartCard key={key} title={title} subtitle={data.audience[key].label}>
                <AudienceBreakdown segments={data.audience[key].segments} blendedCmRoas={data.audience.blendedCmRoas} />
              </ChartCard>
            ))
          )}
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border p-4">
          <h3 className="text-sm font-semibold">Product-linked ad spend</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Where ad dollars go vs the margin they return.</p>
        </div>
        {loading || !data ? (
          <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Ad spend</TableHead>
                <TableHead className="text-right">CM-ROAS</TableHead>
                <TableHead>Verdict</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.productSpend.map((p) => (
                <TableRow key={p.id}>
                  <TableCell><span className="inline-flex items-center gap-2"><ProductThumb id={p.id} name={p.name} size={28} />{p.name}</span></TableCell>
                  <TableCell className="text-right tabular">{money(p.adSpend)}</TableCell>
                  <TableCell className={cn("text-right tabular", p.cmRoas < 1 && "text-destructive")}>{multiple(p.cmRoas)}</TableCell>
                  <TableCell>
                    {p.losingMoney ? <Badge variant="destructive">Cut / fix</Badge> : p.cmRoas >= 3 ? <Badge variant="success">Scale</Badge> : <Badge variant="secondary">Hold</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border p-4">
          <h3 className="text-sm font-semibold">Campaign breakdown</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Every campaign by profit per ad dollar — scale the winners, pause the leaks.</p>
        </div>
        {loading || !data ? (
          <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Campaign</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">CM-ROAS</TableHead>
                <TableHead>Verdict</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.channels
                .flatMap((c) => c.campaigns.map((k) => ({ ...k, channel: c.name, color: c.color })))
                .sort((a, b) => b.cmRoas - a.cmRoas)
                .map((k) => (
                  <TableRow key={k.channel + k.name}>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className="size-2 rounded-full" style={{ background: k.color }} />
                        {k.channel}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular">{money(k.spend)}</TableCell>
                    <TableCell className="text-right tabular">{k.orders}</TableCell>
                    <TableCell className={cn("text-right tabular", k.cmRoas < 1 && "text-destructive")}>{multiple(k.cmRoas)}</TableCell>
                    <TableCell>
                      {k.cmRoas < 1 ? <Badge variant="destructive">Pause</Badge> : k.cmRoas >= 2.5 ? <Badge variant="success">Scale</Badge> : <Badge variant="secondary">Hold</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </PageContainer>
  );
}
