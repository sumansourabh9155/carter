// Display formatters — money, percent, signed deltas.

export function money(v, { decimals = 0 } = {}) {
  if (v == null || Number.isNaN(v)) return "—";
  const neg = v < 0;
  const abs = Math.abs(v).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${neg ? "−" : ""}$${abs}`;
}

export function moneyK(v) {
  if (v == null || Number.isNaN(v)) return "—";
  const neg = v < 0;
  const a = Math.abs(v);
  const s = a >= 1000 ? `$${(a / 1000).toFixed(1)}k` : `$${a.toFixed(0)}`;
  return `${neg ? "−" : ""}${s}`;
}

export function pct(v, { decimals = 1 } = {}) {
  if (v == null || Number.isNaN(v)) return "—";
  return `${v.toFixed(decimals)}%`;
}

export function multiple(v, { decimals = 2 } = {}) {
  if (v == null || Number.isNaN(v)) return "—";
  return `${v.toFixed(decimals)}×`;
}

// Signed delta: returns { text, dir } where dir is "up" | "down" | "flat"
export function signed(v, { decimals = 1, suffix = "%" } = {}) {
  if (v == null || Number.isNaN(v)) return { text: "—", dir: "flat" };
  const dir = v > 0.05 ? "up" : v < -0.05 ? "down" : "flat";
  const arrow = dir === "up" ? "▲" : dir === "down" ? "▼" : "▬";
  return { text: `${arrow} ${Math.abs(v).toFixed(decimals)}${suffix}`, dir };
}

// A period-over-period product states most of its numbers as a change, so the
// two units that carry a sign get their own formatters. `signed()` always
// appends "%", which silently mislabels a dollar or a CM-ROAS delta.
const arrowFor = (v) => (v > 0 ? "▲" : v < 0 ? "▼" : "▬");

/** Signed money delta — "▲ $3,495". */
export function signedMoney(v, { decimals = 0 } = {}) {
  if (v == null || Number.isNaN(v)) return { text: "—", dir: "flat" };
  return {
    text: `${arrowFor(v)} ${money(Math.abs(v), { decimals })}`,
    dir: v > 0 ? "up" : v < 0 ? "down" : "flat",
  };
}

/** Signed CM-ROAS delta — "▼ 0.27×". */
export function signedMultiple(v, { decimals = 2 } = {}) {
  if (v == null || Number.isNaN(v)) return { text: "—", dir: "flat" };
  return {
    text: `${arrowFor(v)} ${Math.abs(v).toFixed(decimals)}×`,
    dir: v > 0 ? "up" : v < 0 ? "down" : "flat",
  };
}

/** "1 SKU" / "4 SKUs" — counts in this product are legitimately 1 often enough
 *  that the naive `${n} SKUs` misspells real screens, not just edge cases. */
export function plural(n, one, many = `${one}s`) {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`;
}
