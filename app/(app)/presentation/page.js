"use client";

import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  EyeOff,
  History,
  Megaphone,
  MinusCircle,
  MousePointerClick,
  Package,
  PackageX,
  Percent,
  Repeat,
  Smartphone,
  Sparkles,
  Store,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import Link from "next/link";
import { cn } from "@/lib/utils";

// Shared arrow marker — context-stroke lets every path/line color its own
// arrowhead, so one <defs> block works across every diagram on the deck.
function ArrowDefs() {
  return (
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </marker>
      <linearGradient id="aiGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#ea580c" />
      </linearGradient>
    </defs>
  );
}

/* ---------------------------------------------------------------------- */
/* Slide 1 — Cover                                                        */
/* ---------------------------------------------------------------------- */

function PipelineStrip() {
  const steps = [
    { label: "Shopify + Ads + Costs", color: "#78716c" },
    { label: "True Profit Engine", color: "#ea580c" },
    { label: "5 Connected Questions", color: "#8b5cf6" },
    { label: "One Answer", color: "#16a34a" },
  ];
  return (
    <svg viewBox="0 0 860 90" width="100%" className="mt-2" role="img" aria-label="Data flows from Shopify, ads, and costs through the profit engine to one answer">
      <ArrowDefs />
      {steps.map((s, i) => {
        const w = 190;
        const gap = 20;
        const x = i * (w + gap) + 10;
        return (
          <g key={s.label}>
            <rect x={x} y={20} width={w} height={50} rx={10} fill={`${s.color}1a`} stroke={s.color} strokeWidth="1.2" />
            <text x={x + w / 2} y={49} textAnchor="middle" fontSize="12.5" fontWeight="600" fill={s.color}>
              {s.label}
            </text>
            {i < steps.length - 1 && (
              <line x1={x + w + 2} y1={45} x2={x + w + gap - 2} y2={45} stroke="#a8a29e" strokeWidth="1.5" markerEnd="url(#arrow)" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

// Two relatable founder stories — the major problems Tally solves, in the
// customer's own voice. Each pairs the felt pain with the hidden cause.
const STORIES = [
  {
    quote: "“Sales were up 30% — so why was there less money in the bank?”",
    reveal: "Her best-seller lost money on every order after ad spend — and nothing flagged it.",
    who: "Maya · DTC founder",
  },
  {
    quote: "“Meta showed a 5× ROAS, so I doubled the budget.”",
    reveal: "That number ignored product cost, shipping and returns — the SKU was below break-even.",
    who: "Devin · Growth lead",
  },
];

function CoverSlide() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <span className="mb-6 grid size-20 place-items-center rounded-[28px] bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-xl shadow-orange-600/20">
        <Sparkles className="size-9" />
      </span>
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary">Tally</p>
      <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
        The Financial Operating System <span className="text-primary">for Shopify Brands</span>
      </h1>
      <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
        Tally is a financial operating system for Shopify brands that reveals the true, fully-loaded profit of every product — after COGS, shipping, returns, and ad spend — so founders can see which products actually make money and which are quietly bleeding cash.
      </p>
      <div className="mt-6 w-full max-w-3xl">
        <PipelineStrip />
      </div>
      <div className="mt-7 grid w-full max-w-2xl gap-3 text-left sm:grid-cols-2">
        {STORIES.map((s) => (
          <div key={s.who} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-sm font-medium leading-snug text-foreground">{s.quote}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{s.reveal}</p>
            <p className="mt-2.5 text-[11px] font-semibold uppercase tracking-wide text-primary">{s.who}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Slide 2 — Problem + Solution (the connected-decisions diagram)         */
/* ---------------------------------------------------------------------- */

const PROBLEMS = [
  { icon: EyeOff, title: "Profit is a guess" },
  { icon: TrendingDown, title: "Ads lie by omission" },
  { icon: MousePointerClick, title: "Traffic leaks unseen" },
  { icon: PackageX, title: "Stockouts sneak up" },
  { icon: Wallet, title: "Cash surprises are costly" },
];

// Five pillars, evenly laid out across the 860-wide canvas (w=152, step=167).
const PILLAR_BOXES = [
  { x: 20, label: "Margin", sub: "true CM per SKU", fill: "#e0f2fe", stroke: "#0ea5e9", text: "#075985" },
  { x: 187, label: "Ads", sub: "CM-ROAS, not vanity", fill: "#ede9fe", stroke: "#8b5cf6", text: "#5b21b6" },
  { x: 354, label: "Website", sub: "views → cart → sale", fill: "#fce7f3", stroke: "#ec4899", text: "#9d174e" },
  { x: 521, label: "Supply", sub: "stock & lead time", fill: "#d1fae5", stroke: "#10b981", text: "#065f46" },
  { x: 688, label: "Cash", sub: "what you can afford", fill: "#fef3c7", stroke: "#f59e0b", text: "#78350f" },
];

// Compact connected-loop diagram — tightened vertical rhythm so it fits
// alongside the problem strip on one slide, without losing any beat.
function ConnectedLoopDiagram() {
  return (
    <svg viewBox="0 0 860 380" width="100%" role="img" aria-label="Shopify, ad, and cost data feed a profit engine; margin, ads, supply, and cash are read together with cash capping ad spend, feeding Tally which returns one answer">
      <ArrowDefs />

      {/* Inputs */}
      {[
        { x: 20, label: "Shopify: orders & sales" },
        { x: 300, label: "Ad platforms: Meta / Google / TikTok" },
        { x: 580, label: "You: real costs & ops data" },
      ].map((b) => (
        <g key={b.label}>
          <rect x={b.x} y={8} width={260} height={40} rx={9} fill="#f5f5f4" stroke="#a8a29e" strokeWidth="1" />
          <text x={b.x + 130} y={33} textAnchor="middle" fontSize="11.5" fontWeight="600" fill="#57534e">
            {b.label}
          </text>
        </g>
      ))}
      <line x1="150" y1="48" x2="150" y2="78" stroke="#a8a29e" strokeWidth="1.5" markerEnd="url(#arrow)" />
      <line x1="430" y1="48" x2="430" y2="78" stroke="#a8a29e" strokeWidth="1.5" markerEnd="url(#arrow)" />
      <line x1="710" y1="48" x2="710" y2="78" stroke="#a8a29e" strokeWidth="1.5" markerEnd="url(#arrow)" />

      {/* Engine */}
      <rect x={20} y={80} width={820} height={46} rx={12} fill="#ffedd5" stroke="#ea580c" strokeWidth="1.3" />
      <text x={430} y={101} textAnchor="middle" fontSize="13.5" fontWeight="700" fill="#9a3412">
        True Profit Engine
      </text>
      <text x={430} y={118} textAnchor="middle" fontSize="10.5" fill="#9a3412">
        CM1 → CM2 → CM3 — your true profit, built from your real costs
      </text>
      <line x1="430" y1="126" x2="430" y2="158" stroke="#a8a29e" strokeWidth="1.5" markerEnd="url(#arrow)" />

      <text x={430} y={154} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#78716c">
        Read together, every time
      </text>

      {/* Pillars */}
      {PILLAR_BOXES.map((p) => (
        <g key={p.label}>
          <rect x={p.x} y={162} width={152} height={62} rx={12} fill={p.fill} stroke={p.stroke} strokeWidth="1.3" />
          <text x={p.x + 76} y={190} textAnchor="middle" fontSize="13.5" fontWeight="700" fill={p.text}>
            {p.label}
          </text>
          <text x={p.x + 76} y={208} textAnchor="middle" fontSize="10.5" fill={p.text}>
            {p.sub}
          </text>
        </g>
      ))}

      {/* Feedback bracket: Cash caps Ads — a right-angle connector under the pillar row */}
      <path d="M 764 224 L 764 234 L 263 234 L 263 224" fill="none" stroke="#f59e0b" strokeWidth="1.6" strokeDasharray="5 4" markerEnd="url(#arrow)" />
      <rect x={418} y={238} width={190} height={18} rx={5} fill="#fbf8f3" />
      <text x={513} y={251} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#b45309">
        cash caps ad spend
      </text>

      <line x1="430" y1="262" x2="430" y2="288" stroke="#a8a29e" strokeWidth="1.5" markerEnd="url(#arrow)" />

      {/* Tally */}
      <rect x={260} y={290} width={340} height={48} rx={14} fill="url(#aiGrad)" />
      <text x={430} y={311} textAnchor="middle" fontSize="13.5" fontWeight="700" fill="#ffffff">
        Tally
      </text>
      <text x={430} y={328} textAnchor="middle" fontSize="10.5" fill="#ffedd5">
        Reasons across all four — cites every number, never guesses
      </text>

      <line x1="430" y1="338" x2="430" y2="352" stroke="#a8a29e" strokeWidth="1.5" markerEnd="url(#arrow)" />

      {/* Answer */}
      <rect x={180} y={355} width={500} height={22} rx={11} fill="#dcfce7" stroke="#16a34a" strokeWidth="1.3" />
      <text x={430} y={370} textAnchor="middle" fontSize="12" fontWeight="700" fill="#14532d">
        One clear, executable, cited answer
      </text>
    </svg>
  );
}

function ProblemSolutionSlide() {
  return (
    <div className="flex h-full flex-col justify-center">
      <p className="mb-1.5 text-sm font-semibold uppercase tracking-[0.2em] text-primary">Problem → solution</p>
      <h2 className="max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
        Your true profit per product is invisible.
      </h2>

      <div className="mt-3 flex flex-wrap gap-2">
        {PROBLEMS.map((p) => (
          <span key={p.title} className="inline-flex items-center gap-1.5 rounded-full border border-destructive/25 bg-destructive/[0.05] px-3 py-1.5 text-xs font-medium text-destructive">
            <p.icon className="size-3.5" /> {p.title}
          </span>
        ))}
      </div>

      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        It starts with the number nobody trusts — true profit per SKU after ad spend — then joins ads, website, supply, and cash in one engine. No competitor connects them, so nobody else can safely answer "should I scale this?"
      </p>

      <div className="mt-4">
        <ConnectedLoopDiagram />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Slide 3 — Product + Market                                             */
/* ---------------------------------------------------------------------- */

// Plain-English value — what Tally actually tells a founder, one line per
// connected pillar (includes the website / conversion read).
const ANSWERS = [
  { icon: Package, q: "Which products actually make money?" },
  { icon: Megaphone, q: "Which ads pay for themselves?" },
  { icon: MousePointerClick, q: "Where does my website lose shoppers?" },
  { icon: PackageX, q: "What's about to run out of stock?" },
  { icon: Wallet, q: "Can I afford to reorder — and when?" },
];

function MarketFunnel() {
  return (
    <svg viewBox="0 0 860 160" width="100%" role="img" aria-label="Who it's for: every Shopify brand doing 500 thousand to 10 million a year, narrowing to those who can't see their true per-product profit">
      <rect x="20" y="10" width="820" height="130" rx="14" fill="#ffedd5" stroke="#ea580c" strokeWidth="1.3" />
      <rect x="150" y="45" width="560" height="90" rx="14" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.3" />
      <rect x="280" y="75" width="300" height="50" rx="14" fill="#fecaca" stroke="#ef4444" strokeWidth="1.3" />
      <text x="430" y="30" textAnchor="middle" fontSize="13" fontWeight="700" fill="#9a3412">Every Shopify brand doing $500K–$10M a year</text>
      <text x="430" y="48" textAnchor="middle" fontSize="10.5" fill="#9a3412">a $2B+ market</text>
      <text x="430" y="70" textAnchor="middle" fontSize="12" fontWeight="700" fill="#78350f">…that already pay for an analytics or profit tool</text>
      <text x="430" y="103" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#7f1d1d">…and still can't see their true profit — we start here</text>
    </svg>
  );
}

const PRICING = [
  { tier: "Core", price: "$49/mo", band: "$500K–$1M in sales" },
  { tier: "Growth", price: "$99/mo", band: "$1M–$3M in sales" },
  { tier: "Operate", price: "$249/mo", band: "$3M–$10M+ in sales" },
];

function ProductMarketSlide() {
  return (
    <div className="flex h-full flex-col justify-center">
      <p className="mb-1.5 text-sm font-semibold uppercase tracking-[0.2em] text-primary">The product · live today</p>
      <h2 className="max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
        Every money question, answered in one place.
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Connect your store and ad accounts — Tally turns the numbers into plain answers you can act on. The core is live today.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {ANSWERS.map((a) => (
          <div key={a.q} className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2 shadow-sm">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/[0.08] text-primary">
              <a.icon className="size-4" />
            </span>
            <span className="text-sm font-medium text-foreground/90">{a.q}</span>
          </div>
        ))}
        <Link
          href="/insights"
          className="flex items-center justify-center gap-1 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
        >
          Enter the live product <ArrowRight className="size-4" />
        </Link>
      </div>

      <p className="mt-3 rounded-lg border border-border bg-black/[0.02] px-3 py-2 text-xs text-foreground/80">
        <span className="font-semibold text-primary">Website example:</span> in the demo store only <span className="font-semibold">3.6%</span> of visitors buy — Tally shows which products lose the most shoppers between view → cart → checkout.
      </p>

      <div className="mt-3">
        <MarketFunnel />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {PRICING.map((p, i) => (
          <div key={p.tier} className={cn("rounded-xl border px-4 py-3 shadow-sm", i === 1 ? "border-primary/40 bg-primary/[0.05]" : "border-border bg-card")}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold">{p.tier}</span>
              <span className="tabular text-base font-semibold text-primary">{p.price}</span>
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">{p.band}</div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground/70">Our plan:</span> 500 stores in year one → 2,000 → 10,000 stores ($5M a year in revenue).
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Slide 4 — Moat + Roadmap + Ask                                         */
/* ---------------------------------------------------------------------- */

const CAP_ROWS = [
  { cap: "True profit for every product", tally: "full", tw: "partial", sh: "full", nb: "none" },
  { cap: "Ad results by profit, not just revenue", tally: "full", tw: "none", sh: "partial", nb: "none" },
  { cap: "Where the website loses shoppers", tally: "full", tw: "partial", sh: "none", nb: "none" },
  { cap: "Advice that knows your stock & cash", tally: "full", tw: "none", sh: "none", nb: "none" },
  { cap: "Predicts your cash ahead of time", tally: "full", tw: "none", sh: "none", nb: "none" },
  { cap: "One AI that reads all of it together", tally: "full", tw: "partial", sh: "none", nb: "none" },
  { cap: "Detailed ad attribution", tally: "partial", tw: "full", sh: "partial", nb: "full" },
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

// The opportunity band — moved here from the cover to close on the numbers.
const STATS = [
  { label: "Market size", value: "$2B+" },
  { label: "Who it's for", value: "$500K–$10M brands" },
  { label: "Starting price", value: "$49/mo" },
  { label: "Cost to run our AI", value: "$0" },
];

function MoatRoadmapSlide() {
  return (
    <div className="flex h-full flex-col justify-center">
      <p className="mb-1.5 text-sm font-semibold uppercase tracking-[0.2em] text-primary">Why we win</p>
      <h2 className="max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
        Our edge is the whole picture — not one feature.
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Each rival only sees one piece. To copy us, they'd have to rebuild everything from the ground up.
      </p>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-black/[0.015]">
              <th className="p-2.5 text-left text-[11px] font-semibold text-muted-foreground">Capability</th>
              <th className="p-2.5 text-[11px] font-semibold text-primary">Tally</th>
              <th className="p-2.5 text-[11px] font-semibold text-muted-foreground">Triple Whale</th>
              <th className="p-2.5 text-[11px] font-semibold text-muted-foreground">StoreHero</th>
              <th className="p-2.5 text-[11px] font-semibold text-muted-foreground">Northbeam</th>
            </tr>
          </thead>
          <tbody>
            {CAP_ROWS.map((r) => (
              <tr key={r.cap} className="border-b border-border last:border-0">
                <td className="p-2.5 text-xs text-foreground/80">{r.cap}</td>
                <td className="p-2.5 text-center"><CapabilityCell v={r.tally} /></td>
                <td className="p-2.5 text-center"><CapabilityCell v={r.tw} /></td>
                <td className="p-2.5 text-center"><CapabilityCell v={r.sh} /></td>
                <td className="p-2.5 text-center"><CapabilityCell v={r.nb} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-foreground/80">
        Only Tally closes the loop across margin, ads, website, supply, and cash — at a fraction of the price.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card px-4 py-2.5 text-left shadow-sm">
            <div className="tabular text-lg font-semibold text-foreground">{s.value}</div>
            <div className="text-[11px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Deck shell                                                             */
/* ---------------------------------------------------------------------- */

/* ====================================================================== */
/* Slides 5–8 — the investor half (market · model · GTM · roadmap+ask)     */
/* Every figure is grounded in credes/PRD.md; modelled targets are labelled */
/* ====================================================================== */

/* ---------------------------------------------------------------------- */
/* Slide 5 — Market opportunity & why now                                 */
/* ---------------------------------------------------------------------- */

const WHY_NOW = [
  { icon: Smartphone, title: "Attribution broke", body: "iOS privacy killed platform tracking. Merchants need owned-data profit truth, not pixel guesses." },
  { icon: Banknote, title: "Capital got expensive", body: "Cheap growth is over. Runway discipline is existential — every dollar of spend has to earn real margin." },
  { icon: Sparkles, title: "AI is finally ready", body: "LLMs make a genuine reasoning layer over messy financial data viable for the first time." },
  { icon: History, title: "Unsolved, not saturated", body: "Brightflow AI proved the demand — then died on execution. The space is wide open." },
];

const MARKET_TIERS = [
  { label: "TAM", value: "$2B+", w: 100, tint: "#ffedd5", stroke: "#ea580c", text: "#9a3412", desc: "Every Shopify brand doing $500K–$10M a year" },
  { label: "SAM", value: "~$600M", w: 66, tint: "#fef3c7", stroke: "#f59e0b", text: "#78350f", desc: "Already pay for a profit / analytics tool" },
  { label: "SOM", value: "~$120M", w: 34, tint: "#fee2e2", stroke: "#ef4444", text: "#7f1d1d", desc: "Our 3-yr wedge: margin-blind SKU sellers" },
];

function MarketOpportunitySlide() {
  return (
    <div className="flex h-full flex-col justify-center">
      <p className="mb-1.5 text-sm font-semibold uppercase tracking-[0.2em] text-primary">Market opportunity</p>
      <h2 className="max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">A $2B+ market that just became urgent.</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Shopify merchants trust margins that run <span className="font-medium text-destructive">15–30% too optimistic</span> — and four shifts just made getting the real number non-optional.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_1fr] lg:items-center">
        <div className="grid gap-2.5 sm:grid-cols-2">
          {WHY_NOW.map((w) => (
            <div key={w.title} className="rounded-xl border border-border bg-card p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-lg bg-primary/[0.08] text-primary"><w.icon className="size-4" /></span>
                <span className="text-sm font-semibold">{w.title}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{w.body}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2.5 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Market sizing</div>
          {MARKET_TIERS.map((t) => (
            <div key={t.label}>
              <div className="text-xs font-semibold" style={{ color: t.text }}>{t.label} · <span className="tabular">{t.value}</span></div>
              <div className="mt-1 rounded-lg border px-3 py-2" style={{ width: `${t.w}%`, background: t.tint, borderColor: t.stroke }}>
                <span className="text-[11px] font-medium" style={{ color: t.text }}>{t.desc}</span>
              </div>
            </div>
          ))}
          <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">Bottom-up: 10,000 merchants on our plans → the $5M ARR Phase-3 target — under 1% of the SAM.</p>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Slide 6 — Business model & unit economics                              */
/* ---------------------------------------------------------------------- */

const BM_TIERS = [
  { tier: "Core", tagline: "Profit Truth", price: "$49", band: "$500K–$1M GMV", unlocks: ["True CM1/2/3 per SKU", "Heroes & Anchors · CM-ROAS", "3 alerts + read-only AI"] },
  { tier: "Growth", tagline: "Optimize", price: "$99", band: "$1M–$3M GMV", featured: true, unlocks: ["+ Ad-spend optimization", "+ Demand/supply forecasting", "+ Reallocation recs"] },
  { tier: "Operate", tagline: "Run it", price: "$249", band: "$3M–$10M+ GMV", unlocks: ["+ Cash-flow forecasting", "+ Agentic actions", "+ QBO/Xero sync · exports"] },
];

const UNIT_ECON = [
  { icon: Percent, label: "Gross margin", value: "~90%", sub: "SaaS; AI cost held down by model-routing + caching" },
  { icon: TrendingUp, label: "LTV : CAC", value: "6–8×", sub: "App Store distribution keeps CAC low" },
  { icon: Clock, label: "CAC payback", value: "< 4 mo", sub: "monthly subscription recovers fast" },
  { icon: Repeat, label: "Net revenue retention", value: "≥ 110%", sub: "GMV-band upgrades grow accounts" },
];

function BusinessModelSlide() {
  return (
    <div className="flex h-full flex-col justify-center">
      <p className="mb-1.5 text-sm font-semibold uppercase tracking-[0.2em] text-primary">Business model</p>
      <h2 className="max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">SaaS margins, priced to the value we unlock.</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        A GMV-banded subscription via Shopify Billing — not per-seat. Priced as a fraction of the bookkeeping we eliminate and the cash we recover, so it expands as the merchant grows.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {BM_TIERS.map((t) => (
          <div key={t.tier} className={cn("rounded-xl border p-4 shadow-sm", t.featured ? "border-primary/40 bg-primary/[0.05]" : "border-border bg-card")}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold">{t.tier}</span>
              <span className="tabular text-lg font-semibold text-primary">{t.price}<span className="text-xs font-normal text-muted-foreground">/mo</span></span>
            </div>
            <div className="text-[11px] text-muted-foreground">{t.tagline} · {t.band}</div>
            <ul className="mt-2 space-y-1">
              {t.unlocks.map((u) => (
                <li key={u} className="flex items-start gap-1.5 text-[11px] text-foreground/80"><CheckCircle2 className="mt-0.5 size-3 shrink-0 text-success" /> {u}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Target unit economics</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-4">
        {UNIT_ECON.map((m) => (
          <div key={m.label} className="rounded-xl border border-border bg-card p-3 shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><m.icon className="size-3.5 text-primary" /> {m.label}</div>
            <div className="tabular mt-1 text-xl font-semibold">{m.value}</div>
            <div className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{m.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Slide 7 — Go-to-market & distribution                                  */
/* ---------------------------------------------------------------------- */

const GTM_CHANNELS = [
  { icon: Store, title: "Shopify App Store", body: "One-click OAuth install into millions of merchants — built-in, low-CAC distribution from day one." },
  { icon: Users, title: "Agencies & fractional CFOs", body: "Priya manages 5–50 brands. A multi-brand console turns one signup into a whole book of business." },
  { icon: Repeat, title: "The accountant loop", body: "Every reconciled, one-click export makes the bookkeeper the champion — who brings the next brands." },
];

const ACTIVATION = [
  { value: "< 10 min", label: "To first insight" },
  { value: "40%", label: "See a losing hero, session 1" },
  { value: "30%", label: "Full COGS within 7 days" },
  { value: "≥ 85%", label: "Month-3 retention" },
];

function GoToMarketSlide() {
  return (
    <div className="flex h-full flex-col justify-center">
      <p className="mb-1.5 text-sm font-semibold uppercase tracking-[0.2em] text-primary">Go-to-market</p>
      <h2 className="max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">Distribution is built in. Land on truth, expand to the OS.</h2>

      {/* land → expand motion */}
      <div className="mt-3 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <div className="flex-1 rounded-xl border border-primary/30 bg-primary/[0.05] px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-primary">Land</div>
          <div className="mt-0.5 text-sm text-foreground/90">The 10-minute reveal — "your bestseller loses money." Instant, undeniable value.</div>
        </div>
        <ArrowRight className="mx-auto size-5 shrink-0 rotate-90 text-muted-foreground sm:rotate-0" />
        <div className="flex-1 rounded-xl border border-success/30 bg-success/[0.05] px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-success">Expand</div>
          <div className="mt-0.5 text-sm text-foreground/90">Core → Growth → Operate as GMV grows. Accounts expand themselves — NRR ≥ 110%.</div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {GTM_CHANNELS.map((c) => (
          <div key={c.title} className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-primary/[0.08] text-primary"><c.icon className="size-4" /></span>
              <span className="text-sm font-semibold">{c.title}</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{c.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ACTIVATION.map((a) => (
          <div key={a.label} className="rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm">
            <div className="tabular text-lg font-semibold text-foreground">{a.value}</div>
            <div className="text-[11px] leading-tight text-muted-foreground">{a.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Slide 8 — Before vs after Tally (the world we create)                  */
/* ---------------------------------------------------------------------- */

const BEFORE = [
  "Trusts margins that are 15–30% too high",
  "Scales “bestsellers” that secretly lose money",
  "Chases vanity ROAS — and spends into losses",
  "Cash is a mystery until it's a crisis",
  "Answers buried in 5 spreadsheets, reconciled monthly",
];

const AFTER = [
  "Knows the true, fully-loaded profit of every product",
  "Scales only real winners — kills the hidden losers",
  "Puts every ad dollar where it earns profit, not revenue",
  "Sees cash tighten weeks ahead — grows with confidence",
  "One cited answer — decisions in minutes, not months",
];

function BeforeAfterSlide() {
  return (
    <div className="flex h-full flex-col justify-center">
      <p className="mb-1.5 text-sm font-semibold uppercase tracking-[0.2em] text-primary">The world with Tally</p>
      <h2 className="max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
        Before Tally, brands guess. <span className="text-primary">After Tally, they know.</span>
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        This isn't a nicer dashboard — it's a new operating standard for how a Shopify brand is run.
      </p>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-destructive/25 bg-destructive/[0.03] p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-destructive/10 text-destructive"><EyeOff className="size-4" /></span>
            <span className="text-sm font-semibold text-destructive">Today — flying blind</span>
          </div>
          <ul className="space-y-1.5">
            {BEFORE.map((b) => (
              <li key={b} className="flex items-start gap-2 text-xs leading-relaxed text-foreground/80"><XCircle className="mt-0.5 size-3.5 shrink-0 text-destructive/70" /> {b}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-success/30 bg-success/[0.04] p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-success/10 text-success"><CheckCircle2 className="size-4" /></span>
            <span className="text-sm font-semibold text-success">With Tally — in control</span>
          </div>
          <ul className="space-y-1.5">
            {AFTER.map((a) => (
              <li key={a} className="flex items-start gap-2 text-xs leading-relaxed text-foreground/90"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" /> {a}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.06] to-transparent p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 text-white"><TrendingUp className="size-4" /></span>
          <div>
            <p className="text-sm font-medium text-foreground/90">
              Brands stop bleeding hidden losses and start compounding profit — so they grow, stay, and spend more with us as they scale (<span className="font-semibold">NRR ≥ 110%</span>). That's the flywheel.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              <span className="font-semibold text-primary">The ask:</span> seed capital to make profit-truth the default for <span className="font-semibold text-foreground">2,000 merchants in 18 months</span> — on the path to <span className="font-semibold text-foreground">$5M ARR</span> and becoming the financial OS every Shopify brand runs on.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const SLIDES = [
  { id: "cover", Comp: CoverSlide },
  { id: "problem-solution", Comp: ProblemSolutionSlide },
  { id: "product-market", Comp: ProductMarketSlide },
  { id: "moat-roadmap", Comp: MoatRoadmapSlide },
  { id: "market", Comp: MarketOpportunitySlide },
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
      {/* progress bar */}
      <div className="h-1 w-full bg-border">
        <div
          className="h-full bg-gradient-to-r from-amber-400 to-orange-600 transition-all duration-300"
          style={{ width: `${((index + 1) / SLIDES.length) * 100}%` }}
        />
      </div>

      <div className="relative flex-1 overflow-y-auto px-8 py-8 sm:px-16">
        <div className="mx-auto h-full max-w-4xl">
          <Active />
        </div>
      </div>

      {/* controls */}
      <div className="flex items-center justify-between border-t border-border px-6 py-3">
        <button
          onClick={() => go(-1)}
          disabled={index === 0}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-black/[0.04] hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
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
          <span className="ml-2 text-xs tabular text-muted-foreground">
            {index + 1} / {SLIDES.length}
          </span>
        </div>

        <button
          onClick={() => go(1)}
          disabled={index === SLIDES.length - 1}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-black/[0.04] hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          Next <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
