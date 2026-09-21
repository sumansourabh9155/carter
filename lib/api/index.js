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
import { portfolioRollup } from "@/lib/compute/rollup";
import { experimentBoard, attributionGap } from "@/lib/compute/incrementality";
import { creativePerformance, creativeHealthByChannel } from "@/lib/compute/creative";
import { planBudget, budgetLadder } from "@/lib/compute/planner";
import {
  simulateForInsight,
  executeAction,
  undoAction,
  runAutopilot,
  listActions,
  clearLog,
  getPolicy,
  setTier,
  setKillSwitch,
  setAutopilotEnabled,
  resetOverrides,
  outcomeSummary,
} from "@/lib/actions";

// Simulate network latency so loading states are real.
function delay(ms = 360) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function getStore() {
  await delay(80);
  return STORE;
}

export async function getMetrics({ lens = "all", period = "current" } = {}) {
  await delay();
  return dashboardMetrics(lens, period);
}

export async function getProducts({ period = "current" } = {}) {
  await delay();
  return allProducts(period);
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

// On-site behavior from the Carter Web Pixel (Shopify Web Pixels API) —
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

/* ---------------------------------------------------------------- actions */
/*
  THE ACTION LOOP. An insight proposes → the simulator prices it → policy
  guardrails decide who may fire it → the engine executes and audits it → it
  can be undone. Everything below is a thin async wrapper over lib/actions so
  components never reach past this facade, and so swapping the engine for real
  ad-platform APIs is a change in one layer.

  These are NOT stubs: executing pause_ads writes the ad-spend overlay that
  lib/api/mock/products.js applies before the margin engine, so CM2, CM-ROAS,
  the rollup and the insight board all move on the next read.
*/

/** Price an insight's action without committing to it. @returns {{action, simulation}|null} */
export async function simulateInsightAction(insight) {
  await delay(240);
  return simulateForInsight(insight);
}

/** Fire an action. Guardrail failures come back as `ok: false` WITH an audited entry. */
export async function runInsightAction(action) {
  await delay(420);
  return executeAction(action, { executedBy: "user" });
}

export async function revertAction(entryId) {
  await delay(280);
  return undoAction(entryId);
}

/** Did the changes we made actually pay off? Predicted vs realised CM2. */
export async function getActionOutcomes() {
  await delay(160);
  return outcomeSummary();
}

export async function getActionLog() {
  await delay(120);
  return listActions();
}

export async function clearActionLog() {
  await delay(120);
  clearLog();
  // The log is the record of what was applied; dropping it without dropping
  // the overlay would leave the dashboards changed with nothing explaining why.
  resetOverrides();
  return { ok: true };
}

export async function triggerAutopilot() {
  await delay(520);
  return runAutopilot();
}

/* --------------------------------------------------------- autonomy policy */

export async function getAutonomyPolicy() {
  await delay(100);
  return getPolicy();
}

export async function setActionTier(typeId, tier) {
  await delay(140);
  return setTier(typeId, tier);
}

export async function setAutonomyKillSwitch(on) {
  await delay(140);
  return setKillSwitch(on);
}

export async function setAutonomyAutopilot(on) {
  await delay(140);
  return setAutopilotEnabled(on);
}

/* ------------------------------------------------------- measurement layer */

/**
 * Incrementality: the experiments, and the gap between what attribution
 * reports and what a holdout measured. This is the only thing in the product
 * that validates `paidShare` rather than assuming it.
 */
export async function getExperiments() {
  await delay(280);
  const mkt = marketingData();
  return { board: experimentBoard(), gap: attributionGap(mkt.channels) };
}

/** Creative age, frequency and decay — the cause behind channel declines. */
export async function getCreatives() {
  await delay(240);
  return { creatives: creativePerformance(), byChannel: creativeHealthByChannel() };
}

/** The CM2-maximising allocation, plus the same plan at other budget levels. */
export async function getBudgetPlan() {
  await delay(320);
  const mkt = marketingData();
  const budget = mkt.pacing?.budget ?? 0;
  return { plan: planBudget(mkt.channels, budget), ladder: budgetLadder(mkt.channels, budget) };
}

/* ---------------------------------------------------------------- rollups */

/** The level above the SKU — category totals with period-over-period deltas. */
export async function getPortfolioRollup(dimension = "category", period = "current") {
  await delay(300);
  return portfolioRollup(allProducts(period), dimension);
}

// Returns the structured answer; the AI panel handles timed reveal + STOP.
// Routing is $0 client-side semantic matching (embeddings in the browser),
// with a keyword fallback baked into answerForSmart. `history` only matters
// for the last-resort Aura path — every free path is stateless by design.
export async function askCarter(message, history) {
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
