// Shared Recharts styling — quiet chrome, rich CVD-validated data colors.
// Palette validated (lightness band, chroma floor, adjacent-pair CVD ≥ 12,
// contrast) against the white card surface; yellow/green sit below 3:1 so
// every chart pairs them with direct labels or a table view (relief rule).
export const CHART_COLORS = {
  revenue: "#eb6834", // orange — brand tie-in
  cm1: "#2a78d6",     // blue
  cm2: "#4a3aa7",     // violet
  cm3: "#1baf7a",     // green
  profit: "#1baf7a",
  adSpend: "#eda100", // yellow
  danger: "#ef4444",
  warning: "#eda100",
  muted: "#d6d3d1",   // neutral gray (cost layers)
};

export const GRID_PROPS = {
  strokeDasharray: "3 3",
  stroke: "rgba(0,0,0,0.06)",
  vertical: false,
};

export const AXIS_PROPS = {
  tick: { fill: "#78716c", fontSize: 11, fontFamily: "var(--font-dm-sans)" },
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
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 12,
        boxShadow: "0 8px 28px rgba(28,25,23,0.12)",
        minWidth: 150,
      }}
    >
      {label != null && (
        <div style={{ color: "#78716c", marginBottom: 8, fontWeight: 600, fontSize: 11 }}>{label}</div>
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
              <span style={{ color: "#78716c" }}>{p.name}</span>
            </div>
            <span style={{ color: isNeg ? "#dc2626" : "#1c1917", fontFamily: "var(--font-jetbrains), monospace", fontWeight: 700 }}>
              {isNeg ? "−" : ""}
              {v}
            </span>
          </div>
        );
      })}
    </div>
  );
}
