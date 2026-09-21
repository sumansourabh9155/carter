// RAW ad-channel inputs. CM-ROAS is DERIVED by the engine, never stored.
//   spend                   total spend on the channel (the one number platforms report honestly)
//   attributedCm            contribution margin attributed to the channel (from owned UTM/order data)
//   attributedRevenue       revenue attributed via owned data (Carter's verified number)
//   platformReportedRevenue what the platform's OWN ads dashboard claims it drove — usually
//                           higher, because platforms use generous attribution windows
//                           (e.g. Meta: 7-day-click + 1-day-view) that credit sales Carter's
//                           owned order data can't actually verify happened because of the ad.
//   trackingConfidence      how much to trust this channel's numbers overall — driven by
//                           pixel/CAPI match rate, iOS tracking loss, sample size
//   confidenceNote          plain-language reason for that confidence level
//   orders                  orders attributed
//   monthlyBudget           the plan for the month — a DECISION, so it cannot be derived

/*
  Flight dates. `endsOn: null` is always-on, which is a real and different
  state from "ends in 4 days" — an always-on campaign can absorb a budget
  change, one ending this week cannot, and pausing a campaign two days from
  its natural end achieves nothing.
*/
function dayOffset(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export const AD_CHANNELS = [
  {
    id: "meta", name: "Meta Ads", color: "#0277bd", monthlyBudget: 20000,
    spend: 18200, attributedCm: 30540, attributedRevenue: 52400, orders: 712,
    platformReportedRevenue: 71800,
    trackingConfidence: "medium",
    confidenceNote: "Meta's 7-day-click + 1-day-view window credits people who saw the ad but bought later via search or direct — inflates its own number.",
    campaigns: [
      { name: "ASC — Broad", startedOn: dayOffset(-112), endsOn: null, spend: 8400, attributedCm: 15960, orders: 342 },
      { name: "Retargeting", startedOn: dayOffset(-210), endsOn: null, spend: 5800, attributedCm: 13920, orders: 258 },
      { name: "TOF — Lookalike", startedOn: dayOffset(-21), endsOn: dayOffset(4), spend: 4000, attributedCm: 3200, orders: 112 },
    ],
  },
  {
    id: "google", name: "Google Ads", color: "#ef6c00", monthlyBudget: 12000,
    spend: 11400, attributedCm: 22680, attributedRevenue: 38760, orders: 534,
    platformReportedRevenue: 42100,
    trackingConfidence: "high",
    confidenceNote: "Closest to owned-data reality of any channel, though some branded-search clicks here are people who were already coming to buy.",
    campaigns: [
      { name: "Shopping — Brand", startedOn: dayOffset(-300), endsOn: null, spend: 4200, attributedCm: 11760, orders: 267 },
      { name: "PMax", startedOn: dayOffset(-140), endsOn: null, spend: 4800, attributedCm: 8160, orders: 192 },
      { name: "Search — Non-Brand", startedOn: dayOffset(-48), endsOn: dayOffset(12), spend: 2400, attributedCm: 2880, orders: 75 },
    ],
  },
  {
    id: "tiktok", name: "TikTok Ads", color: "#e87ba4", monthlyBudget: 7000,
    spend: 5600, attributedCm: 6440, attributedRevenue: 11200, orders: 188,
    platformReportedRevenue: 17400,
    trackingConfidence: "low",
    confidenceNote: "Weakest pixel match rate on iOS of any channel — a large share of TikTok's claimed conversions can't be matched to a real order.",
    campaigns: [
      { name: "VSA — UGC", startedOn: dayOffset(-52), endsOn: null, spend: 3200, attributedCm: 4480, orders: 128 },
      { name: "TopView", startedOn: dayOffset(-31), endsOn: dayOffset(2), spend: 2400, attributedCm: 1920, orders: 60 },
    ],
  },
  {
    id: "snapchat", name: "Snapchat Ads", color: "#2238b0", monthlyBudget: 3000,
    spend: 3200, attributedCm: 2560, attributedRevenue: 5760, orders: 96,
    platformReportedRevenue: 8950,
    trackingConfidence: "low",
    confidenceNote: "Small order volume plus weak iOS tracking make this the least reliable self-reported number of the five channels.",
    campaigns: [
      { name: "Snap Ads — Story", startedOn: dayOffset(-38), endsOn: dayOffset(18), spend: 2000, attributedCm: 1700, orders: 62 },
      { name: "Collection Ads", startedOn: dayOffset(-14), endsOn: dayOffset(45), spend: 1200, attributedCm: 860, orders: 34 },
    ],
  },
  {
    id: "twitter", name: "X (Twitter) Ads", color: "#111827", monthlyBudget: 2500,
    spend: 1800, attributedCm: 2070, attributedRevenue: 3420, orders: 54,
    platformReportedRevenue: 3950,
    trackingConfidence: "medium",
    confidenceNote: "Low ad volume means fewer conversions to check against real orders — reasonably close, but a thin sample.",
    campaigns: [
      { name: "Promoted Ads — Brand", spend: 1100, attributedCm: 1375, orders: 34 },
      { name: "Amplify Pre-roll", spend: 700, attributedCm: 695, orders: 20 },
    ],
  },
];

// New-vs-returning customer mix — raw split of period revenue/orders.
// Dollar figures are derived from the canonical revenue total in the
// margin engine, never stored here.
/*
  CARTER'S OWN ATTRIBUTION WINDOW — stated, because the product spends a whole
  card criticising Meta for a generous one.

  Attacking "7-day click, 1-day view" while never declaring your own is the
  fastest way to lose a media buyer's trust in a demo. This is the window
  every "Carter verified" figure in the app is measured over.
*/
export const ATTRIBUTION = {
  clickDays: 7,
  viewDays: 0,
  basis: "last non-direct click on owned order data",
  label: "7-day click · no view-through",
  note:
    "Carter credits an order to a channel only when the order's own UTM chain shows a click within 7 days. View-through is excluded entirely — it is the assumption that lets platforms claim credit for demand they did not create.",
};

// Weekly CM-ROAS trend per channel (presentation series for the trend chart).
export const MARKETING_WEEKLY = [
  { week: "W1", meta: 2.1, google: 1.8, tiktok: 0.9, snapchat: 1.1, twitter: 1.4 },
  { week: "W2", meta: 2.3, google: 2.0, tiktok: 1.0, snapchat: 1.0, twitter: 1.35 },
  { week: "W3", meta: 1.9, google: 2.1, tiktok: 1.1, snapchat: 0.85, twitter: 1.25 },
  { week: "W4", meta: 2.4, google: 2.2, tiktok: 1.2, snapchat: 0.9, twitter: 1.2 },
  { week: "W5", meta: 2.2, google: 2.0, tiktok: 1.1, snapchat: 0.82, twitter: 1.18 },
  { week: "W6", meta: 1.8, google: 2.0, tiktok: 1.15, snapchat: 0.8, twitter: 1.15 },
];
