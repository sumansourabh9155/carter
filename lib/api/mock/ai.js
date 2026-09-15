// Carter — canned but structured answers to the hard, cross-domain questions
// DTC founders actually ask. The facade reveals these on a timer to feel like
// streaming; the content is deterministic, cited, and honest about confidence.
//
// Every answer reasons across more than one data source (margin + ads + stock +
// cash) — the whole point: no single dashboard number answers these.

import { allProducts } from "@/lib/api/mock/products";
import { QUADRANT_META } from "@/lib/compute/margin";
import { money, pct, multiple } from "@/lib/format";

const ANSWERS = [
  {
    id: "keep",
    match: ["actually keeping", "what am i keeping", "margins look healthy", "where's the cash", "where is the cash", "what did i actually make", "actually making per order", "take home", "after everything"],
    steps: ["Rebuilding the full P&L waterfall…", "Loading every cost layer Shopify hides…"],
    answer:
      "Your gross margin looks healthy, but after **every** cost is loaded in you're keeping **$88,990 — 24.5% (CM3)** this period. The gap opens in two places: ad spend and overhead.",
    bullets: [
      "CM1 (after COGS, shipping, fees, returns): **$179,994 · 49.6%**",
      "CM2 (after ad spend): **$125,287 · 34.5%**",
      "CM3 (after overhead): **$88,990 · 24.5%**",
      "One product — Recovery Slides — is quietly dragging this down (−$338).",
    ],
    metrics: [{ label: "CM1", value: "49.6%" }, { label: "CM2", value: "34.5%" }, { label: "CM3", value: "24.5%" }],
    citations: [{ label: "Dashboard → waterfall", href: "/dashboard" }, { label: "Products", href: "/products" }],
    confidence: "High", freshness: "Computed from orders synced 8 min ago",
  },
  {
    id: "losing",
    match: ["quietly losing", "losing me money", "losing money", "returns and ads", "secretly", "which products lose", "unprofitable", "bleeding", "worst product"],
    steps: ["Computing CM1 → CM2 per SKU…", "Allocating returns + ad spend down to the product…"],
    answer:
      "**Recovery Slides** is the one quietly losing money. After returns and ads its CM2 is **−$338/mo (−$0.78 per order)** — every unit sold at the current ad budget destroys value. One more to watch: **Yoga Flow Tank's** margin is *estimated* (no real COGS yet), so treat it as uncertain.",
    bullets: ["Cut Recovery Slides' ads, or raise price ≥ $4", "Add real COGS for Yoga Flow Tank to trust its margin"],
    metrics: [{ label: "Slides CM2", value: "−$338" }, { label: "Per order", value: "−$0.78" }, { label: "Slides CM1", value: "16%" }],
    citations: [{ label: "Recovery Slides → breakdown", href: "/products/p6" }, { label: "Add COGS", href: "/data-collection" }],
    confidence: "High", freshness: "Computed from orders synced 8 min ago",
  },
  {
    id: "ads-overall",
    match: ["making money overall", "ad spend actually", "meta and tiktok", "platforms claim", "is my advertising", "ads actually making", "claim wins", "double count", "double-count", "advertising actually"],
    steps: ["Summing spend across Meta + Google + TikTok…", "Reconciling platform claims against real Shopify revenue…"],
    answer:
      "Your platforms together take more credit than your bank shows — classic double-counting. Reconciled against real revenue, your **blended CM-ROAS is ~1.7×** (profit per ad dollar). Positive overall, but two campaigns are below the **1.0× break-even** and dragging it down.",
    bullets: ["Meta TOF Lookalike: **0.8× CM-ROAS** — losing money", "TikTok TopView: **0.8×** — losing money", "Move that budget to Meta Retargeting (**2.4×**)"],
    metrics: [{ label: "Blended CM-ROAS", value: "1.7×" }, { label: "Meta", value: "1.7×" }, { label: "Google", value: "2.0×" }, { label: "TikTok", value: "1.15×" }],
    citations: [{ label: "Marketing → channels", href: "/marketing" }],
    confidence: "Medium", freshness: "Ad data restates for ~24h — directional",
  },
  {
    id: "breakeven",
    match: ["lowest roas", "minimum roas", "before i'm losing", "before i am losing", "losing money on a sale", "break-even roas", "scalable", "lowest i can run"],
    steps: ["Deriving break-even from each SKU's contribution margin…"],
    answer:
      "Break-even is **1.0× CM-ROAS** — a dollar of margin per dollar spent. But the revenue-ROAS you see in ad managers depends on each product's margin: **Cloud 7** (61% CM1) breaks even at ~**1.6×**, while **Recovery Slides** (16% CM1) needs ~**6.2×** just to not lose money — and it's running 5.0×, which is exactly why it's underwater.",
    bullets: ["High-margin SKUs can scale at lower ROAS", "Low-margin SKUs need a much higher ROAS — or shouldn't be advertised"],
    metrics: [{ label: "Break-even", value: "1.0× CM-ROAS" }, { label: "Cloud 7", value: "~1.6× rev ROAS" }, { label: "Slides", value: "~6.2× rev ROAS" }],
    citations: [{ label: "Products → margins", href: "/products" }],
    confidence: "High", freshness: "From your current per-SKU margins",
  },
  {
    id: "scale-cloud7",
    match: ["scale cloud", "afford to scale", "stock and the cash", "stock and cash", "do i have the stock", "scale my best", "scale cloud 7", "afford to scale cloud"],
    steps: ["Checking Cloud 7 margin & marginal CM-ROAS…", "Cross-checking days of stock vs lead time…", "Estimating the cash to back it…"],
    answer:
      "Margin says yes — **Cloud 7 is a 61% CM1 Hero at 4.1× CM-ROAS**. But you'd **stock out first**: ~**16 days of stock** against a **35-day** supplier lead time. Scaling ads now sends traffic to a page that goes out of stock mid-flight. **Reorder first, then scale.**",
    bullets: ["Place the reorder now (MOQ 300 ≈ $2,928; ~$878 deposit today)", "Then scale Meta ASC on Cloud 7", "Don't scale into a stockout — it wastes the ad spend that created the demand"],
    metrics: [{ label: "CM1", value: "61%" }, { label: "CM-ROAS", value: "4.1×" }, { label: "Days of stock", value: "16" }, { label: "Lead time", value: "35d" }],
    citations: [{ label: "Cloud 7 → breakdown", href: "/products/p2" }, { label: "Reorder data", href: "/data-collection" }],
    confidence: "High on margin & stock", freshness: "Cash impact is directional — bank connects in Phase 2",
  },
  {
    id: "reorder-vs-ads",
    match: ["reorder inventory now or", "or put that cash into ads", "fund both", "inventory now or", "ads or inventory", "reorder or ads", "can't fully fund both", "cant fully fund both"],
    steps: ["Comparing the two cash cycles…", "Checking stockout risk on both sides…"],
    answer:
      "**Reorder first.** Two sellers are about to stock out — **Recovery Slides (~4 days)** and **Cloud 7 (~16 days)** — against 30–35 day lead times. Ad dollars you push now return over 30–60 days, but a stockout wastes them immediately. Commit the POs against confirmed stock, *then* scale ads into what you can actually fulfil.",
    bullets: ["Reorder Cloud 7 now (it's a profitable Hero)", "Do NOT reorder Recovery Slides — let it sell down (it loses money)", "Scale ads only on SKUs with confirmed inbound stock"],
    metrics: [{ label: "Cloud 7 cover", value: "16d" }, { label: "Slides cover", value: "4d" }, { label: "Lead time", value: "30–35d" }],
    citations: [{ label: "Supply data", href: "/data-collection" }, { label: "Products", href: "/products" }],
    confidence: "High", freshness: "From on-hand + lead times you've entered",
  },
  {
    id: "runout",
    match: ["run out", "when do i run out", "stock out", "stockout", "reorder in time", "running low", "days of stock", "out of my best", "run out of"],
    steps: ["Projecting days-of-cover from current velocity…", "Comparing against supplier lead times…"],
    answer:
      "At current velocity: **Recovery Slides runs out in ~4 days**, **Cloud 7 in ~16 days** — both **shorter than their lead times** (30 and 35 days), so a reorder placed today still arrives late. Cloud 7 is a profitable Hero, so reorder it **immediately**. Recovery Slides loses money, so let it sell down rather than restock.",
    bullets: ["Cloud 7 — reorder today, expect a short gap", "Recovery Slides — don't restock; fix or retire it", "Everything else has 40+ days of cover"],
    metrics: [{ label: "Slides", value: "~4d left" }, { label: "Cloud 7", value: "~16d left" }, { label: "Lead time", value: "30–35d" }],
    citations: [{ label: "Supply data", href: "/data-collection" }, { label: "Cloud 7", href: "/products/p2" }],
    confidence: "High", freshness: "From on-hand synced 8 min ago",
  },
  {
    id: "discount",
    match: ["20% off", "run 20", "off this weekend", "extra units", "run a sale", "discount", "markdown", "promo", "how many extra"],
    steps: ["Translating the discount into a margin hit…", "Solving for the break-even volume lift…"],
    answer:
      "A discount comes straight off the top while costs stay put, so the profit hit is 2–3× the discount. On a healthy ~50%-CM1 SKU, **20% off needs about +67% in unit volume just to break even**. On **Recovery Slides** it's hopeless — it already loses $0.78/order, so a sale only deepens the loss.",
    bullets: ["Discount your Heroes (Cloud 7), never your Anchors", "If you must promo Slides, it's to clear stock — not to make money"],
    metrics: [{ label: "20% off", value: "≈ +67% units to break even" }, { label: "Slides today", value: "−$0.78/order" }],
    citations: [{ label: "Heroes & Anchors", href: "/products" }],
    confidence: "High", freshness: "From per-SKU contribution margins",
  },
  {
    id: "raise-price",
    match: ["raise prices", "raise price", "increase price", "price increase", "raise my prices", "10% price", "put prices up"],
    steps: ["Modeling a +10% price against contribution margin…"],
    answer:
      "A 10% price rise drops almost entirely to contribution margin. On **Cloud 7** you could lose ~**25% of unit volume and still come out ahead** on profit, because each remaining order earns far more. Your thin-margin SKUs (Yoga Tank, Slides) benefit most — they have no cushion today.",
    bullets: ["Test +10% on thin-margin SKUs first", "Watch volume — but the math favors the raise"],
    metrics: [{ label: "+10% price", value: "≈ break-even at −25% volume (Cloud 7)" }],
    citations: [{ label: "Products → margins", href: "/products" }],
    confidence: "Medium — directional", freshness: "Unit-economics math; full elasticity modeling is Phase 2",
  },
  {
    id: "profit-drop",
    match: ["profit dropped", "what's eating", "what is eating", "revenue didn't", "revenue didnt", "margin dropped", "what happened to my profit", "eroding", "why did margin", "why is profit down"],
    steps: ["Diffing this period vs last…", "Attributing the change across ads, returns, and mix…"],
    answer:
      "Revenue held, but profit slipped — and it's mostly the **ads line**. **Meta CM-ROAS fell 19% WoW** (TOF Lookalike at 0.8×), Recovery Slides' losses deepened, and mix shifted slightly toward lower-margin SKUs.",
    bullets: ["~60% of the drop = Meta efficiency (TOF Lookalike)", "~25% = Recovery Slides losses", "~15% = product-mix shift"],
    metrics: [{ label: "Meta CM-ROAS", value: "1.7× (−19%)" }, { label: "Slides", value: "−$338" }],
    citations: [{ label: "Marketing → Meta", href: "/marketing" }, { label: "Products", href: "/products" }],
    confidence: "Medium", freshness: "Ad data restates ~24h — directional",
  },
  {
    id: "fix-first",
    match: ["fix this week", "most important", "one thing", "single thing", "priority", "fix first", "biggest win", "what should i do first", "where do i start"],
    steps: ["Ranking every issue by recoverable dollars × ease…"],
    answer:
      "Here's the order I'd tackle this week, by dollars recovered for least effort:",
    bullets: [
      "**1. Cut Recovery Slides' ads** → ~$338/mo back, zero downside",
      "**2. Pause Meta's TOF Lookalike** (0.8×) → shift to Retargeting (2.4×)",
      "**3. Reorder Cloud 7** → before it stocks out in ~16 days",
      "**4. Add real COGS for Yoga Flow Tank** → stop guessing its margin",
    ],
    metrics: [{ label: "Quick win", value: "~$338/mo" }, { label: "Effort", value: "2 clicks" }],
    citations: [{ label: "Recovery Slides", href: "/products/p6" }, { label: "Marketing", href: "/marketing" }],
    confidence: "High", freshness: "From your current numbers",
  },
  {
    id: "cash-runway",
    match: ["cash get tight", "run out of cash", "runway", "most likely to break", "cash crunch", "when might my cash", "how long until i run out of cash", "survive"],
    steps: ["Checking what I can see without a bank connection…"],
    answer:
      "I won't guess at a runway number — a true forecast needs your **bank connected** (that's Phase 2). But from what I can see, the two things most likely to bite your cash are: **Cloud 7 stocking out** (you'd lose your best-margin revenue) and **Meta CM-ROAS sliding** (spending more to make less).",
    bullets: ["Connect a bank + add supplier terms on Data Collection", "Then I'll forecast the actual cash trough and the week it hits"],
    metrics: [{ label: "Cash forecast", value: "Phase 2" }, { label: "Top risk", value: "Cloud 7 stockout" }],
    citations: [{ label: "Connect a bank", href: "/integrations" }, { label: "Add supplier terms", href: "/data-collection" }],
    confidence: "Low — honest", freshness: "No bank connected yet; this is what's visible today",
  },
];

