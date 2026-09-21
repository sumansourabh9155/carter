// THE MARGIN ENGINE — the one piece that must stay real even on mock data.
// Everything CM-related is derived here from raw inputs. No screen, mock, or
// seed file is allowed to hardcode CM1/CM2/CM3/CM-ROAS.

import { classifyLifecycleStage } from "@/lib/compute/lifecycle";
import { SKU_CHANNEL_MIX } from "@/lib/data/skuChannelMix";

/*
  ATTRIBUTION — the correction that reprices the whole product.

  CM-ROAS used to be `total CM1 ÷ ad spend`. CM1 is every dollar of margin the
  SKU made, including the organic, direct and email orders ads had nothing to
  do with. Across this catalogue ads drive ~35% of orders, so that formula
  credited paid media with roughly three times the margin it earned: a store
  CM-ROAS of 3.29x against an honest 1.17x.

  That is the exact failure this product exists to call out. There is a card
  on the Channels view shaming Meta for claiming 37% more revenue than Carter
  can verify; the headline number was overstating by 181%.

  So: ads are credited ONLY with the paid slice. `paidShare` is per-SKU, from
  the same UTM/pixel attribution lib/compute/channelMix.js uses, so the store
  number and the per-channel numbers rest on one set of assumptions.

  Two margins now exist and they answer different questions:
    cm2       = cm1 − adSpend        the P&L line. What the SKU contributed.
    mediaCm2  = paidCm1 − adSpend    the MEDIA verdict. Did the ads pay?
  A SKU can be comfortably profitable overall and still have media that
  destroys value. Four SKUs in this catalogue are exactly that, and the old
  model called every one of them healthy.
*/
const DEFAULT_PAID_SHARE = 0.34; // catalogue-weighted average, used only if a SKU has no attribution yet

export function paidShareFor(id) {
  return SKU_CHANNEL_MIX[id]?.paidShare ?? DEFAULT_PAID_SHARE;
}

const MARGIN_HIGH = 50; // CM1% threshold for the Heroes & Anchors matrix
const VELOCITY_HIGH = 600; // units/period threshold (≈ median of the catalog)

const PERIOD_DAYS = 30; // the reporting window the seed data represents

// Fallbacks when the merchant hasn't supplied lead time / safety stock yet —
// conservative apparel-import defaults, always flagged as estimated so the
// reorder math is never presented with false confidence.
const DEFAULT_LEAD_TIME_DAYS = 21;
const DEFAULT_SAFETY_STOCK_DAYS = 10;
const REORDER_REVIEW_WINDOW_DAYS = 30; // how far ahead a reorder should cover
const DEFAULT_DEPOSIT_PCT = 30; // common apparel-import deposit when unknown
const DEFAULT_PAYMENT_TERMS = "Net 30";

// THE MARGIN CORE — revenue in, contribution margin out. Extracted so the
// CURRENT and the PRIOR period run through byte-identical math; a delta
// computed from two runs of this function can never disagree with the figures
// it compares. Takes only the raw inputs that move period to period; unit
// economics (manufacturing/delivery/packaging/duties) come from the SKU record
// and are held constant across the two windows.
function marginCore({ units, revenue, fees, returns, adSpend, overheadAlloc }, unitCost, deliveryCost, paidShare) {
  const cogs = round(unitCost * units);
  const shipping = round((deliveryCost || 0) * units);

  const cm1 = revenue - cogs - shipping - fees - returns;
  const cm2 = cm1 - adSpend;
  const cm3 = cm2 - overheadAlloc;

  // The slice ads can claim. Everything downstream that judges MEDIA uses
  // these, never the totals.
  const paidRevenue = round(revenue * paidShare);
  const paidCm1 = round(cm1 * paidShare);
  const mediaCm2 = paidCm1 - adSpend;

  return {
    units, revenue, fees, returns, adSpend,
    cogs, shipping,
    cm1, cm2, cm3,
    cm1Pct: pctOf(cm1, revenue),
    cm2Pct: pctOf(cm2, revenue),
    cm3Pct: pctOf(cm3, revenue),
    paidSharePct: round1(paidShare * 100),
    paidRevenue,
    paidCm1,
    mediaCm2,
    // CM-ROAS = margin the ADS generated, per ad dollar. Total CM1 here is
    // what made the old number a vanity metric.
    cmRoas: adSpend > 0 ? round2(paidCm1 / adSpend) : null,
    revRoas: adSpend > 0 ? round2(paidRevenue / adSpend) : null,
    // Per UNIT, and named that way. It was called cm2PerOrder while dividing
    // by units — at 2.3 units an order that understated the per-order figure
    // by more than half, on the one number meant to make a loss feel real.
    cm2PerUnit: units > 0 ? round2(cm2 / units) : 0,
    mediaCm2PerUnit: units > 0 ? round2(mediaCm2 / units) : 0,
  };
}

