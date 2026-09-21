"use client";

import { Suspense, useCallback, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, AlertTriangle, TrendingDown, Wallet, Check, ArrowRight, Sparkles, Zap, MousePointerClick } from "lucide-react";
import { getInsightsBoard, getAlerts, createAlert, getDailyBrief, getMetrics, getMarketing, getCreatives, getBudgetPlan } from "@/lib/api";
import { VERDICT_TO_ACTION, ACTION_TYPES } from "@/lib/actions/types";
import { ActionDialog } from "@/components/actions/ActionDialog";
import { ActionLogCard } from "@/components/actions/ActionLogCard";
import { ExperimentsView } from "@/components/insights/ExperimentsView";
import { PlannerCard } from "@/components/insights/PlannerCard";
import { CreativeCard } from "@/components/insights/CreativeCard";
import { useAsync } from "@/lib/useAsync";
import { useAIPanel } from "@/context/AIPanelContext";
import { useReportingWindow } from "@/context/DateRangeContext";
import { ALERT_TYPES } from "@/lib/data/alertsSeed";
import { PageHeader, PageContainer } from "@/components/PageHeader";
import { KpiCard } from "@/components/ui/KpiCard";
import { ChartCard } from "@/components/ChartCard";
import { MarginWaterfall } from "@/components/charts/MarginWaterfall";
import { RankBars } from "@/components/charts/RankBars";
import { CmRoasTrend } from "@/components/charts/CmRoasTrend";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableToolbar } from "@/components/ui/table";
import { Card, CardHeading } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogPrimitive } from "@/components/ui/dialog";
import { money, pct, signedMoney, multiple, plural } from "@/lib/format";
import { untilText, timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

/*
  Insights — the retail-media scoreboard, triage surface, and the evidence
  behind both. This is where Reporting went.

  TWO VIEWS, NOT FOUR PAGES:

    Today     the decision surface — brief, health, action board, activity.
    Channels  the paid-media evidence those decisions rest on — channel
              profitability, the efficiency trend, what platforms overclaim,
              and every campaign.

  They are views of one page rather than two nav items because the action
  board is mostly channel verdicts ("Shift budget", "Meta efficiency is
  sliding"), and its evidence is exactly what the Channels view holds. Split
  across pages, "see the evidence" meant leaving the decision behind.

  These replaced an All / Shopify / Ads lens row. The lens filtered the KPI
  strip and nothing else, and "Shopify" encoded an assumption — one store,
  one storefront — that does not survive the buyer this product targets. The
  Ads lens survives as the Channels view's KPI row; the Shopify lens is gone,
  because revenue, COGS and returns per SKU are the Products page's job.

  WHAT IS DELIBERATELY NOT HERE. One canonical home per dataset:
    · category rollup and per-SKU movement → Products (Categories / Δ CM2)
    · audience, customer mix, paid-vs-earned → Audience & Funnel
    · connected platform list → Integrations
  Each of those rendered here too before the merge. Re-adding one means two
  screens can disagree about the same number.

  SCOPE: this app measures money that moves through CAMPAIGNS. It deliberately
  stops at CM2 (revenue − COGS − ad spend). CM3, cash runway, supplier
  deposits, order feeds and returns are merchant finance, not retail media, so
  they are not surfaced here. The compute layer still derives them — nothing is
  broken — they simply aren't part of this product.
*/
const VIEWS = [
  { id: "today", label: "Today" },
  { id: "channels", label: "Channels" },
  // The measurement layer. Last because it is read least often and matters
  // most — everything on the other two views assumes the attribution these
  // tests are the only check on.
  { id: "experiments", label: "Experiments" },
];

// The KPI lens each view reads. Today answers "did we make money" (CM1 → CM2
// → CM-ROAS); Channels answers "what did the media cost and return".
const VIEW_LENS = { today: "all", channels: "ads", experiments: "ads" };

const ALERT_ICON = { "negative-cm2": AlertTriangle, "ad-overspend": TrendingDown, "runway-floor": Wallet };
const SEV_VARIANT = { critical: "negative", warning: "notice", opportunity: "positive", info: "neutral" };
const SEV_DOT = { critical: "bg-ia-negative", warning: "bg-ia-notice", opportunity: "bg-ia-positive", info: "bg-neutral-400" };

// Severity accent as a 3px left rail — the device the side nav uses for the
// active item. (Replaces a `hover:border-*` accent that never rendered: these
// cards draw their edge with an inset ring, so there was no border width for
// the colour to apply to.)
const SEV_RAIL = {
  critical: "bg-ia-negative",
  warning: "bg-ia-notice",
  opportunity: "bg-ia-positive",
  info: "bg-neutral-300",
};

const TILE_TONE = {
  pos: "bg-ia-positive-faded",
  neg: "bg-ia-negative-faded",
  warn: "bg-ia-notice-faded",
};

// Campaign-level margin only. Anything past CM2 subtracts overhead, which is
// company accounting rather than media performance.
//
// NOTE the two different shapes: KPIs carry a lowercase `key` ("cm1", "cmroas"),
// waterfall steps carry a display `name` ("− Overhead", "CM3"). Matching the
// wrong field here fails silently and the cut metric keeps rendering.
const isMediaKpi = (k) => !/cm3/i.test(k?.key ?? "");
const isMediaStep = (s) => !/cm3|overhead/i.test(s?.name ?? "");

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

function HealthStrip({ board }) {
  if (!board?.health) {
    return <div className="grid grid-cols-3 gap-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[92px] w-full" />)}</div>;
  }
  const { health } = board;
  const opportunityCount = board.actions.filter((a) => a.severity === "opportunity").length;
  return (
    <div className="grid grid-cols-3 gap-4">
      <Tile label="Needs action" value={health.actionCount} sub="prioritized below" tone={health.actionCount > 0 ? "warn" : undefined} />
      <Tile label="Act today" value={health.criticalCount} sub="critical issues" tone={health.criticalCount > 0 ? "neg" : "pos"} />
      <Tile label="Opportunities" value={opportunityCount} sub="upside to capture" tone={opportunityCount > 0 ? "pos" : undefined} />
    </div>
  );
}

