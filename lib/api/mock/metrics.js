import { allProducts, productsSummary } from "@/lib/api/mock/products";
import { AD_CHANNELS, MARKETING_WEEKLY } from "@/lib/data/adChannels";
import { projectTrend } from "@/lib/compute/projection";

// Presentation-only trend series (the engine owns the point-in-time numbers).
const MONTHLY = [
  { m: "Nov", revenue: 138400, cm3: 20912 },
  { m: "Dec", revenue: 201600, cm3: 36288 },
  { m: "Jan", revenue: 142200, cm3: 22752 },
  { m: "Feb", revenue: 156800, cm3: 25088 },
  { m: "Mar", revenue: 171300, cm3: 27408 },
  { m: "Apr", revenue: 148500, cm3: 24190 },
];

export function dashboardMetrics(lens = "all") {
  const s = productsSummary();
  const ads = AD_CHANNELS.reduce(
    (a, c) => ({ spend: a.spend + c.spend, cm: a.cm + c.attributedCm, rev: a.rev + c.attributedRevenue, orders: a.orders + c.orders }),
    { spend: 0, cm: 0, rev: 0, orders: 0 }
  );
  const mer = ads.spend > 0 ? round2(s.revenue / ads.spend) : null;

  const lenses = {
    all: [
      { key: "cm1", label: "CM1", value: s.cm1, unit: "money", sub: `${s.cm1Pct}% of revenue`, delta: 1.4 },
      { key: "cm2", label: "CM2 (after ads)", value: s.cm2, unit: "money", sub: `${s.cm2Pct}% of revenue`, delta: 0.9 },
      { key: "cm3", label: "CM3 (net)", value: s.cm3, unit: "money", sub: `${s.cm3Pct}% of revenue`, delta: 2.1, verdict: true },
      { key: "cmroas", label: "CM-ROAS", value: s.cmRoas, unit: "mult", sub: "profit per ad $", delta: -3.0 },
    ],
    shopify: [
      { key: "revenue", label: "Revenue", value: s.revenue, unit: "money", sub: `${s.units.toLocaleString()} units`, delta: 1.4 },
      { key: "cogs", label: "COGS", value: s.cogs, unit: "money", sub: `${pct(s.cogs, s.revenue)}% of revenue`, delta: 0.6 },
      { key: "cm1", label: "CM1 (gross contribution)", value: s.cm1, unit: "money", sub: `${s.cm1Pct}%`, delta: 1.4, verdict: true },
      { key: "returns", label: "Returns", value: s.returns, unit: "money", sub: `${pct(s.returns, s.revenue)}% of revenue`, delta: -0.4 },
    ],
    ads: [
      { key: "spend", label: "Ad spend", value: ads.spend, unit: "money", sub: `${ads.orders.toLocaleString()} orders`, delta: 2.0 },
      { key: "cmroas", label: "CM-ROAS", value: round2(ads.cm / ads.spend), unit: "mult", sub: "profit per ad $", delta: -3.0, verdict: true },
      { key: "revroas", label: "Revenue ROAS", value: round2(ads.rev / ads.spend), unit: "mult", sub: "the vanity number", delta: -1.1 },
      { key: "mer", label: "MER", value: mer, unit: "mult", sub: "blended efficiency", delta: 0.3 },
    ],
  };

  return {
    lens,
    kpis: lenses[lens] || lenses.all,
    waterfall: [
      { name: "Revenue", value: s.revenue, fill: "#2238b0" },
      { name: "− COGS", value: -s.cogs, fill: "#e4eaed" },
      { name: "− Ship/Fees/Ret", value: -(s.shipping + s.fees + s.returns), fill: "#e4eaed" },
      { name: "CM1", value: s.cm1, fill: "#00838f", marker: true },
      { name: "− Ad spend", value: -s.adSpend, fill: "#ffa000" },
      { name: "CM2", value: s.cm2, fill: "#7b1fa2", marker: true },
      { name: "− Overhead", value: -s.overhead, fill: "#e4eaed" },
      { name: "CM3", value: s.cm3, fill: "#2e7d32", marker: true },
    ],
    trend: MONTHLY,
    projection: projectTrend(MONTHLY, 2, ["May", "Jun"]),
    cmRoasWeekly: MARKETING_WEEKLY,
    summary: s,
  };
}

function pct(part, whole) { return whole ? Math.round((part / whole) * 100) : 0; }
function round2(v) { return v == null ? null : Math.round(v * 100) / 100; }

export { allProducts };