// Derive the full margin + supply picture for one raw SKU record.
export function deriveSku(raw) {
  // Landed COGS per unit = manufacturing + packaging + duties (all merchant-supplied).
  const packaging = raw.packagingCost || 0;
  const duties = raw.manufacturingCost * ((raw.dutiesPct || 0) / 100);
  const unitCost = round2(raw.manufacturingCost + packaging + duties);

  const paidShare = paidShareFor(raw.id);
  const cur = marginCore(raw, unitCost, raw.deliveryCost, paidShare);
  const { cogs, shipping, cm1, cm2, cm3, cm1Pct, cm2Pct, cm3Pct, cmRoas, revRoas, paidCm1, paidRevenue, mediaCm2 } = cur;

  // PRIOR PERIOD — same engine, same unit economics, same attribution, last
  // window's raw inputs. Overhead is a fixed allocation pool, so it carries
  // over unchanged.
  const prev = raw.prev
    ? marginCore({ ...raw.prev, overheadAlloc: raw.overheadAlloc }, unitCost, raw.deliveryCost, paidShare)
    : null;
  const delta = prev ? diffPeriods(cur, prev) : null;

  const estimated = raw.costSource !== "real";
  const quadrant = classifyQuadrant(cm1Pct, raw.units);

  // Supply signals (need merchant data: onHand + leadTimeDays).
  const dailyVelocity = round2(raw.units / PERIOD_DAYS);
  const daysOfCover = raw.onHand != null && dailyVelocity > 0 ? Math.round(raw.onHand / dailyVelocity) : null;
  const stockoutRisk = daysOfCover != null && raw.leadTimeDays != null ? daysOfCover < raw.leadTimeDays : false;

  // Demand & supply projection — trend-adjusted, not flat-pace. Falls back
  // to conservative defaults (flagged via supplyEstimated) when the
  // merchant hasn't supplied lead time / safety stock.
  const supplyEstimated = raw.leadTimeDays == null || raw.safetyStockDays == null;
  const leadTimeDaysUsed = raw.leadTimeDays ?? DEFAULT_LEAD_TIME_DAYS;
  const safetyStockDaysUsed = raw.safetyStockDays ?? DEFAULT_SAFETY_STOCK_DAYS;
  const trendMultiplier = 1 + (raw.trendPct || 0) / 100;
  const projectedDailyVelocity = Math.max(0, round2(dailyVelocity * trendMultiplier));
  const projectedDaysToStockout = projectedDailyVelocity > 0 && raw.onHand != null
    ? Math.round(raw.onHand / projectedDailyVelocity)
    : null;
  const safetyStockUnits = round(projectedDailyVelocity * safetyStockDaysUsed);
  const reorderPointUnits = round(projectedDailyVelocity * leadTimeDaysUsed + safetyStockUnits);
  const needsReorderNow = raw.onHand != null && raw.onHand <= reorderPointUnits;
  const targetCoverUnits = round(projectedDailyVelocity * (leadTimeDaysUsed + REORDER_REVIEW_WINDOW_DAYS) + safetyStockUnits);
  let suggestedReorderQty = needsReorderNow ? Math.max(0, targetCoverUnits - (raw.onHand || 0)) : 0;
  if (suggestedReorderQty > 0 && raw.moq) {
    suggestedReorderQty = Math.ceil(suggestedReorderQty / raw.moq) * raw.moq;
  }
  suggestedReorderQty = round(suggestedReorderQty);

  // Cash impact of that reorder — lives in the supplier contract, not the ad
  // account, so no DSP or ad platform can ever know it. Falls back to a
  // common apparel-import deposit/terms when the merchant hasn't supplied
  // its own, flagged via cashEstimated. Feeds the portfolio-wide cash
  // calendar (lib/compute/cashCalendar.js), not a per-SKU card.
  const cashEstimated = raw.depositPct == null || raw.paymentTerms == null;
  const depositPctUsed = raw.depositPct ?? DEFAULT_DEPOSIT_PCT;
  const paymentTermsUsed = raw.paymentTerms ?? DEFAULT_PAYMENT_TERMS;
  const reorderCostTotal = round(suggestedReorderQty * unitCost);
  const reorderDepositDue = round(reorderCostTotal * (depositPctUsed / 100));
  const reorderBalanceDue = reorderCostTotal - reorderDepositDue;

  return {
    ...raw,
    unitCost,
    cogs,
    shipping,
    cm1, cm2, cm3,
    cm1Pct, cm2Pct, cm3Pct,
    cmRoas, revRoas,
    paidShare,
    paidSharePct: cur.paidSharePct,
    paidRevenue, paidCm1, mediaCm2,
    cm2PerUnit: cur.cm2PerUnit,
    mediaCm2PerUnit: cur.mediaCm2PerUnit,
    estimated,
    cogsSource: raw.costSource,
    quadrant,
    // TWO VERDICTS, deliberately separate.
    //   mediaLosing    the ads cost more margin than they brought in. This is
    //                  the one that drives "Cut ads", because it is the only
    //                  one a budget decision can fix.
    //   losingMoney    the SKU is underwater overall after ad spend. Rarer,
    //                  and usually a pricing or COGS problem, not a media one.
    // They used to be the same flag, keyed on the total. That called four
    // SKUs healthy whose media was destroying value.
    mediaLosing: mediaCm2 < 0,
    losingMoney: cm2 < 0,
    dailyVelocity,
    daysOfCover,
    stockoutRisk,
    projectedDailyVelocity,
    projectedDaysToStockout,
    reorderPointUnits,
    needsReorderNow,
    suggestedReorderQty,
    leadTimeDaysUsed,
    safetyStockDaysUsed,
    supplyEstimated,
    lifecycleStage: classifyLifecycleStage(raw),
    reorderCostTotal,
    reorderDepositDue,
    reorderBalanceDue,
    depositPctUsed,
    paymentTermsUsed,
    cashEstimated,
    prev,
    delta,
  };
}

