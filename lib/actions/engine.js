// ACTIONS ENGINE — the orchestrator. simulate → propose → execute → receipt
// → undo, with every step audited. Insights say WHAT should happen; this
// module is the only place actions actually FIRE, so guardrails run here and
// nowhere can bypass them.
//
// Only pause_ads mutates the demo model (the ad-spend overlay); every other
// type executes record-only, with the receipt describing the external API
// call that would fire in production.

import { ACTION_TYPES, VERDICT_TO_ACTION } from "@/lib/actions/types";
import { simulateAction } from "@/lib/actions/simulate";
import { getPolicy, checkGuardrails } from "@/lib/actions/policy";
import { listActions, getAction, appendAction, updateAction } from "@/lib/actions/store";
import { getOverrides, setAdSpendMult, clearAdSpendMult } from "@/lib/actions/overrides";
import { oneProduct, productsSummary } from "@/lib/api/mock/products";
import { insightsBoard } from "@/lib/compute/insights";
import { money } from "@/lib/format";
import { outcomeMaturity, OUTCOME_MATURITY_DAYS } from "@/lib/time";

/**
 * @typedef {Object} Action
 * @property {string} type  ACTION_TYPES id
 * @property {string} title
 * @property {{ skuId?: string, channelId?: string, insightId?: string, insightTitle?: string }} params
 * @property {Object} sourceInsight  the insight that proposed it
 * @property {import("@/lib/actions/simulate").Simulation} [simulation]  attach to skip re-simulation on execute
 */

/**
 * Map an insight to a concrete, executable action.
 * @returns {Action|null} null when the verdict is informational (Plan cash, Complete data)
 */
export function proposeFromInsight(insight) {
  const typeId = VERDICT_TO_ACTION[insight?.verdict];
  if (!typeId) return null;
  const type = ACTION_TYPES[typeId];
  // Out-of-scope types never leave the registry — see types.js.
  if (!type?.inScope) return null;

  // SKU-targeted insights link to their product page — that href is the id.
  const m = /^\/products\/([^/]+)$/.exec(insight.ref?.href || "");
  const skuId = m ? m[1] : undefined;

  // Rolled-up insights carry every member SKU, so one confirmation moves the
  // whole group. Without this a category card would be advice, not an action.
  const skuIds = Array.isArray(insight.skuIds) && insight.skuIds.length ? insight.skuIds : undefined;

  return {
    type: typeId,
    title: `${type.label} — ${insight.ref?.label || "Store"}`,
    params: {
      ...(skuId ? { skuId } : {}),
      ...(skuIds ? { skuIds, groupLabel: insight.ref?.label } : {}),
      ...(insight.creativeId ? { creativeId: insight.creativeId } : {}),
      scope: insight.scope || (skuId ? "sku" : "store"),
      insightId: insight.id,
      insightTitle: insight.title, // stable dedupe key (ins-N ids are positional)
    },
    sourceInsight: insight,
  };
}

// Resolves whatever the action targets: one SKU, a group of them, or nothing.
function resolveTargets(action) {
  const { skuId, skuIds } = action?.params || {};
  if (skuIds) return skuIds.map(oneProduct).filter(Boolean);
  if (skuId) {
    const p = oneProduct(skuId);
    return p ? [p] : [];
  }
  return [];
}

/**
 * Propose + simulate in one step, resolving the product(s) it targets.
 * @returns {{ action: Action, simulation: import("@/lib/actions/simulate").Simulation }|null}
 */
export function simulateForInsight(insight) {
  const action = proposeFromInsight(insight);
  if (!action) return null;
  const targets = resolveTargets(action);
  const simulation = simulateAction(action, targets[0] ?? null, targets);

  // The same gate execute() runs, evaluated up front so the confirm step can
  // say "this is blocked and here is why" BEFORE the operator commits — being
  // refused after pressing the button is how people stop trusting a control.
  const guardrails = checkGuardrails(action, simulation);

  return {
    action,
    simulation,
    guardrails,
    type: ACTION_TYPES[action.type],
    tier: getPolicy().tiers[action.type] ?? ACTION_TYPES[action.type].defaultTier,
    targets: targets.map((t) => ({ id: t.id, name: t.name, adSpend: t.adSpend, cm2: t.cm2 })),
  };
}