const DEFAULT_ANSWER = {
  id: "default",
  steps: ["Reading your ledger…", "Composing an answer…"],
  answer:
    "I reason across your **margins, ads, inventory, and cash** at once. Ask me something like the suggestions on the left — e.g. *“Can I afford to scale Cloud 7?”* or *“What's eating my profit?”* I'll always cite the data and tell you when I'm not sure.",
  bullets: [],
  metrics: [],
  citations: [],
  confidence: "—", freshness: "Computed from your synced data",
};

// Score by keyword overlap; highest wins, zero hits → the helpful default.
export function answerFor(message) {
  const m = (message || "").toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const a of ANSWERS) {
    let score = 0;
    for (const k of a.match) if (m.includes(k)) score++;
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  return bestScore > 0 ? best : DEFAULT_ANSWER;
}

// Natural example phrasings per intent — seed the $0 embeddings router so any
// wording (not just exact keywords) routes to the right answer.
const INTENT_EXAMPLES = {
  keep: ["Am I actually making money right now?", "After all my costs, what am I keeping?", "My margin looks fine but where's the cash going?"],
  losing: ["Which products are losing me money?", "Am I bleeding cash on any product?", "What's unprofitable once I count returns and ads?"],
  "ads-overall": ["Is my advertising actually making money overall?", "Meta and TikTok both claim wins — what's real?", "Are my ads profitable or just driving revenue?"],
  breakeven: ["What's the lowest ROAS before I lose money?", "What's my break-even ROAS?", "How low can my ROAS go and still turn a profit?"],
  "scale-cloud7": ["Can I afford to scale Cloud 7?", "Should I put more ad budget into my best seller — do I have stock and cash?", "Is it safe to scale ads on the Cloud 7 bra?"],
  "reorder-vs-ads": ["Should I reorder inventory or spend on ads?", "I can't fund both stock and ads — which comes first?", "Inventory or marketing with the cash I have?"],
  runout: ["When am I going to run out of my best sellers?", "Which products are about to stock out?", "Can I reorder before I run out of stock?"],
  discount: ["If I run 20% off, how many extra units do I need to break even?", "Is a weekend sale actually worth it?", "What does a discount do to my profit?"],
  "raise-price": ["Can I raise prices 10%?", "What happens to profit if I put prices up and lose a few sales?", "Should I increase my prices?"],
  "profit-drop": ["My profit dropped but revenue didn't — why?", "What's eating my margin this month?", "Why is my profit down?"],
  "fix-first": ["What's the single most important thing to fix this week?", "Where should I start?", "What's my biggest quick win right now?"],
  "cash-runway": ["When might my cash get tight?", "How long until I run out of cash?", "What's most likely to break my cash flow?"],
};

