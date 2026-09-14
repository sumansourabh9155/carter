// Resolves a CHART REF (a plain string Aura picks, e.g. "waterfall:p2") into
// real chart data pulled from the same compute functions every other page
// uses. Aura never supplies chart VALUES — only ever a ref string — so a
// chart can never show a number the engine didn't compute.

import { productsSummary, oneProduct } from "@/lib/api/mock/products";
import { marketingData } from "@/lib/api/mock/marketing";
import { returnsRanking as getReturnsRanking } from "@/lib/api/mock/products";
import { websiteAnalytics } from "@/lib/compute/funnel";
import { storeAudience } from "@/lib/compute/audience";
import { dashboardMetrics } from "@/lib/api/mock/metrics";
import { WEEKLY_SESSIONS } from "@/lib/data/webFunnel";
import { pct, money, multiple, signed } from "@/lib/format";

function buildWaterfallData(p) {
  const overhead = p.overheadAlloc ?? p.overhead ?? 0;
  return [
    { name: "Revenue", value: p.revenue, fill: "#eb6834" },
    { name: "− COGS", value: -p.cogs, fill: "#d6d3d1" },
    { name: "− Ship/Fees/Ret", value: -(p.shipping + p.fees + p.returns), fill: "#d6d3d1" },
    { name: "CM1", value: p.cm1, fill: "#2a78d6", marker: true },
    { name: "− Ad spend", value: -p.adSpend, fill: "#eda100" },
    { name: "CM2", value: p.cm2, fill: "#4a3aa7", marker: true },
    { name: "− Overhead", value: -overhead, fill: "#d6d3d1" },
    { name: "CM3", value: p.cm3, fill: "#1baf7a", marker: true },
  ];
}

