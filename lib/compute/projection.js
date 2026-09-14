// TREND PROJECTION — a simple, honest forecast, never a hardcoded future
// number. We fit a least-squares linear trend over the monthly actuals and
// extend it forward. Deliberately plain: no seasonality, no ML — it's a
// direction, always labelled as an estimate in the UI.

// Least-squares slope/intercept for a series of y-values at x = 0,1,2,…
function linreg(ys) {
  const n = ys.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  const sx = ys.reduce((a, _, i) => a + i, 0);
  const sy = ys.reduce((a, y) => a + y, 0);
  const sxx = ys.reduce((a, _, i) => a + i * i, 0);
  const sxy = ys.reduce((a, y, i) => a + i * y, 0);
  const denom = n * sxx - sx * sx;
  const slope = denom ? (n * sxy - sx * sy) / denom : 0;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

// series: [{ m, revenue, cm3 }] (oldest → newest). Returns a combined chart
// series (actuals + projected tail, each on its own key so the projected part
// can render dashed) plus a summary of the next projected month.
export function projectTrend(series, aheadMonths = 2, nextLabels = []) {
  const n = series.length;
  const revReg = linreg(series.map((d) => d.revenue));
  const cmReg = linreg(series.map((d) => d.cm3));

  const rows = series.map((d) => ({
    m: d.m,
    revenue: d.revenue,
    cm3: d.cm3,
    revenueProj: null,
    cm3Proj: null,
    projected: false,
  }));

  // Seed the projected line from the last actual point so the two connect.
  if (n > 0) {
    rows[n - 1].revenueProj = rows[n - 1].revenue;
    rows[n - 1].cm3Proj = rows[n - 1].cm3;
  }

  const proj = [];
  for (let k = 0; k < aheadMonths; k++) {
    const idx = n + k;
    const revenueProj = Math.max(0, Math.round(revReg.slope * idx + revReg.intercept));
    const cm3Proj = Math.round(cmReg.slope * idx + cmReg.intercept);
    proj.push({
      m: nextLabels[k] || `+${k + 1}`,
      revenue: null,
      cm3: null,
      revenueProj,
      cm3Proj,
      projected: true,
    });
  }

  const lastRev = n > 0 ? series[n - 1].revenue : 0;
  const lastCm = n > 0 ? series[n - 1].cm3 : 0;
  const first = proj[0] || { m: null, revenueProj: 0, cm3Proj: 0 };

  return {
    data: [...rows, ...proj],
    projFrom: n > 0 ? series[n - 1].m : null,
    next: {
      label: first.m,
      revenue: first.revenueProj,
      cm3: first.cm3Proj,
      revenueDeltaPct: lastRev ? Math.round(((first.revenueProj - lastRev) / lastRev) * 1000) / 10 : 0,
      cm3DeltaPct: lastCm ? Math.round(((first.cm3Proj - lastCm) / lastCm) * 1000) / 10 : 0,
      marginPct: first.revenueProj ? Math.round((first.cm3Proj / first.revenueProj) * 1000) / 10 : 0,
    },
    aheadMonths,
  };
}
