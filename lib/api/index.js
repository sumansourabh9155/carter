// THE DATA FACADE — the only data import surface for components.
// Today these resolve mock data through the real margin engine. When real
// Shopify/ads APIs arrive (Phase 2), only these implementations change.

import { allProducts, oneProduct, losingHero, cashCalendar, returnsRanking } from "@/lib/api/mock/products";
import { dashboardMetrics } from "@/lib/api/mock/metrics";
import { marketingData } from "@/lib/api/mock/marketing";
import { websiteAnalytics } from "@/lib/compute/funnel";
import { insightsBoard } from "@/lib/compute/insights";
import { buildDailyBrief } from "@/lib/compute/dailyBrief";
import { answerForSmart } from "@/lib/api/mock/ai";
import { INSIGHTS_SEED } from "@/lib/data/insightsSeed";
import { ALERTS_SEED } from "@/lib/data/alertsSeed";
import { RECENT_ORDERS } from "@/lib/data/ordersSeed";
import { STORE, SKUS } from "@/lib/data/skus";
import { overallReadiness } from "@/lib/dataFields";

// Simulate network latency so loading states are real.
function delay(ms = 360) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function getStore() {
  await delay(80);
  return STORE;
}

export async function getMetrics({ lens = "all" } = {}) {
  await delay();
  return dashboardMetrics(lens);
}

export async function getProducts() {
  await delay();
  return allProducts();
}

export async function getProduct(id) {
  await delay(280);
  return oneProduct(id); // null → caller triggers notFound()
}

export async function getLosingHero() {
  await delay(200);
  return losingHero();
}

export async function getCashCalendar() {
  await delay();
  return cashCalendar();
}

export async function getReturnsRanking() {
  await delay();
  return returnsRanking();
}

export async function getMarketing() {
  await delay();
  return marketingData();
}

// On-site behavior from the Tally Web Pixel (Shopify Web Pixels API) —
// sessions, funnel stages, and per-product conversion verdicts.
export async function getWebsite() {
  await delay();
  return websiteAnalytics();
}

export async function getInsights() {
  await delay(300);
  return INSIGHTS_SEED;
}

// The re-stitched, cross-domain action board — prioritized recommendations
// plus a store-health summary. This is what the Insights page renders.
export async function getInsightsBoard() {
  await delay();
  return insightsBoard();
}

// Aura's proactive Daily Brief (ambient mode) — a plain-English synthesis of
// the ranked board: what moved money and what to do, before you ask.
export async function getDailyBrief() {
  await delay(240);
  return buildDailyBrief();
}

export async function getRecentOrders() {
  await delay(260);
  return RECENT_ORDERS;
}

export async function getAlerts() {
  await delay(220);
  return ALERTS_SEED;
}

export async function createAlert(payload) {
  await delay(200);
  return { ok: true, id: "a_new", ...payload };
}

// Hands the confirmed reallocation off to the connected ad accounts.
// Human-confirm only for now — no auto-apply until a recommendation track
// record exists to justify it.
export async function applyRecommendation(payload) {
  await delay(260);
  return { ok: true, id: "rec_new", ...payload };
}

// Returns the structured answer; the AI panel handles timed reveal + STOP.
// Routing is $0 client-side semantic matching (embeddings in the browser),
// with a keyword fallback baked into answerForSmart. `history` only matters
// for the last-resort Aura path — every free path is stateless by design.
export async function askTally(message, history) {
  return answerForSmart(message, history);
}

// --- Data collection (the inputs Shopify can't provide) ---

export async function getDataCollection() {
  await delay(340);
  return SKUS.map((s) => ({ ...s })); // editable copies
}

export async function getDataReadiness() {
  await delay(150);
  const r = overallReadiness(SKUS);
  return { pct: r.pct, incompleteCount: r.incompleteCount };
}

// Mock persistence — in production this writes the merchant-supplied fields
// that feed the margin engine and the forecasting models.
export async function updateSkuData(id, patch) {
  await delay(160);
  return { ok: true, id, patch };
}
