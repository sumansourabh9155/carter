/*
  BUDGET PLANNER — the allocation a media team actually produces.

  What existed: "shift $8,150 from Google to Meta". A two-channel swap, priced
  at constant CM-ROAS, which is the assumption that breaks first. If CM-ROAS
  were constant you would move the entire budget to the best channel and stop
  — and every media buyer knows that isn't how it works, which is exactly why
  a linear recommendation reads as naive.

  WHAT MAKES THIS REAL: diminishing returns. The tenth thousand dollars on a
  channel buys less margin than the first, because you exhaust the cheap
  audience first. Modelled as a power curve:

      CM(s) = k · s^α          0 < α < 1

  α is the saturation exponent. α = 1 is linear (no saturation); lower α
  saturates faster. It is fitted per channel from a point the engine already
  has — current spend and current attributed CM — so the curve passes exactly
  through where the channel is today. No curve, no matter how elegant, is
  allowed to disagree with the observed number.

  Marginal return is the derivative: dCM/ds = α · k · s^(α−1). Allocation is
  then the classic water-filling result — spend the next dollar wherever the
  MARGINAL return is highest, and stop when marginal return falls to 1.0
  (a dollar returning less than a dollar of margin should not be spent).

  WHERE α COMES FROM. Saturation is a property of the audience and the
  placement, not something derivable from one spend point, so it is declared
  per channel type and stated in the output. Broad social prospecting
  saturates fast; intent-driven search barely saturates until you have
  bought every relevant query.

  WHAT THIS IS NOT: a forecast. It answers "given this budget and these
  curves, where does the next dollar go", and it says so.
*/

import { REPORTING } from "@/lib/time";

/*
  Saturation exponent by channel. Lower = saturates faster.
    search/shopping  intent is finite but cheap to reach; the ceiling is
                     query volume, so it holds up well until it stops dead
    broad social     vast reach, but the responsive slice is exhausted early
    short-form video fastest saturation — the audience overlaps heavily
*/
const ALPHA = {
  google: 0.85,
  meta: 0.62,
  tiktok: 0.55,
  snapchat: 0.58,
  twitter: 0.55,
};
const DEFAULT_ALPHA = 0.65;

// Marginal return below this means the next dollar destroys margin.
const MARGINAL_FLOOR = 1.0;
const STEP = 100; // allocate in $100 increments — finer is false precision

const round2 = (v) => Math.round(v * 100) / 100;

/** Fit the curve through the channel's own observed point. */
function fitCurve(channel) {
  const alpha = ALPHA[channel.id] ?? DEFAULT_ALPHA;
  const s = channel.spend;
  const cm = channel.attributedCm;
  if (!(s > 0) || !(cm > 0)) return null;
  // cm = k · s^α  →  k = cm / s^α
  const k = cm / Math.pow(s, alpha);
  return {
    alpha,
    k,
    cmAt: (spend) => (spend <= 0 ? 0 : k * Math.pow(spend, alpha)),
    marginalAt: (spend) => (spend <= 0 ? Infinity : alpha * k * Math.pow(spend, alpha - 1)),
  };
}

/**
 * Allocate a budget across channels by marginal return.
 *
 * @param {Object[]} channels marketingData().channels
 * @param {number} budget total to allocate
 */
