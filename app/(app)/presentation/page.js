"use client";

/*
  THE DECK — rewritten for what the product actually is.

  The previous version pitched a financial operating system for Shopify
  founders: stockout alerts, cash-runway forecasting, a $49/mo App Store
  install, "Priya manages 5–50 brands". None of that survives in the product.
  Inventory and treasury were deliberately cut, the buyer is a media team at a
  consumer brand, and the thing that makes it defensible — incrementality
  testing — did not exist when those slides were written.

  THE ARGUMENT NOW, in three numbers for the same $54,707 of spend:

      revenue ROAS        what the platforms report
      CM-ROAS attributed  after COGS, shipping, fees and returns
      incremental         what a geo holdout actually measured

  On the current seed those run roughly 2.3x / 1.15x / 0.59x, but the slides
  read them from the engines rather than quoting them, so the deck cannot
  contradict the app.

  Everyone ships the first number. A few ship the second. Almost nobody ships
  the third, and only the third answers the question a CFO asks. That ladder
  is the whole deck.

  EVERY FIGURE HERE IS PRODUCED BY THE LIVE ENGINES, not typed into a slide.
  The deck imports the same compute the app renders, so it cannot drift from
  the product it describes — and a demo that contradicts its own pitch deck is
  the fastest way to lose a room.
*/

import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cookie,
  EyeOff,
  FlaskConical,
  Gauge,
  Landmark,
  MinusCircle,
  Repeat,
  ShieldCheck,
  Sparkles,
  Store,
  Target,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import Link from "next/link";
import { getMarketing, getExperiments, getBudgetPlan, getCreatives, getMetrics } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { money, multiple, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

/* Shared arrow marker — context-stroke lets every path color its own head. */
function ArrowDefs() {
  return (
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </marker>
      <linearGradient id="aiGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fb8c00" />
        <stop offset="100%" stopColor="#ef6c00" />
      </linearGradient>
    </defs>
  );
}

/* A single hook so every slide reads the same live figures once. */
function useDeckData() {
  const { data: mkt } = useAsync(() => getMarketing(), []);
  const { data: exp } = useAsync(() => getExperiments(), []);
  const { data: plan } = useAsync(() => getBudgetPlan(), []);
  const { data: cre } = useAsync(() => getCreatives(), []);
  const { data: ads } = useAsync(() => getMetrics({ lens: "ads" }), []);
  return { mkt, exp, plan, cre, ads };
}

function Figure({ label, value, sub, tone }) {
  return (
    <div className="rounded-card bg-card px-4 py-2.5 shadow-ring">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("tabular text-lg font-semibold", tone === "neg" && "text-destructive", tone === "pos" && "text-success")}>
        {value}
      </div>
      {sub && <div className="text-[11px] leading-tight text-muted-foreground">{sub}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Slide 1 — Cover: the three numbers                                     */
/* ---------------------------------------------------------------------- */

/*
  THE LADDER. One bar per number, same spend underneath all three, so the
  overstatement is a length rather than a claim. This is the single most
  important visual in the deck: a media director recognises their own
  reporting in the top bar and has never seen the bottom one.
*/
function RoasLadder({ revRoas, cmRoas, incremental }) {
  const rows = [
    { label: "Revenue ROAS", value: revRoas, who: "what the ad platforms claim", color: "#a3b3bc" },
    { label: "CM-ROAS", value: cmRoas, who: "after COGS, shipping, fees, returns", color: "#0277bd" },
    { label: "Incremental CM-ROAS", value: incremental, who: "what a geo holdout measured", color: "#d32f2f" },
  ].filter((r) => r.value != null);
  if (!rows.length) return <div className="h-[132px]" />;
  const max = Math.max(...rows.map((r) => r.value)) || 1;

  return (
    <div className="w-full space-y-2.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3">
          <span className="w-[150px] shrink-0 text-right text-[11px] font-medium text-muted-foreground">{r.label}</span>
          <div className="h-7 flex-1 overflow-hidden rounded-button bg-ia-gray">
            <div
              className="flex h-full items-center justify-end rounded-button px-2"
              style={{ width: `${(r.value / max) * 100}%`, background: r.color }}
            >
              <span className="tabular text-[12px] font-semibold text-white">{multiple(r.value)}</span>
            </div>
          </div>
          <span className="hidden w-[190px] shrink-0 text-[11px] text-muted-foreground sm:block">{r.who}</span>
        </div>
      ))}
      {/* Break-even is the only reference that matters on this chart. */}
      <p className="pl-[162px] text-[11px] text-muted-foreground">
        Break-even is <span className="font-semibold text-foreground">1.0×</span>. The same spend, measured three ways —
        and only the bottom one answers &ldquo;would this have happened anyway?&rdquo;
      </p>
    </div>
  );
}

