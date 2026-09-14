// ACTION SIMULATOR — "what happens to the numbers if we do this?"
// Grounded math only: every figure traces to the margin engine (deriveSku
// fields on the passed product) or the marketing engine (channel CM-ROAS /
// CAC). Where a real unknown exists (demand elasticity, CAC at scale,
// promo sell-through) the simulation says so in assumptions and downgrades
// confidence instead of inventing precision.

import { marketingData } from "@/lib/api/mock/marketing";
import { money, pct, multiple } from "@/lib/format";

/**
 * @typedef {Object} Simulation
 * @property {string} headline  one-line "if you do this" summary
 * @property {number} cm2DeltaMonthly  expected monthly CM2 change, $ (+ good)
 * @property {number} cashImpact  cash committed (−) / freed or at stake (+) now, $
 * @property {string[]} assumptions  what the math takes on faith
 * @property {"High"|"Medium"|"Low"} confidence
 */

// Catalog-average paid share when a SKU has no channel attribution yet
// (see lib/compute/channelMix.js — consistent with the Website tab split).
const DEFAULT_PAID_SHARE_PCT = 34;

const round = (v) => Math.round(v);

/**
 * @param {{ type: string, params?: Object }} action
 * @param {Object} [product]  margin-derived product (oneProduct) when the action targets a SKU
 * @returns {Simulation}
 */
export function simulateAction(action, product) {
  switch (action?.type) {
    case "pause_ads": return simPauseAds(product);
    case "reorder": return simReorder(product);
    case "shift_budget": return simShiftBudget(product);
    case "price_change": return simPriceChange(action, product);
    case "clear_stock_promo": return simClearStockPromo(action, product);
    case "create_alert": return simCreateAlert(product);
    default:
      return {
        headline: `Unknown action type "${action?.type}"`,
        cm2DeltaMonthly: 0,
        cashImpact: 0,
        assumptions: ["Action type is not in ACTION_TYPES — nothing simulated"],
        confidence: "Low",
      };
  }
}

function unresolvedSku(label) {
  return {
    headline: `${label} — SKU could not be resolved`,
    cm2DeltaMonthly: 0,
    cashImpact: 0,
    assumptions: ["Pass the derived product (oneProduct) for grounded math"],
    confidence: "Low",
  };
}

function simPauseAds(p) {
  if (!p) return unresolvedSku("Pause ads");
  const paidSharePct = p.channelPerformance?.paidSharePct ?? DEFAULT_PAID_SHARE_PCT;
  const paidShareSource = p.channelPerformance?.paidSharePct != null
    ? "UTM/pixel attribution"
    : "catalog average (no per-SKU attribution yet)";

  if (p.losingMoney) {
    // Every month of ads at this budget burns |CM2|. Pausing stops the burn;
    // the forfeited paid sales were the ones losing the money.
    return {
      headline: `Stop a ${money(Math.abs(p.cm2))}/mo loss on ${p.name}`,
      cm2DeltaMonthly: round(Math.abs(p.cm2)),
      cashImpact: round(p.adSpend),
      assumptions: [
        `Forfeits the paid slice of sales — ${pct(paidSharePct)} of orders (${paidShareSource})`,
        `${money(p.adSpend)}/mo of ad spend stops leaving the account immediately`,
        `Assumes organic/direct demand (${pct(100 - paidSharePct)} of sales) holds without ad support`,
      ],
      confidence: "High",
    };
  }

  // Profitable SKU: saving the spend costs the paid slice of CM1.
  const paidCm1Forfeited = round(p.cm1 * (paidSharePct / 100));
  const net = round(p.adSpend - paidCm1Forfeited);
  return {
    headline: `Pausing ${p.name} ads nets ${money(net)}/mo — it is profitable after ad spend today`,
    cm2DeltaMonthly: net,
    cashImpact: round(p.adSpend),
    assumptions: [
      `Forfeits ~${money(paidCm1Forfeited)}/mo of CM1 from the paid slice (${pct(paidSharePct)} of sales, ${paidShareSource})`,
      `Saves ${money(p.adSpend)}/mo of ad spend`,
      "Assumes paid demand does not convert organically once ads stop",
    ],
    confidence: "Medium",
  };
}

function simReorder(p) {
  if (!p) return unresolvedSku("Reorder");
  const qty = p.suggestedReorderQty || 0;
  if (!qty) {
    return {
      headline: `${p.name} does not need a reorder yet`,
      cm2DeltaMonthly: 0,
      cashImpact: 0,
      assumptions: [
        `On hand (${p.onHand?.toLocaleString() ?? "—"}) is above the reorder point (${p.reorderPointUnits?.toLocaleString() ?? "—"} units)`,
      ],
      confidence: "High",
    };
  }
  const protectedRunRate = Math.max(0, round(p.cm2));
  return {
    headline: `Reorder ${qty.toLocaleString()} units of ${p.name} — ${money(p.reorderDepositDue)} deposit now, ${money(p.reorderCostTotal)} total`,
    cm2DeltaMonthly: protectedRunRate,
    cashImpact: -round(p.reorderCostTotal),
    assumptions: [
      `Protects a ${money(protectedRunRate)}/mo CM2 run-rate a stockout would zero out — not new profit`,
      `Deposit ${money(p.reorderDepositDue)} (${pct(p.depositPctUsed, { decimals: 0 })}) due now; ${money(p.reorderBalanceDue)} on ${p.paymentTermsUsed}${p.cashEstimated ? " (terms estimated)" : ""}`,
      `Sized for lead time ${p.leadTimeDaysUsed}d + 30d cover + safety stock${p.supplyEstimated ? " (lead time/safety stock estimated)" : ""}`,
    ],
    confidence: p.supplyEstimated || p.cashEstimated ? "Medium" : "High",
  };
}