// THE METRICS THAT CARRY A PRIOR. Ratios (cm1Pct, cmRoas) diff in POINTS /
// multiples, not percent-of-percent — "CM-ROAS fell 0.4×" is a sentence an
// operator can act on; "CM-ROAS fell 19%" is one they have to decode.
const DELTA_ABSOLUTE = ["revenue", "adSpend", "units", "cm1", "cm2", "cm3", "fees", "returns", "paidCm1", "mediaCm2"];
const DELTA_POINTS = ["cm1Pct", "cm2Pct", "cm3Pct", "cmRoas", "revRoas"];

/**
 * Period-over-period diff between two runs of the margin core.
 * @returns {Object} metric → { abs, pct, dir } — `pct` is null where a
 *   percentage change is meaningless (ratio metrics, or a zero prior base).
 */
export function diffPeriods(cur, prev) {
  const out = {};
  for (const k of DELTA_ABSOLUTE) {
    const a = cur[k] ?? 0;
    const b = prev[k] ?? 0;
    const abs = round(a - b);
    // A percentage change off a zero (or sign-flipped) base is noise, not
    // information — CM2 going −$400 → +$200 is not "150% better".
    const pct = b > 0 && a >= 0 ? round1(((a - b) / b) * 100) : null;
    out[k] = { abs, pct, dir: dirOf(abs) };
  }
  for (const k of DELTA_POINTS) {
    if (cur[k] == null || prev[k] == null) { out[k] = { abs: null, pct: null, dir: "flat" }; continue; }
    const abs = round2(cur[k] - prev[k]);
    out[k] = { abs, pct: null, dir: dirOf(abs) };
  }
  return out;
}

