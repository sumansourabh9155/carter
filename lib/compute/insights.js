// INSIGHTS ENGINE — the re-stitch. Every other compute module answers ONE
// domain (margin, ads, funnel, audience, cash); this one crosses all of them
// and emits prioritized, action-typed recommendations: what to scale, what to
// kill, where budget leaks, what to reorder, what it costs. This is what
// makes Carter a decision tool, not a Shopify report.
//
// Deterministic and honest — every number comes from the same engines the
// rest of the app uses; this module only ranks and phrases.

import { allProducts, productsSummary, cashCalendar } from "@/lib/api/mock/products";
import { deriveChannelPerformance } from "@/lib/compute/channelMix";
import { marketingData } from "@/lib/api/mock/marketing";
import { websiteAnalytics } from "@/lib/compute/funnel";
import { money, pct, multiple, signed } from "@/lib/format";

// Severity ordering for a DTC operator: stop losing money > plug a leak >
// grab upside > housekeeping. Dollar impact ranks within a tier.
const SEV_BASE = { critical: 1_000_000, warning: 100_000, opportunity: 10_000, info: 100 };
const round1 = (v) => Math.round(v * 10) / 10;

function productInsight(p, funnel, cp) {
  const ref = { label: p.name, href: `/products/${p.id}` };
  const cands = [];

  if (p.losingMoney) {
    cands.push({
      severity: "critical", verdict: "Cut ads",
      title: `${p.name} loses money on every order`,
      body: `After ad spend its CM2 is ${money(p.cm2)} (${money(p.cm2PerOrder, { decimals: 2 })}/order). Cut its ads or raise price — every unit at the current budget destroys value.`,
      metric: `${money(p.cm2)} / mo`, ref, impact: Math.abs(p.cm2),
    });
  }
  if (p.stockoutRisk && !p.losingMoney) {
    cands.push({
      severity: "critical", verdict: "Reorder now",
      title: `${p.name} sells out before a reorder can land`,
      body: `~${p.projectedDaysToStockout} days of stock vs a ${p.leadTimeDaysUsed}-day lead time. Order ~${p.suggestedReorderQty?.toLocaleString()} units now or lose the sales on a profitable SKU.`,
      metric: `${p.projectedDaysToStockout}d left`, ref, impact: Math.max(500, p.cm2),
    });
  }
  if (!p.stockoutRisk && p.daysOfCover != null && p.daysOfCover > 75 && p.trendPct < 0) {
    cands.push({
      severity: "warning", verdict: "Clear stock",
      title: `${p.name} is slow-moving dead stock`,
      body: `${p.daysOfCover} days of cover and demand is ${signed(p.trendPct).text} — cash sitting on the shelf. Discount or bundle to clear it (cheap to discount at ${pct(p.cm1Pct)} CM1).`,
      metric: `${p.daysOfCover}d cover`, ref, impact: Math.min(p.onHand * p.unitCost * 0.1, 8000),
    });
  }
  const retPct = p.revenue ? (p.returns / p.revenue) * 100 : 0;
  if (retPct >= 5.5) {
    cands.push({
      severity: "warning", verdict: "Review fit",
      title: `${p.name} returns are eroding its margin`,
      body: `Returns are ${pct(round1(retPct))} of revenue (${money(p.returns)}) — above the ~3–4% norm. That's product fit, not traffic: review sizing/photos before scaling spend.`,
      metric: `${money(p.returns)}`, ref, impact: p.returns,
    });
  }
  if (funnel && funnel.verdict === "lowinterest") {
    cands.push({
      severity: "warning", verdict: "Fix page",
      title: `${p.name} gets traffic but few carts`,
      body: `${funnel.views.toLocaleString()} views, only ${pct(funnel.viewToAtcPct)} add to cart. The page or ad targeting is the problem, not demand — fix the listing before buying more clicks.`,
      metric: `${pct(funnel.viewToAtcPct)} to cart`, ref, impact: 4000,
    });
  }
  if (p.quadrant === "hero" && p.cmRoas != null && p.cmRoas >= 3 && !p.stockoutRisk && p.trendPct >= 0 && !p.losingMoney) {
    cands.push({
      severity: "opportunity", verdict: "Scale",
      title: `${p.name} is a hero with room to scale`,
      body: `${pct(p.cm1Pct)} CM1 at ${multiple(p.cmRoas)} CM-ROAS, stock to back it, trend ${signed(p.trendPct).text}.${cp?.best ? ` Push its best channel, ${cp.best.name}.` : ""}`,
      metric: `${multiple(p.cmRoas)} CM-ROAS`, ref, impact: Math.max(1000, p.cm2 * 0.3),
    });
  }

  if (!cands.length) return null;
  // One insight per product — the most important verdict for that SKU.
  cands.sort((a, b) => (SEV_BASE[b.severity] + (b.impact || 0)) - (SEV_BASE[a.severity] + (a.impact || 0)));
  return cands[0];
}

