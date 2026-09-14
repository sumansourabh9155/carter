"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { GRID_PROPS, AXIS_PROPS } from "@/lib/chartTheme";

// Generic multi-series line chart for AI-resolved charts (projections,
// runway, monthly trends). yFormat controls axis + tooltip formatting so
// units/sessions don't get rendered as dollars.
const FMT = {
  money: (v) => (Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`),
  moneyFull: (v) => `$${Math.round(v).toLocaleString()}`,
  number: (v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`),
  numberFull: (v) => Math.round(v).toLocaleString(),
  mult: (v) => `${v}×`,
};

function SimpleTooltip({ active, payload, label, yFormat }) {
  if (!active || !payload?.length) return null;
  const fmt = yFormat === "money" ? FMT.moneyFull : yFormat === "mult" ? FMT.mult : FMT.numberFull;
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, padding: "8px 12px", fontSize: 12, boxShadow: "0 8px 28px rgba(28,25,23,0.12)" }}>
      <div style={{ color: "#78716c", marginBottom: 6, fontWeight: 600, fontSize: 11 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: 14, marginBottom: 2 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />
            <span style={{ color: "#78716c" }}>{p.name}</span>
          </span>
          <span style={{ fontWeight: 700 }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function LinesChart({ data, xKey, series, height = 200, yFormat = "number" }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey={xKey} {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} tickFormatter={FMT[yFormat] || FMT.number} width={46} />
          <Tooltip content={<SimpleTooltip yFormat={yFormat} />} />
          {series.length > 1 && (
            <Legend iconType="plainline" wrapperStyle={{ fontSize: 11 }} formatter={(v) => <span style={{ color: "#94a3b8" }}>{v}</span>} />
          )}
          {series.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} strokeDasharray={s.dashed ? "5 4" : undefined} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
