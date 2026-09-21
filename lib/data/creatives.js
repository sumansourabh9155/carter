/*
  CREATIVE — the layer the product stopped at "campaign" and never reached.

  Why it matters here specifically: the board already detects CM-ROAS decay
  and names the channel. It could not name the CAUSE, and the most common
  cause by a wide margin is creative fatigue — the same asset shown to the
  same people until the response rate collapses. Diagnosing a channel decline
  without looking at creative age is like diagnosing a fever without a
  thermometer.

  Fatigue is a function of TIME LIVE and FREQUENCY, which is exactly why this
  was impossible before the calendar spine existed. Nothing in the product
  knew how old anything was.

  RAW INPUTS ONLY. `firstRunOn`, `format`, `placement`, `frequency` and the
  first-week baseline come from the ad platforms. Current CM-ROAS, decay and
  every verdict are DERIVED in lib/compute/creative.js from the channel and
  campaign figures the margin engine already produced — a creative's
  performance is a share of its campaign's, never a separate number.

    campaignName   the campaign this asset runs in (joins to AD_CHANNELS)
    firstRunOn     ISO date the asset first served. The whole point.
    format         video / static / carousel / collection
    placement      where it serves. A feed asset and a story asset fatigue
                   at very different rates.
    spendShare     share of its campaign's spend
    frequency      average impressions per reached user over the window.
                   Above ~4 on prospecting is the classic fatigue signature.
    week1CmRoasIndex  its CM-ROAS in its FIRST week, indexed to the campaign's
                   current rate = 1.0. 1.6 means it started 60% stronger than
                   the campaign runs today, i.e. it has decayed.
*/

export const CREATIVES = [
  // --- Meta -------------------------------------------------------------
  {
    id: "cr-meta-asc-ugc",
    campaignName: "ASC — Broad",
    name: "UGC — “I wear these every day”",
    format: "video",
    placement: "Feed",
    firstRunOn: daysAgoIso(64),
    spendShare: 0.52,
    frequency: 6.4,
    week1CmRoasIndex: 1.72,
  },
  {
    id: "cr-meta-asc-studio",
    campaignName: "ASC — Broad",
    name: "Studio flat-lay — Autumn set",
    format: "static",
    placement: "Feed",
    firstRunOn: daysAgoIso(9),
    spendShare: 0.48,
    frequency: 2.1,
    week1CmRoasIndex: 1.02,
  },
  {
    id: "cr-meta-retarget-carousel",
    campaignName: "Retargeting",
    name: "Dynamic carousel — viewed items",
    format: "carousel",
    placement: "Feed",
    firstRunOn: daysAgoIso(112),
    spendShare: 1,
    frequency: 8.9,
    week1CmRoasIndex: 1.34,
  },
  {
    id: "cr-meta-tof-reel",
    campaignName: "TOF — Lookalike",
    name: "Reel — 15s hook test",
    format: "video",
    placement: "Reels",
    firstRunOn: daysAgoIso(21),
    spendShare: 1,
    frequency: 3.3,
    week1CmRoasIndex: 1.11,
  },

  // --- Google -----------------------------------------------------------
  {
    id: "cr-goog-pmax-assets",
    campaignName: "PMax",
    name: "PMax asset group — Core",
    format: "mixed",
    placement: "PMax network",
    firstRunOn: daysAgoIso(140),
    spendShare: 1,
    frequency: 4.6,
    week1CmRoasIndex: 1.28,
  },
  {
    id: "cr-goog-shopping",
    campaignName: "Shopping — Brand",
    name: "Shopping feed — brand terms",
    format: "feed",
    placement: "Shopping",
    firstRunOn: daysAgoIso(210),
    // Shopping feeds don't fatigue like social creative — the asset is the
    // product, and intent is what varies. Flat by design, and a useful
    // contrast to the social assets above.
    spendShare: 1,
    frequency: 1.4,
    week1CmRoasIndex: 1.03,
  },
  {
    id: "cr-goog-nonbrand",
    campaignName: "Search — Non-Brand",
    name: "RSA — category terms",
    format: "text",
    placement: "Search",
    firstRunOn: daysAgoIso(48),
    spendShare: 1,
    frequency: 1.2,
    week1CmRoasIndex: 1.09,
  },

  // --- TikTok -----------------------------------------------------------
  {
    id: "cr-tt-ugc-a",
    campaignName: "VSA — UGC",
    name: "Creator cut A — gym bag",
    format: "video",
    placement: "For You",
    firstRunOn: daysAgoIso(52),
    spendShare: 0.6,
    frequency: 7.1,
    week1CmRoasIndex: 1.81,
  },
  {
    id: "cr-tt-ugc-b",
    campaignName: "VSA — UGC",
    name: "Creator cut B — morning run",
    format: "video",
    placement: "For You",
    firstRunOn: daysAgoIso(5),
    spendShare: 0.4,
    frequency: 1.6,
    week1CmRoasIndex: 0.94,
  },
  {
    id: "cr-tt-topview",
    campaignName: "TopView",
    name: "TopView — brand film",
    format: "video",
    placement: "TopView",
    firstRunOn: daysAgoIso(31),
    spendShare: 1,
    frequency: 5.2,
    week1CmRoasIndex: 1.44,
  },

  // --- Snapchat ---------------------------------------------------------
  {
    id: "cr-snap-story",
    campaignName: "Snap Ads — Story",
    name: "Story ad — 3-card set",
    format: "video",
    placement: "Stories",
    firstRunOn: daysAgoIso(38),
    spendShare: 1,
    frequency: 4.9,
    week1CmRoasIndex: 1.36,
  },
  {
    id: "cr-snap-collection",
    campaignName: "Collection Ads",
    name: "Collection — best sellers",
    format: "collection",
    placement: "Stories",
    firstRunOn: daysAgoIso(14),
    spendShare: 1,
    frequency: 2.4,
    week1CmRoasIndex: 1.05,
  },
];

/*
  Dates are stored relative to the run so the demo never goes stale — a
  creative seeded "112 days live" stays 112 days live next month instead of
  quietly ageing into nonsense. Real data would carry absolute dates; this is
  the one concession the seed makes to being a seed, and it is contained here.
*/
function daysAgoIso(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/* Placement families — a story asset and a feed asset are not comparable, so
   fatigue thresholds are per family rather than global. */
export const PLACEMENT_FAMILY = {
  Feed: "social-feed",
  Reels: "social-short",
  "For You": "social-short",
  TopView: "social-short",
  Stories: "social-story",
  Search: "intent",
  Shopping: "intent",
  "PMax network": "mixed",
};
