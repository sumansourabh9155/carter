// THE MARGIN ENGINE — the one piece that must stay real even on mock data.
// Everything CM-related is derived here from raw inputs. No screen, mock, or
// seed file is allowed to hardcode CM1/CM2/CM3/CM-ROAS.

import { classifyLifecycleStage } from "@/lib/compute/lifecycle";

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

// Derive the full margin + supply picture for one raw SKU record.
export function deriveSku(raw) {
  // Landed COGS per unit = manufacturing + packaging + duties (all merchant-supplied).
  const packaging = raw.packagingCost || 0;
  const duties = raw.manufacturingCost * ((raw.dutiesPct || 0) / 100);
  const unitCost = round2(raw.manufacturingCost + packaging + duties);
  const cogs = round(unitCost * raw.units);
  const shipping = round((raw.deliveryCost || 0) * raw.units);

  const cm1 = raw.revenue - cogs - shipping - raw.fees - raw.returns;
  const cm2 = cm1 - raw.adSpend;
  const cm3 = cm2 - raw.overheadAlloc;

  const cm1Pct = pctOf(cm1, raw.revenue);
  const cm2Pct = pctOf(cm2, raw.revenue);
  const cm3Pct = pctOf(cm3, raw.revenue);

  // CM-ROAS = contribution margin generated per ad dollar (CM1 basis).
  const cmRoas = raw.adSpend > 0 ? round2(cm1 / raw.adSpend) : null;
  const revRoas = raw.adSpend > 0 ? round2(raw.revenue / raw.adSpend) : null;

  const estimated = raw.costSource !== "real";
  const quadrant = classifyQuadrant(cm1Pct, raw.units);
  const cm2PerOrder = raw.units > 0 ? round2(cm2 / raw.units) : 0;

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
    cm2PerOrder,
    estimated,
    cogsSource: raw.costSource,
    quadrant,
    losingMoney: cm2 < 0, // unprofitable after ad spend
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
  };
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
  cashcow: { label: "Cash Cow", desc: "High margin · low velocity", color: "#00838f" },
  trafficdriver: { label: "Traffic Driver", desc: "Low margin · high velocity", color: "#ffa000" },
  anchor: { label: "Anchor", desc: "Low margin · low velocity", color: "#ef4444" },
};

// Store-wide rollup from the per-SKU derivations.
export function aggregate(skus) {
  const sum = (k) => skus.reduce((a, s) => a + s[k], 0);
  const revenue = sum("revenue");
  const cm1 = sum("cm1");
  const cm2 = sum("cm2");
  const cm3 = sum("cm3");
  const adSpend = sum("adSpend");
  return {
    revenue,
    cogs: sum("cogs"),
    shipping: sum("shipping"),
    fees: sum("fees"),
    returns: sum("returns"),
    adSpend,
    overhead: sum("overheadAlloc"),
    cm1, cm2, cm3,
    cm1Pct: pctOf(cm1, revenue),
    cm2Pct: pctOf(cm2, revenue),
    cm3Pct: pctOf(cm3, revenue),
    cmRoas: adSpend > 0 ? round2(cm1 / adSpend) : null,
    units: sum("units"),
    estimatedCount: skus.filter((s) => s.estimated).length,
  };
}

function pctOf(part, whole) {
  if (!whole) return 0;
  return round1((part / whole) * 100);
}
function round(v) { return Math.round(v); }
function round1(v) { return Math.round(v * 10) / 10; }
function round2(v) { return Math.round(v * 100) / 100; }
