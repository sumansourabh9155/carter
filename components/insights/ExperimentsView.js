"use client";

/*
  EXPERIMENTS — where attribution gets checked against reality.

  This view exists because every other number in the product rests on
  `paidShare`, and until now nothing tested it. Attribution answers "what
  preceded the order"; only a holdout answers "would the order have happened
  anyway". The gap between the two is the largest single source of wasted
  media budget in retail, and it is invisible without this screen.

  DESIGN RULES, all of them about refusing to overclaim:
    · a running test shows its window and no result
    · a test shorter than the minimum shows its interval, not its midpoint
    · an interval spanning zero reads "no detectable lift", never its centre
    · coverage is stated up front, because the honest headline for most
      brands is how much of the budget has no evidence at all
*/

import { FlaskConical, Clock, Check, TriangleAlert, Minus } from "lucide-react";
import { getExperiments } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { Card, CardHeading } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/ui/LoadError";
import { money, pct, multiple, plural } from "@/lib/format";
import { fmtDate, untilText } from "@/lib/time";
import { cn } from "@/lib/utils";

const STATUS = {
  conclusive: { label: "Conclusive", variant: "positive", Icon: Check },
  inconclusive: { label: "No detectable lift", variant: "negative", Icon: Minus },
  underpowered: { label: "Too short", variant: "notice", Icon: TriangleAlert },
  running: { label: "Running", variant: "neutral", Icon: Clock },
};

const VERDICT_TONE = {
  "attribution holds": "positive",
  "attribution over-credits": "notice",
  "mostly not incremental": "negative",
};

/* The bar that makes an interval legible: where zero sits, and whether the
   whole range clears it. A point estimate alone hides exactly this. */
function LiftInterval({ lo, hi, point }) {
  if (lo == null || hi == null) return null;
  const min = Math.min(lo, 0) - 5;
  const max = Math.max(hi, 0) + 5;
  const span = max - min || 1;
  const x = (v) => ((v - min) / span) * 100;
  const clearsZero = lo > 0 || hi < 0;

  return (
    <div className="mt-2">
      <div className="relative h-6">
        {/* Zero line — the only reference that matters. */}
        <span className="absolute top-0 h-full w-px bg-brand-800/40" style={{ left: `${x(0)}%` }} />
        <span
          className={cn("absolute top-2 h-2 rounded-full", clearsZero ? "bg-ia-positive" : "bg-ia-notice")}
          style={{ left: `${x(lo)}%`, width: `${Math.max(1, x(hi) - x(lo))}%` }}
        />
        {point != null && (
          <span
            className="absolute top-1 size-4 -translate-x-1/2 rounded-full border-2 border-white bg-brand-700 shadow-control"
            style={{ left: `${x(point)}%` }}
            title={`Point estimate ${pct(point)}`}
          />
        )}
      </div>
      <div className="flex justify-between text-[10px] tabular text-muted-foreground">
        <span>{pct(lo)}</span>
        <span className="font-medium">0 — no lift</span>
        <span>{pct(hi)}</span>
      </div>
    </div>
  );
}

function ExperimentCard({ x }) {
  const s = STATUS[x.status];
  return (
    <Card className={cn("relative overflow-hidden p-4 pl-5", x.running && "bg-ia-gray-faded")}>
      <span
        className={cn(
          "absolute left-0 top-0 h-full w-[3px]",
          x.status === "conclusive" ? "bg-ia-positive"
            : x.status === "inconclusive" ? "bg-ia-negative"
            : x.status === "underpowered" ? "bg-ia-notice"
            : "bg-neutral-300"
        )}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={s.variant} size="sm"><s.Icon /> {s.label}</Badge>
          <Badge variant="outline" size="sm">{x.designMeta.short}</Badge>
        </div>
        {/* TIME, stated: a result without its window is not a result. */}
        <span className="tabular text-[11px] text-muted-foreground">
          {fmtDate(x.startedOn)} – {x.endedOn ? fmtDate(x.endedOn) : "now"} · {plural(x.days, "day")}
          {x.days < x.minDays && ` of ${x.minDays} needed`}
        </span>
      </div>

      <div className="mt-2 text-[14px] font-semibold leading-snug">{x.name}</div>
      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{x.readout}</p>

      <LiftInterval lo={x.liftLoPct} hi={x.liftHiPct} point={x.liftPct} />

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Figure label="Treatment" value={`${x.treatmentRatePer1k}`} hint={`orders / 1k people · ${x.treatment.markets} mkt`} />
        <Figure label="Control" value={`${x.controlRatePer1k}`} hint={`orders / 1k people · ${x.control.markets} mkt`} />
        <Figure
          label="Incremental CM-ROAS"
          value={x.usable ? multiple(x.incrementalCmRoas) : "—"}
          hint={x.usable ? `on ${money(x.treatmentSpend)} spend` : "not established"}
          tone={x.usable && x.incrementalCmRoas < 1 ? "neg" : undefined}
        />
        <Figure
          label="Measured paid share"
          value={x.usable ? pct(x.impliedPaidSharePct) : "—"}
          hint={x.usable ? "vs the assumed share" : "needs a conclusive test"}
        />
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{x.note}</p>
    </Card>
  );
}

