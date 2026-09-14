// ACTION TYPE REGISTRY — the contract between insights (what should happen),
// the simulator (what it would change), policy (who may pull the trigger),
// and the engine (what actually fires). Types are data, not code: adding an
// action type here is the only registration step.
//
// Autonomy tiers, least to most trusted:
//   "watch"   — Aura observes and reports; execution is blocked
//   "suggest" — Aura proposes with a simulation; the operator executes
//   "auto"    — autopilot may execute unattended (reversible types only)

/**
 * @typedef {"watch"|"suggest"|"auto"} Tier
 */

/**
 * @typedef {Object} ActionType
 * @property {string} id
 * @property {string} label
 * @property {string} description
 * @property {Tier} defaultTier
 * @property {boolean} reversible  false = undo needs an external compensating step
 * @property {{ maxDollars: number }} caps  hard ceiling on dollars at stake per execution (0 = no dollars involved)
 * @property {string} [reversalNote]  shown when reversible is false
 */

export const TIERS = ["watch", "suggest", "auto"];

export const ACTION_TYPES = {
  pause_ads: {
    id: "pause_ads",
    label: "Pause ads",
    description: "Pause every ad set behind a SKU that destroys margin at the current budget.",
    defaultTier: "suggest",
    reversible: true,
    caps: { maxDollars: 10000 },
  },
  shift_budget: {
    id: "shift_budget",
    label: "Shift budget",
    description: "Move ad budget from the weakest CM-ROAS channel toward the strongest — net-neutral to total spend.",
    defaultTier: "suggest",
    reversible: true,
    caps: { maxDollars: 5000 },
  },
  reorder: {
    id: "reorder",
    label: "Reorder stock",
    description: "Draft a purchase order sized by the reorder engine, with deposit and terms from the supplier contract.",
    defaultTier: "suggest",
    reversible: false,
    reversalNote:
      "Not instantly reversible — undo requires a compensating cancellation with the supplier, and the deposit may be forfeit.",
    caps: { maxDollars: 25000 },
  },
  price_change: {
    id: "price_change",
    label: "Change price",
    description: "Adjust a SKU's price; per-unit CM1 math is exact, demand elasticity is not.",
    defaultTier: "suggest",
    reversible: true,
    caps: { maxDollars: 10000 },
  },
  clear_stock_promo: {
    id: "clear_stock_promo",
    label: "Clear stock",
    description: "Run a discount promo to convert dead inventory back into cash.",
    defaultTier: "suggest",
    reversible: true,
    caps: { maxDollars: 8000 },
  },
  create_alert: {
    id: "create_alert",
    label: "Create alert",
    description: "Add a watchlist alert — monitoring only, no financial change.",
    defaultTier: "auto",
    reversible: true,
    caps: { maxDollars: 0 },
  },
};

// Insight verdict → action type. null = insight is informational; nothing for
// the engine to execute (cash planning and data completeness are workflows,
// not one-shot actions). Keys match lib/compute/insights.js verdicts exactly.
export const VERDICT_TO_ACTION = {
  "Cut ads": "pause_ads",
  "Reorder now": "reorder",
  "Clear stock": "clear_stock_promo",
  "Shift budget": "shift_budget",
  "Trim spend": "shift_budget",
  "Scale": "shift_budget",
  "Review fit": "create_alert",
  "Fix page": "create_alert",
  "Plan cash": null,
  "Complete data": null,
};
