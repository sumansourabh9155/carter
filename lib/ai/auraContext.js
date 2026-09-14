// Builds the real, engine-computed snapshot Aura is allowed to reason over.
// Aura NARRATES this data — it never computes a number of its own. Runs
// server-side only (imported by the /api/aura route), so it's fine to pull
// straight from the mock data layer without going through fetch/delay.
//
// This is deliberately comprehensive — margin, channel, product-channel fit,
// returns, cash, alerts/findings, and the platform-honesty gap — so "full
// context" means the same real numbers a merchant would find by clicking
// around every tab, not a thin summary.

import { allProducts, productsSummary, cashCalendar, returnsRanking } from "@/lib/api/mock/products";
import { marketingData } from "@/lib/api/mock/marketing";
import { deriveChannelPerformance } from "@/lib/compute/channelMix";
import { websiteAnalytics } from "@/lib/compute/funnel";
import { productAudience } from "@/lib/compute/audience";
import { INSIGHTS_SEED } from "@/lib/data/insightsSeed";
import { ALERTS_SEED } from "@/lib/data/alertsSeed";
import { STORE } from "@/lib/data/skus";

export function buildAuraContext() {
  const s = productsSummary();
  const marketing = marketingData();
  const cash = cashCalendar();
  const returns = returnsRanking();
  const products = allProducts();
  const web = websiteAnalytics();
  const funnelById = Object.fromEntries(web.products.map((f) => [f.id, f]));

  const productSummaries = products.map((p) => {
    const cp = deriveChannelPerformance(p);
    const f = funnelById[p.id];
    return {
      id: p.id,
      name: p.name,
      category: p.category,
      revenue: p.revenue,
      cm1Pct: p.cm1Pct,
      cm2: p.cm2,
      cmRoas: p.cmRoas,
      losingMoney: p.losingMoney,
      quadrant: p.quadrant,
      lifecycleStage: p.lifecycleStage,
      onHand: p.onHand,
      dailyVelocity: p.dailyVelocity,
      daysOfCover: p.daysOfCover,
      trendPct: p.trendPct,
      stockoutRisk: p.stockoutRisk,
      needsReorderNow: p.needsReorderNow,
      projectedDaysToStockout: p.projectedDaysToStockout,
      reorderPointUnits: p.reorderPointUnits,
      suggestedReorderQty: p.suggestedReorderQty,
      estimatedCogs: p.estimated,
      supplier: p.supplier,
      leadTimeDaysUsed: p.leadTimeDaysUsed,
      returnsAmount: p.returns,
      returnsPctOfRevenue: p.revenue ? Math.round((p.returns / p.revenue) * 1000) / 10 : null,
      // Which ad channel actually converts THIS product best/worst — computed
      // on the PAID slice only, distinct from the store-wide channel numbers.
      bestChannelForThisProduct: cp?.best ? { name: cp.best.name, cmRoas: cp.best.cmRoas } : null,
      worstChannelForThisProduct: cp?.worst ? { name: cp.worst.name, cmRoas: cp.worst.cmRoas } : null,
      // How much of this SKU's sales ads actually drive — the rest is earned
      // (organic/direct/email) and does NOT scale with ad budget.
      paidSharePct: cp?.paidSharePct ?? null,
      paidUnits: cp?.paidUnits ?? null,
      earnedUnits: cp?.earnedUnits ?? null,
      // On-site funnel from the Tally Web Pixel — the verdict separates
      // "page/traffic problem" from "checkout problem" for this product.
      websiteFunnel: f
        ? {
            productViews: f.views,
            viewToCartPct: f.viewToAtcPct,
            cartToCheckoutPct: f.atcToCheckoutPct,
            overallViewToPurchasePct: f.overallConvPct,
            behaviorVerdict: f.verdict, // "lowinterest" | "checkoutdrop" | "healthy"
          }
        : null,
      // Who this SKU's ad-driven buyers are (DSP audience data).
      audience: (() => {
        const a = productAudience(p.id);
        return a ? { topAge: a.topAge.label, topDevice: a.topDevice.label, topRegions: a.topRegions } : null;
      })(),
    };
  });

  const channels = marketing.channels.map((c) => ({
    name: c.name,
    spend: c.spend,
    orders: c.orders,
    cac: c.cac, // cost per order on this channel — the number to multiply by a unit target for a budget estimate
    cmRoas: c.cmRoas,
    revRoas: c.revRoas,
    trendPct: c.cmRoasDelta,
    platformClaimedRevenue: c.platformReportedRevenue,
    verifiedRevenue: c.attributedRevenue,
    platformOverclaimPct: c.platformGapPct,
    trackingConfidence: c.trackingConfidence,
    topCampaigns: c.campaigns.map((k) => ({ name: k.name, spend: k.spend, cmRoas: k.cmRoas })),
  }));

  return {
    store: STORE.name,
    periodLabel: "the current reporting period",
    totals: {
      revenue: s.revenue,
      cm1: s.cm1, cm1Pct: s.cm1Pct,
      cm2: s.cm2, cm2Pct: s.cm2Pct,
      cm3: s.cm3, cm3Pct: s.cm3Pct,
      cmRoas: s.cmRoas,
      unitsSold: s.units,
      skusWithEstimatedCosts: s.estimatedCount,
    },
    products: productSummaries,
    marketing: {
      blendedCmRoas: marketing.totals.cmRoas,
      blendedRevRoas: marketing.totals.revRoas,
      totalAdSpend: marketing.totals.spend,
      blendedCac: marketing.totals.cac, // cost per order, all channels combined — the number to multiply by a unit target for a budget estimate when the merchant has no channel preference
      // Ads only drive part of the store — every ad suggestion moves the paid
      // slice only; earned orders (organic/direct/email) don't scale with spend.
      paidVsEarned: (() => {
        const paidOrders = web.sources.filter((t) => t.paid).reduce((a, t) => a + t.orders, 0);
        return {
          paidOrders,
          earnedOrders: web.orders - paidOrders,
          paidPctOfOrders: Math.round((paidOrders / web.orders) * 1000) / 10,
        };
      })(),
      recommendation: marketing.recommendation
        ? {
            shiftFrom: marketing.recommendation.from.name,
            shiftTo: marketing.recommendation.to.name,
            weeklyAmount: marketing.recommendation.amount,
            reason: marketing.recommendation.note,
          }
        : null,
      newVsReturningCustomers: {
        newRevenuePct: marketing.customerMix.newRevenuePct,
        returningRevenuePct: marketing.customerMix.returningRevenuePct,
      },
      channels,
      // DSP audience for the PAID slice — each segment's share of ad SPEND vs
      // its CM-ROAS. A segment with a big spend share but a CM-ROAS below
      // blendedCmRoas is over-funded and dragging profit down.
      audience: (() => {
        const a = marketing.audience;
        const simplify = (dim) => dim.segments.map((x) => ({ segment: x.label, spendSharePct: x.spendSharePct, orderSharePct: x.orderSharePct, cmRoas: x.cmRoas }));
        return { blendedCmRoas: a.blendedCmRoas, byDevice: simplify(a.device), byAge: simplify(a.age), byGeography: simplify(a.geography) };
      })(),
      biggestAudienceLeak: marketing.audienceLeak
        ? { dimension: marketing.audienceLeak.dim, segment: marketing.audienceLeak.label, spendSharePct: marketing.audienceLeak.spendSharePct, orderSharePct: marketing.audienceLeak.orderSharePct, cmRoas: marketing.audienceLeak.cmRoas }
        : null,
    },
    returnsRanking: returns.slice(0, 8).map((r) => ({ name: r.name, returnsAmount: r.returns, returnsPctOfRevenue: r.returnsPct })),
    cashCalendar: {
      totalDepositDueNow: cash.totalDepositDue,
      totalBalanceDueLater: cash.totalBalanceDue,
      productsNeedingReorder: cash.items.length,
      items: cash.items.map((i) => ({
        name: i.name,
        urgent: i.urgent,
        totalCost: i.reorderCostTotal,
        depositDue: i.depositDue,
        balanceDue: i.balanceDue,
        paymentTerms: i.paymentTerms,
      })),
    },
    // On-site behavior from the Tally Web Pixel (Shopify Web Pixels API) —
    // sessions, the store funnel, and conversion by traffic source.
    website: {
      sessions: web.sessions,
      ordersAllSources: web.orders,
      sessionToOrderPct: web.sessionConvPct,
      storeFunnel: web.storeFunnel,
      catalogAvgRates: web.catalogAvg,
      trafficSources: web.sources.map((t) => ({ name: t.name, paid: t.paid, sessions: t.sessions, orders: t.orders, convPct: t.convPct })),
    },
    activeAlerts: ALERTS_SEED.map((a) => ({ title: a.title, body: a.body, severity: a.severity })),
    findings: INSIGHTS_SEED.map((i) => ({ title: i.title, body: i.body, severity: i.severity })),
    // Explicit, not implied — so a question that needs one of these gets a
    // clear "Tally doesn't track that" instead of an inconsistent guess.
    notTracked: [
      "Heatmaps, session recordings, scroll depth, or individual visitor journeys — the Web Pixel gives aggregate funnel counts (website + websiteFunnel above), not per-visitor behavior",
      "Product variants: color, size, or style-level breakdowns — every 'product' here is already one specific SKU, not a parent product with variants",
      "Customer-level data: repeat-purchase history by individual, lifetime value, cohort retention",
      "External market demand, search trends, or competitor pricing/activity",
      "Real bank balance or true cash-flow forecast (cashCalendar below is reorder cost only, not a bank connection — that is Phase 2)",
    ],
  };
}

// The only hrefs Aura is allowed to cite — keeps "citations" in its
// structured response from ever pointing at a page that doesn't exist.
export function buildValidLinks() {
  const products = allProducts().map((p) => ({ label: `${p.name} → breakdown`, href: `/products/${p.id}` }));
  return [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Insights", href: "/insights" },
    { label: "Products", href: "/products" },
    { label: "Marketing", href: "/marketing" },
    { label: "Website", href: "/website" },
    { label: "Data Collection", href: "/data-collection" },
    { label: "Integrations", href: "/integrations" },
    ...products,
  ];
}