function simShiftBudget(p) {
  const mkt = marketingData();
  const rec = mkt.recommendation;

  // Product-level scale: push the SKU's best channel, funded from the store's
  // weakest channel so total spend stays flat.
  const best = p?.channelPerformance?.best;
  if (p && best && best.cmRoas != null) {
    const fromRoas = rec?.from?.cmRoas ?? 1; // worst case: reallocating from break-even
    const amount = Math.max(50, Math.round((p.adSpend * 0.2) / 50) * 50);
    const delta = round(amount * (best.cmRoas - fromRoas));
    return {
      headline: `Shift ${money(amount)}/mo toward ${p.name} on ${best.name} (${multiple(best.cmRoas)} CM-ROAS)`,
      cm2DeltaMonthly: delta,
      cashImpact: amount,
      assumptions: [
        "Straight-line at current CM-ROAS — CAC rises with scale, so treat this as an upper bound",
        rec?.from
          ? `Funded by trimming ${rec.from.name} (${multiple(rec.from.cmRoas)} CM-ROAS); total spend unchanged`
          : "Funded from the weakest channel; total spend unchanged",
        `SKU×channel sample is ${best.confidence} confidence (${best.units} paid orders)`,
      ],
      confidence: best.confidence === "low" ? "Low" : "Medium",
    };
  }

  // Store-level reallocation: weakest → strongest channel.
  if (!rec) {
    return {
      headline: "No reallocation edge between channels right now",
      cm2DeltaMonthly: 0,
      cashImpact: 0,
      assumptions: ["Channels are too close on CM-ROAS to justify a shift"],
      confidence: "Low",
    };
  }
  const from = mkt.channels.find((c) => c.id === rec.from.id) || rec.from;
  const to = mkt.channels.find((c) => c.id === rec.to.id) || rec.to;
  const amount = rec.amount;
  const delta = round(amount * (to.cmRoas - from.cmRoas));
  const ordersGained = to.cac ? Math.round(amount / to.cac) : null;
  const ordersLost = from.cac ? Math.round(amount / from.cac) : null;
  return {
    headline: `Shift ${money(amount)}/mo from ${from.name} (${multiple(from.cmRoas)}) to ${to.name} (${multiple(to.cmRoas)}) ≈ ${money(delta)}/mo CM2`,
    cm2DeltaMonthly: delta,
    cashImpact: amount,
    assumptions: [
      `Straight-line at current CAC (${money(to.cac)} on ${to.name}) — CAC rises with scale, so treat this as an upper bound`,
      ordersGained != null && ordersLost != null
        ? `~${ordersGained} orders gained on ${to.name} vs ~${ordersLost} lost on ${from.name}`
        : "Order math needs per-channel CAC",
      "Net-neutral to total ad spend — budget moves, it doesn't grow",
    ],
    confidence: "Medium",
  };
}

function simPriceChange(action, p) {
  if (!p || !p.units) return unresolvedSku("Price change");
  const pricePct = action?.params?.pricePct ?? 5;
  const price = p.revenue / p.units;
  const cm1PerUnit = p.cm1 / p.units;
  const upliftPerUnit = price * (pricePct / 100);
  const newCm1PerUnit = cm1PerUnit + upliftPerUnit;
  const delta = round(upliftPerUnit * p.units);
  return {
    headline: `+${pct(pricePct, { decimals: 0 })} on ${p.name}: per-unit CM1 ${money(cm1PerUnit, { decimals: 2 })} → ${money(newCm1PerUnit, { decimals: 2 })}`,
    cm2DeltaMonthly: delta,
    cashImpact: 0,
    assumptions: [
      "Assumes zero volume elasticity — real demand response is unknown, so this is a ceiling",
      `Average selling price ${money(price, { decimals: 2 })} → ${money(price * (1 + pricePct / 100), { decimals: 2 })}`,
      p.priceFloor != null ? `Price floor on file: ${money(p.priceFloor)}` : "No price floor on file",
    ],
    confidence: "Low",
  };
}

function simClearStockPromo(action, p) {
  if (!p || p.onHand == null) return unresolvedSku("Clear stock");
  const discountPct = action?.params?.discountPct ?? 20;
  const inventoryValue = round(p.onHand * p.unitCost);
  const maxDiscountCost = round(inventoryValue * (discountPct / 100));
  return {
    headline: `Clear ${p.onHand.toLocaleString()} units of ${p.name} at ${pct(discountPct, { decimals: 0 })} off — costs at most ${money(maxDiscountCost)}`,
    cm2DeltaMonthly: -maxDiscountCost,
    cashImpact: -maxDiscountCost,
    assumptions: [
      `Upper bound: assumes the full ${money(inventoryValue)} of on-hand inventory (at cost) sells through at the discount`,
      "Discount cost modeled as onHand × unit cost × discount%",
      p.daysOfCover != null
        ? `Frees cash off the shelf — ${p.daysOfCover} days of cover today`
        : "Frees cash off the shelf — days of cover unknown",
    ],
    confidence: "Medium",
  };
}

function simCreateAlert(p) {
  return {
    headline: p ? `Watch ${p.name} — alert on the next material change` : "Create a watchlist alert",
    cm2DeltaMonthly: 0,
    cashImpact: 0,
    assumptions: ["Monitoring only — no spend, price, or inventory change"],
    confidence: "High",
  };
}
