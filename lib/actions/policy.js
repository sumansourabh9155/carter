// AUTONOMY POLICY — who may pull which trigger, and the guardrails that run
// before ANY write. Policy is the merchant's dial, not Aura's: per-type tiers
// (watch/suggest/auto), a global kill switch, and an autopilot master toggle,
// persisted so the choice survives reloads.
//
// Import-safe on server and client: localStorage behind a typeof window
// guard with a module-level in-memory fallback for SSR.

import { ACTION_TYPES, TIERS } from "@/lib/actions/types";
import { money } from "@/lib/format";

const KEY = "carter.autonomy.v1";

/**
 * @typedef {Object} Policy
 * @property {Object<string, "watch"|"suggest"|"auto">} tiers  typeId → tier
 * @property {boolean} killSwitch  true blocks ALL writes, regardless of tier
 * @property {boolean} autopilotEnabled  master toggle for unattended runs
 */

function defaults() {
  const tiers = {};
  for (const t of Object.values(ACTION_TYPES)) tiers[t.id] = t.defaultTier;
  return { tiers, killSwitch: false, autopilotEnabled: true };
}

let memory = defaults();
let hydrated = false;

function load() {
  if (typeof window === "undefined") return memory;
  if (!hydrated) {
    hydrated = true;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const base = defaults();
        // Merge over defaults so new action types pick up their defaultTier
        // even against a policy saved before they existed.
        memory = { ...base, ...parsed, tiers: { ...base.tiers, ...(parsed.tiers || {}) } };
      }
    } catch {
      memory = defaults();
    }
  }
  return memory;
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    // Storage blocked — session memory still applies.
  }
}

/** @returns {Policy} a defensive copy of the current policy */
export function getPolicy() {
  const state = load();
  return { ...state, tiers: { ...state.tiers } };
}

export function setTier(typeId, tier) {
  if (!ACTION_TYPES[typeId] || !TIERS.includes(tier)) return getPolicy();
  const state = load();
  state.tiers[typeId] = tier;
  persist();
  return getPolicy();
}

export function setKillSwitch(on) {
  const state = load();
  state.killSwitch = !!on;
  persist();
  return getPolicy();
}

export function setAutopilotEnabled(on) {
  const state = load();
  state.autopilotEnabled = !!on;
  persist();
  return getPolicy();
}

// The gate every execution passes through. Returns ALL failing reasons, not
// just the first — the receipt should tell the operator everything at once.
//
// Dollars at stake = |cashImpact| when the simulation commits/moves cash,
// falling back to |cm2DeltaMonthly| for actions with no cash line.
/**
 * @param {{ type: string, executedBy?: string }} action
 * @param {{ cashImpact?: number, cm2DeltaMonthly?: number }} simulation
 * @returns {{ allowed: boolean, reasons: string[] }}
 */
export function checkGuardrails(action, simulation) {
  const type = ACTION_TYPES[action?.type];
  if (!type) return { allowed: false, reasons: [`Unknown action type "${action?.type}"`] };

  const policy = load();
  const reasons = [];

  if (policy.killSwitch) {
    reasons.push("Kill switch is on — all writes are blocked");
  }

  const tier = policy.tiers[type.id] ?? type.defaultTier;
  if (tier === "watch") {
    reasons.push(`${type.label} is in the Watch tier — execution is disabled`);
  }

  const dollars = Math.abs(simulation?.cashImpact || simulation?.cm2DeltaMonthly || 0);
  if (type.caps.maxDollars > 0 && dollars > type.caps.maxDollars) {
    reasons.push(`${money(dollars)} at stake exceeds the ${money(type.caps.maxDollars)} cap for ${type.label}`);
  }

  // Autopilot is held to a stricter bar: enabled, reversible, and explicitly
  // trusted at the "auto" tier.
  if (action?.executedBy === "autopilot") {
    if (!policy.autopilotEnabled) reasons.push("Autopilot is disabled");
    if (!type.reversible) reasons.push(`${type.label} is not reversible — autopilot may only run reversible actions`);
    if (tier !== "auto") reasons.push(`${type.label} tier is "${tier}" — autopilot requires "auto"`);
  }

  return { allowed: reasons.length === 0, reasons };
}
