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
import { oneProduct } from "@/lib/api/mock/products";
import { insightsBoard } from "@/lib/compute/insights";
import { money } from "@/lib/format";

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

  // SKU-targeted insights link to their product page — that href is the id.
  const m = /^\/products\/([^/]+)$/.exec(insight.ref?.href || "");
  const skuId = m ? m[1] : undefined;

  return {
    type: typeId,
    title: `${type.label} — ${insight.ref?.label || "Store"}`,
    params: {
      ...(skuId ? { skuId } : {}),
      insightId: insight.id,
      insightTitle: insight.title, // stable dedupe key (ins-N ids are positional)
    },
    sourceInsight: insight,
  };
}

/**
 * Propose + simulate in one step, resolving the product when SKU-targeted.
 * @returns {{ action: Action, simulation: import("@/lib/actions/simulate").Simulation }|null}
 */
export function simulateForInsight(insight) {
  const action = proposeFromInsight(insight);
  if (!action) return null;
  const product = action.params.skuId ? oneProduct(action.params.skuId) : null;
  return { action, simulation: simulateAction(action, product) };
}

// The real effect + its receipt. pause_ads writes the overlay; the rest are
// record-only and honest about it.
function applyEffect(action, simulation, product) {
  const skuId = action.params?.skuId;

  switch (action.type) {
    case "pause_ads": {
      if (!skuId) {
        return { receipt: { lines: ["No SKU resolved — nothing paused"] }, undo: null };
      }
      const prevMult = getOverrides().adSpendMult[skuId] ?? null;
      setAdSpendMult(skuId, 0);
      return {
        receipt: {
          lines: [
            "Ad sets paused via Meta/Google/TikTok APIs",
            "Demo store: SKU ad spend zeroed — dashboards update on next render",
          ],
        },
        undo: { kind: "restore_ad_spend_mult", skuId, prevMult },
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
  const product = acted.params?.skuId ? oneProduct(acted.params.skuId) : null;
  const simulation = acted.simulation || simulateAction(acted, product);

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

  const { receipt, undo } = applyEffect(acted, simulation, product);
  const entry = appendAction({ ...base, status: "executed", receipt, undo });
  return { ok: true, entry };
}

/**
 * Reverse an executed entry. Only entries with in-model or record-only undo
 * info qualify (reorder never does — compensating cancellation is external).
 * Patches the entry in place (status "undone" + undoneAt) rather than
 * appending, so the log reads as one action with its full lifecycle.
 * @returns {{ ok: boolean, entry: import("@/lib/actions/store").ActionLogEntry|null }}
 */
export function undoAction(entryId) {
  const entry = getAction(entryId);
  if (!entry) return { ok: false, entry: null };
  if (entry.status !== "executed") return { ok: false, entry };

  const type = ACTION_TYPES[entry.type];
  if (!type?.reversible || !entry.undo) return { ok: false, entry };

  if (entry.undo.kind === "restore_ad_spend_mult") {
    // Restore whatever multiplier was there before the pause (usually none).
    if (entry.undo.prevMult == null) clearAdSpendMult(entry.undo.skuId);
    else setAdSpendMult(entry.undo.skuId, entry.undo.prevMult);
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
