"use client";

import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

// Lightweight div-based waterfall (Revenue → … → CM3). Markers are absolute
// totals from 0; deltas float from the running total.
export function MarginWaterfall({ data, height = 220 }) {
  let running = 0;
  const segs = data.map((d) => {
    if (d.marker) {
      running = d.value;
      return { ...d, top: Math.max(0, d.value), bottom: Math.min(0, d.value) };
    }
    if (d.value >= 0) {
      const bottom = running;
      running += d.value;
      return { ...d, top: running, bottom };
    }
    const top = running;
    running += d.value;
    return { ...d, top, bottom: running };
  });

  const maxVal = Math.max(...segs.map((s) => s.top), 0);
  const minVal = Math.min(...segs.map((s) => s.bottom), 0);
  const span = maxVal - minVal || 1;

  return (
    <div>
      <div className="flex items-end gap-2" style={{ height }}>
        {segs.map((s, i) => {
          const hPx = ((s.top - s.bottom) / span) * height;
          const topPx = ((maxVal - s.top) / span) * height;
          return (
            <div key={i} className="relative flex-1" style={{ height }}>
              {s.marker && (
                <div
                  className="absolute inset-x-0 text-center text-[10px] font-semibold tabular"
                  style={{ top: Math.max(0, topPx - 16) }}
                >
                  {money(s.value)}
                </div>
              )}
              <div
                className={cn("absolute inset-x-0 rounded-[3px]", s.marker && "ring-1 ring-black/10")}
                style={{ top: topPx, height: Math.max(2, hPx), background: s.fill }}
                title={`${s.name}: ${money(s.value)}`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2">
        {segs.map((s, i) => (
          <div key={i} className="flex-1 text-center text-[10px] leading-tight text-muted-foreground">
            {s.name}
          </div>
        ))}
      </div>
    </div>
  );
}
