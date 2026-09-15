"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Download } from "lucide-react";
import { getMetrics, getProducts, getRecentOrders, getStore, getAlerts, getCashCalendar, getMarketing, getReturnsRanking } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { useDateRange, RANGES } from "@/context/DateRangeContext";
import { CHANNEL_TONE } from "@/lib/data/ordersSeed";
import { buildExecutiveSummary, renderSummaryMarkdown } from "@/lib/report/executiveSummary";
import { PageHeader, PageContainer } from "@/components/PageHeader";
import { ProductThumb } from "@/components/ProductThumb";
import { KpiCard } from "@/components/ui/KpiCard";
import { ChartCard } from "@/components/ChartCard";
import { MarginWaterfall } from "@/components/charts/MarginWaterfall";
import { ProjectionChart } from "@/components/charts/ProjectionChart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogPrimitive } from "@/components/ui/dialog";
import { money, pct, signed } from "@/lib/format";
import { cn } from "@/lib/utils";

const LENSES = [
  { id: "all", label: "All" },
  { id: "shopify", label: "Shopify" },
  { id: "ads", label: "Ads" },
];

// Fetches only run once the dialog actually mounts its content — nothing
// loads until someone clicks "Generate report."
function ReportBody({ rangeLabel }) {
  const { data: store } = useAsync(() => getStore(), []);
  const { data: metrics } = useAsync(() => getMetrics({ lens: "all" }), []);
  const { data: alerts } = useAsync(() => getAlerts(), []);
  const { data: cashCal } = useAsync(() => getCashCalendar(), []);
  const { data: marketing } = useAsync(() => getMarketing(), []);
  const { data: returns } = useAsync(() => getReturnsRanking(), []);

  const ready = store && metrics && alerts && cashCal && marketing && returns;

  if (!ready) {
    return <div className="space-y-2 py-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-5 w-full" />)}</div>;
  }

  const summary = buildExecutiveSummary({
    store,
    rangeLabel,
    summary: metrics.summary,
    alerts,
    cashCalendar: cashCal,
    marketingRec: marketing.recommendation,
    returnsRanking: returns,
  });

  function download() {
    const md = renderSummaryMarkdown(summary);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${store.name.replace(/\s+/g, "-").toLowerCase()}-executive-summary.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
        {summary.sections.map((sec) => (
          <div key={sec.title}>
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{sec.title}</h4>
            <ul className="space-y-1.5">
              {sec.lines.map((line, i) => (
                <li key={i} className="text-sm leading-snug text-foreground/90">{line}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <DialogFooter>
        <DialogPrimitive.Close asChild><Button variant="ghost">Close</Button></DialogPrimitive.Close>
        <Button onClick={download}><Download className="size-3.5" /> Download .md</Button>
      </DialogFooter>
    </>
  );
}

function ReportDialog() {
  const { range } = useDateRange();
  const rangeLabel = RANGES.find((r) => r.id === range)?.label || "period";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><FileText className="size-3.5" /> Generate report</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Executive summary</DialogTitle>
          <DialogDescription>Every line below is a template around numbers the engine already computed — nothing here is invented.</DialogDescription>
        </DialogHeader>
        <ReportBody rangeLabel={rangeLabel} />
      </DialogContent>
    </Dialog>
  );
}

function ReturnsRankingCard() {
  const { data: ranking, loading } = useAsync(() => getReturnsRanking(), []);
  const top = (ranking || []).slice(0, 5);

  return (
    <Card className="p-5">
      <h3 className="mb-1 text-sm font-semibold">Where returns are eating margin</h3>
      <p className="mb-1 text-xs text-muted-foreground">Returns subtract straight from CM1 — this is exactly what margin would gain if they went to zero.</p>
      {loading ? (
        <div className="space-y-2 pt-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
      ) : top.length === 0 ? (
        <p className="pt-3 text-sm text-muted-foreground">No returns recorded this period.</p>
      ) : (
        <div className="divide-y divide-border">
          {top.map((r) => (
            <Link key={r.id} href={`/products/${r.id}`} className="flex items-center gap-3 py-2.5 transition-opacity hover:opacity-70">
              <ProductThumb id={r.id} name={r.name} size={36} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{r.name}</div>
                <div className="text-[11px] text-muted-foreground">{pct(r.returnsPct)} of its revenue</div>
              </div>
              <span className="tabular text-sm font-medium text-destructive">{money(r.returns)}</span>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function DashboardPage() {
  const [lens, setLens] = useState("all");
  const { data, loading } = useAsync(() => getMetrics({ lens }), [lens]);
  const { data: products } = useAsync(() => getProducts(), []);
  const { data: orders } = useAsync(() => getRecentOrders(), []);

  const movers = (products || [])
    .slice()
    .sort((a, b) => Math.abs(b.trendPct) - Math.abs(a.trendPct))
    .slice(0, 6);

  return (
    <PageContainer>
      <PageHeader eyebrow="The scoreboard" title="Dashboard" description="What actually happened this period — your P&L (CM1 → CM2 → CM3), trends, and live orders, computed from real costs, never hardcoded. This tab reports the numbers; for what to fix, see Insights.">
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={lens} onValueChange={setLens}>
            <TabsList>
              {LENSES.map((l) => (
                <TabsTrigger key={l.id} value={l.id}>{l.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <ReportDialog />
        </div>
      </PageHeader>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)
          : data.kpis.map((k) => (
              <KpiCard key={k.key} label={k.label} value={k.value} unit={k.unit} sub={k.sub} delta={k.delta} verdict={k.verdict} />
            ))}
      </div>

      {/* Charts — P&L reporting only. Channel & campaign performance is
          Marketing's job; this tab never restates it. */}
      <ChartCard title="Where the money goes" subtitle="Revenue flows down through every cost layer to CM3">
        {loading ? <Skeleton className="h-[220px] w-full" /> : <MarginWaterfall data={data.waterfall} />}
      </ChartCard>

      {/* Forward look — a trend-based projection of revenue and net profit */}
      <ChartCard
        title="Revenue & net-profit projection"
        subtitle="Trend fit over the last 6 months, extended 2 months — a direction, not a guarantee"
        action={<Badge variant="warning">Estimate</Badge>}
      >
        {loading ? (
          <Skeleton className="h-[240px] w-full" />
        ) : (
          <>
            <ProjectionChart data={data.projection.data} projFrom={data.projection.projFrom} />
            {(() => {
              const n = data.projection.next;
              const d = signed(n.cm3DeltaPct);
              return (
                <p className="mt-4 rounded-input shadow-ring bg-ia-gray-faded px-4 py-3 text-sm text-foreground/90">
                  On the current trend, <span className="font-semibold">{n.label}</span> lands around{" "}
                  <span className="font-semibold text-success">{money(n.cm3)}</span> net profit (CM3) on{" "}
                  <span className="font-semibold">{money(n.revenue)}</span> revenue — about {pct(n.marginPct)} margin,{" "}
                  <span className={cn(d.dir === "up" && "text-success", d.dir === "down" && "text-destructive")}>{d.text}</span> vs {data.projection.projFrom}.
                </p>
              );
            })()}
          </>
        )}
      </ChartCard>

      {/* Live pulse — orders, movers, returns side by side (horizontal, not stacked) */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Recent orders</h3>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 animate-pulse rounded-full bg-success" /> live · per-order profit
            </span>
          </div>
          {!orders ? (
            <div className="space-y-2 pt-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
          ) : (
            <div className="divide-y divide-border">
              {orders.map((o) => (
                <div key={o.id} className="flex items-center gap-3 py-2.5">
                  <span className="size-2 shrink-0 rounded-full" style={{ background: CHANNEL_TONE[o.channel] || "#a3b3bc" }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{o.product}</div>
                    <div className="text-[11px] text-muted-foreground">{o.channel} · {o.customer} · {o.time}</div>
                  </div>
                  <div className="text-right">
                    <div className="tabular text-sm">{money(o.amount)}</div>
                    <div className={cn("tabular text-[11px]", o.cmPct < 0 ? "text-destructive" : "text-success")}>{o.cmPct}% CM</div>
                  </div>
                  {o.flag && <Badge variant="destructive">low</Badge>}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-1 text-sm font-semibold">Top movers</h3>
          <p className="mb-1 text-xs text-muted-foreground">Biggest CM3 swings vs last period</p>
          {!products ? (
            <div className="space-y-2 pt-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
          ) : (
            <div className="divide-y divide-border">
              {movers.map((p) => {
                const t = signed(p.trendPct);
                return (
                  <Link key={p.id} href={`/products/${p.id}`} className="flex items-center gap-3 py-2.5 transition-opacity hover:opacity-70">
                    <ProductThumb id={p.id} name={p.name} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="tabular text-[11px] text-muted-foreground">{money(p.cm3)} CM3 · {pct(p.cm1Pct)} CM1</div>
                    </div>
                    <span className={cn("tabular text-xs font-medium", t.dir === "up" && "text-success", t.dir === "down" && "text-destructive", t.dir === "flat" && "text-muted-foreground")}>
                      {t.text}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        <ReturnsRankingCard />
      </div>
    </PageContainer>
  );
}
