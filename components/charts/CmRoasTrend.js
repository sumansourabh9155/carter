"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { GRID_PROPS, AXIS_PROPS, YAXIS_MULT, ChartTooltip, CHART_COLORS } from "@/lib/chartTheme";

// Channel identity colors — MUST match lib/data/adChannels.js exactly, so a
// channel wears the same hue on every surface (color follows the entity).
const SERIES = [
  { key: "meta", name: "Meta", color: "#2a78d6" },
  { key: "google", name: "Google", color: "#eda100" },
  { key: "tiktok", name: "TikTok", color: "#e87ba4" },
  { key: "snapchat", name: "Snapchat", color: "#eb6834" },
  { key: "twitter", name: "X", color: "#111827" },
];

export function CmRoasTrend({ data, height = 220 }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="week" {...AXIS_PROPS} />
          <YAxis {...YAXIS_MULT} domain={[0, "auto"]} />
          <Tooltip content={<ChartTooltip multKeys={["meta", "google", "tiktok", "snapchat", "twitter"]} />} />
          <Legend
            iconType="plainline"
            wrapperStyle={{ fontSize: 11, color: "#64748b" }}
            formatter={(v) => <span style={{ color: "#94a3b8" }}>{v}</span>}
          />
          {SERIES.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