export function resolveChartRef(ref) {
  if (!ref || typeof ref !== "string") return null;
  const parts = ref.split(":");
  const [kind, arg, arg2] = parts;

  if (kind === "waterfall") {
    if (arg === "store") {
      const s = productsSummary();
      return { type: "waterfall", title: "Where the money goes", subtitle: "Store-wide, this period", data: buildWaterfallData(s) };
    }
    const p = oneProduct(arg);
    if (!p) return null;
    return { type: "waterfall", title: `Where ${p.name}'s money goes`, subtitle: `${p.units.toLocaleString()} units this period`, data: buildWaterfallData(p) };
  }

  if (kind === "channels") {
    if (arg === "store") {
      const m = marketingData();
      return {
        type: "rankbars",
        title: "Which channels are actually profitable?",
        subtitle: "Ranked by CM-ROAS, store-wide",
        breakeven: 1, showBreakeven: true, format: "multiple",
        items: m.channels.map((c) => ({ name: c.name, value: c.cmRoas, color: c.color })),
      };
    }
    const p = oneProduct(arg);
    if (!p?.channelPerformance?.channels?.length) return null;
    return {
      type: "rankbars",
      title: `How ${p.name}'s paid sales split by channel`,
      subtitle: `Ad-attributed slice only (${p.channelPerformance.paidSharePct}% of its units) — small sample sizes`,
      breakeven: 1, showBreakeven: true, format: "multiple",
      items: p.channelPerformance.channels.map((c) => ({ name: c.name, value: c.cmRoas ?? 0, color: c.color })),
    };
  }

  if (kind === "trend" && arg === "cmroas") {
    return { type: "trend", title: "CM-ROAS trend", subtitle: "Profit per ad dollar, last 6 weeks", data: marketingData().weekly };
  }

  if (kind === "trend" && arg === "revenue") {
    const trend = dashboardMetrics().trend;
    return {
      type: "lines",
      title: "Revenue & net profit by month",
      subtitle: "Last 6 months",
      xKey: "m", yFormat: "money",
      data: trend,
      series: [
        { key: "revenue", name: "Revenue", color: "#eb6834" },
        { key: "cm3", name: "CM3 (net)", color: "#1baf7a" },
      ],
    };
  }

  if (kind === "trend" && arg === "sessions") {
    return {
      type: "lines",
      title: "Site sessions by week",
      subtitle: "Last 6 weeks (Tally Web Pixel)",
      xKey: "week", yFormat: "number",
      data: WEEKLY_SESSIONS,
      series: [{ key: "sessions", name: "Sessions", color: "#2a78d6" }],
    };
  }

  if (kind === "projection" && arg === "budget") {
    const m = marketingData();
    const channel = arg2 ? m.channels.find((c) => c.id === arg2) : null;
    const cac = channel ? channel.cac : m.totals.cac;
    const baseSpend = channel ? channel.spend : m.totals.spend;
    const name = channel ? channel.name : "all channels blended";
    const data = [0.5, 0.75, 1, 1.25, 1.5, 2].map((mult) => {
      const spend = Math.round(baseSpend * mult);
      return { spend: money(spend), units: Math.round(spend / cac), current: mult === 1 ? Math.round(spend / cac) : null };
    });
    return {
      type: "lines",
      title: `Ad budget → orders projection (${name})`,
      subtitle: `Straight-line at today's ${money(cac)} cost per order — real CAC RISES as spend scales, so the top end is optimistic`,
      xKey: "spend", yFormat: "number",
      data,
      series: [{ key: "units", name: "Projected orders", color: "#eb6834", dashed: true }],
    };
  }

  if (kind === "runway") {
    const p = oneProduct(arg);
    if (!p || p.onHand == null || !p.projectedDailyVelocity) return null;
    const stockoutDay = Math.ceil(p.onHand / p.projectedDailyVelocity);
    const horizon = Math.min(Math.max(stockoutDay + 7, 14), 75);
    const step = Math.max(1, Math.round(horizon / 8));
    const data = [];
    for (let d = 0; d <= horizon; d += step) {
      data.push({ day: `Day ${d}`, stock: Math.max(0, Math.round(p.onHand - p.projectedDailyVelocity * d)) });
    }
    return {
      type: "lines",
      title: `${p.name} — inventory runway`,
      subtitle: `~${p.projectedDailyVelocity}/day at the trend-adjusted pace → stock hits zero around day ${stockoutDay}${p.leadTimeDaysUsed ? ` (supplier lead time: ${p.leadTimeDaysUsed} days)` : ""}`,
      xKey: "day", yFormat: "number",
      data,
      series: [{ key: "stock", name: "Units on hand", color: "#ef4444" }],
    };
  }

  if (kind === "compare") {
    const [idA, idB] = (arg || "").split(",");
    const a = oneProduct(idA);
    const b = oneProduct(idB);
    if (!a || !b) return null;
    const row = (label, av, bv, fmt) => ({
      label,
      aVal: Math.abs(av ?? 0), bVal: Math.abs(bv ?? 0),
      aText: fmt(av), bText: fmt(bv),
    });
    return {
      type: "compare",
      title: `${a.name} vs ${b.name}`,
      subtitle: "Side by side, this period",
      aName: a.name, bName: b.name,
      rows: [
        row("Revenue", a.revenue, b.revenue, money),
        row("CM1 margin", a.cm1Pct, b.cm1Pct, pct),
        row("CM-ROAS", a.cmRoas, b.cmRoas, multiple),
        row("Sales trend", a.trendPct, b.trendPct, (v) => signed(v).text),
        row("Returns (% of revenue)", (a.returns / a.revenue) * 100, (b.returns / b.revenue) * 100, (v) => pct(Math.round(v * 10) / 10)),
        row("Paid share of sales", a.channelPerformance?.paidSharePct, b.channelPerformance?.paidSharePct, (v) => (v == null ? "—" : pct(v))),
      ],
    };
  }

  if (kind === "audience") {
    const a = storeAudience();
    const dimMap = { device: a.device, age: a.age, geo: a.geography, geography: a.geography };
    const dim = dimMap[arg];
    if (!dim) return null;
    const nameMap = { device: "device", age: "age", geo: "geography", geography: "geography" };
    return {
      type: "audience",
      title: `Ad audience by ${nameMap[arg]}`,
      subtitle: `Bar = share of ad spend · chip = CM-ROAS vs your ${a.blendedCmRoas}× blend (paid orders only)`,
      blendedCmRoas: a.blendedCmRoas,
      segments: dim.segments,
    };
  }

  if (kind === "split" && arg === "paidearned") {
    const web = websiteAnalytics();
    const paid = web.sources.filter((s) => s.paid).reduce((a, s) => a + s.orders, 0);
    return {
      type: "rankbars",
      title: "Paid vs earned orders",
      subtitle: "Ads only move the paid slice — earned demand doesn't scale with spend",
      showBreakeven: false, format: "number",
      items: [
        { name: "Paid (ads)", value: paid, color: "#eb6834", sub: `${Math.round((paid / web.orders) * 1000) / 10}% of ${web.orders.toLocaleString()} orders` },
        { name: "Earned (organic, direct, email)", value: web.orders - paid, color: "#1baf7a" },
      ],
    };
  }

  if (kind === "returns" && arg === "top") {
    const top = getReturnsRanking().slice(0, 6);
    if (!top.length) return null;
    return {
      type: "rankbars",
      title: "Where returns are eating margin",
      subtitle: "Dollars lost to returns, this period",
      showBreakeven: false, format: "money",
      items: top.map((r) => ({ name: r.name, value: r.returns, color: "#ef4444", sub: `${r.returnsPct}% of its revenue` })),
    };
  }

  if (kind === "funnel") {
    const web = websiteAnalytics();
    if (arg === "store") {
      return { type: "funnel", title: "Where visitors drop off", subtitle: "Store-wide, this period (Tally Web Pixel)", steps: web.storeFunnel };
    }
    const f = web.products.find((p) => p.id === arg);
    if (!f) return null;
    return {
      type: "funnel",
      title: `${f.name} — visitor funnel`,
      subtitle: "This product's path from view to sale (Tally Web Pixel)",
      steps: [
        { label: "Product views", value: f.views },
        { label: "Added to cart", value: f.atc },
        { label: "Reached checkout", value: f.checkout },
        { label: "Units sold", value: f.units },
      ],
    };
  }

  return null;
}

