/*
  INCREMENTALITY — turning paidShare from an assumption into a measurement.

  WHAT THIS ANSWERS that attribution cannot: attribution asks "which
  touchpoint came before the order". Incrementality asks "would the order
  have happened anyway". Those give very different answers, and the gap
  between them is the single largest source of wasted media spend in retail.

  THE MATH, deliberately plain:

    per-capita orders    treatmentOrders / treatmentPopulation, same for control
    lift                 (treatmentRate − controlRate) / controlRate
    incremental orders   treatmentOrders × (lift / (1 + lift))
                         — the share of treatment orders that would NOT have
                           happened without the ads. Not the raw difference,
                           because the cells are different sizes.
    incremental CM-ROAS  incrementalOrders × cm1PerOrder / treatmentSpend
    implied paid share   incrementalOrders / treatmentOrders
                         — the measured version of the number the margin
                           engine has been assuming.

  CONFIDENCE. Order counts are counts, so the standard error of each cell's
  rate is Poisson: sqrt(orders)/population. Propagated to a 95% interval on
  lift. This is the honest treatment — a point estimate from 98 control
  orders deserves an interval wide enough to see.

  WHAT IT REFUSES TO DO. A running test is never reported as a result. A test
  shorter than MIN_TEST_DAYS is marked underpowered. An interval that spans
  zero is reported as "no detectable lift" rather than as its midpoint —
  reading a point estimate out of a non-significant result is how brands end
  up defending spend that does nothing.
*/

import { EXPERIMENTS, DESIGN_META, MIN_TEST_DAYS } from "@/lib/data/experiments";
import { TODAY, daysBetween } from "@/lib/time";

const Z95 = 1.96;
const round1 = (v) => Math.round(v * 10) / 10;
const round2 = (v) => Math.round(v * 100) / 100;

/** One experiment, measured. */
export function evaluateExperiment(e) {
  const running = e.endedOn == null;
  const days = daysBetween(e.startedOn, e.endedOn ?? TODAY);

  const tRate = e.treatment.orders / e.treatment.population;
  const cRate = e.control.orders / e.control.population;

  // Poisson standard error on each cell's per-capita rate.
  const tSe = Math.sqrt(e.treatment.orders) / e.treatment.population;
  const cSe = Math.sqrt(e.control.orders) / e.control.population;

  const liftPct = cRate > 0 ? ((tRate - cRate) / cRate) * 100 : null;

  // Interval on the difference, then expressed as a lift against control.
  const diffSe = Math.sqrt(tSe * tSe + cSe * cSe);
  const liftLoPct = cRate > 0 ? ((tRate - cRate - Z95 * diffSe) / cRate) * 100 : null;
  const liftHiPct = cRate > 0 ? ((tRate - cRate + Z95 * diffSe) / cRate) * 100 : null;

  // Significant only when the whole interval sits on one side of zero.
  const significant = liftLoPct != null && liftHiPct != null && (liftLoPct > 0 || liftHiPct < 0);
  const underpowered = days < MIN_TEST_DAYS;

  const lift = liftPct != null ? liftPct / 100 : null;
  const incrementalOrders =
    lift != null && lift > -1 ? Math.round(e.treatment.orders * (lift / (1 + lift))) : null;

  const incrementalCm = incrementalOrders != null ? Math.round(incrementalOrders * e.cm1PerOrder) : null;
  const incrementalCmRoas =
    incrementalCm != null && e.treatmentSpend > 0 ? round2(incrementalCm / e.treatmentSpend) : null;

  const impliedPaidSharePct =
    incrementalOrders != null && e.treatment.orders > 0
      ? round1((incrementalOrders / e.treatment.orders) * 100)
      : null;

  // Status drives everything the UI is allowed to say about this test.
  const status = running
    ? "running"
    : underpowered
      ? "underpowered"
      : significant
        ? "conclusive"
        : "inconclusive";

  return {
    ...e,
    designMeta: DESIGN_META[e.design],
    days,
    running,
    minDays: MIN_TEST_DAYS,
    daysShort: Math.max(0, MIN_TEST_DAYS - days),
    treatmentRatePer1k: round2(tRate * 1000),
    controlRatePer1k: round2(cRate * 1000),
    liftPct: liftPct != null ? round1(liftPct) : null,
    liftLoPct: liftLoPct != null ? round1(liftLoPct) : null,
    liftHiPct: liftHiPct != null ? round1(liftHiPct) : null,
    significant,
    underpowered,
    status,
    incrementalOrders,
    incrementalCm,
    incrementalCmRoas,
    impliedPaidSharePct,
    // Only a conclusive, adequately-powered test may inform the model.
    usable: status === "conclusive",
    readout: buildReadout({ e, status, days, liftPct, liftLoPct, liftHiPct, incrementalCmRoas }),
  };
}