// The real effect + its receipt. pause_ads writes the overlay; the rest are
// record-only and honest about it.
function applyEffect(action, simulation, product, targets = []) {
  const ids = targets.length
    ? targets.map((t) => t.id)
    : action.params?.skuId
      ? [action.params.skuId]
      : [];

  switch (action.type) {
    case "pause_ads": {
      if (!ids.length) {
        return { receipt: { lines: ["No SKU resolved — nothing paused"] }, undo: null };
      }
      // Capture EVERY previous multiplier before writing any, so an undo
      // restores the exact pre-action state even if some SKUs in the group
      // were already paused by an earlier action.
      const before = getOverrides().adSpendMult;
      const prevMults = Object.fromEntries(ids.map((id) => [id, before[id] ?? null]));
      for (const id of ids) setAdSpendMult(id, 0);

      const scope = ids.length > 1 ? `${ids.length} SKUs` : "1 SKU";
      return {
        receipt: {
          lines: [
            `Ad sets paused via Meta/Google/TikTok APIs — ${scope}`,
            `Demo store: ad spend zeroed on ${scope} — CM2, CM-ROAS and the board recompute on next render`,
          ],
        },
        undo: { kind: "restore_ad_spend_mult", prevMults },
      };
    }
    case "reorder": {
      const lines = product
        ? [
            `Purchase order drafted: ${(product.suggestedReorderQty || 0).toLocaleString()} units @ ${money(product.unitCost, { decimals: 2 })} — ${money(product.reorderCostTotal)} total, to ${product.supplier || "supplier"}`,
            `Deposit ${money(product.reorderDepositDue)} due now; ${money(product.reorderBalanceDue)} on ${product.paymentTermsUsed}`,
            "Record-only in demo — no supplier email/EDI sent",
            ACTION_TYPES.reorder.reversalNote,
          ]
        : ["Purchase order drafted (SKU unresolved)", "Record-only in demo — no supplier email/EDI sent"];
      return { receipt: { lines }, undo: null }; // not reversible in-model
    }
    case "shift_budget":
      return {
        receipt: {
          lines: [
            "Budget reallocation queued via Meta/Google/TikTok budget APIs",
            "Record-only in demo — no live campaign budgets changed",
          ],
        },
        undo: { kind: "record_only" },
      };
    case "reduce_spend":
      return {
        receipt: {
          lines: [
            "Daily budget lowered on the weakest channel via its budget API",
            `Brings the month back toward plan${simulation?.cashImpact ? ` — ${money(simulation.cashImpact)}/mo of spend withdrawn` : ""}`,
            "Record-only in demo — no live campaign budgets changed",
          ],
        },
        undo: { kind: "record_only" },
      };
    case "price_change":
      return {
        receipt: {
          lines: [
            "Price update pushed via Shopify Admin API (productVariantsBulkUpdate)",
            "Record-only in demo — storefront price unchanged",
          ],
        },
        undo: { kind: "record_only" },
      };
    case "clear_stock_promo":
      return {
        receipt: {
          lines: [
            "Discount created via Shopify Admin API + promo email queued in Klaviyo",
            "Record-only in demo — no live discount published",
          ],
        },
        undo: { kind: "record_only" },
      };
    case "refresh_creative":
      return {
        receipt: {
          lines: [
            "Fatigued asset paused and its replacement promoted in the ad set",
            `Same budget behind new creative${simulation?.cm2DeltaMonthly ? ` — up to ${money(simulation.cm2DeltaMonthly)}/mo of decayed margin to recover` : ""}`,
            "Record-only in demo — no live asset swapped",
          ],
        },
        undo: { kind: "record_only" },
      };
    case "create_alert":
      return {
        receipt: {
          lines: ["Alert added to the Aura watchlist — fires on the next material change for this metric"],
        },
        undo: { kind: "record_only" },
      };
    default:
      return { receipt: { lines: ["No effect defined for this action type"] }, undo: null };
  }
}

