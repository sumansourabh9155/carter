// SKU × CHANNEL PERFORMANCE — real CM-ROAS per channel for ONE product,
// derived from that SKU's own margin (never a separately-invented number).
//
// Attribution honesty: ads only get credit for the PAID slice of a SKU's
// sales (paidShare, from UTM/pixel attribution — catalog average ≈ 34%,
// consistent with the Website tab's paid-vs-earned order split). The old
// version credited 100% of units to ad channels, which overstated every
// channel's CM-ROAS roughly 3×. Earned sales (organic/direct/email) are
// reported alongside, because ad budget cannot move them.
//
// Order counts per SKU×channel are small by construction, so confidence is
// flagged rather than implied.

import { SKU_CHANNEL_MIX } from "@/lib/data/skuChannelMix";
import { AD_CHANNELS } from "@/lib/data/adChannels";

const HIGH_CONFIDENCE_UNITS = 60;
const MEDIUM_CONFIDENCE_UNITS = 20;

function round(v) { return Math.round(v); }
function round1(v) { return Math.round(v * 10) / 10; }
function round2(v) { return v == null ? null : Math.round(v * 100) / 100; }

// sku must already be margin-derived (has cm1, units, revenue, adSpend).
export function deriveChannelPerformance(sku) {
  const entry = SKU_CHANNEL_MIX[sku.id];
  if (!entry?.channels?.length || !sku.units) return null;

  const cm1PerUnit = sku.cm1 / sku.units;
  const paidUnits = round(sku.units * entry.paidShare);
  const earnedUnits = sku.units - paidUnits;

  const channels = entry.channels.map((m) => {
    const meta = AD_CHANNELS.find((c) => c.id === m.channel);
    const units = round(paidUnits * m.orderShare);
    const revenue = round(sku.revenue * entry.paidShare * m.orderShare);
    const spend = round(sku.adSpend * m.spendShare);
    const cm1 = round(cm1PerUnit * units);
    const cmRoas = spend > 0 ? round2(cm1 / spend) : null;
    const confidence = units >= HIGH_CONFIDENCE_UNITS ? "high" : units >= MEDIUM_CONFIDENCE_UNITS ? "medium" : "low";
    return {
      id: m.channel,
      name: meta?.name ?? m.channel,
      color: meta?.color ?? "#94a3b8",
      spend,
      units,
      revenue,
      cm1,
      cmRoas,
      trendPct: m.trendPct,
      confidence,
    };
  });

  const ranked = [...channels].sort((a, b) => (b.cmRoas ?? -Infinity) - (a.cmRoas ?? -Infinity));
  const best = ranked[0] ?? null;
  const worst = ranked[ranked.length - 1] ?? null;

  return {
    channels: ranked,
    best,
    worst,
    paidUnits,
    earnedUnits,
    paidSharePct: round1(entry.paidShare * 100),
  };
}
