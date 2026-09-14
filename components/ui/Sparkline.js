// Lightweight inline-SVG sparkline (no Recharts — keeps KPI cards cheap).
export function Sparkline({ data = [], width = 96, height = 28, color = "#eb6834" }) {
  if (!data.length) return null;
  const min = Math.min(...data, 0);
  const max = Math.max(...data, 0);
  const span = max - min || 1;
  const step = width / (data.length - 1 || 1);
  const pts = data.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / span) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = data[data.length - 1];
  const lx = (data.length - 1) * step;
  const ly = height - ((last - min) / span) * height;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" aria-hidden="true">
      <polyline points={pts.join(" ")} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="2" fill={color} />
    </svg>
  );
}