function storeInsights(summary, marketing, cash) {
  const out = [];
  const chans = marketing.channels;
  const worst = chans.filter((c) => c.cmRoas < 1).sort((a, b) => b.spend - a.spend)[0];
  const best = [...chans].sort((a, b) => b.cmRoas - a.cmRoas)[0];
  if (worst && best) {
    out.push({
      severity: "warning", verdict: "Shift budget",
      title: `${worst.name} is spending below break-even`,
      body: `${money(worst.spend)} at ${multiple(worst.cmRoas)} CM-ROAS — under 1.0×, so it loses money per dollar. Shift toward ${best.name} (${multiple(best.cmRoas)}).`,
      metric: `${multiple(worst.cmRoas)}`, ref: { label: "Marketing", href: "/marketing" }, impact: worst.spend,
    });
  }
  if (marketing.audienceLeak) {
    const l = marketing.audienceLeak;
    out.push({
      severity: "warning", verdict: "Trim spend",
      title: `${l.dim} · ${l.label} is an over-funded ad segment`,
      body: `Takes ${pct(l.spendSharePct)} of ad spend at ${multiple(l.cmRoas)} CM-ROAS — below your ${multiple(l.blendedCmRoas)} blend, driving just ${pct(l.orderSharePct)} of orders. Trim and reallocate.`,
      metric: `${multiple(l.cmRoas)}`, ref: { label: "Marketing", href: "/marketing" }, impact: l.spend * 0.25,
    });
  }
  if (cash.totalDepositDue > 0) {
    out.push({
      severity: "info", verdict: "Plan cash",
      title: `${money(cash.totalDepositDue)} in supplier deposits due now`,
      body: `${cash.items.length} reorders need deposits now, with ${money(cash.totalBalanceDue)} more due on terms. Make sure the cash is on hand before committing.`,
      metric: `${money(cash.totalDepositDue)}`, ref: { label: "Cash calendar", href: "/insights" }, impact: 3000,
    });
  }
  if (summary.estimatedCount > 0) {
    out.push({
      severity: "info", verdict: "Complete data",
      title: `${summary.estimatedCount} SKUs still have estimated costs`,
      body: `Their margins are educated guesses until you add real COGS — complete them so every number you act on here is trustworthy.`,
      metric: `${summary.estimatedCount} SKUs`, ref: { label: "Data Collection", href: "/data-collection" }, impact: 800,
    });
  }
  return out;
}

export function insightsBoard() {
  const products = allProducts();
  const summary = productsSummary();
  const marketing = marketingData();
  const web = websiteAnalytics();
  const cash = cashCalendar();
  const funnelById = Object.fromEntries(web.products.map((f) => [f.id, f]));

  const perProduct = products
    .map((p) => productInsight(p, funnelById[p.id], deriveChannelPerformance(p)))
    .filter(Boolean);

  const all = [...perProduct, ...storeInsights(summary, marketing, cash)]
    .map((x, i) => ({ id: `ins-${i}`, ...x, score: SEV_BASE[x.severity] + Math.min(x.impact || 0, 50000) }))
    .sort((a, b) => b.score - a.score);

  const paidOrders = web.sources.filter((s) => s.paid).reduce((a, s) => a + s.orders, 0);

  return {
    health: {
      cm3: summary.cm3,
      cm3Pct: summary.cm3Pct,
      profitable: summary.cm3 >= 0,
      cmRoas: marketing.totals.cmRoas,
      paidPct: round1((paidOrders / web.orders) * 100),
      cashDue: cash.totalDepositDue,
      actionCount: all.filter((a) => a.severity === "critical" || a.severity === "warning").length,
      criticalCount: all.filter((a) => a.severity === "critical").length,
    },
    actions: all.slice(0, 8),
  };
}
