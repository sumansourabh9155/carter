"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend, ReferenceArea } from "recharts";
import { GRID_PROPS, AXIS_PROPS, YAXIS_MONEY, ChartTooltip, CHART_COLORS } from "@/lib/chartTheme";

// Revenue + net-profit (CM3) over time. Actuals are solid; the projected tail
// is the same colour, dashed. Two money axes because revenue and CM3 live on
// very different scales. The shaded band marks where the estimate begins.
export function ProjectionChart({ data, projFrom, height = 240 }) {
  const moneyKeys = ["revenue", "cm3", "revenueProj", "cm3Proj"];
  const lastM = data.length ? data[data.length - 1].m : null;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid {...GRID_PROPS} />
          {projFrom && lastM && (
            <ReferenceArea x1={projFrom} x2={lastM} strokeOpacity={0} fill={CHART_COLORS.adSpend} fillOpacity={0.06} />
          )}
          <XAxis dataKey="m" {...AXIS_PROPS} />
          <YAxis yAxisId="rev" {...YAXIS_MONEY} domain={[0, "auto"]} />
          <YAxis yAxisId="cm" orientation="right" {...YAXIS_MONEY} domain={[0, "auto"]} />
          <Tooltip content={<ChartTooltip moneyKeys={moneyKeys} />} />
          <Legend
            iconType="plainline"
            wrapperStyle={{ fontSize: 11 }}
            formatter={(v) => <span style={{ color: "#a3b3bc" }}>{v}</span>}
          />
          <Line yAxisId="rev" type="monotone" dataKey="revenue" name="Revenue" stroke={CHART_COLORS.revenue} strokeWidth={2} dot={false} connectNulls />
          <Line yAxisId="rev" type="monotone" dataKey="revenueProj" name="Revenue (projected)" stroke={CHART_COLORS.revenue} strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls legendType="none" />
          <Line yAxisId="cm" type="monotone" dataKey="cm3" name="Net profit (CM3)" stroke={CHART_COLORS.cm3} strokeWidth={2} dot={false} connectNulls />
          <Line yAxisId="cm" type="monotone" dataKey="cm3Proj" name="Net profit (projected)" stroke={CHART_COLORS.cm3} strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls legendType="none" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
