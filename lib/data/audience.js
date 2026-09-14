// RAW audience breakdowns from the ad platforms' DSP reporting (geography,
// device, age). These describe the PAID slice only — DSPs only see the
// people ads reached, not organic/direct/email buyers.
//
// We store SHARES, never CM-ROAS. The engine (lib/compute/audience.js)
// derives each segment's CM-ROAS from the real paid totals in adChannels.js,
// so segment numbers always reconcile with the blended 1.60× on Marketing.
//
//   spendShare  fraction of paid ad spend that reached this segment
//   orderShare  fraction of paid orders credited to this segment
// A segment where orderShare > spendShare beats the blended CM-ROAS; where it
// trails, it drags the blend down — that gap is the whole insight.

export const STORE_AUDIENCE = {
  device: {
    label: "Device",
    segments: [
      { id: "mobile", label: "Mobile", color: "#eb6834", spendShare: 0.58, orderShare: 0.46 },
      { id: "desktop", label: "Desktop", color: "#2a78d6", spendShare: 0.34, orderShare: 0.44 },
      { id: "tablet", label: "Tablet", color: "#4a3aa7", spendShare: 0.08, orderShare: 0.10 },
    ],
  },
  age: {
    label: "Age",
    segments: [
      { id: "18-24", label: "18–24", color: "#e87ba4", spendShare: 0.24, orderShare: 0.19 },
      { id: "25-34", label: "25–34", color: "#eb6834", spendShare: 0.38, orderShare: 0.42 },
      { id: "35-44", label: "35–44", color: "#2a78d6", spendShare: 0.22, orderShare: 0.24 },
      { id: "45-54", label: "45–54", color: "#4a3aa7", spendShare: 0.11, orderShare: 0.10 },
      { id: "55+", label: "55+", color: "#1baf7a", spendShare: 0.05, orderShare: 0.05 },
    ],
  },
  geography: {
    label: "Geography",
    segments: [
      { id: "west", label: "US West", color: "#eb6834", spendShare: 0.28, orderShare: 0.30 },
      { id: "northeast", label: "US Northeast", color: "#2a78d6", spendShare: 0.22, orderShare: 0.24 },
      { id: "south", label: "US South", color: "#e87ba4", spendShare: 0.24, orderShare: 0.20 },
      { id: "midwest", label: "US Midwest", color: "#4a3aa7", spendShare: 0.14, orderShare: 0.14 },
      { id: "canada", label: "Canada", color: "#eb6834", spendShare: 0.07, orderShare: 0.06 },
      { id: "intl", label: "International", color: "#1baf7a", spendShare: 0.05, orderShare: 0.06 },
    ],
  },
};

// Per-product audience profiles from the DSP — who each SKU's ad-driven
// buyers actually are. Distributions sum to 100 within each dimension.
// Defined via archetypes so the data stays consistent and readable; the
// archetype reflects the product's real category/seasonality.
const ARCHETYPES = {
  youngMobile: {
    device: { mobile: 62, desktop: 30, tablet: 8 },
    age: { "18-24": 34, "25-34": 40, "35-44": 18, "45-54": 6, "55+": 2 },
    topRegions: ["US West", "US South"],
  },
  coreBalanced: {
    device: { mobile: 48, desktop: 44, tablet: 8 },
    age: { "18-24": 14, "25-34": 42, "35-44": 28, "45-54": 12, "55+": 4 },
    topRegions: ["US West", "US Northeast"],
  },
  olderDesktop: {
    device: { mobile: 38, desktop: 54, tablet: 8 },
    age: { "18-24": 8, "25-34": 30, "35-44": 34, "45-54": 20, "55+": 8 },
    topRegions: ["US Northeast", "US Midwest"],
  },
};

// SKU → archetype. Trend apparel skews young/mobile; outerwear skews
// older/desktop/colder regions; everyday staples sit in the middle.
export const PRODUCT_AUDIENCE_ARCHETYPE = {
  p1: "coreBalanced",   // Performance Leggings — Black
  p2: "youngMobile",    // Cloud 7 Sports Bra
  p3: "coreBalanced",   // Pro Compression Shorts
  p4: "olderDesktop",   // Thermal Running Jacket
  p5: "youngMobile",    // Yoga Flow Tank — 2-Pack
  p6: "youngMobile",    // Recovery Slides
  p7: "youngMobile",    // Seamless Leggings — Navy
  p8: "coreBalanced",   // Featherweight Hoodie
  p9: "coreBalanced",   // Everyday Joggers
  p10: "coreBalanced",  // Performance Socks — 3-Pack
  p11: "olderDesktop",  // Quilted Training Vest
  p12: "coreBalanced",  // Grip Training Gloves
  p13: "youngMobile",   // Hydro Flask Bottle 750ml
  p14: "olderDesktop",  // Studio Wrap Jacket
  p15: "coreBalanced",  // Compression Calf Sleeves
  p16: "coreBalanced",  // Lightweight Running Cap
};

export const AUDIENCE_ARCHETYPES = ARCHETYPES;
