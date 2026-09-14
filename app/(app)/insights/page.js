"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Plus, AlertTriangle, TrendingDown, Wallet, Check, ArrowRight, Sparkles } from "lucide-react";
import { getInsightsBoard, getAlerts, createAlert, getCashCalendar, getDailyBrief } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { useAIPanel } from "@/context/AIPanelContext";
import { ALERT_TYPES } from "@/lib/data/alertsSeed";
import { PageHeader, PageContainer } from "@/components/PageHeader";
import { ProductThumb } from "@/components/ProductThumb";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogPrimitive } from "@/components/ui/dialog";
import { money, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

const ALERT_ICON = { "negative-cm2": AlertTriangle, "ad-overspend": TrendingDown, "runway-floor": Wallet };
const SEV_VARIANT = { critical: "destructive", warning: "warning", opportunity: "success", info: "secondary" };
const SEV_ACCENT = {
  critical: "hover:border-destructive/40",
  warning: "hover:border-warning/40",
  opportunity: "hover:border-success/40",
  info: "hover:border-border",
};

// --- Health strip: instant read on the state of the business ---
function Tile({ label, value, sub, tone }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-3.5", tone === "pos" && "border-success/30 bg-success/[0.04]", tone === "neg" && "border-destructive/30 bg-destructive/[0.04]", tone === "warn" && "border-warning/30 bg-warning/[0.04]")}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="tabular mt-1 text-xl font-semibold tracking-tight">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

// Attention signals only — NOT the P&L (that's the Dashboard's job). This
// strip answers "how much needs me, and how urgent", never "what are my
// margins" — keeping Insights and Dashboard from restating each other.
function HealthStrip({ board }) {
  if (!board?.health) {
    return <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[86px] w-full" />)}</div>;
  }
  const { health } = board;
  const opportunityCount = board.actions.filter((a) => a.severity === "opportunity").length;
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
      <Tile label="Needs action" value={health.actionCount} sub="prioritized below" tone={health.actionCount > 0 ? "warn" : undefined} />
      <Tile label="Act today" value={health.criticalCount} sub="critical issues" tone={health.criticalCount > 0 ? "neg" : "pos"} />
      <Tile label="Opportunities" value={opportunityCount} sub="upside to capture" tone={opportunityCount > 0 ? "pos" : undefined} />
      <Tile label="Cash due now" value={money(health.cashDue)} sub="supplier deposits" tone={health.cashDue > 0 ? "warn" : undefined} />
    </div>
  );
}

// A diagnosis with its evidence — the card explains WHAT's wrong and WHY,
// and links to the deep screen that proves it.
function ActionCard({ a }) {
  return (
    <div className={cn("flex flex-col rounded-xl border border-border bg-card p-3.5 transition-colors", SEV_ACCENT[a.severity])}>
      <div className="flex items-center justify-between gap-2">
        <Badge variant={SEV_VARIANT[a.severity]}>{a.verdict}</Badge>
        {a.metric && <span className="tabular text-xs font-semibold text-muted-foreground">{a.metric}</span>}
      </div>
      <div className="mt-2 text-sm font-semibold leading-snug">{a.title}</div>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">{a.body}</p>
      <div className="mt-2.5">
        <Link href={a.ref.href} className="group inline-flex items-center gap-1 text-xs font-medium text-primary">
          See the evidence <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

// --- Monitoring: watchers you've configured (compact) ---
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
        <Button size="sm" variant="outline"><Plus className="size-3.5" /> New alert</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create an alert</DialogTitle>
          <DialogDescription>Tally watches your numbers and pings you when a threshold trips.</DialogDescription>
        </DialogHeader>
        {saved ? (
          <div className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/[0.06] p-4 text-sm">
            <Check className="size-4 text-success" /> Alert created. You'll be notified in-app and by email.
          </div>
        ) : (
          <div className="space-y-2">
            {liveTypes.map((t) => (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                  type === t.id ? "border-primary/40 bg-primary/[0.06]" : "border-border hover:bg-black/[0.03]"
                )}
              >
                <span className={cn("mt-0.5 size-3.5 rounded-full border-2", type === t.id ? "border-primary bg-primary" : "border-muted-foreground")} />
                <span>
                  <span className="block text-sm font-medium">{t.label}</span>
                  <span className="block text-xs text-muted-foreground">{t.desc}</span>
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
    <Card className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-sm font-semibold">
          <span className="grid size-7 place-items-center rounded-lg bg-warning/15 text-warning"><Bell className="size-3.5" /></span>
          Alerts you've set
        </span>
        <CreateAlertDialog />
      </div>
      {loading ? (
        <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => (
            <div key={a.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{a.title}</span>
                <Badge variant={a.severity === "critical" ? "destructive" : "warning"}>{a.severity}</Badge>
                <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{a.triggeredAt}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{a.body}</p>
              {a.ref && <Link href={a.ref.href} className="mt-1 inline-block text-[11px] font-medium text-primary hover:underline">{a.ref.label} →</Link>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function CashCard() {
  const { data: cal, loading } = useAsync(() => getCashCalendar(), []);
  return (
    <Card className="flex h-full flex-col p-4">
      <div className="mb-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold">
          <span className="grid size-7 place-items-center rounded-lg bg-primary/15 text-primary"><Wallet className="size-3.5" /></span>
          Cash calendar
        </span>
        <p className="mt-0.5 text-[11px] text-muted-foreground">What your current reorder needs commit you to — not a forecast.</p>
      </div>
      {loading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-11 w-full" />)}</div>
      ) : cal.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending reorders — nothing committed.</p>
      ) : (
        <>
          <div className="mb-2 flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">Due now <span className="tabular font-semibold text-foreground">{money(cal.totalDepositDue)}</span></span>
            <span className="text-muted-foreground">Later <span className="tabular font-semibold text-foreground">{money(cal.totalBalanceDue)}</span></span>
          </div>
          <div className="space-y-1.5 overflow-y-auto">
            {cal.items.slice(0, 5).map((i) => (
              <Link key={i.id} href={`/products/${i.id}`} className="flex items-center gap-2.5 rounded-lg border border-border p-2 transition-colors hover:bg-black/[0.02]">
                <ProductThumb id={i.id} name={i.name} size={26} />
                <span className="min-w-0 flex-1 truncate text-xs font-medium">{i.name}</span>
                {i.urgent && <Badge variant="destructive">Urgent</Badge>}
                <span className="tabular shrink-0 text-xs font-semibold">{money(i.reorderCostTotal)}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

// Ambient Aura — the proactive Daily Brief. Aura speaks first: what moved
// money, what to do, and the dollars at stake, synthesized from the same
// ranked board below. "Ask Aura" opens the dock seeded to today's brief.
const SEV_DOT = { critical: "bg-destructive", warning: "bg-warning", opportunity: "bg-success", info: "bg-muted-foreground" };

function AuraDailyBrief() {
  const { data: brief } = useAsync(() => getDailyBrief(), []);
  const { openPanel } = useAIPanel();

  if (!brief) return <Skeleton className="h-[188px] w-full rounded-2xl" />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.06] to-transparent p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 text-white shadow-sm">
          <Sparkles className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">Aura · Daily Brief</span>
            {brief.stakeLabel && <Badge variant="destructive">{brief.stakeLabel}</Badge>}
            {brief.upsideLabel && <Badge variant="success">{brief.upsideLabel}</Badge>}
          </div>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">{greeting} — {brief.headline}</h2>
          <p className="mt-1 text-sm leading-relaxed text-foreground/80">{brief.summary}</p>
        </div>
        <Button size="sm" variant="outline" className="shrink-0" onClick={() => openPanel("Walk me through today's brief — what should I tackle first and why?")}>
          <Sparkles className="size-3.5" /> Ask Aura
        </Button>
      </div>

      {brief.items.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {brief.items.map((it, i) => (
            <Link
              key={it.id}
              href={it.action?.href || "#"}
              className="group flex flex-col gap-1.5 rounded-xl border border-border bg-card/70 p-3 transition-colors hover:border-primary/30"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground">{i + 1}</span>
                <span className={cn("size-1.5 rounded-full", SEV_DOT[it.severity])} />
                <span className="text-xs font-semibold">{it.verdict}</span>
                {it.metric && <span className="tabular ml-auto text-[11px] text-muted-foreground">{it.metric}</span>}
              </div>
              <span className="line-clamp-2 text-xs text-foreground/80">{it.title}</span>
              <span className="mt-auto inline-flex items-center gap-1 text-[11px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                {it.action?.label || "Open"} <ArrowRight className="size-3" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function InsightsPage() {
  const { data: board, loading } = useAsync(() => getInsightsBoard(), []);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Triage · what needs you"
        title="Insights"
        description="What's making or costing you money right now — ranked by impact, with the why. The Dashboard has the raw numbers; every card links to its evidence."
      />

      <AuraDailyBrief />

      <HealthStrip board={board} />

      {/* The decision surface — prioritized, cross-domain diagnoses. */}
      <div>
        <h2 className="mb-0.5 flex items-center gap-2 text-sm font-semibold">
          What's making &amp; costing you money
          {board && <Badge variant="secondary">{board.actions.length}</Badge>}
        </h2>
        <p className="mb-2.5 text-xs text-muted-foreground">Ranked by dollar impact · every card links to the screen that proves it.</p>
        {loading ? (
          <div className="grid gap-3 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {board.actions.map((a) => <ActionCard key={a.id} a={a} />)}
          </div>
        )}
      </div>

      {/* Monitoring — side by side to keep the page short */}
      <div className="grid gap-4 lg:grid-cols-2">
        <AlertsCard />
        <CashCard />
      </div>
    </PageContainer>
  );
}
