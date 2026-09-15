// Side-by-side product comparison — one row per metric, two bars scaled to
// the row's max. Values arrive pre-formatted from the server resolver so
// this stays a pure presenter.

const A_COLOR = "#2238b0";
const B_COLOR = "#0277bd";

export function CompareBars({ aName, bName, rows }) {
  if (!rows?.length) return null;
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-xs">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <span className="size-2 rounded-full" style={{ background: A_COLOR }} /> {aName}
        </span>
        <span className="inline-flex items-center gap-1.5 font-medium">
          <span className="size-2 rounded-full" style={{ background: B_COLOR }} /> {bName}
        </span>
      </div>
      <div className="space-y-3">
        {rows.map((r) => {
          const max = Math.max(Math.abs(r.aVal), Math.abs(r.bVal), 0.001);
          return (
            <div key={r.label}>
              <div className="mb-1 text-xs font-medium text-muted-foreground">{r.label}</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ia-gray">
                    <div className="h-full rounded-full" style={{ width: `${(Math.abs(r.aVal) / max) * 100}%`, background: A_COLOR }} />
                  </div>
                  <span className="tabular w-20 text-right text-xs font-semibold">{r.aText}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ia-gray">
                    <div className="h-full rounded-full" style={{ width: `${(Math.abs(r.bVal) / max) * 100}%`, background: B_COLOR }} />
                  </div>
                  <span className="tabular w-20 text-right text-xs font-semibold">{r.bText}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
