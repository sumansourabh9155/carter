// ACTIONS — public surface. UI and the AI layer import from here; the
// internal split (types / simulate / policy / store / overrides / engine) can
// change without touching callers.
//
// The lifecycle: an insight proposes an action → the simulator shows what it
// would change → policy guardrails decide who may fire it → the engine
// executes and audits it → it can be undone (reversible types) → autopilot
// runs the "auto"-tier ones unattended. The ad-spend overlay (overrides) is
// what makes an executed pause actually move the dashboards.

export { ACTION_TYPES, TIERS, VERDICT_TO_ACTION, IN_SCOPE_ACTION_TYPES } from "@/lib/actions/types";
export { simulateAction } from "@/lib/actions/simulate";
export {
  getPolicy,
  setTier,
  setKillSwitch,
  setAutopilotEnabled,
  checkGuardrails,
} from "@/lib/actions/policy";
export {
  listActions,
  getAction,
  appendAction,
  updateAction,
  clearLog,
} from "@/lib/actions/store";
export {
  getOverrides,
  setAdSpendMult,
  clearAdSpendMult,
  resetOverrides,
  applyOverridesToRawSku,
} from "@/lib/actions/overrides";
export {
  proposeFromInsight,
  simulateForInsight,
  executeAction,
  undoAction,
  runAutopilot,
  scoreOutcome,
  outcomeSummary,
} from "@/lib/actions/engine";
