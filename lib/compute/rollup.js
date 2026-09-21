// PORTFOLIO ROLLUP — the level above the SKU.
//
// Why this exists: every other compute module answers a question about ONE
// SKU, and the insight board emits at most one card per SKU. That works for a
// 16-SKU catalogue and collapses at 50,000 — a media director never opens a
// SKU, they open a category, see it is down, and drill in. This module is that
// missing level: it groups derived SKUs on a dimension and re-runs the SAME
// aggregate() the store-wide totals use, so a category's CM2 and the store's
// CM2 are computed by identical code and always reconcile.
//
// Dimensions are data, not code — adding one is a row in ROLLUP_DIMENSIONS.
// Brand / region / retailer slot in here the moment the seed carries them.

import { aggregate, QUADRANT_META } from "@/lib/compute/margin";
import { LIFECYCLE_META } from "@/lib/compute/lifecycle";

export const ROLLUP_DIMENSIONS = {
  category: {
    id: "category",
    label: "Category",
    // The grouping key on a derived SKU, and how to title the group.
    keyOf: (p) => p.category || "Uncategorised",
    labelOf: (key) => key,
  },
  quadrant: {
    id: "quadrant",
    label: "Margin quadrant",
    keyOf: (p) => p.quadrant,
    labelOf: (key) => QUADRANT_META[key]?.label ?? key,
    colorOf: (key) => QUADRANT_META[key]?.color,
  },
  lifecycleStage: {
    id: "lifecycleStage",
    label: "Lifecycle",
    keyOf: (p) => p.lifecycleStage,
    labelOf: (key) => LIFECYCLE_META[key]?.label ?? key,
    colorOf: (key) => LIFECYCLE_META[key]?.color,
  },
};

/**
 * @typedef {Object} RollupGroup
 * @property {string} key            grouping value ("Outerwear")
 * @property {string} label          display name
 * @property {string} [color]        dimension-supplied accent, when it has one
 * @property {Object} totals         full aggregate() output, incl. prev + delta
 * @property {number} skuCount
 * @property {number} losingCount    SKUs whose MEDIA loses money (paidCm1 < adSpend)
 * @property {number} estimatedCount SKUs still on estimated COGS
 * @property {number} revenueSharePct share of portfolio revenue
 * @property {Object|null} worst     biggest CM2 detractor in the group
 * @property {Object|null} best      biggest CM2 contributor in the group
 * @property {Object[]} skus         the members, CM2 descending
 */

/**
 * Group derived SKUs and aggregate each group through the margin engine.
 * @param {Object[]} products derived SKUs (allProducts())
 * @param {string} dimensionId key of ROLLUP_DIMENSIONS
 * @returns {RollupGroup[]} revenue descending
 */
export function rollupBy(products, dimensionId = "category") {
  const dim = ROLLUP_DIMENSIONS[dimensionId] ?? ROLLUP_DIMENSIONS.category;
  const portfolioRevenue = products.reduce((a, p) => a + p.revenue, 0);

  const buckets = new Map();
  for (const p of products) {
    const key = dim.keyOf(p);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(p);
  }

  return [...buckets.entries()]
    .map(([key, skus]) => {
      const byCm2 = [...skus].sort((a, b) => b.cm2 - a.cm2);
      const totals = aggregate(skus);
      return {
        key,
        label: dim.labelOf(key),
        color: dim.colorOf?.(key),
        totals,
        skuCount: skus.length,
        losingCount: skus.filter((s) => s.mediaLosing).length,
        overallLosingCount: skus.filter((s) => s.losingMoney).length,
        estimatedCount: totals.estimatedCount,
        revenueSharePct: portfolioRevenue ? round1((totals.revenue / portfolioRevenue) * 100) : 0,
        best: byCm2[0] ?? null,
        worst: byCm2[byCm2.length - 1] ?? null,
        skus: byCm2,
      };
    })
    .sort((a, b) => b.totals.revenue - a.totals.revenue);
}

/**
 * The portfolio picture a director opens with: totals, the rollup, and the
 * two groups that actually moved the number since last period.
 *
 * `mover` ranks on ABSOLUTE CM2 dollars, not percentage — a 40% swing on a
 * $2k category is noise next to a 4% swing on a $400k one, and at enterprise
 * scale percentage ranking surfaces nothing but the smallest groups.
 */
export function portfolioRollup(products, dimensionId = "category") {
  const groups = rollupBy(products, dimensionId);
  const movers = groups
    .filter((g) => g.totals.delta?.cm2 && g.totals.delta.cm2.dir !== "flat")
    .sort((a, b) => Math.abs(b.totals.delta.cm2.abs) - Math.abs(a.totals.delta.cm2.abs));

  return {
    dimension: ROLLUP_DIMENSIONS[dimensionId] ?? ROLLUP_DIMENSIONS.category,
    groups,
    totals: aggregate(products),
    topGainer: movers.find((g) => g.totals.delta.cm2.dir === "up") ?? null,
    topDecliner: movers.find((g) => g.totals.delta.cm2.dir === "down") ?? null,
  };
}

function round1(v) {
  return Math.round(v * 10) / 10;
}
