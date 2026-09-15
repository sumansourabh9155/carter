// Shared Recharts styling — quiet chrome, rich CVD-validated data colors.
//
// Carter palette: built on the brand indigo (Figma "Brand/600") and spread
// across hue AND lightness so adjacent series stay separable under colour-
// vision deficiency. Status hues reuse the published Figma tokens
// (Green/600, Red/600, Yellow/600) so a red bar matches a red badge.
// Keep in sync with the --chart-* tokens in app/globals.css.
export const CHART_COLORS = {
  revenue: "#2238b0", // indigo — brand tie-in (carter-brand-600)
  cm1: "#0277bd",     // info blue (carter-info-600)
  cm2: "#7b1fa2",     // purple
  cm3: "#2e7d32",     // green (carter-green-600)
  profit: "#2e7d32",
  adSpend: "#ef6c00", // orange (carter-orange-600 — Carter's "notice" hue)
  danger: "#d32f2f",  // carter-red-600
  warning: "#ef6c00", // carter-orange-600
  muted: "#e4eaed",   // cool neutral (carter-neutral-200) — cost layers
};

export const GRID_PROPS = {
  strokeDasharray: "3 3",
  stroke: "rgba(26,32,39,0.06)",
  vertical: false,
};

export const AXIS_PROPS = {
  // Text/Tertiary on the raised card surface.
  tick: { fill: "#7d929e", fontSize: 11, fontFamily: "var(--font-inter)" },
  tickLine: false,
  axisLine: false,
};

export const YAXIS_MONEY = {
  ...AXIS_PROPS,
  tickFormatter: (v) => (Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`),
  width: 46,
};

export const YAXIS_MULT = {
  ...AXIS_PROPS,
  tickFormatter: (v) => `${v}×`,
  width: 34,
};

export function ChartTooltip({ active, payload, label, moneyKeys = [], multKeys = [] }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e4eaed",
        borderRadius: 4,
        padding: "10px 14px",
        fontSize: 12,
        boxShadow: "0 4px 4px 0 rgba(0,0,0,0.08)",
        minWidth: 150,
      }}
    >
      {label != null && (
        <div style={{ color: "#7d929e", marginBottom: 8, fontWeight: 600, fontSize: 11 }}>{label}</div>
      )}
      {payload.filter((p) => p.value != null).map((p) => {
        const isNeg = p.value < 0;
        const v = moneyKeys.includes(p.dataKey)
          ? `$${Math.abs(p.value).toLocaleString()}`
          : multKeys.includes(p.dataKey)
          ? `${p.value}×`
          : typeof p.value === "number" && Math.abs(p.value) > 100
          ? `$${p.value.toLocaleString()}`
          : p.value;
        return (
          <div
            key={p.dataKey || p.name}
            style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 4 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />
              <span style={{ color: "#7d929e" }}>{p.name}</span>
            </div>
            <span
              style={{
                color: isNeg ? "#d32f2f" : "#1a2027",
                fontVariantNumeric: "tabular-nums",
                fontWeight: 700,
              }}
            >
              {isNeg ? "−" : ""}
              {v}
            </span>
          </div>
        );
      })}
    </div>
  );
}