function buildReadout({ e, status, days, liftPct, liftLoPct, liftHiPct, incrementalCmRoas }) {
  const window = `${days} days`;
  switch (status) {
    case "running":
      return `Running — ${window} in of a ${MIN_TEST_DAYS}-day minimum. No result yet, and the interim numbers should not be quoted.`;
    case "underpowered":
      return `Ran ${window}, short of the ${MIN_TEST_DAYS}-day minimum. Point estimate ${round1(liftPct)}% lift, but the interval spans ${round1(liftLoPct)}% to ${round1(liftHiPct)}% — too wide to plan against. Re-run for longer.`;
    case "inconclusive":
      return `Ran ${window} and found no detectable lift: the interval (${round1(liftLoPct)}% to ${round1(liftHiPct)}%) includes zero. On this evidence the spend is not buying incremental demand.`;
    default:
      return `Ran ${window}. Lift ${round1(liftPct)}% (95% CI ${round1(liftLoPct)}% to ${round1(liftHiPct)}%), incremental CM-ROAS ${incrementalCmRoas}×.`;
  }
}

/** All experiments, newest first, with the running ones surfaced. */
export function experimentBoard() {
  const all = EXPERIMENTS.map(evaluateExperiment).sort((a, b) => {
    if (a.running !== b.running) return a.running ? -1 : 1;
    return new Date(b.startedOn) - new Date(a.startedOn);
  });

  const usable = all.filter((x) => x.usable);
  const coveredSpend = usable.reduce((a, x) => a + x.treatmentSpend, 0);

  return {
    experiments: all,
    conclusive: usable.length,
    running: all.filter((x) => x.running).length,
    needsRerun: all.filter((x) => x.status === "underpowered" || x.status === "inconclusive").length,
    coveredSpend,
    minDays: MIN_TEST_DAYS,
  };
}

/**
 * THE PAYOFF: measured paid share per channel, where a usable test exists.
 *
 * This is what makes the product defensible. Every CM-ROAS in the app assumes
 * a paid share; here is the measured one, and the gap between them is the
 * amount the assumption is wrong by. A channel whose attribution claims 38%
 * of orders but whose holdout measures 11% incremental is a channel being
 * funded on a fiction.
 */
export function measuredPaidShare() {
  const out = {};
  for (const x of EXPERIMENTS.map(evaluateExperiment)) {
    if (!x.usable || x.scope.kind !== "channel") continue;
    // Latest usable test per channel wins.
    const prev = out[x.scope.id];
    if (prev && new Date(prev.endedOn) > new Date(x.endedOn)) continue;
    out[x.scope.id] = {
      channelId: x.scope.id,
      label: x.scope.label,
      measuredSharePct: x.impliedPaidSharePct,
      incrementalCmRoas: x.incrementalCmRoas,
      endedOn: x.endedOn,
      days: x.days,
      experimentId: x.id,
    };
  }
  return out;
}

/**
 * Compare what the model assumes against what the tests measured.
 *
 * @param {Object[]} channels marketingData().channels — each with an
 *   attributed cmRoas the product currently reports
 */
export function attributionGap(channels) {
  const measured = measuredPaidShare();
  const rows = channels
    .filter((c) => measured[c.id] && c.spend > 0)
    .map((c) => {
      const m = measured[c.id];
      // The attributed CM-ROAS the product reports, vs the incremental one a
      // holdout measured. Ratio < 1 means attribution is over-crediting.
      const ratio = c.cmRoas > 0 ? round2(m.incrementalCmRoas / c.cmRoas) : null;
      const overstatedCm =
        c.cmRoas > 0 && m.incrementalCmRoas != null
          ? Math.round(c.spend * (c.cmRoas - m.incrementalCmRoas))
          : null;
      return {
        channelId: c.id,
        name: c.name,
        color: c.color,
        spend: c.spend,
        attributedCmRoas: c.cmRoas,
        incrementalCmRoas: m.incrementalCmRoas,
        ratio,
        overstatedCm,
        measuredSharePct: m.measuredSharePct,
        testedDays: m.days,
        testedEndedOn: m.endedOn,
        verdict:
          ratio == null ? "untested"
            : ratio >= 0.85 ? "attribution holds"
            : ratio >= 0.5 ? "attribution over-credits"
            : "mostly not incremental",
      };
    })
    .sort((a, b) => (b.overstatedCm ?? 0) - (a.overstatedCm ?? 0));

  const testedSpend = rows.reduce((a, r) => a + r.spend, 0);
  const totalSpend = channels.reduce((a, c) => a + c.spend, 0);

  return {
    rows,
    testedSpend,
    totalSpend,
    // How much of the budget has ANY experimental evidence behind it. The
    // honest headline: most brands discover this number is near zero.
    coveragePct: totalSpend ? round1((testedSpend / totalSpend) * 100) : 0,
    overstatedCm: rows.reduce((a, r) => a + Math.max(0, r.overstatedCm ?? 0), 0),
    untested: channels.filter((c) => c.spend > 0 && !measured[c.id]).map((c) => ({ id: c.id, name: c.name, spend: c.spend })),
  };
}
