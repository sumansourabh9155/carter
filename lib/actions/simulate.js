// ACTION SIMULATOR — "what happens to the numbers if we do this?"
// Grounded math only: every figure traces to the margin engine (deriveSku
// fields on the passed product) or the marketing engine (channel CM-ROAS /
// CAC). Where a real unknown exists (demand elasticity, CAC at scale,
// promo sell-through) the simulation says so in assumptions and downgrades
// confidence instead of inventing precision.

import { marketingData } from "@/lib/api/mock/marketing";
import { creativePerformance } from "@/lib/compute/creative";
import { money, pct, multiple, plural } from "@/lib/format";

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
 * @param {Object[]} [targets]  every product the action touches — a rolled-up
 *   category action carries the whole group, and the simulation has to price
 *   the group, not its first member.
 * @returns {Simulation}
 */
export function simulateAction(action, product, targets) {
  if (Array.isArray(targets) && targets.length > 1) {
    const group = simulateGroup(action, targets);
    if (group) return group;
  }
  switch (action?.type) {
    case "pause_ads": return simPauseAds(product);
    case "reorder": return simReorder(product);
    case "shift_budget": return simShiftBudget(product);
    case "reduce_spend": return simReduceSpend(action);
    case "refresh_creative": return simRefreshCreative(action);
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

/*
  GROUP SIMULATION — pricing a rolled-up action.

  A category action is not "the first SKU's simulation, applied N times": the
  members have different margins and different paid shares, so the group total
  has to be summed from per-SKU math. Summing the individual simulations is
  exactly that, and it keeps ONE implementation of the per-SKU economics —
  a second formula here would be the first thing to drift.

  Confidence is the WEAKEST member's, never an average. A group is only as
  trustworthy as its shakiest input, and averaging hides that.
*/
const CONFIDENCE_RANK = { Low: 0, Medium: 1, High: 2 };
const RANK_CONFIDENCE = ["Low", "Medium", "High"];

function simulateGroup(action, targets) {
  // Only pause_ads sums cleanly today. Budget shifts are a single store-level
  // reallocation regardless of how many SKUs the card names, and alerts have
  // no economics — both are already correct from the scalar path.
  if (action?.type !== "pause_ads") return null;

  const parts = targets.map((p) => simPauseAds(p));
  const cm2DeltaMonthly = round(parts.reduce((a, s) => a + s.cm2DeltaMonthly, 0));
  const cashImpact = round(parts.reduce((a, s) => a + s.cashImpact, 0));
  const worstRank = Math.min(...parts.map((s) => CONFIDENCE_RANK[s.confidence] ?? 0));

  const losing = targets.filter((p) => p.losingMoney);
  const profitable = targets.filter((p) => !p.losingMoney);
  const label = action?.params?.groupLabel || "this group";

  return {
    headline: cm2DeltaMonthly >= 0
      ? `Pausing ads across ${plural(targets.length, "SKU")} in ${label} nets ${money(cm2DeltaMonthly)}/mo`
      : `Pausing ads across ${plural(targets.length, "SKU")} in ${label} costs ${money(Math.abs(cm2DeltaMonthly))}/mo`,
    cm2DeltaMonthly,
    cashImpact,
    assumptions: [
      `${money(cashImpact)}/mo of ad spend stops leaving the account across ${plural(targets.length, "SKU")}`,
      losing.length
        ? `${losing.length} of them lose money after ad spend today — that loss is what stops`
        : "None of them lose money after ad spend today — this trades margin for saved spend",
      profitable.length
        ? `${profitable.length} are profitable after ad spend; pausing forfeits the paid slice of their CM1`
        : "Every SKU in the group is unprofitable at the current budget",
      "Summed from each SKU's own margin and paid share — no group-level averaging",
    ],
    confidence: RANK_CONFIDENCE[worstRank] ?? "Low",
  };
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

  /*
    ONE FORMULA, BOTH CASES: pausing saves the spend and forfeits the paid
    margin. net = adSpend − paidCm1, which is exactly −mediaCm2.

    The media-losing branch used to predict |cm2| — the SKU's whole
    contribution — which is neither what is saved nor what is lost. It
    happened to look plausible and was wrong by 3x.
  */
  const paidCm1Forfeited = round(p.paidCm1 ?? p.cm1 * (paidSharePct / 100));
  const net = round(p.adSpend - paidCm1Forfeited);

  if (p.mediaLosing) {
    return {
      headline: `Stop a ${money(Math.abs(p.mediaCm2))}/mo media loss on ${p.name}`,
      cm2DeltaMonthly: net,
      cashImpact: round(p.adSpend),
      assumptions: [
        `${money(p.adSpend)}/mo of spend stops; the ${money(paidCm1Forfeited)}/mo of CM1 it was buying stops with it`,
        `Forfeits the paid slice — ${pct(paidSharePct)} of this SKU's orders (${paidShareSource})`,
        `Earned demand (${pct(100 - paidSharePct)} of sales) is assumed to hold without ad support`,
      ],
      confidence: "High",
    };
  }

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

/*
  PULLING SPEND BACK — the only action that lowers total spend.

  Priced honestly: cutting the weakest channel forfeits the margin that spend
  was producing, so the CM2 effect is `saved − forfeited` = saved × (1 − its
  CM-ROAS). Cut a channel returning 1.08x and you barely break even on the
  decision; cut one returning 0.6x and you are ahead. That distinction is the
  entire point of doing it at the weakest channel rather than across the board.
*/
function simReduceSpend(action) {
  const mkt = marketingData();
  const pace = mkt.pacing;
  const live = mkt.channels.filter((c) => c.cmRoas != null && c.spend >= 1000);
  const weakest = [...live].sort((a, b) => a.cmRoas - b.cmRoas)[0];

  if (!pace?.budget || !weakest) {
    return {
      headline: "No budget plan to pull back to",
      cm2DeltaMonthly: 0,
      cashImpact: 0,
      assumptions: ["Set a monthly budget per channel before pacing actions can be priced"],
      confidence: "Low",
    };
  }

  // Bring spend back to where an even pace would have it by now, but never
  // ask for more than the weakest channel actually has.
  const onPaceSpend = pace.budget * (pace.elapsedPct / 100);
  const overBy = Math.max(0, round(pace.spend - onPaceSpend));
  const cut = Math.min(overBy, round(weakest.spend * 0.5));
  const forfeited = round(cut * weakest.cmRoas);
  const net = cut - forfeited;

  return {
    headline: `Cut ${money(cut)}/mo from ${weakest.name} (${multiple(weakest.cmRoas)} CM-ROAS) to get back inside plan`,
    cm2DeltaMonthly: net,
    cashImpact: cut,
    assumptions: [
      `${money(pace.spend)} spent against ${money(pace.budget)} planned — ${pct(pace.pacePct)} of budget at ${pct(pace.elapsedPct)} of the month`,
      `${weakest.name} is the weakest channel still running at scale, so it is where a cut costs least`,
      `Forfeits ~${money(forfeited)}/mo of attributed CM — cutting a ${multiple(weakest.cmRoas)} channel nets ${money(net)}`,
      cut < overBy
        ? `Capped at half of ${weakest.name}'s spend; ${money(overBy - cut)} of the overage needs a second lever`
        : "Brings the month back to an even pace in one move",
    ],
    confidence: weakest.cmRoas < 1 ? "High" : "Medium",
  };
}

/*
  REFRESHING A FATIGUED ASSET.

  Priced as recovery, never as growth: the upside is the gap between what the
  asset earns now and what it earned in its OWN first week. A new asset that
  beats the old one's launch is possible but not forecastable, so the
  simulation refuses to promise it.
*/
function simRefreshCreative(action) {
  const id = action?.params?.creativeId;
  const rows = creativePerformance();
  const cr = (id && rows.find((r) => r.id === id)) || rows[0];

  if (!cr) {
    return {
      headline: "No creative data available",
      cm2DeltaMonthly: 0, cashImpact: 0,
      assumptions: ["Connect creative-level reporting to price a refresh"],
      confidence: "Low",
    };
  }

  return {
    headline: `Replace “${cr.name}” on ${cr.channelName} — recovers up to ${money(cr.recoverableCm)}/mo`,
    cm2DeltaMonthly: cr.recoverableCm,
    // Spend is unchanged: the same budget runs behind a different asset.
    cashImpact: 0,
    assumptions: [
      `${cr.daysLive} days live at frequency ${cr.frequency} (ceiling ${cr.freqLimit} for ${cr.placement})`,
      `CM-ROAS ${cr.week1CmRoas}× in week one, ${cr.cmRoas}× now — a ${Math.abs(cr.decayPct)}% decline on ${money(cr.spend)} of spend`,
      "Upside is capped at its own launch efficiency; a replacement beating that is possible but not forecastable",
      "Budget is unchanged — this rotates the asset, it does not move money",
    ],
    confidence: cr.status === "fatigued" ? "Medium" : "Low",
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
