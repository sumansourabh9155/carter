// ACTION AUDIT LOG — every propose/execute/block/undo leaves a receipt here.
// The log is the trust artifact: an operator (or a demo audience) can read
// exactly what Aura did, what it simulated, and how to reverse it.
// Newest first.
//
// Import-safe on server and client: localStorage behind a typeof window
// guard with a module-level in-memory fallback for SSR.

const KEY = "carter.actionLog.v1";

/**
 * @typedef {Object} ActionLogEntry
 * @property {string} id
 * @property {number} ts  Date.now() at append
 * @property {string} type  ACTION_TYPES id
 * @property {string} title
 * @property {Object} params  { skuId?, channelId?, insightId?, insightTitle? }
 * @property {import("@/lib/actions/simulate").Simulation} simulation
 * @property {"proposed"|"executed"|"undone"|"blocked"} status
 * @property {"watch"|"suggest"|"auto"} tier  tier at execution time
 * @property {"user"|"autopilot"} executedBy
 * @property {{ lines: string[] }} receipt
 * @property {{ kind: string, skuId?: string, prevMult?: number|null }|null} undo
 * @property {number} [undoneAt]
 */

let memory = [];
let hydrated = false;

function load() {
  if (typeof window === "undefined") return memory;
  if (!hydrated) {
    hydrated = true;
    try {
      const raw = window.localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) memory = parsed;
    } catch {
      memory = [];
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

function uuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `act-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** @returns {ActionLogEntry[]} newest first */
export function listActions() {
  return [...load()];
}

/** @returns {ActionLogEntry|null} */
export function getAction(id) {
  return load().find((e) => e.id === id) || null;
}

/**
 * Fills id/ts/receipt/undo defaults; caller supplies the rest.
 * @returns {ActionLogEntry} the stored entry
 */
export function appendAction(entry) {
  const log = load();
  const full = { id: uuid(), ts: Date.now(), receipt: { lines: [] }, undo: null, ...entry };
  log.unshift(full);
  persist();
  return full;
}

/** Shallow-merge patch onto the entry. @returns {ActionLogEntry|null} */
export function updateAction(id, patch) {
  const log = load();
  const i = log.findIndex((e) => e.id === id);
  if (i === -1) return null;
  log[i] = { ...log[i], ...patch };
  persist();
  return log[i];
}

export function clearLog() {
  const log = load();
  log.length = 0;
  persist();
}
