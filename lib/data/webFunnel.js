// RAW on-site behavior events, as collected by the Carter Web Pixel
// (Shopify Web Pixels API). Counts only — every rate/conversion number is
// DERIVED in lib/compute/funnel.js, never stored here.
//
// Consistency contract with the rest of the seed data:
//   purchases (units) per product == that SKU's `units` in lib/data/skus.js
//   paid-source orders            == that channel's `orders` in lib/data/adChannels.js

// Per-product funnel counts for the current 30-day period.
//   views    product-page views
//   atc      added to cart
//   checkout reached checkout
//   (units sold comes from skus.js — not duplicated here)
export const PRODUCT_FUNNEL = {
  p1: { views: 29400, atc: 2940, checkout: 1470 },
  p2: { views: 20400, atc: 2450, checkout: 1120 },
  p3: { views: 36100, atc: 3250, checkout: 1620 },
  p4: { views: 12000, atc: 960, checkout: 400 },
  p5: { views: 26200, atc: 1830, checkout: 880 },
  // Recovery Slides — the "lots of traffic, nobody buys" story: heavy views,
  // weak add-to-cart. Pairs with its high return rate → product/page fit.
  p6: { views: 43200, atc: 2160, checkout: 720 },
  p7: { views: 19400, atc: 2130, checkout: 990 },
  p8: { views: 12400, atc: 1490, checkout: 640 },
  p9: { views: 30700, atc: 3070, checkout: 1410 },
  p10: { views: 41700, atc: 5000, checkout: 2300 },
  p11: { views: 9000, atc: 630, checkout: 280 },
  p12: { views: 21600, atc: 1510, checkout: 830 },
  p13: { views: 21100, atc: 2530, checkout: 1170 },
  p14: { views: 7500, atc: 600, checkout: 230 },
  p15: { views: 14300, atc: 1290, checkout: 660 },
  p16: { views: 22700, atc: 2270, checkout: 1040 },
};

// Sessions and orders by traffic source, current period. Paid-source orders
// match AD_CHANNELS exactly; organic/direct/email make up the rest.
export const TRAFFIC_SOURCES = [
  { id: "organic", name: "Organic search", paid: false, sessions: 38000, orders: 1450, color: "#2e7d32" },
  { id: "meta", name: "Meta Ads", paid: true, sessions: 26000, orders: 712, color: "#00838f" },
  { id: "direct", name: "Direct", paid: false, sessions: 18500, orders: 820, color: "#7d929e" },
  { id: "google", name: "Google Ads", paid: true, sessions: 14800, orders: 534, color: "#ffa000" },
  { id: "email", name: "Email", paid: false, sessions: 9800, orders: 610, color: "#7b1fa2" },
  { id: "tiktok", name: "TikTok Ads", paid: true, sessions: 9400, orders: 188, color: "#e87ba4" },
  { id: "snapchat", name: "Snapchat Ads", paid: true, sessions: 6100, orders: 96, color: "#2238b0" },
  { id: "twitter", name: "X (Twitter) Ads", paid: true, sessions: 2400, orders: 54, color: "#111827" },
];

// Weekly store-wide sessions + conversion, for the trend sparklines.
export const WEEKLY_SESSIONS = [
  { week: "W1", sessions: 19200, convPct: 3.4 },
  { week: "W2", sessions: 19800, convPct: 3.5 },
  { week: "W3", sessions: 20400, convPct: 3.5 },
  { week: "W4", sessions: 21100, convPct: 3.6 },
  { week: "W5", sessions: 21900, convPct: 3.7 },
  { week: "W6", sessions: 22600, convPct: 3.6 },
];