/* ------------------------------------------------------------ action cards */

// Scope chip — says whether a card is one SKU, a whole category, a channel
// or the store. At catalogue scale this is the difference between "some
// product has a problem" and "this part of the business has a problem".
const SCOPE_LABEL = { category: "Category", channel: "Channel", store: "Store-wide", sku: "SKU" };

/*
  A card is only an insight if something can be done with it. Every verdict
  that maps to an executable action gets a primary button that opens the
  simulate → confirm → execute flow; the rest keep the evidence link alone,
  which is honest about being informational rather than dressing it up as a
  decision.
*/
function ActionCard({ a, onApplied }) {
  const [open, setOpen] = useState(false);
  const typeId = VERDICT_TO_ACTION[a.verdict];
  const type = typeId ? ACTION_TYPES[typeId] : null;
  const actionable = Boolean(type?.inScope);

  return (
    <div className="relative flex flex-col overflow-hidden rounded-card bg-card p-4 pl-5 shadow-ring-lift">
      <span className={cn("absolute left-0 top-0 h-full w-[3px]", SEV_RAIL[a.severity])} />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Badge variant={SEV_VARIANT[a.severity]}>{a.verdict}</Badge>
          {a.scope && a.scope !== "sku" && (
            <Badge variant="outline" size="sm">{SCOPE_LABEL[a.scope]}</Badge>
          )}
        </div>
        {a.metric && <span className="tabular text-[12px] font-semibold text-muted-foreground">{a.metric}</span>}
      </div>
      <div className="mt-2 text-[14px] font-semibold leading-snug">{a.title}</div>
      <p className="mt-1 flex-1 text-[12px] leading-relaxed text-muted-foreground">{a.body}</p>

      <div className="mt-3 flex items-center gap-3">
        {actionable && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Zap className="size-3.5" /> {type.label}
          </Button>
        )}
        <Link
          href={a.ref.href}
          className="group inline-flex items-center gap-1 text-[12px] font-semibold text-brand-600"
        >
          See the evidence <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {actionable && (
        <ActionDialog insight={a} open={open} onOpenChange={setOpen} onApplied={onApplied} />
      )}
    </div>
  );
}

