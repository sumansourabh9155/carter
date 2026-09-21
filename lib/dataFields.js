// The data Carter collects from the merchant (what Shopify can't provide).
// Each field declares what prediction/model it powers — so the UI can show
// "fill this in → unlock that", and we capture exactly what improves accuracy.

export const FIELD_GROUPS = [
  {
    id: "costs",
    label: "Costs",
    desc: "Powers true margin — CM1, CM2, CM3.",
    fields: [
      { key: "manufacturingCost", label: "Manufacturing cost / unit", type: "money", required: true, realFlag: true, powers: "True CM1" },
      { key: "deliveryCost", label: "Delivery (fulfilment) cost / unit", type: "money", required: true, powers: "True CM1" },
      { key: "packagingCost", label: "Packaging cost / unit", type: "money", powers: "Landed-cost precision" },
      { key: "dutiesPct", label: "Duties & import %", type: "pct", powers: "Landed cost" },
    ],
  },
  /*
    Supply and supplier-cash groups were removed. Lead time, MOQ, supplier
    name, payment terms and PO deposits are procurement and treasury data — a
    retail media platform has no business asking an advertiser for them, and
    they powered reorder/stockout/cash features that are no longer surfaced.
    Only inputs that make CAMPAIGN margin true are collected now.
  */
  {
    id: "demand",
    label: "Demand",
    desc: "Powers seasonality-aware pacing.",
    fields: [
      { key: "launchDate", label: "Launch date", type: "date", required: true, powers: "Seasonality model" },
      { key: "seasonality", label: "Seasonality profile", type: "select", options: ["None", "Spring", "Summer", "Winter", "Holiday"], required: true, powers: "Demand model" },
      { key: "isSubscription", label: "Subscription product?", type: "bool", powers: "Recurring-revenue model" },
    ],
  },
  {
    id: "targets",
    label: "Targets",
    desc: "Powers pricing guardrails & optimization.",
    fields: [
      { key: "targetMarginPct", label: "Target margin %", type: "pct", powers: "Pricing guardrails" },
      { key: "priceFloor", label: "Price floor", type: "money", powers: "Discount limits" },
    ],
  },
];

// Predictions and the fields they require to unlock per SKU.
export const PREDICTIONS = [
  { id: "margin", label: "True margin (CM1–CM2)", fields: ["manufacturingCost", "deliveryCost"] },
  { id: "roas", label: "Profit-true CM-ROAS", fields: ["manufacturingCost", "deliveryCost"] },
  { id: "demand", label: "Demand forecast", fields: ["launchDate", "seasonality"] },
];

const REAL_FLAG_KEYS = new Set(
  FIELD_GROUPS.flatMap((g) => g.fields.filter((f) => f.realFlag).map((f) => f.key))
);

// A field counts as "filled" when present; manufacturingCost must be REAL, not estimated.
export function fieldFilled(rec, key) {
  if (REAL_FLAG_KEYS.has(key)) return rec.costSource === "real";
  const v = rec[key];
  return v !== null && v !== undefined && v !== "";
}

const REQUIRED_FIELDS = FIELD_GROUPS.flatMap((g) =>
  g.fields.filter((f) => f.required).map((f) => ({ ...f, group: g.label }))
);

// Per-SKU completeness over the required fields.
export function computeCompleteness(rec) {
  const missing = REQUIRED_FIELDS.filter((f) => !fieldFilled(rec, f.key));
  const filled = REQUIRED_FIELDS.length - missing.length;
  return {
    filled,
    total: REQUIRED_FIELDS.length,
    pct: Math.round((filled / REQUIRED_FIELDS.length) * 100),
    missing,
  };
}

export function predictionUnlocked(rec, prediction) {
  return prediction.fields.every((k) => fieldFilled(rec, k));
}

// Store-wide readiness: overall completeness + per-prediction SKU coverage.
export function overallReadiness(records) {
  const comps = records.map(computeCompleteness);
  const pct = Math.round(comps.reduce((a, c) => a + c.pct, 0) / (records.length || 1));
  const incompleteCount = comps.filter((c) => c.pct < 100).length;
  const predictions = PREDICTIONS.map((p) => ({
    ...p,
    ready: records.filter((r) => predictionUnlocked(r, p)).length,
    total: records.length,
  }));
  return { pct, incompleteCount, predictions };
}
