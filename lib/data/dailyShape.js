/*
  THE DAILY SHAPE — how a 30-day total distributes across its days.

  Stored as SHARES, never absolutes. A day's spend is `channelSpend ×
  share[day]`, so the daily series always sums back to the figure the margin
  engine derived and the two can never disagree. Storing daily dollars here
  would create a second source of truth for the same money, which is the bug
  that produced two ad-spend totals 36% apart.

  Two real effects are modelled because both change what a media team does:

    WEEKDAY SEASONALITY  consumer retail converts worst mid-week and best at
                         the weekend. A Tuesday dip is not a problem to fix.
    WITHIN-PERIOD DRIFT  a channel's efficiency moves across the window. This
                         is what makes a 7-day read differ from the 30-day
                         one, and it is where creative fatigue shows up.

  Deterministic: same inputs, same curve, every run. No RNG.
*/

// Index 0 = Sunday. Weekend lift and a Wednesday trough, normalised to 1.0.
const WEEKDAY_WEIGHT = [1.18, 0.88, 0.84, 0.82, 0.92, 1.08, 1.28];

/**
 * Per-day weights for a window, combining weekday seasonality with a linear
 * drift. `driftPct` is the total change in daily weight from the first day to
 * the last: −30 means the channel was steadily getting quieter.
 */
export function dailyWeights(window, driftPct = 0) {
  const n = window.days;
  const out = [];
  for (let i = 0; i < n; i++) {
    const date = new Date(window.startDate.getTime() + i * 86_400_000);
    const seasonal = WEEKDAY_WEIGHT[date.getDay()];
    // Linear ramp from 1 to (1 + drift), so the mean stays near 1 and the
    // total is preserved by the normalisation below.
    const drift = 1 + (driftPct / 100) * (n === 1 ? 0 : i / (n - 1));
    out.push({ date, weight: seasonal * drift });
  }
  const total = out.reduce((a, d) => a + d.weight, 0);
  return out.map((d) => ({ date: d.date, share: d.weight / total }));
}

/**
 * Distribute a total across a window.
 * @returns {{date: Date, value: number}[]}
 */
export function spread(total, window, driftPct = 0) {
  return dailyWeights(window, driftPct).map((d) => ({
    date: d.date,
    value: Math.round(total * d.share),
  }));
}

/** Roll a daily series into ISO weeks, oldest first, for trend charts. */
export function byWeek(series) {
  const weeks = [];
  for (let i = 0; i < series.length; i += 7) {
    const chunk = series.slice(i, i + 7);
    weeks.push({
      label: `W${Math.floor(i / 7) + 1}`,
      start: chunk[0]?.date,
      end: chunk[chunk.length - 1]?.date,
      value: chunk.reduce((a, d) => a + d.value, 0),
      days: chunk.length,
    });
  }
  return weeks;
}

/** The trailing `days` of a daily series — what a 7-day read actually is. */
export function trailing(series, days) {
  return series.slice(Math.max(0, series.length - days));
}