function Figure({ label, value, hint, tone }) {
  return (
    <div className="rounded-input bg-card px-2.5 py-2 shadow-ring">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("tabular text-[15px] font-semibold leading-5", tone === "neg" && "text-destructive")}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function ExperimentsView() {
  const { data, error } = useAsync(() => getExperiments(), []);

  if (error) return <LoadError what="experiment results" error={error} />;
  if (!data) {
    return <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-52 w-full rounded-card" />)}</div>;
  }

  const { board, gap } = data;

  return (
    <>
      {/* COVERAGE FIRST. The uncomfortable number, before any result. */}
      <Card className={cn("p-4", gap.coveragePct < 60 && "bg-ia-notice-faded")}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-[14px] font-semibold">
            {pct(gap.coveragePct)} of ad spend has experimental evidence behind it
          </span>
          <span className="tabular text-[12px] text-muted-foreground">
            {money(gap.testedSpend)} tested of {money(gap.totalSpend)}
          </span>
        </div>
        <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-ia-gray">
          <div className="h-full bg-primary" style={{ width: `${gap.coveragePct}%` }} />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          {gap.untested.length > 0 ? (
            <>
              Untested: {gap.untested.map((u) => `${u.name} (${money(u.spend)})`).join(", ")}. Attribution is the only
              evidence those channels have — and where a test has run, it came back materially below what attribution
              claimed.
            </>
          ) : (
            <>Every channel running at scale has a holdout behind it.</>
          )}
        </p>
      </Card>

      {/* THE GAP: what the product reports vs what a test measured. */}
      {gap.rows.length > 0 && (
        <Card className="overflow-hidden p-0">
          <CardHeading
            title="Attributed vs. incremental"
            description="What Carter reports against what a holdout measured. The difference is margin the product has been counting twice."
          >
            <Badge variant="negative">{money(gap.overstatedCm)} over-credited</Badge>
          </CardHeading>
          <div className="border-t border-border">
            {gap.rows.map((r) => (
              <div key={r.channelId} className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border-subtle px-6 py-3 last:border-b-0">
                <span className="inline-flex min-w-[130px] items-center gap-1.5 text-[13px] font-medium">
                  <span className="size-2 rounded-full" style={{ background: r.color }} />
                  {r.name}
                </span>
                <span className="tabular text-[12px] text-muted-foreground">
                  attributed <span className="font-semibold text-foreground">{multiple(r.attributedCmRoas)}</span>
                </span>
                <span className="tabular text-[12px] text-muted-foreground">
                  incremental{" "}
                  <span className={cn("font-semibold", r.incrementalCmRoas < 1 ? "text-destructive" : "text-foreground")}>
                    {multiple(r.incrementalCmRoas)}
                  </span>
                </span>
                <Badge variant={VERDICT_TONE[r.verdict] ?? "neutral"} size="sm">{r.verdict}</Badge>
                <span className="tabular ml-auto text-[12px] font-semibold text-destructive">
                  {money(r.overstatedCm)} over-credited
                </span>
                <span className="w-full text-[11px] text-muted-foreground">
                  {plural(r.testedDays, "day")} holdout, ended {untilText(r.testedEndedOn)} · measured paid share{" "}
                  {pct(r.measuredSharePct)} on {money(r.spend)} of spend
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div>
        <h2 className="flex items-center gap-2 text-[16px] font-semibold leading-6 text-brand-800">
          <FlaskConical className="size-4" /> Tests
          <Badge variant="neutral">{board.experiments.length}</Badge>
        </h2>
        <p className="mb-3 mt-0.5 text-[12px] leading-4 text-neutral-500">
          {board.conclusive} conclusive · {board.running} running · {board.needsRerun} need re-running. A test shorter
          than {board.minDays} days measures timing rather than lift, so it reports an interval instead of a number.
        </p>
        <div className="grid gap-4">
          {board.experiments.map((x) => <ExperimentCard key={x.id} x={x} />)}
        </div>
      </div>
    </>
  );
}