// Anything under half a percent of movement is period noise, not a trend.
const FLAT_EPSILON = 0.005;
function dirOf(v) {
  if (v == null || Math.abs(v) < FLAT_EPSILON) return "flat";
  return v > 0 ? "up" : "down";
}

export function classifyQuadrant(cm1Pct, units) {
  const highMargin = cm1Pct >= MARGIN_HIGH;
  const highVelocity = units >= VELOCITY_HIGH;
  if (highMargin && highVelocity) return "hero";
  if (highMargin && !highVelocity) return "cashcow";
  if (!highMargin && highVelocity) return "trafficdriver";
  return "anchor";
}

export const QUADRANT_META = {
  hero: { label: "Hero", desc: "High margin · high velocity", color: "#2e7d32" },
  cashcow: { label: "Cash Cow", desc: "High margin · low velocity", color: "#0277bd" },
  trafficdriver: { label: "Traffic Driver", desc: "Low margin · high velocity", color: "#ef6c00" },
  anchor: { label: "Anchor", desc: "Low margin · low velocity", color: "#ef4444" },
};

// Sums one period's worth of derived SKUs into a single set of totals. Used
// for the current window and — over each SKU's `prev` block — for the prior
// one, so a rollup's delta is built the same way a SKU's is.
function totals(rows) {
  const sum = (k) => rows.reduce((a, s) => a + (s?.[k] ?? 0), 0);
  const revenue = sum("revenue");
  const cm1 = sum("cm1");
  const cm2 = sum("cm2");
  const cm3 = sum("cm3");
  const adSpend = sum("adSpend");
  // Summed from each SKU's own paid slice, never re-derived off the totals —
  // paidShare varies 25%–48% across this catalogue, so a blended share
  // applied to the total would be a different (and wrong) number.
  const paidRevenue = sum("paidRevenue");
  const paidCm1 = sum("paidCm1");
  const mediaCm2 = paidCm1 - adSpend;
  return {
    revenue,
    cogs: sum("cogs"),
    shipping: sum("shipping"),
    fees: sum("fees"),
    returns: sum("returns"),
    adSpend,
    cm1, cm2, cm3,
    cm1Pct: pctOf(cm1, revenue),
    cm2Pct: pctOf(cm2, revenue),
    cm3Pct: pctOf(cm3, revenue),
    paidRevenue, paidCm1, mediaCm2,
    paidSharePct: revenue ? round1((paidRevenue / revenue) * 100) : 0,
    cmRoas: adSpend > 0 ? round2(paidCm1 / adSpend) : null,
    revRoas: adSpend > 0 ? round2(paidRevenue / adSpend) : null,
    units: sum("units"),
  };
}

// Store-wide rollup from the per-SKU derivations.
export function aggregate(skus) {
  const cur = totals(skus);
  // Only SKUs that actually carry a prior contribute to the prior total —
  // otherwise a SKU missing history would silently read as a period of zero
  // revenue and blow the delta out.
  const withPrev = skus.filter((s) => s.prev);
  const prev = withPrev.length ? totals(withPrev.map((s) => s.prev)) : null;

  return {
    ...cur,
    overhead: skus.reduce((a, s) => a + (s.overheadAlloc ?? 0), 0),
    estimatedCount: skus.filter((s) => s.estimated).length,
    mediaLosingCount: skus.filter((s) => s.mediaLosing).length,
    prev,
    // Comparable only when every SKU in the set has a prior; a partial base
    // would understate the prior period and overstate every delta off it.
    delta: prev && withPrev.length === skus.length ? diffPeriods(cur, prev) : null,
  };
}

function pctOf(part, whole) {
  if (!whole) return 0;
  return round1((part / whole) * 100);
}
function round(v) { return Math.round(v); }
function round1(v) { return Math.round(v * 10) / 10; }
function round2(v) { return Math.round(v * 100) / 100; }
