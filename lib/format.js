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