/**
 * Execute an action: simulate (if not already attached), run guardrails,
 * apply the effect, append the audited entry. Blocked attempts are audited
 * too — silence is not an option for an autonomy system.
 * @param {Action} action
 * @param {{ executedBy?: "user"|"autopilot" }} [opts]
 * @returns {{ ok: boolean, reasons?: string[], entry: import("@/lib/actions/store").ActionLogEntry }}
 */
export function executeAction(action, { executedBy = "user" } = {}) {
  const acted = { ...action, executedBy };
  const targets = resolveTargets(acted);
  const product = targets[0] ?? null;
  const simulation = acted.simulation || simulateAction(acted, product, targets);

  const type = ACTION_TYPES[acted.type];
  const tier = getPolicy().tiers[acted.type] ?? type?.defaultTier ?? "suggest";
  const base = {
    type: acted.type,
    title: acted.title,
    params: acted.params || {},
    simulation,
    tier,
    executedBy,
  };

  const check = checkGuardrails(acted, simulation);
  if (!check.allowed) {
    const entry = appendAction({
      ...base,
      status: "blocked",
      receipt: { lines: check.reasons.map((r) => `Blocked: ${r}`) },
      undo: null,
    });
    return { ok: false, reasons: check.reasons, entry };
  }

  /*
    THE OUTCOME LOOP starts here.

    Snapshot store CM2 the instant BEFORE the effect lands, and store it with
    the entry alongside what the simulation predicted. Without that baseline
    there is no way to ever answer "did it work" — which is the question a
    media team asks about every change they make, and the only evidence that
    would justify letting autopilot run unattended.

    The baseline is taken pre-effect on purpose: measuring after would compare
    the new world to itself and every action would score a perfect zero.
  */
  const baselineCm2 = productsSummary().cm2;
  const { receipt, undo } = applyEffect(acted, simulation, product, targets);
  const entry = appendAction({
    ...base,
    status: "executed",
    receipt,
    undo,
    outcome: {
      baselineCm2,
      predictedCm2Delta: simulation?.cm2DeltaMonthly ?? 0,
      // Only pause_ads moves the model today. Everything else executes
      // record-only, and claiming a measured result for it would be the
      // fabrication this whole loop exists to prevent.
      measurable: acted.type === "pause_ads",
    },
  });
  return { ok: true, entry };
}

/**
 * Reverse an executed entry. Only entries with in-model or record-only undo
 * info qualify (reorder never does — compensating cancellation is external).
 * Patches the entry in place (status "undone" + undoneAt) rather than
 * appending, so the log reads as one action with its full lifecycle.
 * @returns {{ ok: boolean, entry: import("@/lib/actions/store").ActionLogEntry|null }}
 */
