/*
  INCREMENTALITY EXPERIMENTS — the only thing here that isn't an assumption.

  Every figure in this product hangs off `paidShare`: the fraction of a SKU's
  sales credited to paid media. It drives CM-ROAS, mediaCm2, the "Cut ads"
  verdicts, the simulator's forecasts and therefore the actions. And it was
  seeded. A number nothing validates, carrying the entire product.

  Attribution answers "which touchpoint preceded the order". It cannot answer
  "would the order have happened anyway", and that is the question a brand
  spending real money asks. Only a controlled experiment answers it.

  TWO DESIGNS, both standard:

    geo_holdout   markets are split into treatment (ads keep running) and
                  control (ads switched off). Lift is the difference in
                  orders per capita. The gold standard, and expensive: the
                  control markets genuinely lose the sales.
    psa           the ad slot is bought in both cells, but the control cell
                  is served a public-service ad. Controls for the fact that
                  ad-exposed users differ from unexposed ones. Cheaper, and
                  only available where the platform supports it.

  RAW MEASUREMENTS ONLY. Cell populations, orders and spend are what the test
  recorded. Lift, incremental CM-ROAS, confidence and statistical power are
  all DERIVED in lib/compute/incrementality.js — a seeded "lift: 34%" would
  be the same act of faith this module exists to replace.

    startedOn / endedOn   the window. `endedOn: null` means still running,
                          which changes how its result may be used.
    treatment / control   { markets, population, orders } as measured
    treatmentSpend        media cost in the treatment cell only
    cm1PerOrder           contribution margin per order in this scope, from
                          the margin engine at the time the test ran
*/

export const EXPERIMENTS = [
  {
    id: "exp-meta-geo-q3",
    name: "Meta — Q3 geo holdout",
    design: "geo_holdout",
    scope: { kind: "channel", id: "meta", label: "Meta Ads" },
    startedOn: daysAgoIso(58),
    endedOn: daysAgoIso(30),
    treatment: { markets: 18, population: 4_100_000, orders: 1_042 },
    control: { markets: 6, population: 1_350_000, orders: 243 },
    treatmentSpend: 21_400,
    cm1PerOrder: 41.2,
    note: "Ran four full weeks across 24 DMAs. Control markets matched on prior-year revenue per capita.",
  },
  {
    id: "exp-google-brand-psa",
    name: "Google brand search — PSA test",
    design: "psa",
    scope: { kind: "campaign", id: "Shopping — Brand", label: "Shopping — Brand" },
    startedOn: daysAgoIso(44),
    endedOn: daysAgoIso(16),
    // The classic finding: brand-term traffic converts with or without the
    // ad, because the customer was already looking for you.
    treatment: { markets: 1, population: 880_000, orders: 268 },
    control: { markets: 1, population: 880_000, orders: 241 },
    treatmentSpend: 4_180,
    cm1PerOrder: 38.6,
    note: "Nationwide PSA split on brand terms only. Non-brand search was excluded and is unaffected by this result.",
  },
  {
    id: "exp-tiktok-geo",
    name: "TikTok — prospecting geo holdout",
    design: "geo_holdout",
    scope: { kind: "channel", id: "tiktok", label: "TikTok Ads" },
    startedOn: daysAgoIso(26),
    endedOn: daysAgoIso(5),
    treatment: { markets: 12, population: 2_250_000, orders: 341 },
    control: { markets: 4, population: 780_000, orders: 98 },
    treatmentSpend: 7_900,
    cm1PerOrder: 36.4,
    note: "Three weeks. Shorter than ideal for a channel with this order volume — read the interval, not the point estimate.",
  },
  {
    id: "exp-snap-geo-live",
    name: "Snapchat — geo holdout (running)",
    design: "geo_holdout",
    scope: { kind: "channel", id: "snapchat", label: "Snapchat Ads" },
    startedOn: daysAgoIso(6),
    endedOn: null, // still running — results must not be acted on yet
    treatment: { markets: 10, population: 1_900_000, orders: 41 },
    control: { markets: 4, population: 760_000, orders: 14 },
    treatmentSpend: 1_180,
    cm1PerOrder: 33.1,
    note: "Six days in. Far too early to read — included so the queue is visible, not so it can be acted on.",
  },
];

/*
  Same relative-date convention as the creative seed: stored as "N days ago"
  so a demo never ages into an experiment that finished in the future.
*/
function daysAgoIso(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export const DESIGN_META = {
  geo_holdout: {
    label: "Geo holdout",
    short: "Geo",
    desc: "Ads switched off in matched control markets. Measures true incremental demand; the control markets really do lose the sales.",
  },
  psa: {
    label: "PSA control",
    short: "PSA",
    desc: "Both cells see an ad; the control sees a public-service ad. Controls for exposed-audience bias without forfeiting the impressions.",
  },
};

/*
  MINIMUM DURATION. A media test needs to cover the full purchase cycle plus
  the attribution window, or it measures timing rather than lift. Below this
  a result is reported with its interval and marked underpowered rather than
  quietly presented as fact.
*/
export const MIN_TEST_DAYS = 21;
