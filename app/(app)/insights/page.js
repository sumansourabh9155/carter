"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell, Plus, AlertTriangle, TrendingDown, Wallet, Check, ArrowRight, Sparkles, FileText, Download,
} from "lucide-react";
import {
  getInsightsBoard, getAlerts, createAlert, getCashCalendar, getDailyBrief,
  getMetrics, getProducts, getRecentOrders, getStore, getMarketing, getReturnsRanking,
} from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { useAIPanel } from "@/context/AIPanelContext";
import { useDateRange, RANGES } from "@/context/DateRangeContext";
import { ALERT_TYPES } from "@/lib/data/alertsSeed";
import { CHANNEL_TONE } from "@/lib/data/ordersSeed";
import { buildExecutiveSummary, renderSummaryMarkdown } from "@/lib/report/executiveSummary";
import { PageHeader, PageContainer } from "@/components/PageHeader";
import { ProductThumb } from "@/components/ProductThumb";
import { KpiCard } from "@/components/ui/KpiCard";
import { ChartCard } from "@/components/ChartCard";
import { MarginWaterfall } from "@/components/charts/MarginWaterfall";
import { ProjectionChart } from "@/components/charts/ProjectionChart";
import { Card, CardHeading } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogPrimitive } from "@/components/ui/dialog";
import { money, pct, signed } from "@/lib/format";
import { cn } from "@/lib/utils";

const LENSES = [
  { id: "all", label: "All" },
  { id: "shopify", label: "Shopify" },
  { id: "ads", label: "Ads" },
];

const ALERT_ICON = { "negative-cm2": AlertTriangle, "ad-overspend": TrendingDown, "runway-floor": Wallet };
const SEV_VARIANT = { critical: "negative", warning: "notice", opportunity: "positive", info: "neutral" };
const SEV_DOT = { critical: "bg-ia-negative", warning: "bg-ia-notice", opportunity: "bg-ia-positive", info: "bg-neutral-400" };

// Severity accent as a 3px left rail — the same device the side nav uses for
// the active item. (This replaces a `hover:border-*` accent that never
// rendered: these cards draw their edge with an inset ring, not a border, so
// there was no border width for the colour to apply to.)
const SEV_RAIL = {
  critical: "bg-ia-negative",
  warning: "bg-ia-notice",
  opportunity: "bg-ia-positive",
  info: "bg-neutral-300",
};

// Health-strip tints. Same reason as above — the tone used to be carried by a
// dead `border-*/30`, so it now comes from the feedback ramp's fill.
const TILE_TONE = {
  pos: "bg-ia-positive-faded",
  neg: "bg-ia-negative-faded",
  warn: "bg-ia-notice-faded",
};