/* -------------------------------------------------------------- monitoring */

function CreateAlertDialog() {
  const [type, setType] = useState("negative-cm2");
  const [saved, setSaved] = useState(false);
  // Runway alerts need the cash engine — out of scope for retail media.
  const liveTypes = ALERT_TYPES.filter((t) => t.live && t.id !== "runway-floor");

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
          <DialogDescription>Carter watches your campaign numbers and pings you when a threshold trips.</DialogDescription>
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
                  {t.window && t.window !== "—" && (
                    <span className="mt-0.5 block text-[11px] text-muted-foreground/80">Evaluated over {t.window}</span>
                  )}
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

function AlertsCard({ rev = 0 }) {
  const { data: alerts, loading } = useAsync(() => getAlerts(), [rev]);
  const rows = (alerts || []).filter((a) => a.type !== "runway-floor");
  return (
    <Card className="flex h-full flex-col p-0">
      <CardHeading title="Alerts you've set" description="Thresholds Carter watches on your campaigns.">
        <CreateAlertDialog />
      </CardHeading>
      <div className="px-6 pb-5">
        {loading ? (
          <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : (
          <div className="space-y-2">
            {rows.map((a) => (
              <div key={a.id} className="rounded-input bg-card p-3 shadow-ring">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium">{a.title}</span>
                  <Badge variant={a.severity === "critical" ? "negative" : "notice"}>{a.severity}</Badge>
                  <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{timeAgo(a.triggeredAt)}</span>
                </div>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{a.body}</p>
                {/* The RULE and the DURATION. A threshold with no window
                    fires on noise, and a breach's age is what separates a
                    decision from a process failure. */}
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  {a.threshold && <span>Rule: {a.threshold}</span>}
                  {a.breachDays != null && (
                    <span className="font-medium text-ia-notice">breaching {plural(a.breachDays, "day")}</span>
                  )}
                </div>
                {a.ref && <Link href={a.ref.href} className="mt-1 inline-block text-[11px] font-semibold text-brand-600 hover:underline">{a.ref.label} →</Link>}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------- daily brief */

function AuraDailyBrief({ rev = 0 }) {
  const { data: brief } = useAsync(() => getDailyBrief(), [rev]);
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

/* ----------------------------------------------------------- where next */

/*
  A SIGNPOST, NOT A SECOND TABLE.

  This replaced a full category rollup and a "top movers" list that both sat
  here. Products owns the catalogue: the Categories tab is the rollup, and
  the Δ CM2 column is per-SKU movement. Rendering either again on this page
  meant maintaining two views of the same figures — and the first time a
  filter or a rounding rule diverged, the two screens would disagree.

  What survives is the one line a decision-maker needs on this page: which
  part of the portfolio moved, and a route to the numbers behind it.
*/
function MoverRow({ label, group, tone }) {
  if (!group) return null;
  const d = signedMoney(group.totals.delta.cm2.abs);
  return (
    <Link
      href={`/products?category=${encodeURIComponent(group.key)}`}
      className="flex items-center gap-3 rounded-input px-3 py-2.5 shadow-ring transition-colors hover:bg-ia-gray-faded"
    >
      <span className={cn("h-8 w-[3px] shrink-0 rounded-full", tone === "up" ? "bg-ia-positive" : "bg-ia-negative")} />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="truncate text-[14px] font-semibold">{group.label}</div>
      </div>
      <div className="text-right">
        <div className={cn("tabular text-[14px] font-semibold", tone === "up" ? "text-ia-positive" : "text-ia-negative")}>
          {d.text}
        </div>
        <div className="text-[11px] text-muted-foreground">{plural(group.skuCount, "SKU")} · CM2</div>
      </div>
      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function NextLooksCard({ board }) {
  const rollup = board?.rollup;
  return (
    <Card className="flex h-full flex-col p-0">
      <CardHeading
        title="Where to look next"
        description="The parts of the portfolio that moved most since last period."
      />
      <div className="flex flex-1 flex-col gap-2 px-6 pb-5">
        {!rollup ? (
          <>{[0, 1].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</>
        ) : (
          <>
            <MoverRow label="Biggest decline" group={rollup.topDecliner} tone="down" />
            <MoverRow label="Biggest gain" group={rollup.topGainer} tone="up" />
            {!rollup.topDecliner && !rollup.topGainer && (
              <p className="py-3 text-[12px] text-muted-foreground">
                No category moved materially this period.
              </p>
            )}
          </>
        )}
        <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-2 text-[12px]">
          <Link href="/products" className="font-semibold text-brand-600 hover:underline">
            All categories &amp; SKU movement →
          </Link>
          <Link href="/pixel/funnel" className="font-semibold text-brand-600 hover:underline">
            Audience &amp; on-site funnel →
          </Link>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------- channels */

/*
  THE EVIDENCE VIEW — everything that used to be the Reporting page, minus
  what other surfaces already owned.

  Three blocks did not survive the move, and none of them were lost:
    · the budget-shift recommendation card — the Today board already carries
      it as an executable action, and that version runs through the actions
      engine (simulated, guardrailed, audited, undoable) rather than setting
      a flag in component state.
    · the audience over-funding callout — same insight, already an action card.
    · the connected-platform logo strip — Integrations is the list of what is
      connected; a second copy drifts the moment a connector changes.
*/
/*
  PACING — spend against plan.

  A media manager works to a budget. Without one, "shift budget" has no
  envelope to shift inside and "over-spending" has nothing to be over. This
  is the first thing on the Channels view because it is the first thing they
  check, and on this data it says something alarming that nothing else did:
  123% of plan spent at 70% of the month.
*/
function PacingCard({ pacing }) {
  if (!pacing?.budget) return <Skeleton className="h-[160px] w-full rounded-card" />;

  const blown = pacing.pacePct > 100;
  const ahead = pacing.pacePct > pacing.elapsedPct + 5;
  const willOverrun = pacing.projectedOver != null && pacing.projectedOver > 0;

  return (
    <Card className={cn("p-4", blown && "bg-ia-negative-faded")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[14px] font-semibold">
          {money(pacing.spend)} of a {money(pacing.budget)} plan for {pacing.month}
        </span>
        {/* TIME, not just money: day N of M is what makes a spend figure mean
            anything. The old card divided by a flat 30 and could not say this. */}
        <span className="tabular text-[12px] text-muted-foreground">
          day {pacing.daysElapsed} of {pacing.daysInMonth} · {plural(pacing.daysRemaining, "day")} left
        </span>
      </div>

      <div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-ia-gray">
        <div
          className={cn("h-full rounded-full", blown ? "bg-ia-negative" : ahead ? "bg-ia-notice" : "bg-primary")}
          style={{ width: `${Math.min(100, pacing.pacePct)}%` }}
        />
        <span
          className="absolute top-0 h-full w-[2px] bg-brand-800/60"
          style={{ left: `${Math.min(100, pacing.elapsedPct)}%` }}
          title={`${pct(pacing.elapsedPct)} of the month elapsed`}
        />
      </div>

      {/* THE PROJECTION — the number a media manager actually decides on.
          "122% of budget" is a fact about the past; "you land at $82,050"
          is the thing that needs a decision this week. */}
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <PaceStat label="Run rate" value={`${money(pacing.dailyRunRate)}/day`} hint={`over ${plural(pacing.daysElapsed, "day")}`} />
        <PaceStat
          label="Projected landing"
          value={money(pacing.projected)}
          hint={willOverrun ? `${money(pacing.projectedOver)} over plan` : "inside plan"}
          tone={willOverrun ? "neg" : "pos"}
        />
        <PaceStat
          label="To finish on plan"
          value={pacing.daysRemaining > 0 ? `${money(pacing.onPlanDailyBudget)}/day` : "—"}
          hint={
            pacing.remaining < 0
              ? `plan already ${money(Math.abs(pacing.remaining))} exhausted`
              : `for the remaining ${plural(pacing.daysRemaining, "day")}`
          }
          tone={pacing.remaining < 0 ? "neg" : undefined}
        />
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        The marker is where the month is. Performance figures above cover {pacing.reportingWindow}; this plan is the
        calendar month, which is why the two windows are labelled separately.
      </p>
    </Card>
  );
}

function PaceStat({ label, value, hint, tone }) {
  return (
    <div className="rounded-input bg-card px-3 py-2 shadow-ring">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("tabular text-[16px] font-semibold leading-6", tone === "neg" && "text-destructive", tone === "pos" && "text-success")}>
        {value}
      </div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function ChannelsView({ rev }) {
  const { data, loading } = useAsync(() => getMarketing(), [rev]);
  const { data: creativeData } = useAsync(() => getCreatives(), [rev]);
  const { data: planData } = useAsync(() => getBudgetPlan(), [rev]);

  return (
    <>
      <PacingCard pacing={data?.pacing} />

      {/* How much, and where — before the retrospective charts. A media
          manager plans forward first and explains backward second. */}
      <PlannerCard plan={planData?.plan} ladder={planData?.ladder} />

      {/* STATE YOUR OWN WINDOW. This product spends a whole card below
          criticising Meta for a generous attribution window while never
          declaring its own — the fastest way to lose a media buyer. */}
      {data?.attribution && (
        <p className="flex items-start gap-2 rounded-input bg-ia-gray-faded px-3 py-2.5 text-xs leading-relaxed text-muted-foreground shadow-ring">
          <MousePointerClick className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Carter&apos;s attribution window: <span className="font-medium text-foreground">{data.attribution.label}</span>,{" "}
            {data.attribution.basis}. {data.attribution.note}{" "}
            <Link href="/pixel/funnel" className="font-medium text-brand-600 hover:underline">
              See paid vs. earned traffic →
            </Link>
          </span>
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Which channels are actually profitable?" subtitle="Ranked by CM-ROAS · below break-even = losing money">
          {loading || !data ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <RankBars
              items={data.channels.map((c) => ({
                name: c.name,
                value: c.cmRoas,
                color: c.color,
                sub: `${money(c.spend)} spend · ${multiple(c.revRoas)} revenue ROAS`,
              }))}
              breakeven={1}
            />
          )}
        </ChartCard>
        <ChartCard title="CM-ROAS trend" subtitle="Profit per ad dollar, last 6 weeks">
          {loading || !data ? <Skeleton className="h-[220px] w-full" /> : <CmRoasTrend data={data.weekly} />}
        </ChartCard>
      </div>

      <ChartCard
        title="Where the platforms disagree with your own data"
        subtitle="What each channel claims vs. what Carter can verify against real orders"
      >
        {loading || !data ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : (
          <div className="space-y-3">
            {[...data.channels]
              .sort((a, b) => b.platformGapPct - a.platformGapPct)
              .map((c) => (
                <div key={c.id} className="rounded-input p-3 shadow-ring">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                      <span className="size-2 rounded-full" style={{ background: c.color }} />
                      {c.name}
                    </span>
                    <Badge variant={c.trackingConfidence === "high" ? "positive" : c.trackingConfidence === "medium" ? "notice" : "negative"}>
                      {c.trackingConfidence === "high" ? "High" : c.trackingConfidence === "medium" ? "Medium" : "Low"} confidence
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
                    <span className="text-muted-foreground">Platform claims <span className="tabular font-semibold text-foreground">{money(c.platformReportedRevenue)}</span></span>
                    <span className="text-muted-foreground">Carter verified <span className="tabular font-semibold text-foreground">{money(c.attributedRevenue)}</span></span>
                    <span className={cn("tabular font-semibold", c.platformGapPct > 30 ? "text-ia-negative" : c.platformGapPct > 10 ? "text-ia-notice" : "text-ia-positive")}>
                      +{pct(c.platformGapPct)} gap
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{c.confidenceNote}</p>
                </div>
              ))}
          </div>
        )}
      </ChartCard>

      <CreativeCard creatives={creativeData?.creatives} />

      <Card className="overflow-hidden p-0">
        <TableToolbar
          title="Campaign breakdown"
          description="Every campaign by profit per ad dollar — scale the winners, pause the leaks."
        />
        {loading || !data ? (
          <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Campaign</TableHead>
                <TableHead>Flight</TableHead>
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
                    {/* A campaign's remaining flight changes what you can do
                        to it. Always-on absorbs a budget change; one ending
                        in two days does not. */}
                    <TableCell>
                      {k.alwaysOn ? (
                        <span className="text-[11px] text-muted-foreground">Always-on · {plural(k.daysRunning ?? 0, "day")}</span>
                      ) : k.ended ? (
                        <Badge variant="neutral" size="sm">Ended</Badge>
                      ) : (
                        <span className={cn("text-[11px]", k.endingSoon ? "font-semibold text-ia-notice" : "text-muted-foreground")}>
                          Ends {untilText(k.endsOn)}
                        </span>
                      )}
                    </TableCell>
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
                      {k.cmRoas < 1 ? <Badge variant="negative">Pause</Badge> : k.cmRoas >= 2.5 ? <Badge variant="positive">Scale</Badge> : <Badge variant="neutral">Hold</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}
      </Card>

    </>
  );
}

/* --------------------------------------------------------------- the page */

const VIEW_COPY = {
  today: {
    eyebrow: "Triage · what needs you",
    description:
      "What your paid media earned this period and what to do about it, ranked by dollar impact. Act on a card and every number here recomputes.",
  },
  channels: {
    eyebrow: "Evidence · your ad platforms, unified",
    description:
      "The paid slice in one place — pacing against plan, the allocation that maximises profit, creative age, and every campaign. This is the proof behind the calls on Today.",
  },
  experiments: {
    eyebrow: "Measurement · holdouts and lift",
    description:
      "Attribution says which touchpoint came first. Only a holdout says whether the order would have happened anyway. Every CM-ROAS in this product assumes an answer; these tests measure it.",
  },
};

function InsightsView() {
  const router = useRouter();
  const params = useSearchParams();

  // The view lives in the URL so an insight card, a link from another page
  // and a shared URL all land on the same one. `/insights?view=channels` is
  // also where every old /reporting link now points.
  const viewParam = params.get("view");
  const view = VIEWS.some((v) => v.id === viewParam) ? viewParam : "today";
  const setView = (next) =>
    router.replace(next === "today" ? "/insights" : `/insights?view=${next}`, { scroll: false });

  // Executing an action really rewrites the numbers (it writes the ad-spend
  // overlay the margin engine reads), so every surface on this page has to
  // refetch when one fires. Bumping `rev` is the whole mechanism.
  const [rev, setRev] = useState(0);
  const refresh = useCallback(() => setRev((n) => n + 1), []);

  // The window is stated, not selected — see context/DateRangeContext.js.
  const win = useReportingWindow();

  const { data: board, loading } = useAsync(() => getInsightsBoard(), [rev]);
  const { data: metrics, loading: metricsLoading } = useAsync(
    () => getMetrics({ lens: VIEW_LENS[view] }),
    [view, rev]
  );

  const kpis = (metrics?.kpis || []).filter(isMediaKpi);
  const waterfall = (metrics?.waterfall || []).filter(isMediaStep);
  const copy = VIEW_COPY[view];
  // How many KPIs this view WILL render, known before the fetch resolves, so
  // the skeletons occupy the same grid the real cards will.
  const expectedKpis = view === "today" ? 3 : 4;

  return (
    <PageContainer>
      <PageHeader eyebrow={copy.eyebrow} title="Insights" description={copy.description}>
        <Tabs value={view} onValueChange={setView}>
          <TabsList>
            {VIEWS.map((v) => (
              <TabsTrigger key={v.id} value={v.id}>{v.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </PageHeader>

      {/* THE WINDOW, STATED. Replaces the top-bar picker: these numbers
          describe exactly these days, and nothing about that is a choice
          the reader has to make. */}
      <p className="-mt-1 text-[12px] text-muted-foreground">
        {win.label} · {win.days} days, complete. Movement is against the {win.days} days before it.
      </p>

      {/* The scoreboard — same component, different lens per view.
          Experiments has its own scoreboard (coverage, and attributed vs
          measured), so repeating the spend strip there would be a third copy
          of numbers the other two views own. Columns follow the KPI count
          rather than a hardcoded guess, which was wrapping the 4-KPI ads
          lens into a 3-column grid. */}
      <div
        className={cn(
          "grid gap-4 sm:grid-cols-2",
          view === "experiments" && "hidden",
          expectedKpis >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
        )}
      >
        {metricsLoading
          ? Array.from({ length: expectedKpis }, (_, i) => <Skeleton key={i} className="h-32 w-full" />)
          // Spread, not a fixed prop list — the metrics layer decides which
          // delta shape a KPI carries (percentage vs. a ratio's `deltaText`),
          // and picking props here silently dropped the ones it added. `key`
          // is pulled out first: it's the metric's id, and leaving it in the
          // spread collides with React's own reserved prop.
          : kpis.map(({ key, ...props }) => <KpiCard key={key} {...props} />)}
      </div>

      {view === "experiments" ? (
        <ExperimentsView />
      ) : view === "channels" ? (
        <ChannelsView rev={rev} />
      ) : (
        <>
          {/* 1 — Carter's read of those numbers */}
          <AuraDailyBrief rev={rev} />

          {/* 2 — how much needs you */}
          <HealthStrip board={board} />

          {/* 3 — the decision surface */}
          <div>
            <h2 className="flex items-center gap-2 text-[16px] font-semibold leading-6 text-brand-800">
              What's making &amp; costing you money
              {board && <Badge variant="neutral">{board.actions.length}</Badge>}
            </h2>
            <p className="mb-3 mt-0.5 text-[12px] leading-4 text-neutral-500">
              Ranked by dollar impact · portfolio-wide cards first, then individual SKUs. Act on one and the numbers above recompute.
            </p>
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {board.actions.map((a) => <ActionCard key={a.id} a={a} onApplied={refresh} />)}
              </div>
            )}
            {board?.health?.skuInsightsSuppressed > 0 && (
              <p className="mt-3 text-[11px] text-muted-foreground">
                {board.health.skuInsightsSuppressed} further SKU-level findings are rolled into the category cards above.
              </p>
            )}
          </div>

          {/* 4 — what Carter did about it */}
          <ActionLogCard refreshKey={rev} onChanged={refresh} />

          {/* 5 — the evidence: revenue down to CM2, no further */}
          <ChartCard title="Where the money goes" subtitle="Revenue flows down through COGS and ad spend to CM2">
            {metricsLoading ? <Skeleton className="h-[220px] w-full" /> : <MarginWaterfall data={waterfall} />}
          </ChartCard>

          {/* 6 — where to look next. These are pointers, not copies: the
              rollup and per-SKU movement live on Products, which owns the
              catalogue. A second rendering here is how two screens end up
              disagreeing about the same category's CM2. */}
          <div className="grid gap-4 lg:grid-cols-2">
            <AlertsCard rev={rev} />
            <NextLooksCard board={board} />
          </div>
        </>
      )}
    </PageContainer>
  );
}

// useSearchParams needs a Suspense boundary or the whole route opts out of
// static rendering.
export default function InsightsPage() {
  return (
    <Suspense fallback={<PageContainer><Skeleton className="h-96 w-full rounded-card" /></PageContainer>}>
      <InsightsView />
    </Suspense>
  );
}
