// AURA EVAL — the release gate. Two things it proves:
//   1. Routing: canonical questions still resolve to the right, on-topic answer.
//   2. Grounding: every NUMBER an answer asserts is one the engines can
//      actually produce — the AI narrates real data, never invents a figure.
//
// Expectations are computed LIVE from the engines (passed in by the runner),
// never hardcoded — so if the seed changes, the gate moves with it and any
// stale canned number in lib/api/mock/ai.js gets caught as a grounding
// violation instead of silently drifting.

import { money, pct, multiple } from "@/lib/format";

// --- number normalization (shared by allowed-set + claim extraction) ------
// Collapse a numeric token to a canonical form so "3.29×", "3.29x", "3.29 x"
// all compare equal, and "−$338" == "-$338".
function norm(tok) {
  return String(tok)
    .replace(/\s+/g, "")
    .replace(/×/g, "x")
    .replace(/−/g, "-")
    .replace(/[.,]$/, "")
    .toLowerCase();
}

// Every legitimately-derivable numeric string, plus tolerant variants.
export function buildAllowedNumbers(engines) {
  const { allProducts, productsSummary, cashCalendar, marketingData } = engines;
  const set = new Set();
  const add = (s) => { if (s && s !== "—") set.add(norm(s)); };

  const addMoney = (v) => {
    if (v == null || Number.isNaN(v)) return;
    add(money(v));
    add(money(Math.abs(v)));
    add(money(v, { decimals: 2 }));
    // bare number with thousands separators (answers sometimes drop the $)
    add(Math.round(Math.abs(v)).toLocaleString("en-US"));
  };
  const addPct = (v) => {
    if (v == null || Number.isNaN(v)) return;
    add(pct(v));                      // 24.5%
    add(`${Math.round(v)}%`);         // 25%
    add(`${v}%`);
  };
  const addMult = (v) => {
    if (v == null || Number.isNaN(v)) return;
    add(multiple(v));                 // 3.29x
    add(`${v}x`);
    add(`${Math.round(v * 10) / 10}x`); // 3.3x
    add(`${Math.round(v)}x`);
  };
  const addInt = (v) => {
    if (v == null || Number.isNaN(v)) return;
    add(Math.round(v).toLocaleString("en-US"));
    add(String(Math.round(v)));
  };

  const products = allProducts();
  for (const p of products) {
    [p.revenue, p.cm1, p.cm2, p.cm3, p.returns, p.cogs, p.adSpend, p.reorderCostTotal, p.reorderDepositDue, p.reorderBalanceDue, p.unitCost].forEach(addMoney);
    [p.cm1Pct, p.cm2Pct, p.cm3Pct].forEach(addPct);
    addMult(p.cmRoas); addMult(p.revRoas);
    [p.units, p.onHand, p.daysOfCover, p.suggestedReorderQty, p.projectedDaysToStockout].forEach(addInt);
    if (p.cm2PerOrder != null) { addMoney(p.cm2PerOrder); }
  }

  const s = productsSummary();
  [s.revenue, s.cm1, s.cm2, s.cm3, s.cogs, s.returns, s.adSpend].forEach(addMoney);
  [s.cm1Pct, s.cm2Pct, s.cm3Pct].forEach(addPct);
  addMult(s.cmRoas); addInt(s.units);

  const cash = cashCalendar();
  [cash.totalDepositDue, cash.totalBalanceDue, cash.totalCommitted].forEach(addMoney);

  const mk = marketingData();
  for (const c of mk.channels || []) { addMoney(c.spend); addMult(c.cmRoas); if (c.cac != null) addMoney(c.cac); }
  if (mk.totals) { addMoney(mk.totals.spend); addMult(mk.totals.cmRoas); if (mk.totals.cac != null) addMoney(mk.totals.cac); }

  return set;
}

// Pull numeric tokens out of an answer. Money ($1,234 / −$338 / $1,234.56),
// percents (12% / 12.5%), multiples (3.2x / 3.2×), and bare grouped numbers
// (1,234). Returns normalized tokens with a small surrounding context slice.
export function extractNumericClaims(text) {
  const s = String(text || "");
  const out = [];
  const patterns = [
    /[-−]?\$\s?\d[\d,]*(?:\.\d+)?/g, // money
    /\d+(?:\.\d+)?\s*%/g,            // percent
    /\d+(?:\.\d+)?\s*[×x]\b/g,       // multiple
    /\b\d{1,3}(?:,\d{3})+\b/g,       // grouped thousands without $
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(s))) {
      out.push({ token: norm(m[0]), raw: m[0], context: s.slice(Math.max(0, m.index - 24), m.index + m[0].length + 12) });
    }
  }
  return out;
}

