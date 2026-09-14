// Horizontal funnel — each stage's bar is sized against the first stage,
// with the drop-off called out between stages. Div-based, no chart library.
// Labels sit above the bars so narrow stages stay readable.

// Funnel stages are ORDERED, so they wear ONE hue stepped light→dark (an
// ordinal ramp) rather than four unrelated hues — depth = progress to purchase.
const STAGE_COLORS = ["#86b6ef", "#5598e7", "#2a78d6", "#1c5cab"];

export function FunnelSteps({ steps }) {
  if (!steps?.length) return null;
  const first = steps[0].value || 1;
  return (
    <div className="space-y-3">
      {steps.map((s, i) => {
        const widthPct = Math.max(2, (s.value / first) * 100);
        const dropPct = i > 0 && steps[i - 1].value > 0
          ? Math.round((1 - s.value / steps[i - 1].value) * 1000) / 10
          : null;
        return (
          <div key={s.label}>
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <span className="font-medium">
                {s.label}
                {dropPct != null && <span className="ml-2 text-[10px] font-normal text-muted-foreground">↓ {dropPct}% drop off</span>}
              </span>
              <span className="tabular">
                <span className="font-semibold">{s.value.toLocaleString()}</span>
                <span className="ml-1 text-[10px] text-muted-foreground">
                  {i === 0 ? "100%" : `${Math.round((s.value / first) * 1000) / 10}%`}
                </span>
              </span>
            </div>
            <div className="h-3.5 overflow-hidden rounded-full bg-black/[0.04]">
              <div
                className="h-full rounded-full"
                style={{ width: `${widthPct}%`, background: STAGE_COLORS[i % STAGE_COLORS.length] }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