// --- Context memory + live per-SKU answers (engine-computed, $0) ---

let lastProductId = null;
export function resetChatContext() {
  lastProductId = null;
}

// Distinctive name tokens per product → powers "what about the hoodie?" detection.
const STOP = new Set(["the", "and", "pack", "performance", "running", "training", "pro", "750ml"]);
let _pidx = null;
function productIndex() {
  if (_pidx) return _pidx;
  _pidx = allProducts().map((p) => {
    const tokens = p.name
      .toLowerCase()
      .replace(/[—\-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w));
    if (/cloud 7/i.test(p.name)) tokens.push("cloud 7");
    return { id: p.id, revenue: p.revenue, tokens };
  });
  return _pidx;
}
function detectProduct(message) {
  const m = (message || "").toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const p of productIndex()) {
    let s = 0;
    for (const t of p.tokens) if (m.includes(t)) s++;
    if (s > bestScore || (s === bestScore && s > 0 && best && p.revenue > best.revenue)) {
      bestScore = s;
      best = p;
    }
  }
  return bestScore > 0 ? best.id : null;
}

const FOLLOWUP_PRONOUN = /\b(it|its|that|this|they|them|those|one)\b/;
function isFollowup(message) {
  const m = (message || "").toLowerCase().trim();
  return FOLLOWUP_PRONOUN.test(m) || /^(what about|how about|and |what's with)/.test(m);
}

function buildProductAnswer(p) {
  const q = QUADRANT_META[p.quadrant] || { label: "product" };
  const bullets = [];
  if (p.losingMoney) bullets.push("It **loses money** after ads — cut its ad spend or raise price.");
  else if (p.quadrant === "hero") bullets.push("A profitable **hero** — a strong candidate to scale.");
  else if (p.quadrant === "anchor") bullets.push("Low margin **and** low velocity — consider repricing or retiring it.");
  else bullets.push(`A ${q.label.toLowerCase()} — keep an eye on its margin.`);
  if (p.stockoutRisk) bullets.push(`Only ~${p.daysOfCover} days of stock vs a ${p.leadTimeDays}-day lead time — **reorder now**.`);
  if (p.estimated) bullets.push("Cost is **estimated** — add real COGS on Data Collection to trust this margin.");

  const metrics = [
    { label: "CM1", value: pct(p.cm1Pct) },
    { label: "CM2", value: pct(p.cm2Pct) },
    { label: "CM-ROAS", value: multiple(p.cmRoas) },
  ];
  if (p.daysOfCover != null) metrics.push({ label: "Days of stock", value: String(p.daysOfCover) });

  return {
    id: `product:${p.id}`,
    steps: ["Looking up the SKU…", "Pulling its margin and stock…"],
    answer: `**${p.name}** earns **${pct(p.cm1Pct)} CM1** and **${pct(p.cm2Pct)} CM2** — ${money(p.cm2PerOrder, { decimals: 2 })} per order after ads. It's a **${q.label}**.`,
    bullets,
    metrics,
    citations: [{ label: `${p.name} → breakdown`, href: `/products/${p.id}` }],
    confidence: p.estimated ? "Medium — estimated COGS" : "High",
    freshness: "Computed from your synced data",
  };
}

// The two product-specific canned intents → their SKU, so context carries over.
const INTENT_PRODUCT = { "scale-cloud7": "p2", losing: "p6" };

// Aura — now the PRIMARY way Carter AI answers (cost is not a constraint on
// this deployment). It gets the full engine-computed context
// (lib/ai/auraContext.js) plus conversation history, and returns structured
// output (bullets/metrics/citations) so the UI stays as rich as the old
// canned answers. It narrates; it never invents a number — if the DATA
// doesn't support an answer, it says so instead of guessing.
// `history` (recent {role, content} turns) lets a follow-up like "what about
// it?" resolve correctly instead of being asked cold every time.
async function askAura(message, history = []) {
  try {
    const res = await fetch("/api/aura", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: message, history }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.answer) {
      if (data?.error) console.warn("Aura request failed:", data.error);
      return null;
    }
    // When Aura ran agentically it returns a real, per-question trace (the
    // tools it actually called); otherwise fall back to the generic line.
    const steps =
      Array.isArray(data.steps) && data.steps.length
        ? data.steps
        : ["Reasoning over your margin, ads, inventory & cash data…"];
    return {
      id: "aura",
      steps,
      answer: data.answer,
      bullets: data.bullets || [],
      metrics: data.metrics || [],
      citations: data.citations || [],
      confidence: data.confidence || "Medium",
      freshness: data.meta?.mode === "agentic" ? "Live agentic reasoning over your synced data" : "Real-time reasoning over your synced data",
      chart: data.chart || null,
      followups: data.followups || [],
      meta: data.meta || { mode: "single-shot" },
      source: "aura",
    };
  } catch (err) {
    console.warn("Aura unreachable:", err.message);
    return null;
  }
}