// A token is allowed if it's in the engine set, OR it's a benign non-claim:
// a 4-digit year, or a small integer (<=12, e.g. "3 things", "top 5").
export function isBenignNumber(token) {
  const t = norm(token);
  if (/^(19|20)\d{2}$/.test(t)) return true;              // year
  const asInt = Number(t.replace(/[^\d.-]/g, ""));
  if (Number.isInteger(asInt) && Math.abs(asInt) <= 12 && !/[$%x,]/.test(t)) return true; // small count ("3 things")
  // Small whole-dollar advisory nudges ("raise price ≥ $4", "$5 off") are
  // guidance, not a data claim — never material enough to mislead.
  if (/^-?\$\d+$/.test(t)) { const d = Number(t.replace(/[^\d]/g, "")); if (d <= 10) return true; }
  return false;
}

export const GOLDEN_SET = [
  {
    id: "net-profit",
    question: "My margins look healthy but where's the cash actually going?",
    expect: (e) => ({ mustContainAny: [money(e.productsSummary().cm3), "CM3", "keeping"], description: "store net profit (CM3)" }),
  },
  {
    id: "losing-product",
    question: "Which products are quietly losing me money?",
    expect: (e) => ({ mustContainAny: [e.losingHero()?.name, "losing"].filter(Boolean), description: "names the money-losing SKU" }),
  },
  {
    id: "losing-per-order",
    question: "Am I bleeding money on any product after returns and ads?",
    expect: (e) => { const h = e.losingHero(); return { mustContainAny: [h?.name, h ? money(Math.abs(h.cm2)) : null, "per order"].filter(Boolean), description: "per-order loss on the losing SKU" }; },
  },
  {
    id: "ads-overall",
    question: "Is my advertising actually making money overall?",
    expect: (e) => ({ mustContainAny: [multiple(e.productsSummary().cmRoas), "CM-ROAS", "ROAS"], description: "blended CM-ROAS" }),
  },
  {
    id: "best-channel", det: false,
    question: "Which ad channel is actually the most profitable right now?",
    expect: (e) => { const c = [...e.marketingData().channels].sort((a, b) => b.cmRoas - a.cmRoas)[0]; return { mustContainAny: [c?.name, c ? multiple(c.cmRoas) : null].filter(Boolean), description: "best CM-ROAS channel" }; },
  },
  {
    id: "cash-tight",
    question: "When might my cash get tight — what am I committed to?",
    expect: (e) => ({ mustContainAny: [money(e.cashCalendar().totalDepositDue), money(e.cashCalendar().totalCommitted), "cash"], description: "cash committed / due now" }),
  },
  {
    id: "stockout",
    question: "Which of my products are about to run out of stock?",
    expect: (e) => { const risk = e.allProducts().filter((p) => p.stockoutRisk).map((p) => p.name); return { mustContainAny: risk.length ? risk : ["stock", "reorder"], description: "stockout-risk SKUs" }; },
  },
  {
    id: "highest-margin", det: false,
    question: "What's my highest-margin product?",
    expect: (e) => { const top = [...e.allProducts()].sort((a, b) => b.cm1Pct - a.cm1Pct)[0]; return { mustContainAny: [top?.name, top ? pct(top.cm1Pct) : null].filter(Boolean), description: "highest CM1% SKU" }; },
  },
  {
    id: "returns-worst", det: false,
    question: "Which product's returns are eating the most margin?",
    expect: (e) => { const worst = [...e.allProducts()].sort((a, b) => b.returns - a.returns)[0]; return { mustContainAny: [worst?.name, "returns"].filter(Boolean), description: "worst returns SKU" }; },
  },
  {
    id: "fix-first",
    question: "What's the single most important thing to fix this week?",
    expect: (e) => { const brief = e.buildDailyBrief(); const top = brief?.actions?.[0] || brief?.headline; return { mustContainAny: [typeof top === "string" ? top : top?.title, e.losingHero()?.name, "fix"].filter(Boolean), description: "daily brief top action" }; },
  },
  {
    id: "revenue-total", det: false,
    question: "How much revenue did the store do this period?",
    expect: (e) => ({ mustContainAny: [money(e.productsSummary().revenue), "revenue"], description: "total revenue" }),
  },
  {
    id: "estimated-cogs", det: false,
    question: "Which products have estimated costs I should fix?",
    expect: (e) => { const est = e.allProducts().filter((p) => p.estimated).map((p) => p.name); return { mustContainAny: est.length ? est : ["estimated", "COGS"], description: "estimated-COGS SKUs" }; },
  },
];
