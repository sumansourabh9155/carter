// AUDIENCE ENGINE — turns raw DSP audience shares into decision-grade
// numbers. The Carter twist: don't just report "46% of orders are mobile"
// (vanity), report each segment's CM-ROAS so the merchant sees where ad
// spend goes vs where it actually pays off. Every CM-ROAS is derived from
// the real paid totals in adChannels.js, so it reconciles with the blended
// number on the Marketing tab.

import { AD_CHANNELS } from "@/lib/data/adChannels";
import { STORE_AUDIENCE, PRODUCT_AUDIENCE_ARCHETYPE, AUDIENCE_ARCHETYPES } from "@/lib/data/audience";

function round(v) { return Math.round(v); }
function round2(v) { return Math.round(v * 100) / 100; }
function pct1(v) { return Math.round(v * 1000) / 10; }

// Paid-slice totals — the denominator every segment is carved out of.
function paidTotals() {
  return AD_CHANNELS.reduce(
    (a, c) => ({
      spend: a.spend + c.spend,
      cm: a.cm + c.attributedCm,
      revenue: a.revenue + c.attributedRevenue,
      orders: a.orders + c.orders,
    }),
    { spend: 0, cm: 0, revenue: 0, orders: 0 }
  );
}

function deriveDimension(dim, totals, blendedCmRoas) {
  const segments = dim.segments.map((s) => {
    const spend = round(totals.spend * s.spendShare);
    const orders = round(totals.orders * s.orderShare);
    // CM scales with orders (similar per-order margin across segments) — the
    // spend/order mismatch is what moves CM-ROAS away from the blend.
    const cm = round(totals.cm * s.orderShare);
    const cmRoas = spend > 0 ? round2(cm / spend) : null;
    return {
      id: s.id,
      label: s.label,
      color: s.color,
      spendSharePct: pct1(s.spendShare),
      orderSharePct: pct1(s.orderShare),
      spend,
      orders,
      cmRoas,
      // Above the blend = pulling weight; below = dragging it down.
      vsBlended: cmRoas != null ? round2(cmRoas - blendedCmRoas) : null,
    };
  });
  // Sort by CM-ROAS so the profit winners/losers read top-to-bottom.
  segments.sort((a, b) => (b.cmRoas ?? -Infinity) - (a.cmRoas ?? -Infinity));
  return { label: dim.label, segments };
}

export function storeAudience() {
  const totals = paidTotals();
  const blendedCmRoas = round2(totals.cm / totals.spend);
  return {
    blendedCmRoas,
    device: deriveDimension(STORE_AUDIENCE.device, totals, blendedCmRoas),
    age: deriveDimension(STORE_AUDIENCE.age, totals, blendedCmRoas),
    geography: deriveDimension(STORE_AUDIENCE.geography, totals, blendedCmRoas),
  };
}

// Store-level headline: the single biggest "overspending here" mismatch —
// the segment burning the most budget relative to the profit it returns.
export function audienceLeak() {
  const totals = paidTotals();
  const blendedCmRoas = round2(totals.cm / totals.spend);
  let worst = null;
  for (const dimKey of ["device", "age", "geography"]) {
    for (const s of STORE_AUDIENCE[dimKey].segments) {
      const spend = totals.spend * s.spendShare;
      const cmRoas = (totals.cm * s.orderShare) / spend;
      // "Wasted-ish" spend = spend on a below-blend segment, weighted by how
      // far below and how much money it's eating.
      if (cmRoas < blendedCmRoas) {
        const drag = (blendedCmRoas - cmRoas) * spend;
        if (!worst || drag > worst.drag) {
          worst = { dim: STORE_AUDIENCE[dimKey].label, label: s.label, cmRoas: round2(cmRoas), spend: round(spend), spendSharePct: pct1(s.spendShare), orderSharePct: pct1(s.orderShare), blendedCmRoas, drag };
        }
      }
    }
  }
  return worst;
}

// Per-product audience — who this SKU's ad-driven buyers are. Distributions
// come straight from the archetype; we surface the dominant segment per
// dimension plus the full device/age splits for a compact chart.
export function productAudience(id) {
  const key = PRODUCT_AUDIENCE_ARCHETYPE[id];
  const arch = key && AUDIENCE_ARCHETYPES[key];
  if (!arch) return null;

  const deviceSegs = Object.entries(arch.device).map(([k, v]) => ({ id: k, label: labelFor("device", k), pct: v }));
  const ageSegs = Object.entries(arch.age).map(([k, v]) => ({ id: k, label: labelFor("age", k), pct: v }));
  const topDevice = [...deviceSegs].sort((a, b) => b.pct - a.pct)[0];
  const topAge = [...ageSegs].sort((a, b) => b.pct - a.pct)[0];

  return {
    device: deviceSegs,
    age: ageSegs,
    topDevice,
    topAge,
    topRegions: arch.topRegions,
  };
}

function labelFor(dim, id) {
  const seg = STORE_AUDIENCE[dim].segments.find((s) => s.id === id);
  return seg ? seg.label : id;
}