/* ------------------------------------------------------------------ report */

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
            <h4 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">{sec.title}</h4>
            <ul className="space-y-1.5">
              {sec.lines.map((line, i) => (
                <li key={i} className="text-[14px] leading-snug text-foreground/90">{line}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <DialogFooter>
        <DialogPrimitive.Close asChild><Button variant="ghost">Close</Button></DialogPrimitive.Close>
        <Button onClick={download}><Download /> Download .md</Button>
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
        <Button variant="outline" size="sm"><FileText /> Generate report</Button>
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

/* ------------------------------------------------------------ health strip */

function Tile({ label, value, sub, tone }) {
  return (
    <div className={cn("rounded-card bg-card p-4 shadow-ring-lift", tone && TILE_TONE[tone])}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="tabular mt-1 text-[24px] font-semibold leading-8 tracking-tight">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

// Attention signals only — how much needs you and how urgent. The KPI row
// above carries the P&L, so this strip never restates margins.
function HealthStrip({ board }) {
  if (!board?.health) {
    return <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[92px] w-full" />)}</div>;
  }
  const { health } = board;
  const opportunityCount = board.actions.filter((a) => a.severity === "opportunity").length;
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Tile label="Needs action" value={health.actionCount} sub="prioritized below" tone={health.actionCount > 0 ? "warn" : undefined} />
      <Tile label="Act today" value={health.criticalCount} sub="critical issues" tone={health.criticalCount > 0 ? "neg" : "pos"} />
      <Tile label="Opportunities" value={opportunityCount} sub="upside to capture" tone={opportunityCount > 0 ? "pos" : undefined} />
      <Tile label="Cash due now" value={money(health.cashDue)} sub="supplier deposits" tone={health.cashDue > 0 ? "warn" : undefined} />
    </div>
  );
}

/* ------------------------------------------------------------ action cards */

// A diagnosis with its evidence — WHAT's wrong and WHY, linking to the deep
// screen that proves it.
function ActionCard({ a }) {
  return (
    <div className="relative flex flex-col overflow-hidden rounded-card bg-card p-4 pl-5 shadow-ring-lift">
      <span className={cn("absolute left-0 top-0 h-full w-[3px]", SEV_RAIL[a.severity])} />
      <div className="flex items-center justify-between gap-2">
        <Badge variant={SEV_VARIANT[a.severity]}>{a.verdict}</Badge>
        {a.metric && <span className="tabular text-[12px] font-semibold text-muted-foreground">{a.metric}</span>}
      </div>
      <div className="mt-2 text-[14px] font-semibold leading-snug">{a.title}</div>
      <p className="mt-1 flex-1 text-[12px] leading-relaxed text-muted-foreground">{a.body}</p>
      <div className="mt-3">
        <Link href={a.ref.href} className="group inline-flex items-center gap-1 text-[12px] font-semibold text-brand-600">
          See the evidence <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- monitoring */

function CreateAlertDialog() {
  const [type, setType] = useState("negative-cm2");
  const [saved, setSaved] = useState(false);
  const liveTypes = ALERT_TYPES.filter((t) => t.live);

  async function save() {
    await createAlert({ type });
    setSaved(true);
  }

  return (
    <Dialog onOpenChange={(o) => !o && setSaved(false)}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus /> New alert</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create an alert</DialogTitle>
          <DialogDescription>Carter watches your numbers and pings you when a threshold trips.</DialogDescription>
        </DialogHeader>
        {saved ? (
          <div className="flex items-center gap-3 rounded-input bg-ia-positive-faded p-4 text-[14px] shadow-ring">
            <Check className="size-4 text-ia-positive" /> Alert created. You'll be notified in-app and by email.
          </div>
        ) : (
          <div className="space-y-2">
            {liveTypes.map((t) => (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-input p-3 text-left transition-colors",
                  type === t.id ? "bg-brand-100 shadow-[inset_0_0_0_1px_var(--brand-500)]" : "shadow-ring hover:bg-ia-gray-faded"
                )}
              >
                <span className={cn("mt-0.5 size-3.5 rounded-full border-2", type === t.id ? "border-brand-600 bg-brand-600" : "border-muted-foreground")} />
                <span>
                  <span className="block text-[14px] font-medium">{t.label}</span>
                  <span className="block text-[12px] text-muted-foreground">{t.desc}</span>
                </span>
              </button>
            ))}
          </div>
        )}
        {!saved && (
          <DialogFooter>
            <DialogPrimitive.Close asChild><Button variant="ghost">Cancel</Button></DialogPrimitive.Close>
            <Button onClick={save}>Create alert</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AlertsCard() {
  const { data: alerts, loading } = useAsync(() => getAlerts(), []);
  return (
    <Card className="flex h-full flex-col p-0">
      <CardHeading title="Alerts you've set" description="Thresholds Carter watches on your behalf.">
        <CreateAlertDialog />
      </CardHeading>
      <div className="px-6 pb-5">
        {loading ? (
          <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => (
              <div key={a.id} className="rounded-input bg-card p-3 shadow-ring">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium">{a.title}</span>
                  <Badge variant={a.severity === "critical" ? "negative" : "notice"}>{a.severity}</Badge>
                  <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{a.triggeredAt}</span>
                </div>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{a.body}</p>
                {a.ref && <Link href={a.ref.href} className="mt-1 inline-block text-[11px] font-semibold text-brand-600 hover:underline">{a.ref.label} →</Link>}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function CashCard() {
  const { data: cal, loading } = useAsync(() => getCashCalendar(), []);
  return (
    <Card className="flex h-full flex-col p-0">
      <CardHeading title="Cash calendar" description="What your current reorder needs commit you to — not a forecast." />
      <div className="px-6 pb-5">
        {loading ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-11 w-full" />)}</div>
        ) : cal.items.length === 0 ? (
          <p className="text-[14px] text-muted-foreground">No pending reorders — nothing committed.</p>
        ) : (
          <>
            <div className="mb-2 flex items-baseline justify-between text-[12px]">
              <span className="text-muted-foreground">Due now <span className="tabular font-semibold text-foreground">{money(cal.totalDepositDue)}</span></span>
              <span className="text-muted-foreground">Later <span className="tabular font-semibold text-foreground">{money(cal.totalBalanceDue)}</span></span>
            </div>
            <div className="space-y-1.5 overflow-y-auto">
              {cal.items.slice(0, 5).map((i) => (
                <Link key={i.id} href={`/products/${i.id}`} className="flex items-center gap-2.5 rounded-input bg-card p-2 shadow-ring transition-colors hover:bg-ia-gray-faded">
                  <ProductThumb id={i.id} name={i.name} size={26} />
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium">{i.name}</span>
                  {i.urgent && <Badge variant="negative">Urgent</Badge>}
                  <span className="tabular shrink-0 text-[12px] font-semibold">{money(i.reorderCostTotal)}</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

/* --------------------------------------------------------------- live feed */

function RecentOrdersCard() {
  const { data: orders } = useAsync(() => getRecentOrders(), []);
  return (
    <Card className="p-0">
      <CardHeading title="Recent orders" description="Live · per-order profit">
        <span className="size-1.5 animate-pulse rounded-full bg-ia-positive" />
      </CardHeading>
      <div className="px-6 pb-5">
        {!orders ? (
          <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {orders.map((o) => (
              <div key={o.id} className="flex items-center gap-3 py-2.5">
                <span className="size-2 shrink-0 rounded-full" style={{ background: CHANNEL_TONE[o.channel] || "#a3b3bc" }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium">{o.product}</div>
                  <div className="text-[11px] text-muted-foreground">{o.channel} · {o.customer} · {o.time}</div>
                </div>
                <div className="text-right">
                  <div className="tabular text-[14px]">{money(o.amount)}</div>
                  <div className={cn("tabular text-[11px]", o.cmPct < 0 ? "text-ia-negative" : "text-ia-positive")}>{o.cmPct}% CM</div>
                </div>
                {o.flag && <Badge variant="negative">low</Badge>}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function TopMoversCard() {
  const { data: products } = useAsync(() => getProducts(), []);
  const movers = (products || [])
    .slice()
    .sort((a, b) => Math.abs(b.trendPct) - Math.abs(a.trendPct))
    .slice(0, 6);

  return (
    <Card className="p-0">
      <CardHeading title="Top movers" description="Biggest CM3 swings vs last period" />
      <div className="px-6 pb-5">
        {!products ? (
          <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {movers.map((p) => {
              const t = signed(p.trendPct);
              return (
                <Link key={p.id} href={`/products/${p.id}`} className="flex items-center gap-3 py-2.5 transition-opacity hover:opacity-70">
                  <ProductThumb id={p.id} name={p.name} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-medium">{p.name}</div>
                    <div className="tabular text-[11px] text-muted-foreground">{money(p.cm3)} CM3 · {pct(p.cm1Pct)} CM1</div>
                  </div>
                  <span className={cn("tabular text-[12px] font-semibold", t.dir === "up" && "text-ia-positive", t.dir === "down" && "text-ia-negative", t.dir === "flat" && "text-muted-foreground")}>
                    {t.text}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

function ReturnsRankingCard() {
  const { data: ranking, loading } = useAsync(() => getReturnsRanking(), []);
  const top = (ranking || []).slice(0, 5);

  return (
    <Card className="p-0">
      <CardHeading title="Where returns are eating margin" description="Returns subtract straight from CM1 — this is what margin would gain at zero." />
      <div className="px-6 pb-5">
        {loading ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
        ) : top.length === 0 ? (
          <p className="text-[14px] text-muted-foreground">No returns recorded this period.</p>
        ) : (
          <div className="divide-y divide-border-subtle">
            {top.map((r) => (
              <Link key={r.id} href={`/products/${r.id}`} className="flex items-center gap-3 py-2.5 transition-opacity hover:opacity-70">
                <ProductThumb id={r.id} name={r.name} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium">{r.name}</div>
                  <div className="text-[11px] text-muted-foreground">{pct(r.returnsPct)} of its revenue</div>
                </div>
                <span className="tabular text-[14px] font-semibold text-ia-negative">{money(r.returns)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------- daily brief */

function AuraDailyBrief() {
  const { data: brief } = useAsync(() => getDailyBrief(), []);
  const { openPanel } = useAIPanel();

  if (!brief) return <Skeleton className="h-[188px] w-full rounded-card" />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <Card className="overflow-hidden bg-brand-50 px-6 py-5">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-card bg-[image:var(--gradient-primary-button)] text-white shadow-control">
          <Sparkles className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-600">Carter AI · Daily Brief</span>
            {brief.stakeLabel && <Badge variant="negative">{brief.stakeLabel}</Badge>}
            {brief.upsideLabel && <Badge variant="positive">{brief.upsideLabel}</Badge>}
          </div>
          <h2 className="mt-1 text-[18px] font-semibold leading-6 tracking-tight">{greeting} — {brief.headline}</h2>
          <p className="mt-1 text-[14px] leading-relaxed text-foreground/80">{brief.summary}</p>
        </div>
        <Button size="sm" variant="outline" className="shrink-0" onClick={() => openPanel("Walk me through today's brief — what should I tackle first and why?")}>
          <Sparkles /> Ask Carter
        </Button>
      </div>

      {brief.items.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {brief.items.map((it, i) => (
            <Link
              key={it.id}
              href={it.action?.href || "#"}
              className="group flex flex-col gap-1.5 rounded-card bg-card p-3 shadow-ring transition-shadow hover:shadow-ring-lift"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground">{i + 1}</span>
                <span className={cn("size-1.5 rounded-full", SEV_DOT[it.severity])} />
                <span className="text-[12px] font-semibold">{it.verdict}</span>
                {it.metric && <span className="tabular ml-auto text-[11px] text-muted-foreground">{it.metric}</span>}
              </div>
              <span className="line-clamp-2 text-[12px] text-foreground/80">{it.title}</span>
              <span className="mt-auto inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 opacity-0 transition-opacity group-hover:opacity-100">
                {it.action?.label || "Open"} <ArrowRight className="size-3" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

/* --------------------------------------------------------------- the page */

export default function InsightsPage() {
  const [lens, setLens] = useState("all");
  const { data: board, loading } = useAsync(() => getInsightsBoard(), []);
  const { data: metrics, loading: metricsLoading } = useAsync(() => getMetrics({ lens }), [lens]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Triage · the scoreboard and what needs you"
        title="Insights"
        description="What actually happened this period — your P&L (CM1 → CM2 → CM3), trends and live orders, computed from real costs — and what to do about it, ranked by dollar impact."
      >
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

      {/* 1 — the scoreboard */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricsLoading
          ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)
          : metrics.kpis.map((k) => (
              <KpiCard key={k.key} label={k.label} value={k.value} unit={k.unit} sub={k.sub} delta={k.delta} verdict={k.verdict} />
            ))}
      </div>

      {/* 2 — Carter's read of those numbers */}
      <AuraDailyBrief />

      {/* 3 — how much needs you */}
      <HealthStrip board={board} />

      {/* 4 — the decision surface */}
      <div>
        <h2 className="flex items-center gap-2 text-[16px] font-semibold leading-6 text-brand-800">
          What's making &amp; costing you money
          {board && <Badge variant="neutral">{board.actions.length}</Badge>}
        </h2>
        <p className="mb-3 mt-0.5 text-[12px] leading-4 text-neutral-500">Ranked by dollar impact · every card links to the screen that proves it.</p>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {board.actions.map((a) => <ActionCard key={a.id} a={a} />)}
          </div>
        )}
      </div>

      {/* 5 — the evidence behind the numbers */}
      <ChartCard title="Where the money goes" subtitle="Revenue flows down through every cost layer to CM3">
        {metricsLoading ? <Skeleton className="h-[220px] w-full" /> : <MarginWaterfall data={metrics.waterfall} />}
      </ChartCard>

      <ChartCard
        title="Revenue & net-profit projection"
        subtitle="Trend fit over the last 6 months, extended 2 months — a direction, not a guarantee"
        action={<Badge variant="notice">Estimate</Badge>}
      >
        {metricsLoading ? (
          <Skeleton className="h-[240px] w-full" />
        ) : (
          <>
            <ProjectionChart data={metrics.projection.data} projFrom={metrics.projection.projFrom} />
            {(() => {
              const n = metrics.projection.next;
              const d = signed(n.cm3DeltaPct);
              return (
                <p className="mt-4 rounded-input bg-ia-gray-faded px-4 py-3 text-[14px] text-foreground/90 shadow-ring">
                  On the current trend, <span className="font-semibold">{n.label}</span> lands around{" "}
                  <span className="font-semibold text-ia-positive">{money(n.cm3)}</span> net profit (CM3) on{" "}
                  <span className="font-semibold">{money(n.revenue)}</span> revenue — about {pct(n.marginPct)} margin,{" "}
                  <span className={cn(d.dir === "up" && "text-ia-positive", d.dir === "down" && "text-ia-negative")}>{d.text}</span> vs {metrics.projection.projFrom}.
                </p>
              );
            })()}
          </>
        )}
      </ChartCard>

      {/* 6 — monitoring */}
      <div className="grid gap-4 lg:grid-cols-2">
        <AlertsCard />
        <CashCard />
      </div>

      {/* 7 — live pulse */}
      <div className="grid gap-4 lg:grid-cols-3">
        <RecentOrdersCard />
        <TopMoversCard />
        <ReturnsRankingCard />
      </div>
    </PageContainer>
  );
}
