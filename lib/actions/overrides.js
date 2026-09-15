// EXECUTION OVERLAY — the thin layer that makes an executed action REALLY
// change the numbers. Overrides sit between the raw seeds and the margin
// engine: scale a SKU's adSpend and every derived figure (CM2, CM-ROAS,
// insights, autopilot inputs) moves with it on the next render, because
// nothing downstream is hardcoded.
//
// Hook point: lib/api/mock/products.js wraps SKUS through
// applyOverridesToRawSku before deriveSku — wired by the integrator.
//
// Import-safe on server and client: localStorage only behind a typeof window
// guard, with a module-level in-memory fallback shared within the session so
// SSR never crashes and non-browser callers still see their own writes.

const KEY = "carter.overrides.v1";

/**
 * @typedef {Object} Overrides
 * @property {Object<string, number>} adSpendMult  skuId → multiplier applied to raw adSpend (0 = paused)
 */

const empty = () => ({ adSpendMult: {} });

let memory = empty();
let hydrated = false;

function load() {
  if (typeof window === "undefined") return memory;
  if (!hydrated) {
    hydrated = true;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        memory = { ...empty(), ...parsed, adSpendMult: { ...(parsed.adSpendMult || {}) } };
      }
    } catch {
      // Corrupted storage — start fresh rather than crash the dashboard.
      memory = empty();
    }
  }
  return memory;
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    // Storage full/blocked — in-memory state still holds for this session.
  }
}

/** @returns {Overrides} a defensive copy of the current overlay state */
export function getOverrides() {
  const state = load();
  return { adSpendMult: { ...state.adSpendMult } };
}

export function setAdSpendMult(skuId, mult) {
  if (!skuId) return getOverrides();
  const state = load();
  state.adSpendMult[skuId] = Math.max(0, Number(mult) || 0);
  persist();
  return getOverrides();
}

export function clearAdSpendMult(skuId) {
  const state = load();
  delete state.adSpendMult[skuId];
  persist();
  return getOverrides();
}

export function resetOverrides() {
  memory = empty();
  hydrated = true; // memory is now authoritative for this session
  persist();
  return getOverrides();
}

// Applies the overlay to ONE raw seed record. Shallow-copies only when a
// multiplier exists so untouched SKUs keep referential identity (cheap to
// diff, zero risk of mutating the seed array).
export function applyOverridesToRawSku(raw) {
  if (!raw) return raw;
  const mult = load().adSpendMult[raw.id];
  if (mult == null || typeof raw.adSpend !== "number") return raw;
  return { ...raw, adSpend: Math.round(raw.adSpend * mult) };
}
