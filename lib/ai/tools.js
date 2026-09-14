// AURA TOOL REGISTRY — the data surface of the agentic upgrade. Instead of
// receiving one giant context dump, the model composes these tools per
// question. Same law as the rest of the app: no metric is hardcoded here —
// every number a tool returns was derived by a compute engine from raw seeds.
//
// Server-side only in practice (executed by lib/ai/agentLoop.js), but kept
// import-safe on both server and client: no window/localStorage access.

import { allProducts, oneProduct, productsSummary, cashCalendar, returnsRanking } from "@/lib/api/mock/products";
import { marketingData } from "@/lib/api/mock/marketing";
import { websiteAnalytics, productFunnel } from "@/lib/compute/funnel";
import { storeAudience } from "@/lib/compute/audience";
import { insightsBoard } from "@/lib/compute/insights";
import { buildDailyBrief } from "@/lib/compute/dailyBrief";
import { STORE } from "@/lib/data/skus";
import { money } from "@/lib/format";

/**
 * @typedef {Object} ToolResult
 * @property {boolean} ok        false = the tool couldn't answer (bad arg, ambiguous match)
 * @property {*} data            engine-computed payload; on ok:false, disambiguation info or null
 * @property {{label: string, href: string}[]} citations  only routes that exist (buildValidLinks-style)
 * @property {string|null} freshness  one-line data-recency statement the model can surface
 * @property {string} [note]     caveat or instruction for the model (estimated COGS, ambiguity, …)
 */

// Freshness lines mirror the copy the deterministic answers already use, so
// agentic and canned responses feel like the same product.
const FRESH_ORDERS = "Computed from orders synced 8 min ago";
const FRESH_ADS = "Ad data restates for ~24h — directional";
const FRESH_PIXEL = "Tally Web Pixel counts, this period";
const FRESH_SUPPLY = "From on-hand stock + lead times you've entered";
const FRESH_CASH = "Reorder costs only — bank connection is Phase 2";
const FRESH_MATH = "Unit-economics math on this period's real numbers";

function ok(data, citations, freshness, note) {
  const r = { ok: true, data, citations, freshness };
  if (note) r.note = note;
  return r;
}
function fail(note, data = null) {
  return { ok: false, data, citations: [], freshness: null, note };
}

const round2 = (v) => Math.round(v * 100) / 100;
const pctOf = (part, whole) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);

// --- product resolution ------------------------------------------------
// The model passes whatever the merchant typed ("cloud 7", "CA-BRA-CL7",
// "p2", "the leggings"), so matching is fuzzy on purpose — but a tie is
// surfaced as ambiguous rather than silently picking one.

function tokenize(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w.length > 1 || /\d/.test(w));
}

