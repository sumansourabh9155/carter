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

// RETAIL-MEDIA SCOPE. This product acts on PAID MEDIA. Reordering stock and
// running clearance promos are merchant operations — the same line the
// insight board draws with OUT_OF_SCOPE_VERDICTS. The types stay registered
// (the simulation math is correct and costly to rebuild) but `inScope: false`
// keeps them out of every surface: the autonomy panel, the action menu, the
// autopilot sweep. Flip the flag to bring one back; nothing else changes.
const OUT_OF_SCOPE_TYPES = new Set(["reorder", "clear_stock_promo"]);

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
  /*
    THE MISSING TOOL.

    The board's most severe card was "you are 22.9% over the monthly ad
    budget", and the only thing it offered was Shift budget — which is
    net-neutral to total spend by definition and therefore cannot fix an
    overspend. Pause ads cuts one SKU at a time. Nothing in the product could
    move the one number a media manager actually owns.

    Pulling spend back is the most common action in the job and it was the
    one action missing.
  */
  reduce_spend: {
    id: "reduce_spend",
    label: "Pull spend back",
    description:
      "Cut the weakest channel's daily budget to bring total spend back inside the monthly plan. Reduces spend rather than moving it.",
    defaultTier: "suggest",
    reversible: true,
    caps: { maxDollars: 15000 },
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
  /*
    The fix for the cause, not the symptom. "Meta efficiency is sliding" used
    to route to a budget shift, which moves money away from a channel whose
    problem is a 65-day-old asset at frequency 6.4. Replacing the creative
    addresses it; moving the budget just relocates it.
  */
  refresh_creative: {
    id: "refresh_creative",
    label: "Refresh creative",
    description:
      "Rotate a fatigued asset out and its replacement in. Recovers the efficiency the asset had in its own first week; does not change spend.",
    defaultTier: "suggest",
    reversible: true,
    caps: { maxDollars: 10000 },
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

for (const t of Object.values(ACTION_TYPES)) {
  t.inScope = !OUT_OF_SCOPE_TYPES.has(t.id);
}

/** The action types this product actually offers. Every UI surface reads this. */
export const IN_SCOPE_ACTION_TYPES = Object.values(ACTION_TYPES).filter((t) => t.inScope);

// Insight verdict → action type. null = insight is informational; nothing for
// the engine to execute (cash planning and data completeness are workflows,
// not one-shot actions). Keys match lib/compute/insights.js verdicts exactly.
export const VERDICT_TO_ACTION = {
  "Cut ads": "pause_ads",
  "Reorder now": "reorder",
  "Clear stock": "clear_stock_promo",
  "Shift budget": "shift_budget",
  "Trim spend": "shift_budget",
  "Pull spend back": "reduce_spend",
  "Scale": "shift_budget",
  "Review fit": "create_alert",
  "Fix page": "create_alert",
  "Refresh creative": "refresh_creative",
  "Re-run test": null,
  "Test this": null,
  "Plan cash": null,
  "Complete data": null,
};