export function planBudget(channels, budget) {
  const live = channels
    .map((c) => ({ channel: c, curve: fitCurve(c) }))
    .filter((x) => x.curve);

  if (!live.length || !(budget > 0)) return null;

  // Water-filling: every channel starts at zero and the next $100 goes
  // wherever it earns most, until the budget runs out or nothing clears the
  // floor. Greedy is exact here because each curve is concave.
  const alloc = new Map(live.map((x) => [x.channel.id, 0]));
  let spent = 0;
  let stoppedEarly = false;

  while (spent + STEP <= budget) {
    let best = null;
    let bestMarginal = MARGINAL_FLOOR;
    for (const x of live) {
      const at = alloc.get(x.channel.id);
      // Marginal return of the NEXT step, not of the current point.
      const gain = (x.curve.cmAt(at + STEP) - x.curve.cmAt(at)) / STEP;
      if (gain > bestMarginal) { bestMarginal = gain; best = x; }
    }
    if (!best) { stoppedEarly = true; break; }
    alloc.set(best.channel.id, alloc.get(best.channel.id) + STEP);
    spent += STEP;
  }

  const rows = live
    .map(({ channel, curve }) => {
      const planned = alloc.get(channel.id);
      const plannedCm = Math.round(curve.cmAt(planned));
      const currentCm = channel.attributedCm;
      return {
        id: channel.id,
        name: channel.name,
        color: channel.color,
        alpha: curve.alpha,
        currentSpend: channel.spend,
        currentCm,
        currentCmRoas: channel.cmRoas,
        plannedSpend: planned,
        plannedCm,
        plannedCmRoas: planned > 0 ? round2(plannedCm / planned) : null,
        // What the LAST dollar in the plan earns here. Equalising this across
        // channels is what optimal allocation means.
        marginalCmRoas: planned > 0 ? round2(curve.marginalAt(planned)) : null,
        deltaSpend: planned - channel.spend,
        deltaCm: plannedCm - currentCm,
        currentCm2: currentCm - channel.spend,
        plannedCm2: plannedCm - planned,
      };
    })
    .sort((a, b) => b.plannedSpend - a.plannedSpend);

  const currentCm = rows.reduce((a, r) => a + r.currentCm, 0);
  const plannedCm = rows.reduce((a, r) => a + r.plannedCm, 0);
  const currentSpend = rows.reduce((a, r) => a + r.currentSpend, 0);

  /*
    THE OBJECTIVE IS CM2, NOT CM.

    Reporting total CM made a correct plan look like a catastrophe: allocating
    $26,700 instead of $54,708 of course earns less gross margin, so the
    summary printed "uplift −$24,225" for a plan that is $3,783 BETTER after
    the spend is deducted. Water-filling to a marginal return of 1.0 is
    precisely CM2-maximising — the allocation was right and the scoreboard
    was measuring the wrong thing.

    Spending more always buys more CM. It does not always buy more profit,
    and profit is the number the plan exists to move.
  */
  const currentCm2 = currentCm - currentSpend;
  const plannedCm2 = plannedCm - spent;

  return {
    budget,
    allocated: spent,
    unallocated: budget - spent,
    currentCm2,
    plannedCm2,
    upliftCm2: plannedCm2 - currentCm2,
    // Real and important: if the curves say no channel can return a dollar
    // for a dollar past a point, the honest answer is "don't spend it".
    stoppedEarly,
    rows,
    currentSpend,
    currentCm,
    plannedCm,
    upliftCm: plannedCm - currentCm,
    currentCmRoas: currentSpend > 0 ? round2(currentCm / currentSpend) : null,
    plannedCmRoas: spent > 0 ? round2(plannedCm / spent) : null,
    // When the curves refuse the whole budget, the recommendation IS to spend
    // less. Saying so is the point; quietly allocating the rest anyway would
    // be the dishonest version.
    recommendedSpend: spent,
    spendCutFromCurrent: currentSpend - spent,
    window: REPORTING,
    assumptions: [
      "Each channel's curve is fitted through its OWN current spend and attributed CM, so it matches today's observed performance exactly.",
      "Saturation is declared per channel type (search saturates slowly, short-form video fastest) — it cannot be derived from a single spend point.",
      "Allocation equalises marginal return across channels and stops paying for a dollar that returns less than a dollar.",
      "This is an allocation, not a forecast: it says where the next dollar should go, not what next month will be.",
    ],
  };
}

/**
 * The plan at several budget levels — the question that follows immediately
 * after "what's the best split": how much SHOULD we be spending at all.
 *
 * Reported in CM2 so the curve actually turns over. In gross CM the answer is
 * always "spend more", which is why that framing is useless for planning.
 * Levels are capped at the optimum because past it the model allocates
 * nothing further and every higher budget returns an identical row — a
 * flat ladder that looks broken rather than saturated.
 */
export function budgetLadder(channels, budget) {
  const optimum = planBudget(channels, budget * 4); // deliberately generous ceiling
  const optimalSpend = optimum?.allocated ?? budget;
  const top = Math.max(budget, optimalSpend);

  const levels = [0.4, 0.6, 0.8, 1].map((m) => Math.round((top * m) / 500) * 500);
  if (!levels.includes(Math.round(budget / 500) * 500)) levels.push(Math.round(budget / 500) * 500);

  return [...new Set(levels)]
    .filter((b) => b > 0)
    .sort((a, b) => a - b)
    .map((b) => {
      const p = planBudget(channels, b);
      if (!p) return null;
      return {
        budget: b,
        isCurrentPlan: Math.abs(b - budget) < 500,
        isOptimum: Math.abs(b - optimalSpend) < 500,
        cm: p.plannedCm,
        cm2: p.plannedCm2,
        cmRoas: p.plannedCmRoas,
        // Margin earned by the last increment. Falls as budget rises; when it
        // crosses 1.0 you have found the ceiling.
        marginalCmRoas: Math.min(...p.rows.filter((r) => r.plannedSpend > 0).map((r) => r.marginalCmRoas ?? 0)),
        unallocated: p.unallocated,
      };
    })
    .filter(Boolean);
}

/** The spend level that maximises CM2, independent of the current plan. */
export function optimalSpend(channels) {
  // Ask for far more than anyone would spend; water-filling stops itself at
  // the point marginal return reaches 1.0.
  const p = planBudget(channels, 1_000_000);
  return p ? { spend: p.allocated, cm: p.plannedCm, cm2: p.plannedCm2, rows: p.rows } : null;
}