export const CHART_REF_GUIDE = `If a chart would genuinely help answer the question, add a "chart" field set to ONE of these exact ref strings (omit "chart" entirely — do not include the key — if no chart is needed, which is most answers). Pick based on what the question is actually asking, not just the topic:
- "waterfall:store" — question is about where money goes / cost breakdown, store-wide
- "waterfall:<productId>" — same, but for one specific product (productId must be a real "id" from DATA.products)
- "channels:store" — question is "which channel(s) are profitable/best/worst" — a ranking/comparison at one point in time, store-wide
- "channels:<productId>" — same ranking/comparison question, but scoped to one specific product
- "trend:cmroas" — question is specifically about change OVER TIME ("how has X trended", "is it improving") — NOT for a plain "which channel is best" ranking question, use channels:store for that instead
- "returns:top" — question is about returns cost by product
- "funnel:store" — question is about on-site behavior / where visitors drop off between viewing and buying, store-wide
- "funnel:<productId>" — same, but for one specific product (great for "why isn't this product converting" questions)
- "trend:revenue" — question is about revenue/profit direction over recent months
- "trend:sessions" — question is about site traffic over recent weeks
- "projection:budget" — question is "how much do I need to spend for N orders" or "what would more/less budget get me" (blended). Use "projection:budget:<channelId>" to scope to one channel (channelId: meta|google|tiktok|snapchat|twitter)
- "runway:<productId>" — question is about when a product runs out of stock / how long inventory lasts
- "compare:<productId1>,<productId2>" — question compares exactly two specific products (both must be real ids from DATA.products)
- "split:paidearned" — question is about how much of the business ads actually drive vs organic/earned
- "audience:device" — question is about which device (mobile/desktop/tablet) the ad audience uses or converts on
- "audience:age" — question is about which age group the ads reach or which converts best
- "audience:geo" — question is about which region/geography the ad audience is in or converts best
Never invent a ref string outside this list, and never put chart data anywhere else in your response — the ref is resolved server-side from real numbers.`;