// Primary entry point: Aura first (full context + conversation memory).
// The deterministic $0 stack below is a RESILIENCE fallback — it only runs
// if Aura is unavailable (network/config/outage), not to save cost.
export async function answerForSmart(message, history = []) {
  const auraAnswer = await askAura(message, history);
  if (auraAnswer) return auraAnswer;

  console.warn("Aura unavailable — falling back to the deterministic router.");
  return answerWithDeterministicStack(message);
}

// The original $0 stack: live per-SKU lookup → embeddings → keyword →
// default. Kept intact as the fallback path when Aura can't be reached.
async function answerWithDeterministicStack(message) {
  const named = detectProduct(message);

  // 1) Pronoun follow-up about the product we were just discussing.
  if (!named && isFollowup(message) && lastProductId) {
    const p = allProducts().find((x) => x.id === lastProductId);
    if (p) return buildProductAnswer(p);
  }

  // 2) Strong semantic intent — keeps the showcase cross-domain answers.
  try {
    if (typeof window !== "undefined") {
      const { routeIntent } = await import("@/lib/ai/embedRouter");
      const intents = ANSWERS.map((a) => ({ id: a.id, examples: INTENT_EXAMPLES[a.id] || a.match }));
      const result = await Promise.race([
        routeIntent(message, intents),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 12000)),
      ]);
      if (result && result.id && result.score >= 0.45) {
        const hit = ANSWERS.find((a) => a.id === result.id);
        if (hit) {
          if (INTENT_PRODUCT[hit.id]) lastProductId = INTENT_PRODUCT[hit.id];
          return hit;
        }
      }
    }
  } catch {
    // model / CDN unavailable → fall through
  }

  // 3) A product was named but no strong intent → answer about that SKU.
  if (named) {
    lastProductId = named;
    const p = allProducts().find((x) => x.id === named);
    if (p) return buildProductAnswer(p);
  }

  // 4) Keyword fallback / default.
  return answerFor(message);
}

