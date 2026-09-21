// PRODUCT LIFECYCLE STAGE — catalog-planning math, as opposed to margin.js's
// one-SKU-at-a-time diagnostics. Derived from launchDate + trendPct, both
// already on every SKU — no new data collection required to ship this.

// The reporting period this seed catalog represents ends here — not
// wall-clock "today," since launchDate is a fixed historical value and
// days-since-launch must stay stable regardless of when the app is opened.
const PERIOD_END_DATE = "2024-12-01";

const INTRODUCTION_DAYS = 60; // younger than this: too early for mature benchmarks
const GROWTH_TREND_PCT = 5;
const DECLINE_TREND_PCT = -5;

function daysBetween(fromStr, toStr) {
  if (!fromStr) return null;
  return Math.round((new Date(toStr) - new Date(fromStr)) / 86400000);
}

// Per-SKU lifecycle stage. Age comes first: a brand-new SKU shouldn't be
// judged "declining" or "growing" against a trend it hasn't had time to
// establish.
export function classifyLifecycleStage(raw) {
  const daysSinceLaunch = daysBetween(raw.launchDate, PERIOD_END_DATE);
  if (daysSinceLaunch == null) return "unknown";
  if (daysSinceLaunch < INTRODUCTION_DAYS) return "introduction";
  if (raw.trendPct >= GROWTH_TREND_PCT) return "growth";
  if (raw.trendPct <= DECLINE_TREND_PCT) return "decline";
  return "maturity";
}

export const LIFECYCLE_META = {
  introduction: { label: "Introduction", desc: "Launched recently — too early for mature benchmarks", color: "#0277bd" },
  growth: { label: "Growth", desc: "Established and trending up", color: "#2e7d32" },
  maturity: { label: "Maturity", desc: "Established and holding steady", color: "#94a3b8" },
  decline: { label: "Decline", desc: "Established and trending down", color: "#ef4444" },
  unknown: { label: "Unknown", desc: "No launch date on file", color: "#e4eaed" },
};
