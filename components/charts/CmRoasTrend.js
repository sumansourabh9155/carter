"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { GRID_PROPS, AXIS_PROPS, YAXIS_MULT, ChartTooltip } from "@/lib/chartTheme";

// Channel identity colors — MUST match lib/data/adChannels.js exactly, so a
// channel wears the same hue on every surface (color follows the entity).
const SERIES = [
  { key: "meta", name: "Meta", color: "#0277bd" },
  { key: "google", name: "Google", color: "#ef6c00" },
  { key: "tiktok", name: "TikTok", color: "#7b1fa2" },
  { key: "snapchat", name: "Snapchat", color: "#2238b0" },
  { key: "twitter", name: "X", color: "#1a2027" },
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
            wrapperStyle={{ fontSize: 11, color: "#7d929e" }}
            formatter={(v) => <span style={{ color: "#a3b3bc" }}>{v}</span>}
          />
          {SERIES.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