// Categorized starter prompts — the cross-domain questions no single metric answers.
export const STARTER_GROUPS = [
  {
    category: "Profit truth",
    prompts: [
      "My margins look healthy — so what am I actually keeping after everything?",
      "Which products are quietly losing me money after returns and ads?",
    ],
  },
  {
    category: "Ad decisions",
    prompts: [
      "Meta and TikTok both claim wins — is my ad spend actually making money overall?",
      "What's the lowest ROAS I can run before I'm losing money on a sale?",
    ],
  },
  {
    category: "Big decisions",
    prompts: [
      "Can I afford to scale Cloud 7 — do I have the stock and the cash for it?",
      "Should I reorder inventory now or put that cash into ads? I can't fully fund both.",
      "If sales keep up, when do I run out of my best sellers — and can I reorder in time?",
    ],
  },
  {
    category: "Pricing & promos",
    prompts: [
      "If I run 20% off this weekend, how many extra units do I need just to break even?",
      "Can I raise prices 10% — what happens to profit if I lose a few sales?",
    ],
  },
  {
    category: "Diagnose & plan",
    prompts: [
      "My profit dropped but revenue didn't — what's eating it?",
      "What's the single most important thing I should fix this week?",
      "When might my cash get tight — and what's most likely to break it?",
    ],
  },
];