/*
  Scores an executed entry against what it promised.

  `predicted` is the simulation's monthly CM2 delta. `actual` is the change in
  store CM2 since the baseline captured at execution. They will not match
  exactly and that is the point — an honest tool shows the miss rather than
  quietly reprinting the forecast as the result.
*/
export function scoreOutcome(entry, currentCm2) {
  const o = entry?.outcome;
  if (!o || entry.status !== "executed") return null;
  if (!o.measurable) {
    return { state: "unmeasurable", note: "Record-only in this environment — no in-model effect to measure." };
  }

  /*
    TIME IS PART OF THE MEASUREMENT.

    This scored an action the instant it executed, which is not a result. Ad
    spend stops immediately; the orders that spend would have produced keep
    arriving across the attribution window. Reading the number on day zero
    banks the whole saving against none of the cost, so every action scores
    beautifully and the track record is worthless.

    Immature outcomes are reported with their figures AND marked as not yet
    settled, so they can be watched without being counted.
  */
  const maturity = outcomeMaturity(entry.ts);
  const actual = Math.round(currentCm2 - o.baselineCm2);
  const predicted = Math.round(o.predictedCm2Delta);
  const accuracyPct = predicted !== 0 ? Math.round((actual / predicted) * 100) : null;
  return {
    state: actual >= 0 ? "paid off" : "went backwards",
    predicted,
    actual,
    accuracyPct,
    ...maturity,
    settling: !maturity.mature,
    maturityDays: OUTCOME_MATURITY_DAYS,
    // Within a fifth of the forecast is a good call; wildly over is a sign
    // the simulation's assumptions need revisiting, not a victory.
    verdict:
      !maturity.mature ? "still settling"
        : accuracyPct == null ? "no forecast"
        : accuracyPct >= 80 && accuracyPct <= 125 ? "as forecast"
        : accuracyPct > 125 ? "better than forecast"
        : accuracyPct >= 0 ? "under forecast"
        : "wrong direction",
  };
}

/**
 * THE TRACK RECORD — the artifact that makes autonomy sellable.
 *
 * Nobody grants a system permission to move money unattended on the strength
 * of a good demo. They grant it on evidence: "these forecasts have run N%
 * accurate across M changes". This aggregates exactly that, and it counts
 * ONLY settled outcomes — a record built from same-day readings would be a
 * flattering fiction and the first person to check it would find out.
 */
export function outcomeSummary() {
  const currentCm2 = productsSummary().cm2;
  const scored = listActions()
    .filter((e) => e.status === "executed" && e.outcome?.measurable)
    .map((e) => ({ id: e.id, title: e.title, ts: e.ts, type: e.type, ...scoreOutcome(e, currentCm2) }));

  const settled = scored.filter((x) => x.actual != null && x.mature);
  const settling = scored.filter((x) => x.actual != null && !x.mature);

  // Accuracy is the MEDIAN absolute error against forecast, not the mean of
  // ratios: one action that came in at 900% of forecast would otherwise
  // present as excellent accuracy.
  const errors = settled
    .filter((x) => x.accuracyPct != null)
    .map((x) => Math.abs(100 - x.accuracyPct))
    .sort((a, b) => a - b);
  const medianErrorPct = errors.length
    ? errors.length % 2
      ? errors[(errors.length - 1) / 2]
      : Math.round((errors[errors.length / 2 - 1] + errors[errors.length / 2]) / 2)
    : null;

  return {
    // Settled only. `settlingCount` is surfaced separately so the UI can say
    // "3 more still settling" instead of silently omitting them.
    count: settled.length,
    settlingCount: settling.length,
    netCm2: settled.reduce((a, x) => a + x.actual, 0),
    predictedCm2: settled.reduce((a, x) => a + x.predicted, 0),
    paidOff: settled.filter((x) => x.actual > 0).length,
    accuracyPct: medianErrorPct == null ? null : Math.max(0, 100 - medianErrorPct),
    medianErrorPct,
    maturityDays: OUTCOME_MATURITY_DAYS,
    // Enough history to mean anything? Below this the number is noise and the
    // UI should not lead with it.
    trustworthy: settled.length >= 5,
    entries: scored,
  };
}