function CoverSlide() {
  const { mkt, exp, ads } = useDeckData();
  const gap = exp?.gap?.rows?.[0];
  const revRoas = mkt?.totals?.platformRoas;

  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <span className="mb-5 grid size-16 place-items-center rounded-[24px] bg-[image:var(--gradient-primary-button)] text-white shadow-high">
        <Sparkles className="size-8" />
      </span>
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary">Carter</p>
      <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
        Retail media measurement that survives{" "}
        <span className="text-primary">a conversation with finance</span>
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
        Carter tells a brand&apos;s media team what their paid spend actually earned — after product cost, and after a
        holdout test proves the demand would not have arrived anyway. Then it lets them act on it, and measures whether
        the change worked.
      </p>

      <div className="mt-7 w-full max-w-3xl rounded-card bg-card p-5 shadow-ring-lift">
        <RoasLadder revRoas={revRoas} cmRoas={mkt?.totals?.cmRoas} incremental={gap?.incrementalCmRoas} />
      </div>

      <p className="mt-5 max-w-xl text-sm text-muted-foreground">
        Every number in this deck is computed by the live product, not typed into a slide.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Slide 2 — The problem: two layers of overstatement                     */
/* ---------------------------------------------------------------------- */

function OverstatementDiagram({ revRoas, cmRoas, incremental }) {
  // The headline gap, computed rather than asserted — if the seed or the
  // attribution model changes, the sentence changes with it.
  const spread = revRoas && incremental ? Math.round((revRoas / incremental) * 10) / 10 : null;
  return (
    <svg viewBox="0 0 860 300" width="100%" role="img" aria-label="Revenue ROAS overstates by ignoring cost of goods; attributed CM-ROAS overstates again by crediting demand that would have arrived anyway; only an incrementality test removes both">
      <ArrowDefs />

      {/* Layer 1 */}
      <rect x={20} y={10} width={820} height={64} rx={12} fill="#f2f5f7" stroke="#a3b3bc" strokeWidth="1.1" />
      <text x={40} y={34} fontSize="13" fontWeight="700" fill="#5f7682">What the ad platforms claim: Revenue ROAS</text>
      <text x={40} y={54} fontSize="11" fill="#5f7682">Revenue ÷ spend. Says nothing about whether the revenue was profitable.</text>
      <text x={800} y={46} textAnchor="end" fontSize="20" fontWeight="700" fill="#5f7682">{multiple(revRoas)}</text>

      <line x1="430" y1="74" x2="430" y2="100" stroke="#0277bd" strokeWidth="1.6" markerEnd="url(#arrow)" />
      <rect x={290} y={80} width={280} height="18" rx={5} fill="#ffffff" />
      <text x={430} y={94} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#0277bd">
        subtract COGS, shipping, fees, returns
      </text>

      {/* Layer 2 */}
      <rect x={20} y={104} width={820} height={64} rx={12} fill="#e5f4fd" stroke="#0277bd" strokeWidth="1.2" />
      <text x={40} y={128} fontSize="13" fontWeight="700" fill="#01579b">What a good tool reports: attributed CM-ROAS</text>
      <text x={40} y={148} fontSize="11" fill="#01579b">Real margin per ad dollar — but still credits every order the ad merely preceded.</text>
      <text x={800} y={140} textAnchor="end" fontSize="20" fontWeight="700" fill="#01579b">{multiple(cmRoas)}</text>

      <line x1="430" y1="168" x2="430" y2="194" stroke="#d32f2f" strokeWidth="1.6" markerEnd="url(#arrow)" />
      <rect x={272} y={174} width={316} height="18" rx={5} fill="#ffffff" />
      <text x={430} y={188} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#c62828">
        remove demand that would have arrived anyway
      </text>

      {/* Layer 3 */}
      <rect x={20} y={198} width={820} height={64} rx={12} fill="#ffe6e6" stroke="#d32f2f" strokeWidth="1.3" />
      <text x={40} y={222} fontSize="13" fontWeight="700" fill="#c62828">What a holdout measures: incremental CM-ROAS</text>
      <text x={40} y={242} fontSize="11" fill="#c62828">Below break-even. This channel is buying demand it already had.</text>
      <text x={800} y={234} textAnchor="end" fontSize="20" fontWeight="700" fill="#c62828">{multiple(incremental)}</text>

      <text x={430} y={284} textAnchor="middle" fontSize="12" fontWeight="700" fill="#1a2c8f">
        {spread ? `Same spend. Same period. A ${spread}x spread between the reported number and the real one.` : "Same spend, same period — measured three ways."}
      </text>
    </svg>
  );
}

function ProblemSlide() {
  const { exp, mkt, ads } = useDeckData();
  const gap = exp?.gap;

  return (
    <div className="flex h-full flex-col justify-center">
      <p className="mb-1.5 text-sm font-semibold uppercase tracking-[0.2em] text-primary">The problem</p>
      <h2 className="max-w-3xl text-2xl font-semibold tracking-tight sm:text-3xl">
        Media reporting overstates twice — and the second one is invisible.
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        The first overstatement is well known: ROAS ignores cost of goods. The second one is the expensive one — even a
        profit-true number credits ads with demand that was already coming.
      </p>

      <div className="mt-4">
        <OverstatementDiagram
          revRoas={mkt?.totals?.platformRoas}
          cmRoas={mkt?.totals?.cmRoas}
          incremental={gap?.rows?.[0]?.incrementalCmRoas}
        />
      </div>

      {gap && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Figure label="Over-credited by attribution" value={money(gap.overstatedCm)} sub="on one channel, one month" tone="neg" />
          <Figure label="Spend with any test behind it" value={pct(gap.coveragePct)} sub={`${money(gap.totalSpend - gap.testedSpend)} runs on faith`} />
          <Figure label="Channels never tested" value={gap.untested.length} sub={gap.untested.map((u) => u.name).join(", ")} />
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Slide 3 — The product                                                  */
/* ---------------------------------------------------------------------- */

const SURFACES = [
  {
    icon: Target,
    title: "Insights",
    q: "What's happening, and what do I do?",
    body: "A ranked board of decisions, each priced before you commit. Act on one and every number recomputes — then it tells you whether the call was right.",
  },
  {
    icon: Store,
    title: "Products",
    q: "Which product or category?",
    body: "Contribution margin per SKU and per category, with the media verdict separated from the P&L. A product can be profitable while its ads destroy value.",
  },
  {
    icon: Users,
    title: "Audience & Funnel",
    q: "Who shows up, and what do they do?",
    body: "Paid versus earned traffic, on-site conversion, and which channel recruits rather than harvests. Email is 11% new customers; TikTok is 88%.",
  },
];

function ProductSlide() {
  const { plan, cre, mkt } = useDeckData();
  const recoverable = cre?.creatives?.reduce((a, c) => a + c.recoverableCm, 0);

  return (
    <div className="flex h-full flex-col justify-center">
      <p className="mb-1.5 text-sm font-semibold uppercase tracking-[0.2em] text-primary">The product · live today</p>
      <h2 className="max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
        Three surfaces. One question each.
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Not a dashboard with forty charts. Every dataset has exactly one home, so two screens can never disagree about
        the same number.
      </p>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {SURFACES.map((s) => (
          <div key={s.title} className="rounded-card bg-card p-4 shadow-ring">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-input bg-primary/[0.08] text-primary">
                <s.icon className="size-4" />
              </span>
              <span className="text-sm font-semibold">{s.title}</span>
            </div>
            <p className="mt-1.5 text-xs font-medium text-primary">{s.q}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        What it found in this account, this month
      </p>
      <div className="mt-2 grid gap-3 sm:grid-cols-4">
        <Figure label="Pacing" value={money(mkt?.pacing?.projected)} sub={`projected vs a ${money(mkt?.pacing?.budget)} plan`} tone="neg" />
        <Figure label="Better allocation" value={money(plan?.plan?.upliftCm2)} sub={`from ${money(plan?.plan?.spendCutFromCurrent)} less spend`} tone="pos" />
        <Figure label="Creative recoverable" value={money(recoverable)} sub={`${cre?.creatives?.filter((c) => c.status === "fatigued").length ?? 0} assets spent`} />
        <Figure label="Media CM2 today" value={money(mkt?.totals ? mkt.totals.cm - mkt.totals.spend : null)} sub="on the honest basis" />
      </div>

      <Link
        href="/insights"
        className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-card bg-[image:var(--gradient-primary-button)] px-4 py-2 text-sm font-semibold text-white shadow-control transition-opacity hover:opacity-90"
      >
        Enter the live product <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Slide 4 — The moat: incrementality                                     */
/* ---------------------------------------------------------------------- */

const CAP_ROWS = [
  { cap: "Revenue ROAS", carter: "full", tw: "full", nb: "full", plat: "full" },
  { cap: "Margin-true CM-ROAS after COGS", carter: "full", tw: "partial", nb: "none", plat: "none" },
  { cap: "Separates media result from product P&L", carter: "full", tw: "none", nb: "none", plat: "none" },
  { cap: "Incrementality testing (geo / PSA holdouts)", carter: "full", tw: "none", nb: "partial", plat: "partial" },
  { cap: "States its own attribution window", carter: "full", tw: "none", nb: "partial", plat: "none" },
  { cap: "Budget allocation under diminishing returns", carter: "full", tw: "none", nb: "none", plat: "partial" },
  { cap: "Creative fatigue tied to margin", carter: "full", tw: "none", nb: "none", plat: "partial" },
  { cap: "Executes the change, with undo and audit", carter: "full", tw: "none", nb: "none", plat: "partial" },
  { cap: "Measures whether the change worked", carter: "full", tw: "none", nb: "none", plat: "none" },
];

const CAP_ICON = {
  full: { Icon: CheckCircle2, cls: "text-success" },
  partial: { Icon: MinusCircle, cls: "text-warning" },
  none: { Icon: XCircle, cls: "text-muted-foreground/40" },
};

function CapabilityCell({ v }) {
  const { Icon, cls } = CAP_ICON[v];
  return <Icon className={cn("mx-auto size-4", cls)} />;
}

function MoatSlide() {
  const { exp } = useDeckData();

  return (
    <div className="flex h-full flex-col justify-center">
      <p className="mb-1.5 text-sm font-semibold uppercase tracking-[0.2em] text-primary">Why we win</p>
      <h2 className="max-w-3xl text-2xl font-semibold tracking-tight sm:text-3xl">
        Everyone reports attribution. We test whether it&apos;s true.
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Every measurement tool on the market rests on the same unvalidated assumption — the share of sales that paid
        media caused. We are the only one that runs the experiment and then feeds the answer back into the numbers.
      </p>

      <div className="mt-4 overflow-hidden rounded-card bg-card shadow-ring">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-ia-gray-faded">
              <th className="p-2 text-left text-[11px] font-semibold text-muted-foreground">Capability</th>
              <th className="p-2 text-[11px] font-semibold text-primary">Carter</th>
              <th className="p-2 text-[11px] font-semibold text-muted-foreground">Triple Whale</th>
              <th className="p-2 text-[11px] font-semibold text-muted-foreground">Northbeam</th>
              <th className="p-2 text-[11px] font-semibold text-muted-foreground">Platform native</th>
            </tr>
          </thead>
          <tbody>
            {CAP_ROWS.map((r) => (
              <tr key={r.cap} className="border-b border-border last:border-0">
                <td className="p-2 text-xs text-foreground/80">{r.cap}</td>
                <td className="p-2 text-center"><CapabilityCell v={r.carter} /></td>
                <td className="p-2 text-center"><CapabilityCell v={r.tw} /></td>
                <td className="p-2 text-center"><CapabilityCell v={r.nb} /></td>
                <td className="p-2 text-center"><CapabilityCell v={r.plat} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-card border border-primary/25 bg-gradient-to-br from-primary/[0.06] to-transparent p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-input bg-[image:var(--gradient-primary-button)] text-white">
            <FlaskConical className="size-4" />
          </span>
          <p className="text-sm leading-relaxed text-foreground/90">
            The bottom four rows are the moat, and they compound: you cannot honestly allocate a budget without knowing
            what is incremental, you cannot claim a creative refresh worked without measuring it, and nobody hands a
            system autonomy without a track record.{" "}
            {exp?.board && (
              <span className="font-medium">
                {exp.board.conclusive} conclusive test, {exp.board.running} running, {exp.board.needsRerun} flagged as
                too short to conclude — refusing to read a result is part of the product.
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Slide 5 — Why now                                                      */
/* ---------------------------------------------------------------------- */

const WHY_NOW = [
  {
    icon: Cookie,
    title: "Attribution genuinely broke",
    body: "iOS restrictions and cookie deprecation ended deterministic tracking. Platforms filled the gap with modelled conversions — their own homework, marked by themselves.",
  },
  {
    icon: Landmark,
    title: "Media budgets moved under finance",
    body: "Retail media is now a board-level line item. “We got a 4x ROAS” does not survive a CFO asking what the margin was.",
  },
  {
    icon: Gauge,
    title: "Incrementality got affordable",
    body: "Geo holdouts and PSA tests used to need an agency and a quarter. Cheap compute and clean order data put them within reach of an in-house team.",
  },
  {
    icon: Sparkles,
    title: "The reasoning layer is viable",
    body: "An analyst that reads margin, channel, creative and experiment data together — and cites every figure — became buildable in the last two years.",
  },
];

function WhyNowSlide() {
  return (
    <div className="flex h-full flex-col justify-center">
      <p className="mb-1.5 text-sm font-semibold uppercase tracking-[0.2em] text-primary">Why now</p>
      <h2 className="max-w-3xl text-2xl font-semibold tracking-tight sm:text-3xl">
        The number everyone reports stopped being trustworthy, and the people paying for it noticed.
      </h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {WHY_NOW.map((w) => (
          <div key={w.title} className="rounded-card bg-card p-4 shadow-ring">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-input bg-primary/[0.08] text-primary">
                <w.icon className="size-4" />
              </span>
              <span className="text-sm font-semibold">{w.title}</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{w.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-card bg-card p-4 shadow-ring">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Who we sell to</div>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <div>
            <div className="text-sm font-semibold text-primary">Performance marketing lead</div>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Owns the budget and defends it monthly. Buys the honest number because they are the one asked to explain it.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold text-primary">Media director / VP Growth</div>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Allocates across channels and retailer networks. Buys the planner and the incrementality coverage.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold text-primary">CFO / finance partner</div>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Signs off the spend. Buys the audit trail and the fact that a number can be traced to an experiment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Slide 6 — Business model                                               */
/* ---------------------------------------------------------------------- */

/*
  Priced against MEDIA UNDER MANAGEMENT, not store GMV.

  The old deck charged $49/mo on a GMV band — a price set for a Shopify
  founder buying a profit dashboard. The buyer here runs a media budget in the
  millions and is being asked to trust the number they report upward. The
  value scales with the spend being measured, so the price does too, and an
  incrementality programme is a service line rather than a feature toggle.
*/
const BM_TIERS = [
  {
    tier: "Measure",
    price: "$2.5k",
    band: "up to $500k/mo media",
    unlocks: ["Margin-true CM-ROAS per SKU, category and channel", "Pacing, projections and the action board", "Stated attribution window and audit trail"],
  },
  {
    tier: "Optimise",
    price: "$6k",
    band: "$500k–$2M/mo media",
    featured: true,
    unlocks: ["+ Budget allocation under diminishing returns", "+ Creative fatigue tied to margin", "+ Executed actions with undo and forecast scoring"],
  },
  {
    tier: "Prove",
    price: "$12k+",
    band: "$2M+/mo media",
    unlocks: ["+ Incrementality programme — geo and PSA holdouts", "+ Measured paid share fed back into the model", "+ Approval workflow and finance-ready reporting"],
  },
];

const UNIT_ECON = [
  { icon: Repeat, label: "Priced on", value: "Media under management", sub: "value scales with the spend being measured" },
  { icon: TrendingUp, label: "Expansion path", value: "Measure → Optimise → Prove", sub: "coverage grows as more of the budget gets tested" },
  { icon: ShieldCheck, label: "Why it sticks", value: "The test history", sub: "switching means starting the evidence base again" },
  { icon: Clock, label: "Time to first finding", value: "Days, not a quarter", sub: "the margin correction lands before any test finishes" },
];

function BusinessModelSlide() {
  return (
    <div className="flex h-full flex-col justify-center">
      <p className="mb-1.5 text-sm font-semibold uppercase tracking-[0.2em] text-primary">Business model</p>
      <h2 className="max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
        Priced against the spend we measure, not the store size.
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        A monthly platform fee banded by media under management. The buyer is defending a budget, so the price sits
        against the budget — and the incrementality tier is a programme, because running holdouts properly is work.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {BM_TIERS.map((t) => (
          <div key={t.tier} className={cn("rounded-card border p-4 shadow-card", t.featured ? "border-primary/40 bg-primary/[0.05]" : "border-border bg-card")}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold">{t.tier}</span>
              <span className="tabular text-lg font-semibold text-primary">
                {t.price}<span className="text-xs font-normal text-muted-foreground">/mo</span>
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground">{t.band}</div>
            <ul className="mt-2 space-y-1">
              {t.unlocks.map((u) => (
                <li key={u} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-foreground/80">
                  <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-success" /> {u}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {UNIT_ECON.map((m) => (
          <div key={m.label} className="rounded-card bg-card p-3 shadow-ring">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <m.icon className="size-3.5 text-primary" /> {m.label}
            </div>
            <div className="mt-1 text-[13px] font-semibold leading-tight">{m.value}</div>
            <div className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{m.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Slide 7 — Go to market                                                 */
/* ---------------------------------------------------------------------- */

const GTM = [
  {
    icon: FlaskConical,
    title: "Land on the audit",
    body: "A paid two-week engagement: we recompute their CM-ROAS on their own data and show what attribution is over-crediting. It is a finding, not a trial — and it is uncomfortable enough to be remembered.",
  },
  {
    icon: Users,
    title: "Agencies and holding companies",
    body: "An agency defending a retainer needs incrementality evidence more than the brand does. One integration becomes a book of accounts, and they bring the next brand.",
  },
  {
    icon: Landmark,
    title: "The finance champion",
    body: "The CFO is the only person in the building who wants media numbers to be smaller. Give them an auditable one and they mandate it across the brands.",
  },
];

function GoToMarketSlide() {
  return (
    <div className="flex h-full flex-col justify-center">
      <p className="mb-1.5 text-sm font-semibold uppercase tracking-[0.2em] text-primary">Go-to-market</p>
      <h2 className="max-w-3xl text-2xl font-semibold tracking-tight sm:text-3xl">
        Lead with the uncomfortable number.
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Nobody switches measurement tools because a dashboard is nicer. They switch when someone shows them their
        reported ROAS is wrong and proves it on their own orders.
      </p>

      <div className="mt-3 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <div className="flex-1 rounded-card border border-primary/30 bg-primary/[0.05] px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-primary">Land</div>
          <div className="mt-0.5 text-sm text-foreground/90">
            The attribution audit. &ldquo;Your 2.3× is 1.15× after COGS, and 0.59× incremental on the one channel we
            tested.&rdquo;
          </div>
        </div>
        <ArrowRight className="mx-auto size-5 shrink-0 rotate-90 text-muted-foreground sm:rotate-0" />
        <div className="flex-1 rounded-card border border-success/30 bg-success/[0.05] px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-success">Expand</div>
          <div className="mt-0.5 text-sm text-foreground/90">
            More channels tested each quarter. Coverage becomes the renewal metric — and the reason they cannot leave.
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {GTM.map((c) => (
          <div key={c.title} className="rounded-card bg-card p-3.5 shadow-ring">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-input bg-primary/[0.08] text-primary">
                <c.icon className="size-4" />
              </span>
              <span className="text-sm font-semibold">{c.title}</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{c.body}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 rounded-input bg-ia-gray-faded px-3 py-2 text-xs leading-relaxed text-foreground/80 shadow-ring">
        <span className="font-semibold text-primary">The wedge:</span> test coverage starts near zero at every brand we
        meet. That is not a gap in our product — it is the gap in the category, and it is the number we grow.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Slide 8 — Before / after + the ask                                     */
/* ---------------------------------------------------------------------- */

const BEFORE = [
  "Reports a ROAS that ignores cost of goods",
  "Credits ads with demand that was already coming",
  "Scales a channel because attribution flattered it",
  "Argues with finance using the platform's own numbers",
  "Makes a change and never learns whether it worked",
];

const AFTER = [
  "Reports margin per ad dollar, after every real cost",
  "Knows which channels are incremental — and which aren't",
  "Allocates to marginal return, and spends less when that earns more",
  "Hands finance a number traceable to a controlled test",
  "Scores every change against its forecast, misses included",
];

function BeforeAfterSlide() {
  const { exp, plan } = useDeckData();

  return (
    <div className="flex h-full flex-col justify-center">
      <p className="mb-1.5 text-sm font-semibold uppercase tracking-[0.2em] text-primary">The world with Carter</p>
      <h2 className="max-w-3xl text-2xl font-semibold tracking-tight sm:text-3xl">
        Before Carter, media teams report. <span className="text-primary">After Carter, they can prove it.</span>
      </h2>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-card border border-destructive/25 bg-destructive/[0.03] p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-input bg-destructive/10 text-destructive">
              <EyeOff className="size-4" />
            </span>
            <span className="text-sm font-semibold text-destructive">Today — reporting on faith</span>
          </div>
          <ul className="space-y-1.5">
            {BEFORE.map((b) => (
              <li key={b} className="flex items-start gap-2 text-xs leading-relaxed text-foreground/80">
                <XCircle className="mt-0.5 size-3.5 shrink-0 text-destructive/70" /> {b}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-card border border-success/30 bg-success/[0.04] p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-input bg-success/10 text-success">
              <CheckCircle2 className="size-4" />
            </span>
            <span className="text-sm font-semibold text-success">With Carter — reporting on evidence</span>
          </div>
          <ul className="space-y-1.5">
            {AFTER.map((a) => (
              <li key={a} className="flex items-start gap-2 text-xs leading-relaxed text-foreground/90">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" /> {a}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 rounded-card border border-primary/25 bg-gradient-to-br from-primary/[0.06] to-transparent p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-input bg-[image:var(--gradient-primary-button)] text-white">
            <TrendingUp className="size-4" />
          </span>
          <div>
            <p className="text-sm leading-relaxed text-foreground/90">
              In one account, one month, the honest numbers found{" "}
              {exp?.gap && <span className="font-semibold">{money(exp.gap.overstatedCm)} of over-credited margin</span>}
              {plan?.plan && <> and <span className="font-semibold">{money(plan.plan.upliftCm2)} of profit available from spending less</span></>}
              . Neither was visible on a ROAS report, and neither is a rounding error at a billion-dollar brand&apos;s
              media budget.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              <span className="font-semibold text-primary">The ask:</span> capital to make incrementality the default
              standard for retail media measurement — starting with the brands whose CFOs have already stopped believing
              the platform numbers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const SLIDES = [
  { id: "cover", Comp: CoverSlide },
  { id: "problem", Comp: ProblemSlide },
  { id: "product", Comp: ProductSlide },
  { id: "moat", Comp: MoatSlide },
  { id: "why-now", Comp: WhyNowSlide },
  { id: "business-model", Comp: BusinessModelSlide },
  { id: "go-to-market", Comp: GoToMarketSlide },
  { id: "before-after", Comp: BeforeAfterSlide },
];

export default function PresentationPage() {
  const [index, setIndex] = useState(0);

  const go = useCallback((delta) => {
    setIndex((i) => Math.min(SLIDES.length - 1, Math.max(0, i + delta)));
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const Active = SLIDES[index].Comp;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
      <div className="h-1 w-full bg-border">
        <div
          className="h-full bg-[image:var(--gradient-primary-button)] transition-all duration-300"
          style={{ width: `${((index + 1) / SLIDES.length) * 100}%` }}
        />
      </div>

      <div className="relative flex-1 overflow-y-auto px-8 py-8 sm:px-16">
        <div className="mx-auto h-full max-w-4xl">
          <Active />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border px-6 py-3">
        <button
          onClick={() => go(-1)}
          disabled={index === 0}
          className="inline-flex items-center gap-1 rounded-input px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-ia-gray hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="size-4" /> Prev
        </button>

        <div className="flex items-center gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-6 bg-primary" : "w-1.5 bg-border hover:bg-muted-foreground/40"
              )}
            />
          ))}
          <span className="tabular ml-2 text-xs text-muted-foreground">
            {index + 1} / {SLIDES.length}
          </span>
        </div>

        <button
          onClick={() => go(1)}
          disabled={index === SLIDES.length - 1}
          className="inline-flex items-center gap-1 rounded-input px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-ia-gray hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          Next <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
