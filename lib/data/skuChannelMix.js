// RAW per-SKU paid-attribution data. For each product:
//   paidShare  fraction of this SKU's units attributable to PAID ads at all
//              (from UTM/pixel attribution). The remainder is EARNED —
//              organic search, direct, email — which ad budget cannot move.
//              Catalog-weighted average ≈ 34%, consistent with the Website
//              tab's traffic sources (paid drove 1,584 of 4,464 orders).
//   channels   how the PAID slice splits across ad channels:
//     spendShare  share of this SKU's adSpend that ran on this channel
//     orderShare  share of this SKU's PAID units this channel is credited with
//     trendPct    recent trend for this specific SKU×channel pairing
//
// Real CM-ROAS per channel is DERIVED in lib/compute/channelMix.js from the
// SKU's own margin — never stored here. Not every SKU runs on every channel.

export const SKU_CHANNEL_MIX = {
  p1: {
    paidShare: 0.34,
    channels: [
      { channel: "meta", spendShare: 0.62, orderShare: 0.65, trendPct: 6.5 },
      { channel: "google", spendShare: 0.28, orderShare: 0.27, trendPct: 1.0 },
      { channel: "tiktok", spendShare: 0.10, orderShare: 0.08, trendPct: -3.0 },
    ],
  },
  p2: {
    paidShare: 0.38,
    channels: [
      { channel: "meta", spendShare: 0.50, orderShare: 0.52, trendPct: 5.0 },
      { channel: "tiktok", spendShare: 0.35, orderShare: 0.34, trendPct: 14.0 },
      { channel: "google", spendShare: 0.15, orderShare: 0.14, trendPct: -2.0 },
    ],
  },
  p3: {
    paidShare: 0.33,
    channels: [
      { channel: "google", spendShare: 0.55, orderShare: 0.53, trendPct: 1.5 },
      { channel: "meta", spendShare: 0.45, orderShare: 0.47, trendPct: -3.0 },
    ],
  },
  p4: {
    paidShare: 0.30,
    channels: [
      { channel: "google", spendShare: 0.65, orderShare: 0.68, trendPct: -1.0 },
      { channel: "meta", spendShare: 0.35, orderShare: 0.32, trendPct: -6.0 },
    ],
  },
  p5: {
    paidShare: 0.36,
    channels: [
      { channel: "tiktok", spendShare: 0.55, orderShare: 0.50, trendPct: -2.0 },
      { channel: "meta", spendShare: 0.35, orderShare: 0.38, trendPct: 1.0 },
      { channel: "snapchat", spendShare: 0.10, orderShare: 0.12, trendPct: -10.0 },
    ],
  },
  // Recovery Slides — heavily ad-pushed relative to the catalog, which is
  // exactly why its losses scale with its ad budget.
  p6: {
    paidShare: 0.42,
    channels: [
      { channel: "google", spendShare: 0.60, orderShare: 0.58, trendPct: -4.0 },
      { channel: "meta", spendShare: 0.40, orderShare: 0.42, trendPct: -9.0 },
    ],
  },
  p7: {
    paidShare: 0.36,
    channels: [
      { channel: "meta", spendShare: 0.65, orderShare: 0.68, trendPct: 11.0 },
      { channel: "google", spendShare: 0.35, orderShare: 0.32, trendPct: 2.0 },
    ],
  },
  p8: {
    paidShare: 0.40,
    channels: [
      { channel: "tiktok", spendShare: 0.40, orderShare: 0.38, trendPct: 22.0 },
      { channel: "meta", spendShare: 0.40, orderShare: 0.42, trendPct: 8.0 },
      { channel: "google", spendShare: 0.20, orderShare: 0.20, trendPct: 1.0 },
    ],
  },
  p9: {
    paidShare: 0.32,
    channels: [
      { channel: "google", spendShare: 0.45, orderShare: 0.43, trendPct: 2.0 },
      { channel: "meta", spendShare: 0.45, orderShare: 0.47, trendPct: 3.0 },
      { channel: "tiktok", spendShare: 0.10, orderShare: 0.10, trendPct: 5.0 },
    ],
  },
  // Subscription socks — repeat buyers come back direct/email, not via ads.
  p10: {
    paidShare: 0.25,
    channels: [
      { channel: "google", spendShare: 0.70, orderShare: 0.72, trendPct: 3.0 },
      { channel: "meta", spendShare: 0.30, orderShare: 0.28, trendPct: 6.0 },
    ],
  },
  p11: {
    paidShare: 0.33,
    channels: [
      { channel: "google", spendShare: 0.55, orderShare: 0.52, trendPct: -2.0 },
      { channel: "meta", spendShare: 0.45, orderShare: 0.48, trendPct: -7.0 },
    ],
  },
  p12: {
    paidShare: 0.30,
    channels: [
      { channel: "google", spendShare: 0.60, orderShare: 0.58, trendPct: -1.0 },
      { channel: "meta", spendShare: 0.40, orderShare: 0.42, trendPct: -1.0 },
    ],
  },
  // Hydro Flask — the TikTok-viral story: unusually ad-driven right now.
  p13: {
    paidShare: 0.42,
    channels: [
      { channel: "meta", spendShare: 0.45, orderShare: 0.40, trendPct: 8.0 },
      { channel: "google", spendShare: 0.35, orderShare: 0.30, trendPct: 5.0 },
      { channel: "tiktok", spendShare: 0.20, orderShare: 0.30, trendPct: 38.0 },
    ],
  },
  // Studio Wrap Jacket — the most ad-dependent SKU in the catalog, which is
  // why its TikTok overspend hurts so much.
  p14: {
    paidShare: 0.48,
    channels: [
      { channel: "tiktok", spendShare: 0.65, orderShare: 0.28, trendPct: -15.0 },
      { channel: "meta", spendShare: 0.22, orderShare: 0.42, trendPct: -4.0 },
      { channel: "google", spendShare: 0.13, orderShare: 0.30, trendPct: 6.0 },
    ],
  },
  p15: {
    paidShare: 0.30,
    channels: [
      { channel: "google", spendShare: 0.60, orderShare: 0.58, trendPct: 4.0 },
      { channel: "meta", spendShare: 0.40, orderShare: 0.42, trendPct: 2.0 },
    ],
  },
  p16: {
    paidShare: 0.36,
    channels: [
      { channel: "meta", spendShare: 0.60, orderShare: 0.62, trendPct: 3.0 },
      { channel: "tiktok", spendShare: 0.25, orderShare: 0.23, trendPct: 8.0 },
      { channel: "google", spendShare: 0.15, orderShare: 0.15, trendPct: -5.0 },
    ],
  },
};