function resolveProduct(query) {
  if (!query || typeof query !== "string") return { match: null, candidates: [] };
  const products = allProducts();
  const q = query.trim().toLowerCase();

  const exact = products.find((p) => p.id.toLowerCase() === q || (p.sku || "").toLowerCase() === q);
  if (exact) return { match: exact, candidates: [] };

  const qTokens = tokenize(q);
  const scored = products
    .map((p) => {
      const nTokens = tokenize(p.name);
      let score = 0;
      for (const t of qTokens) if (nTokens.some((n) => n.includes(t) || t.includes(n))) score++;
      if (p.name.toLowerCase().includes(q)) score += 2; // full-phrase hit beats token overlap
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return { match: null, candidates: [] };
  const ties = scored.filter((x) => x.score === scored[0].score);
  if (ties.length > 1) return { match: null, candidates: ties.map((x) => x.p.name) };
  return { match: scored[0].p, candidates: [] };
}

// oneProduct accepts id or sku; fall back to fuzzy name matching so tools
// taking a productId still work when the model passes a product NAME.
function resolveToId(productId) {
  if (typeof productId === "string" && oneProduct(productId)) return { id: productId, candidates: [] };
  const { match, candidates } = resolveProduct(productId);
  return { id: match ? match.id : null, candidates };
}

// Full derived record minus presentation-only fields (emoji, sparkline).
function fullProduct(id) {
  const p = oneProduct(id);
  if (!p) return null;
  const { image, spark, funnel, channelPerformance, ...rest } = p;
  return {
    ...rest,
    channelPerformance: channelPerformance
      ? {
          paidSharePct: channelPerformance.paidSharePct,
          paidUnits: channelPerformance.paidUnits,
          earnedUnits: channelPerformance.earnedUnits,
          best: channelPerformance.best ? { name: channelPerformance.best.name, cmRoas: channelPerformance.best.cmRoas } : null,
          worst: channelPerformance.worst ? { name: channelPerformance.worst.name, cmRoas: channelPerformance.worst.cmRoas } : null,
          channels: channelPerformance.channels.map((c) => ({
            id: c.id, name: c.name, spend: c.spend, units: c.units, revenue: c.revenue, cm1: c.cm1, cmRoas: c.cmRoas, trendPct: c.trendPct, confidence: c.confidence,
          })),
        }
      : null,
    funnel: funnel
      ? {
          views: funnel.views, atc: funnel.atc, checkout: funnel.checkout, units: funnel.units,
          viewToAtcPct: funnel.viewToAtcPct, atcToCheckoutPct: funnel.atcToCheckoutPct,
          checkoutToPurchasePct: funnel.checkoutToPurchasePct, overallConvPct: funnel.overallConvPct,
          verdict: funnel.verdict,
        }
      : null,
  };
}

const productLink = (p) => ({ label: `${p.name} → breakdown`, href: `/products/${p.id}` });

// --- ranking -------------------------------------------------------------

const RANK_KEYS = ["revenue", "cm1", "cm2", "cm3", "cm1Pct", "cm2Pct", "cmRoas", "trendPct", "returns", "daysOfCover", "units"];

const RANK_FILTERS = {
  losingMoney: (p) => p.losingMoney,
  stockoutRisk: (p) => p.stockoutRisk,
  estimated: (p) => p.estimated,
  // Dead stock = too MUCH cover + falling demand — the opposite direction
  // from stockoutRisk. Thresholds match lib/compute/insights.js.
  deadStock: (p) => !p.stockoutRisk && p.daysOfCover != null && p.daysOfCover > 75 && p.trendPct < 0,
  none: () => true,
};

function compactProduct(p) {
  return {
    id: p.id, name: p.name, category: p.category, quadrant: p.quadrant, lifecycleStage: p.lifecycleStage,
    revenue: p.revenue, units: p.units,
    cm1: p.cm1, cm1Pct: p.cm1Pct, cm2: p.cm2, cm2Pct: p.cm2Pct, cm3: p.cm3,
    cmRoas: p.cmRoas, trendPct: p.trendPct,
    returns: p.returns, returnsPctOfRevenue: pctOf(p.returns, p.revenue),
    onHand: p.onHand, daysOfCover: p.daysOfCover,
    losingMoney: p.losingMoney, stockoutRisk: p.stockoutRisk, estimated: p.estimated,
  };
}

// --- the registry ---------------------------------------------------------

export const TOOLS = [
  {
    name: "get_store_summary",
    description: "Store-wide P&L totals (revenue, CM1/CM2/CM3 dollars and %, CM-ROAS, units) plus the store health snapshot (profitability, cash due, open action counts). Start here for 'how is the business doing' questions.",
    parameters: { type: "object", properties: {} },
    execute() {
      const s = productsSummary();
      const { health } = insightsBoard();
      return ok(
        { store: STORE.name, totals: s, health },
        [{ label: "Dashboard", href: "/dashboard" }, { label: "Insights", href: "/insights" }],
        FRESH_ORDERS
      );
    },
  },
  {
    name: "get_product",
    description: "Look up ONE product by id (e.g. 'p2'), SKU code, or (partial) name and return its full derived record: margins (CM1/CM2/CM3), CM-ROAS, quadrant, lifecycle, inventory/reorder math, per-channel ad performance, website funnel, and buyer audience. If the name is ambiguous the result lists candidates — ask the merchant which one.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Product id, SKU code, or (partial) product name, e.g. 'cloud 7' or 'p6'" },
      },
      required: ["query"],
    },
    execute({ query } = {}) {
      const { match, candidates } = resolveProduct(query);
      if (!match && candidates.length) {
        return fail(`Ambiguous product "${query}" — ask the merchant which one they meant.`, { candidates });
      }
      if (!match) {
        return fail(`No product matched "${query}".`, { candidates: allProducts().map((p) => p.name) });
      }
      const p = fullProduct(match.id);
      return ok(p, [productLink(p)], FRESH_ORDERS, p.estimated ? "COGS is ESTIMATED for this SKU — treat its margin as directional." : undefined);
    },
  },
  {
    name: "rank_products",
    description: "Rank the catalog by one metric, optionally filtered. Use for 'best/worst/top N' questions — e.g. worst CM2, biggest returns, dead stock (filter deadStock ranks by daysOfCover), stockout risks.",
    parameters: {
      type: "object",
      properties: {
        by: { type: "string", enum: RANK_KEYS, description: "Metric to rank by. daysOfCover = days of stock left (large = slow-moving, small = near stockout)." },
        direction: { type: "string", enum: ["desc", "asc"], description: "desc = biggest first (default)" },
        limit: { type: "integer", description: "Max rows (default 5)" },
        filter: { type: "string", enum: ["losingMoney", "stockoutRisk", "estimated", "deadStock", "none"], description: "Optional pre-filter. deadStock = >75 days of cover AND falling demand (NOT the same as stockoutRisk)." },
      },
      required: ["by"],
    },
    execute({ by = "revenue", direction = "desc", limit = 5, filter = "none" } = {}) {
      if (!RANK_KEYS.includes(by)) return fail(`Unknown 'by' metric "${by}" — valid: ${RANK_KEYS.join(", ")}.`);
      const pick = RANK_FILTERS[filter || "none"];
      if (!pick) return fail(`Unknown filter "${filter}" — valid: ${Object.keys(RANK_FILTERS).join(", ")}.`);
      const n = Math.max(1, Math.min(Number(limit) || 5, 20));
      const rows = allProducts()
        .filter(pick)
        .sort((a, b) => {
          const va = a[by]; const vb = b[by];
          if (va == null && vb == null) return 0;
          if (va == null) return 1; // nulls (no ad spend / no stock data) sink to the bottom
          if (vb == null) return -1;
          return direction === "asc" ? va - vb : vb - va;
        })
        .slice(0, n)
        .map(compactProduct);
      return ok(
        { by, direction, filter: filter || "none", products: rows },
        [{ label: "Products", href: "/products" }],
        FRESH_ORDERS,
        rows.length ? undefined : "No products matched that filter."
      );
    },
  },
  {
    name: "list_insights",
    description: "The prioritized cross-domain insight board: what to scale, cut, reorder, or fix, ranked by severity and dollar impact. Use for 'what should I fix first / what needs attention' questions.",
    parameters: {
      type: "object",
      properties: {
        severity: { type: "string", enum: ["critical", "warning", "opportunity", "info"], description: "Optional — return only this severity" },
      },
    },
    execute({ severity } = {}) {
      const { actions } = insightsBoard();
      const rows = (severity ? actions.filter((a) => a.severity === severity) : actions)
        .map((a) => ({ id: a.id, severity: a.severity, verdict: a.verdict, title: a.title, body: a.body, metric: a.metric, ref: a.ref }));
      return ok(
        { insights: rows },
        [{ label: "Insights", href: "/insights" }],
        FRESH_ORDERS,
        rows.length ? undefined : "No insights at that severity right now."
      );
    },
  },
  {
    name: "get_daily_brief",
    description: "Aura's daily brief: headline, plain-English summary, top 3 ranked actions, and margin-at-stake totals. Use for 'what's going on today / give me a rundown' questions.",
    parameters: { type: "object", properties: {} },
    execute() {
      return ok(
        buildDailyBrief(),
        [{ label: "Dashboard", href: "/dashboard" }, { label: "Insights", href: "/insights" }],
        FRESH_ORDERS
      );
    },
  },
  {
    name: "channel_performance",
    description: "Ad channel economics. Without productId: every channel's spend, orders, CAC, CM-ROAS, trend, platform-claimed vs verified revenue, top campaigns, and the one budget-shift recommendation. With productId: which channels convert THAT product (paid slice only).",
    parameters: {
      type: "object",
      properties: {
        productId: { type: "string", description: "Optional product id — omit for store-wide channel performance" },
      },
    },
    execute({ productId } = {}) {
      const m = marketingData();
      if (!productId) {
        const data = {
          totals: { spend: m.totals.spend, orders: m.totals.orders, cac: m.totals.cac, cmRoas: m.totals.cmRoas, revRoas: m.totals.revRoas },
          channels: m.channels.map((c) => ({
            id: c.id, name: c.name, spend: c.spend, orders: c.orders, cac: c.cac,
            cmRoas: c.cmRoas, revRoas: c.revRoas, trendPct: c.cmRoasDelta,
            platformClaimedRevenue: c.platformReportedRevenue, verifiedRevenue: c.attributedRevenue,
            platformOverclaimPct: c.platformGapPct, trackingConfidence: c.trackingConfidence,
            topCampaigns: c.campaigns.map((k) => ({ name: k.name, spend: k.spend, cmRoas: k.cmRoas })),
          })),
          recommendation: m.recommendation
            ? { shiftFrom: m.recommendation.from.name, shiftTo: m.recommendation.to.name, weeklyAmount: m.recommendation.amount, reason: m.recommendation.note }
            : null,
        };
        return ok(data, [{ label: "Marketing", href: "/marketing" }], FRESH_ADS, "Break-even is 1.0x CM-ROAS — channels below it lose money per dollar.");
      }
      const { id, candidates } = resolveToId(productId);
      if (!id) return fail(`No product matched "${productId}".`, candidates.length ? { candidates } : null);
      const p = oneProduct(id);
      const cp = p.channelPerformance;
      if (!cp) return fail(`${p.name} has no per-channel attribution data.`);
      const data = {
        id: p.id, name: p.name,
        paidSharePct: cp.paidSharePct, paidUnits: cp.paidUnits, earnedUnits: cp.earnedUnits,
        best: cp.best ? { name: cp.best.name, cmRoas: cp.best.cmRoas } : null,
        worst: cp.worst ? { name: cp.worst.name, cmRoas: cp.worst.cmRoas } : null,
        channels: cp.channels.map((c) => ({ id: c.id, name: c.name, spend: c.spend, units: c.units, revenue: c.revenue, cm1: c.cm1, cmRoas: c.cmRoas, trendPct: c.trendPct, confidence: c.confidence })),
      };
      return ok(
        data,
        [productLink(p), { label: "Marketing", href: "/marketing" }],
        FRESH_ADS,
        `Covers the PAID slice only (${cp.paidSharePct}% of its units) — earned sales don't move with ad budget. Per-channel samples are small; check each channel's confidence flag.`
      );
    },
  },
  {
    name: "website_funnel",
    description: "On-site behavior from the Tally Web Pixel. Without productId: sessions, store funnel (views → cart → checkout → purchase), catalog-average rates, and conversion by traffic source. With productId: that product's funnel rates plus a behavior verdict (lowinterest = page/traffic problem, checkoutdrop = price/shipping/checkout problem, healthy).",
    parameters: {
      type: "object",
      properties: {
        productId: { type: "string", description: "Optional product id — omit for the store-wide funnel" },
      },
    },
    execute({ productId } = {}) {
      const web = websiteAnalytics();
      if (!productId) {
        const data = {
          sessions: web.sessions,
          ordersAllSources: web.orders,
          sessionToOrderPct: web.sessionConvPct,
          storeFunnel: web.storeFunnel,
          catalogAvgRates: web.catalogAvg,
          trafficSources: web.sources.map((t) => ({ name: t.name, paid: t.paid, sessions: t.sessions, orders: t.orders, convPct: t.convPct })),
        };
        return ok(data, [{ label: "Website", href: "/website" }], FRESH_PIXEL);
      }
      const { id, candidates } = resolveToId(productId);
      if (!id) return fail(`No product matched "${productId}".`, candidates.length ? { candidates } : null);
      const f = productFunnel(id);
      if (!f) return fail(`No funnel data for product "${productId}".`);
      const data = {
        id: f.id, name: f.name,
        views: f.views, addedToCart: f.atc, reachedCheckout: f.checkout, unitsSold: f.units,
        viewToCartPct: f.viewToAtcPct, cartToCheckoutPct: f.atcToCheckoutPct,
        checkoutToPurchasePct: f.checkoutToPurchasePct, overallViewToPurchasePct: f.overallConvPct,
        behaviorVerdict: f.verdict,
        catalogAvgRates: web.catalogAvg,
      };
      return ok(data, [{ label: `${f.name} → breakdown`, href: `/products/${f.id}` }, { label: "Website", href: "/website" }], FRESH_PIXEL);
    },
  },
  {
    name: "audience",
    description: "Store-wide ad audience by one dimension (device, age, or geography): each segment's share of ad SPEND vs its CM-ROAS. The insight is the mismatch — segments below the blended CM-ROAS are over-funded.",
    parameters: {
      type: "object",
      properties: {
        dimension: { type: "string", enum: ["device", "age", "geography"], description: "Which audience dimension to break down" },
      },
      required: ["dimension"],
    },
    execute({ dimension } = {}) {
      const key = dimension === "geo" ? "geography" : dimension;
      const a = storeAudience();
      const dim = a[key];
      if (!dim) return fail(`Unknown dimension "${dimension}" — valid: device, age, geography.`);
      const data = {
        dimension: key,
        blendedCmRoas: a.blendedCmRoas,
        segments: dim.segments.map((s) => ({ segment: s.label, spendSharePct: s.spendSharePct, orderSharePct: s.orderSharePct, spend: s.spend, orders: s.orders, cmRoas: s.cmRoas, vsBlended: s.vsBlended })),
      };
      return ok(
        data,
        [{ label: "Marketing", href: "/marketing" }],
        FRESH_ADS,
        "Paid orders only. Rank best/worst strictly by the cmRoas number — higher is better."
      );
    },
  },
  {
    name: "cash_calendar",
    description: "What reordering everything that needs it will cost: supplier deposits due now, balances due later grouped by payment terms, per-product reorder costs. NOT a bank balance — reorder commitments only.",
    parameters: { type: "object", properties: {} },
    execute() {
      const c = cashCalendar();
      const data = {
        totalDepositDueNow: c.totalDepositDue,
        totalBalanceDueLater: c.totalBalanceDue,
        totalCommitted: c.totalCommitted,
        byTerms: c.byTerms,
        items: c.items.map((i) => ({
          id: i.id, name: i.name, urgent: i.urgent,
          totalCost: i.reorderCostTotal, depositDue: i.depositDue, balanceDue: i.balanceDue,
          paymentTerms: i.paymentTerms, cashEstimated: i.cashEstimated,
        })),
      };
      return ok(data, [{ label: "Insights", href: "/insights" }, { label: "Data Collection", href: "/data-collection" }], FRESH_CASH);
    },
  },
  {
    name: "inventory_runway",
    description: "One product's stock runway and reorder math: on-hand units, trend-adjusted daily velocity, projected days to stockout, lead time, reorder point, suggested reorder quantity, and whether a reorder is needed NOW.",
    parameters: {
      type: "object",
      properties: {
        productId: { type: "string", description: "Product id (or SKU/name — fuzzy resolved)" },
      },
      required: ["productId"],
    },
    execute({ productId } = {}) {
      const { id, candidates } = resolveToId(productId);
      if (!id) return fail(`No product matched "${productId}".`, candidates.length ? { candidates } : null);
      const p = oneProduct(id);
      const data = {
        id: p.id, name: p.name,
        onHand: p.onHand,
        dailyVelocity: p.dailyVelocity,
        projectedDailyVelocity: p.projectedDailyVelocity,
        projectedDaysToStockout: p.projectedDaysToStockout,
        daysOfCover: p.daysOfCover,
        leadTimeDaysUsed: p.leadTimeDaysUsed,
        safetyStockDaysUsed: p.safetyStockDaysUsed,
        reorderPointUnits: p.reorderPointUnits,
        suggestedReorderQty: p.suggestedReorderQty,
        needsReorderNow: p.needsReorderNow,
        stockoutRisk: p.stockoutRisk,
        reorderCostTotal: p.reorderCostTotal,
        reorderDepositDue: p.reorderDepositDue,
        supplier: p.supplier,
        supplyEstimated: p.supplyEstimated,
      };
      return ok(
        data,
        [productLink(p), { label: "Data Collection", href: "/data-collection" }],
        FRESH_SUPPLY,
        p.supplyEstimated ? "Lead time / safety stock use conservative defaults — the merchant hasn't supplied real values." : undefined
      );
    },
  },
  {
    name: "simulate_budget_change",
    description: "What-if: change one ad channel's budget (or the blended total) by a percentage. Straight-line projection of spend, orders, and contribution margin at TODAY'S CAC and CM-ROAS — read the assumptions before quoting the top end.",
    parameters: {
      type: "object",
      properties: {
        channelId: { type: "string", enum: ["meta", "google", "tiktok", "snapchat", "twitter"], description: "Optional — omit to project on the blended totals across all channels" },
        changePct: { type: "number", description: "Budget change in percent, e.g. 25 for +25%, -100 to cut entirely" },
      },
      required: ["changePct"],
    },
    execute({ channelId, changePct } = {}) {
      if (typeof changePct !== "number" || Number.isNaN(changePct)) return fail("changePct must be a number, e.g. 25 for +25%.");
      const m = marketingData();
      const channel = channelId ? m.channels.find((c) => c.id === channelId) : null;
      if (channelId && !channel) return fail(`Unknown channelId "${channelId}" — valid: ${m.channels.map((c) => c.id).join(", ")}.`);
      const cac = channel ? channel.cac : m.totals.cac;
      const spend = channel ? channel.spend : m.totals.spend;
      const cmRoas = channel ? channel.cmRoas : m.totals.cmRoas;
      const name = channel ? channel.name : "All channels (blended)";
      const newSpend = Math.max(0, Math.round(spend * (1 + changePct / 100)));
      const currentOrders = channel ? channel.orders : m.totals.orders;
      const projectedOrders = Math.round(newSpend / cac);
      const data = {
        channel: name,
        channelId: channel ? channel.id : null,
        changePct,
        cacUsed: cac,
        cmRoasUsed: cmRoas,
        currentSpend: spend,
        newSpend,
        currentOrders,
        projectedOrders,
        deltaOrders: projectedOrders - currentOrders,
        currentCm: Math.round(spend * cmRoas),
        projectedCm: Math.round(newSpend * cmRoas),
        assumptions: [
          `Straight-line at today's ${money(cac)} CAC — CAC RISES as spend scales (audience saturation / diminishing returns), so budget increases will land worse than this projects, and cuts a little better.`,
          "Only the PAID slice of orders moves with budget — earned orders (organic, direct, email) do not scale with ad spend.",
          "Ad platform data restates for ~24h, so today's CAC and CM-ROAS are directional.",
        ],
      };
      return ok(data, [{ label: "Marketing", href: "/marketing" }], FRESH_ADS);
    },
  },
  {
    name: "simulate_price_change",
    description: "What-if: change one product's price by a percentage. Recomputes per-unit CM1/CM2 at the new price from the product's REAL unit cost, shipping, fees, and returns — volume held constant because demand elasticity is not tracked.",
    parameters: {
      type: "object",
      properties: {
        productId: { type: "string", description: "Product id (or SKU/name — fuzzy resolved)" },
        changePct: { type: "number", description: "Price change in percent, e.g. 10 for +10%, -20 for a 20% cut" },
      },
      required: ["productId", "changePct"],
    },
    execute({ productId, changePct } = {}) {
      if (typeof changePct !== "number" || Number.isNaN(changePct)) return fail("changePct must be a number, e.g. 10 for +10%.");
      const { id, candidates } = resolveToId(productId);
      if (!id) return fail(`No product matched "${productId}".`, candidates.length ? { candidates } : null);
      const p = oneProduct(id);
      if (!p.units) return fail(`${p.name} sold no units this period — per-unit math isn't meaningful.`);

      // Per-unit economics off the derived record — price is revenue/units,
      // never a stored number.
      const perUnit = {
        price: round2(p.revenue / p.units),
        unitCost: p.unitCost,
        shipping: round2(p.shipping / p.units),
        fees: round2(p.fees / p.units),
        returns: round2(p.returns / p.units),
        adSpend: round2(p.adSpend / p.units),
      };
      const unitCosts = perUnit.unitCost + perUnit.shipping + perUnit.fees + perUnit.returns;
      const newPrice = round2(perUnit.price * (1 + changePct / 100));
      const currentCm1 = round2(perUnit.price - unitCosts);
      const newCm1 = round2(newPrice - unitCosts);
      const currentCm2 = round2(currentCm1 - perUnit.adSpend);
      const newCm2 = round2(newCm1 - perUnit.adSpend);

      const data = {
        id: p.id,
        name: p.name,
        changePct,
        unitsThisPeriod: p.units,
        perUnit,
        current: {
          pricePerUnit: perUnit.price,
          cm1PerUnit: currentCm1, cm1Pct: pctOf(currentCm1, perUnit.price),
          cm2PerUnit: currentCm2, cm2Pct: pctOf(currentCm2, perUnit.price),
        },
        projected: {
          pricePerUnit: newPrice,
          cm1PerUnit: newCm1, cm1Pct: pctOf(newCm1, newPrice),
          cm2PerUnit: newCm2, cm2Pct: pctOf(newCm2, newPrice),
          cm1TotalAtCurrentVolume: Math.round(newCm1 * p.units),
          cm2TotalAtCurrentVolume: Math.round(newCm2 * p.units),
        },
        assumptions: [
          "Demand elasticity is UNKNOWN — volume is held constant. A price change WILL move volume; the data cannot predict by how much, so present that as an explicit unknown, not a guess.",
          "Per-unit shipping, fees, and returns held at today's rates (payment fees actually scale slightly with price).",
          "Ad spend per unit held constant.",
        ],
      };
      return ok(
        data,
        [productLink(p), { label: "Products", href: "/products" }],
        FRESH_MATH,
        p.estimated ? "This SKU's COGS is ESTIMATED — the per-unit margins are directional." : undefined
      );
    },
  },
];

// Small store snapshot for the agent's system prompt — enough grounding to
// answer "how's the store" without a tool call, WITHOUT the full context dump
// (the whole point of the agentic upgrade is fetching detail on demand).
export function buildBrandSnapshot() {
  const s = productsSummary();
  const products = allProducts();
  return {
    store: STORE.name,
    periodLabel: "the current reporting period",
    revenue: s.revenue,
    cm1: s.cm1, cm1Pct: s.cm1Pct,
    cm2: s.cm2, cm2Pct: s.cm2Pct,
    cm3: s.cm3, cm3Pct: s.cm3Pct,
    cmRoas: s.cmRoas,
    unitsSold: s.units,
    productCount: products.length,
    losingMoneyCount: products.filter((p) => p.losingMoney).length,
    skusWithEstimatedCosts: s.estimatedCount,
    productsWithReturns: returnsRanking().length,
  };
}