export function undoAction(entryId) {
  const entry = getAction(entryId);
  if (!entry) return { ok: false, entry: null };
  if (entry.status !== "executed") return { ok: false, entry };

  const type = ACTION_TYPES[entry.type];
  if (!type?.reversible || !entry.undo) return { ok: false, entry };

  if (entry.undo.kind === "restore_ad_spend_mult") {
    // Restore whatever multiplier each SKU carried before the pause (usually
    // none). `prevMult`/`skuId` is the pre-group shape — still read so log
    // entries written before group actions existed can still be undone.
    const prevMults = entry.undo.prevMults ?? { [entry.undo.skuId]: entry.undo.prevMult ?? null };
    for (const [skuId, mult] of Object.entries(prevMults)) {
      if (mult == null) clearAdSpendMult(skuId);
      else setAdSpendMult(skuId, mult);
    }
  }
  // "record_only" kinds have no in-model state to restore.

  const patched = updateAction(entryId, { status: "undone", undoneAt: Date.now() });
  return { ok: true, entry: patched };
}

/**
 * Unattended sweep: for every current insight whose action type the merchant
 * trusts at the "auto" tier, simulate → guardrail → execute as autopilot.
 * Insights already executed (matched by insight title, which is stable across
 * board rebuilds — ids are positional) are skipped so reruns are idempotent.
 * @returns {{ executed: import("@/lib/actions/store").ActionLogEntry[], skipped: { title: string, reason: string }[] }}
 */
export function runAutopilot() {
  const executed = [];
  const skipped = [];

  const policy = getPolicy();
  if (policy.killSwitch) {
    return { executed, skipped: [{ title: "Autopilot run", reason: "Kill switch is on" }] };
  }
  if (!policy.autopilotEnabled) {
    return { executed, skipped: [{ title: "Autopilot run", reason: "Autopilot is disabled" }] };
  }

  const log = listActions();
  for (const insight of insightsBoard().actions) {
    const action = proposeFromInsight(insight);
    if (!action) {
      skipped.push({ title: insight.title, reason: "No action type mapped to this verdict" });
      continue;
    }
    const tier = policy.tiers[action.type] ?? ACTION_TYPES[action.type].defaultTier;
    if (tier !== "auto") {
      skipped.push({ title: action.title, reason: `Tier is "${tier}" — autopilot only executes "auto"` });
      continue;
    }
    const already = log.some(
      (e) => e.status === "executed" && (e.params?.insightTitle === insight.title || e.title === action.title)
    );
    if (already) {
      skipped.push({ title: action.title, reason: "Already executed for this insight" });
      continue;
    }
    const res = executeAction(action, { executedBy: "autopilot" });
    if (res.ok) {
      executed.push(res.entry);
      log.unshift(res.entry); // dedupe within this run too
    } else {
      skipped.push({ title: action.title, reason: (res.reasons || []).join("; ") });
    }
  }

  return { executed, skipped };
}

/* Self-test — exercises the full lifecycle against the live insight board.
   Run with ACTIONS_SELFTEST=1 through a loader that resolves the "@/" alias
   (e.g. next's compiler); never runs in the app. */
if (typeof process !== "undefined" && process.env && process.env.ACTIONS_SELFTEST === "1") {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`selftest failed: ${msg}`);
    console.log(`ok — ${msg}`);
  };

  const board = insightsBoard();
  const pair = board.actions.map(simulateForInsight).find(Boolean);
  assert(pair && typeof pair.simulation.headline === "string", "simulateForInsight yields a headline");
  assert(Array.isArray(pair.simulation.assumptions), "simulation lists assumptions");

  const res = executeAction(pair.action);
  assert(res.entry && ["executed", "blocked"].includes(res.entry.status), "executeAction appends an audited entry");
  assert(res.entry.receipt.lines.length > 0, "entry carries receipt lines");

  if (res.ok && res.entry.undo) {
    const un = undoAction(res.entry.id);
    assert(un.ok && un.entry.status === "undone" && un.entry.undoneAt, "undoAction reverses and stamps undoneAt");
  }

  const auto = runAutopilot();
  assert(Array.isArray(auto.executed) && Array.isArray(auto.skipped), "runAutopilot returns { executed, skipped }");

  console.log("actions engine selftest passed", { logEntries: listActions().length });
}