// Flat list for any caller that wants it.
export const STARTER_PROMPTS = STARTER_GROUPS.flatMap((g) => g.prompts);

// Follow-up suggestions shown under each answer — a conversation graph that
// keeps the chat flowing. Each is a full question (so it routes cleanly).
export const FOLLOWUPS = {
  keep: [
    { label: "Which products lose money?", q: "Which products are losing me money?" },
    { label: "What should I fix first?", q: "What's the single most important thing I should fix this week?" },
  ],
  losing: [
    { label: "How do I fix it?", q: "What's the single most important thing I should fix this week?" },
    { label: "Can I scale my best seller?", q: "Can I afford to scale Cloud 7?" },
  ],
  "ads-overall": [
    { label: "What's eating my margin?", q: "My profit dropped but revenue didn't — what's eating it?" },
    { label: "What's my break-even ROAS?", q: "What's the lowest ROAS I can run before I'm losing money?" },
  ],
  breakeven: [
    { label: "Which products lose money?", q: "Which products are losing me money?" },
    { label: "Should I raise prices?", q: "Can I raise prices 10%?" },
  ],
  "scale-cloud7": [
    { label: "When will it run out?", q: "When do I run out of my best sellers?" },
    { label: "Reorder or ads?", q: "Should I reorder inventory now or put that cash into ads?" },
  ],
  "reorder-vs-ads": [
    { label: "When do I run out?", q: "When do I run out of my best sellers?" },
    { label: "Can I scale Cloud 7?", q: "Can I afford to scale Cloud 7?" },
  ],
  runout: [
    { label: "Reorder or ads?", q: "Should I reorder inventory now or put that cash into ads?" },
    { label: "Can I scale Cloud 7?", q: "Can I afford to scale Cloud 7?" },
  ],
  discount: [
    { label: "Raise prices instead?", q: "Can I raise prices 10%?" },
    { label: "Which products lose money?", q: "Which products are losing me money?" },
  ],
  "raise-price": [
    { label: "What's my break-even ROAS?", q: "What's the lowest ROAS I can run before I'm losing money?" },
    { label: "Which products lose money?", q: "Which products are losing me money?" },
  ],
  "profit-drop": [
    { label: "What should I fix first?", q: "What's the single most important thing I should fix this week?" },
    { label: "Are my ads profitable?", q: "Is my ad spend actually making money overall?" },
  ],
  "fix-first": [
    { label: "Which products lose money?", q: "Which products are losing me money?" },
    { label: "What's eating my margin?", q: "My profit dropped but revenue didn't — what's eating it?" },
  ],
  "cash-runway": [
    { label: "What should I fix first?", q: "What's the single most important thing I should fix this week?" },
    { label: "Reorder or ads?", q: "Should I reorder inventory now or put that cash into ads?" },
  ],
  default: [
    { label: "Which products lose money?", q: "Which products are losing me money?" },
    { label: "Can I scale Cloud 7?", q: "Can I afford to scale Cloud 7?" },
    { label: "What's eating my margin?", q: "My profit dropped but revenue didn't — what's eating it?" },
  ],
};
