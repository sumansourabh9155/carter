import { allProducts, productsSummary } from "@/lib/api/mock/products";
import { MARKETING_WEEKLY } from "@/lib/data/adChannels";
import { marketingData } from "@/lib/api/mock/marketing";
import { signedMultiple } from "@/lib/format";

// Presentation-only trend series (the engine owns the point-in-time numbers).
const MONTHLY = [
  { m: "Nov", revenue: 138400, cm3: 20912 },
  { m: "Dec", revenue: 201600, cm3: 36288 },
  { m: "Jan", revenue: 142200, cm3: 22752 },
  { m: "Feb", revenue: 156800, cm3: 25088 },
  { m: "Mar", revenue: 171300, cm3: 27408 },
  { m: "Apr", revenue: 148500, cm3: 24190 },
];

export function dashboardMetrics(lens = "all", period = "current") {
  const s = productsSummary(period);
  // Read the MARKETING engine, not the raw channel seed. Summing AD_CHANNELS
  // here is what produced a second, disagreeing ad-spend total in the first
  // place — the derived channel figures now reconcile to the catalogue, and
  // this lens has to read them or the split comes straight back.
  const mkt = marketingData();
  const ads = { spend: mkt.totals.spend, cm: mkt.totals.cm, rev: mkt.totals.rev, orders: mkt.totals.orders };
  const mer = ads.spend > 0 ? round2(s.revenue / ads.spend) : null;

  /*
    EVERY DELTA HERE IS DERIVED, NOT WRITTEN.

    These used to be hardcoded literals — `delta: 1.4` next to a real CM1 —
    so the headline number on the busiest screen in the product moved with
    the data while the arrow under it never did. They now come off
    `summary.delta`, which the margin engine produces by re-deriving the
    prior 30-day window from its own raw inputs.

    Ratio metrics get `deltaText` instead of `delta`: a percentage change in
    a multiple ("CM-ROAS is 8% better") is a number nobody can act on, where
    "▲ 0.26×" is the actual movement.
  */
  const d = s.delta;
  const roasDelta = d?.cmRoas?.abs != null
    ? { deltaText: signedMultiple(d.cmRoas.abs).text, deltaDir: d.cmRoas.dir }
    : {};
  const VS = "vs prior 30d";

  /*
    ONE CM-ROAS, TWO ROUTES TO IT.

    The store number (paid CM1 ÷ ad spend) and the channel number (summed
    attributed CM ÷ summed channel spend) are now built from the same
    attribution and the same spend, so they agree to within rounding. They
    used to differ 3.29x vs 1.60x under one shared label, which is how a
    reader concludes the product cannot add up.

    The channel lens still carries its OWN prior, because the channels have a
    measured prevCmRoas and the store's movement is a different question.
  */
  const adsPrevCmRoas = ads.spend
    ? round2(mkt.channels.reduce((a, c) => a + (c.prevCmRoas ?? 0) * c.spend, 0) / ads.spend)
    : null;
  const adsCmRoas = round2(ads.cm / ads.spend);
  const adsRoasDelta = adsPrevCmRoas != null
    ? {
        deltaText: signedMultiple(adsCmRoas - adsPrevCmRoas).text,
        deltaDir: adsCmRoas >= adsPrevCmRoas ? "up" : "down",
        deltaNote: VS,
      }
    : {};

  const lenses = {
    all: [
      { key: "cm1", label: "CM1", value: s.cm1, unit: "money", sub: `${s.cm1Pct}% of revenue`, delta: d?.cm1.pct, deltaNote: VS },
      { key: "cm2", label: "CM2 (after ads)", value: s.cm2, unit: "money", sub: `${s.cm2Pct}% of revenue`, delta: d?.cm2.pct, deltaNote: VS },
      { key: "cm3", label: "CM3 (net)", value: s.cm3, unit: "money", sub: `${s.cm3Pct}% of revenue`, delta: d?.cm3.pct, deltaNote: VS },
      { key: "cmroas", label: "CM-ROAS", value: s.cmRoas, unit: "mult", sub: "attributed CM per ad $", verdict: true, breakEven: 1, verdictLabels: { good: "Ads pay", bad: "Ads underwater" }, ...roasDelta, deltaNote: VS },
    ],
    shopify: [
      { key: "revenue", label: "Revenue", value: s.revenue, unit: "money", sub: `${s.units.toLocaleString()} units`, delta: d?.revenue.pct, deltaNote: VS },
      { key: "cogs", label: "COGS", value: s.cogs, unit: "money", sub: `${pct(s.cogs, s.revenue)}% of revenue` },
      { key: "cm1", label: "CM1 (gross contribution)", value: s.cm1, unit: "money", sub: `${s.cm1Pct}%`, delta: d?.cm1.pct, deltaNote: VS, verdict: true },
      { key: "returns", label: "Returns", value: s.returns, unit: "money", sub: `${pct(s.returns, s.revenue)}% of revenue`, delta: d?.returns.pct, deltaNote: VS, deltaInverse: true },
    ],
    ads: [
      { key: "spend", label: "Ad spend", value: ads.spend, unit: "money", sub: `${ads.orders.toLocaleString()} attributed orders` },
      { key: "cmroas", label: "CM-ROAS", value: adsCmRoas, unit: "mult", sub: "attributed CM per ad $", ...adsRoasDelta, verdict: true, breakEven: 1, verdictLabels: { good: "Ads pay", bad: "Ads underwater" } },
      { key: "mediacm2", label: "Media CM2", value: s.mediaCm2, unit: "money", sub: "attributed CM − ad spend", delta: d?.mediaCm2?.pct, deltaNote: VS },
      { key: "mer", label: "MER", value: mer, unit: "mult", sub: "store revenue ÷ ad spend" },
    ],
  };

  return {
    lens,
    kpis: lenses[lens] || lenses.all,
    waterfall: [
      { name: "Revenue", value: s.revenue, fill: "#2238b0" },
      { name: "− COGS", value: -s.cogs, fill: "#e4eaed" },
      { name: "− Ship/Fees/Ret", value: -(s.shipping + s.fees + s.returns), fill: "#e4eaed" },
      { name: "CM1", value: s.cm1, fill: "#0277bd", marker: true },
      { name: "− Ad spend", value: -s.adSpend, fill: "#ef6c00" },
      { name: "CM2", value: s.cm2, fill: "#7b1fa2", marker: true },
      { name: "− Overhead", value: -s.overhead, fill: "#e4eaed" },
      { name: "CM3", value: s.cm3, fill: "#2e7d32", marker: true },
    ],
    trend: MONTHLY,
    cmRoasWeekly: MARKETING_WEEKLY,
    summary: s,
  };
}

function pct(part, whole) { return whole ? Math.round((part / whole) * 100) : 0; }
function round2(v) { return v == null ? null : Math.round(v * 100) / 100; }

export { allProducts };
