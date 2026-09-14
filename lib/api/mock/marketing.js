import { AD_CHANNELS, MARKETING_WEEKLY, CUSTOMER_MIX } from "@/lib/data/adChannels";
import { allProducts, productsSummary } from "@/lib/api/mock/products";
import { storeAudience, audienceLeak } from "@/lib/compute/audience";

function round2(v) { return v == null ? null : Math.round(v * 100) / 100; }

// The one reallocation move worth making this period: shift budget from the
// weakest CM-ROAS channel toward the strongest. Always framed as a shift
// (cut from one, add to another) — never a one-sided "spend more" nudge,
// and never a fake-precise dollar figure the merchant hasn't confirmed.
function buildRecommendation(channels) {
  const ranked = [...channels].sort((a, b) => a.cmRoas - b.cmRoas);
  const from = ranked[0];
  const to = ranked[ranked.length - 1];
  if (!from || !to || from.id === to.id) return null;

  const amount = Math.round((from.spend * 0.4) / 50) * 50;
  const urgent = from.cmRoas < 1;

  return {
    from: { id: from.id, name: from.name, color: from.color, cmRoas: from.cmRoas, spend: from.spend },
    to: { id: to.id, name: to.name, color: to.color, cmRoas: to.cmRoas, spend: to.spend },
    amount,
    urgent,
    note: urgent
      ? `${from.name} is losing money on every dollar spent — ${to.name} is converting the same dollar into ${round2(to.cmRoas / from.cmRoas)}x more profit.`
      : `${to.name} is converting ad dollars into ${round2(to.cmRoas / from.cmRoas)}x more profit than ${from.name} right now.`,
  };
}

// Derive CM-ROAS per channel and campaign (never stored).
export function marketingData() {
  const channels = AD_CHANNELS.map((c) => ({
    ...c,
    cmRoas: round2(c.attributedCm / c.spend),
    revRoas: round2(c.attributedRevenue / c.spend),
    cac: Math.round(c.spend / c.orders),
    cmRoasDelta: round2((c.attributedCm / c.spend - c.prevCmRoas) / c.prevCmRoas * 100),
    // How much higher the platform's own dashboard claims vs. what Tally can
    // verify against real orders — the "honest scoreboard" gap.
    platformGapPct: round2((c.platformReportedRevenue - c.attributedRevenue) / c.attributedRevenue * 100),
    campaigns: c.campaigns.map((k) => ({ ...k, cmRoas: round2(k.attributedCm / k.spend) })),
  }));

  const totals = channels.reduce(
    (a, c) => ({ spend: a.spend + c.spend, cm: a.cm + c.attributedCm, rev: a.rev + c.attributedRevenue, orders: a.orders + c.orders }),
    { spend: 0, cm: 0, rev: 0, orders: 0 }
  );

  // Product-linked spend: where ad dollars go vs the margin they return.
  const productSpend = allProducts()
    .map((p) => ({ id: p.id, name: p.name, image: p.image, adSpend: p.adSpend, cmRoas: p.cmRoas, losingMoney: p.losingMoney }))
    .sort((a, b) => b.adSpend - a.adSpend);

  // New-vs-returning split — dollars derived from the canonical store
  // revenue total (margin engine), never a separately-tracked number.
  const storeRevenue = productsSummary().revenue;
  const customerMix = {
    newRevenue: Math.round(storeRevenue * (CUSTOMER_MIX.newRevenuePct / 100)),
    returningRevenue: Math.round(storeRevenue * (CUSTOMER_MIX.returningRevenuePct / 100)),
    newRevenuePct: CUSTOMER_MIX.newRevenuePct,
    returningRevenuePct: CUSTOMER_MIX.returningRevenuePct,
    newOrdersPct: CUSTOMER_MIX.newOrdersPct,
    returningOrdersPct: CUSTOMER_MIX.returningOrdersPct,
  };

  return {
    channels,
    weekly: MARKETING_WEEKLY,
    productSpend,
    customerMix,
    audience: storeAudience(),
    audienceLeak: audienceLeak(),
    recommendation: buildRecommendation(channels),
    totals: {
      ...totals,
      cmRoas: round2(totals.cm / totals.spend),
      revRoas: round2(totals.rev / totals.spend),
      cac: Math.round(totals.spend / totals.orders),
      storeRevenue,
    },
  };
}
