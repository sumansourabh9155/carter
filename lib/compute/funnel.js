// WEBSITE FUNNEL ENGINE — turns raw Web Pixel counts into conversion rates,
// drop-offs, and a per-product behavior verdict. Same rule as margin.js:
// every rate is derived here from raw counts, never stored in seed data.
//
// The verdict is what makes the funnel decision-grade instead of a vanity
// report: it separates "the product page isn't convincing visitors" from
// "people want it but abandon at checkout" — two different fixes.

import { PRODUCT_FUNNEL, TRAFFIC_SOURCES, WEEKLY_SESSIONS } from "@/lib/data/webFunnel";
import { SKUS } from "@/lib/data/skus";

// Below this fraction of the catalog-average rate, a stage counts as broken.
const UNDERPERFORM_RATIO = 0.6;

function pct1(v) { return Math.round(v * 1000) / 10; }

export const FUNNEL_VERDICT_META = {
  lowinterest: { label: "Low interest", desc: "Plenty of views, weak add-to-cart — the product page or the traffic quality is the problem", color: "#ef4444" },
  checkoutdrop: { label: "Checkout drop-off", desc: "People want it but abandon at checkout — price shock, shipping cost, or checkout UX", color: "#ffa000" },
  healthy: { label: "Healthy", desc: "Converts at or near the catalog average at every stage", color: "#2e7d32" },
};

export function websiteAnalytics() {
  const totals = { views: 0, atc: 0, checkout: 0, units: 0 };
  const rows = SKUS.map((s) => {
    const f = PRODUCT_FUNNEL[s.id];
    if (!f) return null;
    totals.views += f.views;
    totals.atc += f.atc;
    totals.checkout += f.checkout;
    totals.units += s.units;
    return { id: s.id, name: s.name, image: s.image, ...f, units: s.units };
  }).filter(Boolean);

  const avg = {
    viewToAtc: totals.atc / totals.views,
    atcToCheckout: totals.checkout / totals.atc,
    checkoutToPurchase: totals.units / totals.checkout,
    viewToPurchase: totals.units / totals.views,
  };

  const products = rows.map((r) => {
    const viewToAtc = r.atc / r.views;
    const atcToCheckout = r.checkout / r.atc;
    const checkoutToPurchase = r.units / r.checkout;
    let verdict = "healthy";
    if (viewToAtc < avg.viewToAtc * UNDERPERFORM_RATIO) verdict = "lowinterest";
    else if (atcToCheckout < avg.atcToCheckout * UNDERPERFORM_RATIO || checkoutToPurchase < avg.checkoutToPurchase * UNDERPERFORM_RATIO) verdict = "checkoutdrop";
    return {
      ...r,
      viewToAtcPct: pct1(viewToAtc),
      atcToCheckoutPct: pct1(atcToCheckout),
      checkoutToPurchasePct: pct1(checkoutToPurchase),
      overallConvPct: pct1(r.units / r.views),
      verdict,
    };
  }).sort((a, b) => b.views - a.views);

  const sessions = TRAFFIC_SOURCES.reduce((a, t) => a + t.sessions, 0);
  const orders = TRAFFIC_SOURCES.reduce((a, t) => a + t.orders, 0);
  const sources = TRAFFIC_SOURCES.map((t) => ({ ...t, convPct: pct1(t.orders / t.sessions) }))
    .sort((a, b) => b.sessions - a.sessions);

  return {
    sessions,
    orders,
    sessionConvPct: pct1(orders / sessions),
    weekly: WEEKLY_SESSIONS,
    storeFunnel: [
      { label: "Product views", value: totals.views },
      { label: "Added to cart", value: totals.atc },
      { label: "Reached checkout", value: totals.checkout },
      { label: "Units sold", value: totals.units },
    ],
    catalogAvg: {
      viewToAtcPct: pct1(avg.viewToAtc),
      atcToCheckoutPct: pct1(avg.atcToCheckout),
      checkoutToPurchasePct: pct1(avg.checkoutToPurchase),
      viewToPurchasePct: pct1(avg.viewToPurchase),
    },
    products,
    sources,
  };
}

// One product's funnel, for the detail view / AI chart ref.
export function productFunnel(id) {
  const all = websiteAnalytics();
  return all.products.find((p) => p.id === id) || null;
}
