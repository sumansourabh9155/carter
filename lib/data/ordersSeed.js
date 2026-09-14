// Live order feed for the dashboard. Per-order CM is illustrative (the engine
// owns the period-level truth); flags mark orders that came in below margin.
export const RECENT_ORDERS = [
  { id: "#10482", product: "Cloud 7 Sports Bra", customer: "Sarah M.", channel: "Meta", amount: 39, cmPct: 61, time: "2m ago" },
  { id: "#10481", product: "Performance Leggings — Black", customer: "Jordan K.", channel: "Google", amount: 85, cmPct: 58, time: "6m ago" },
  { id: "#10480", product: "Recovery Slides", customer: "Mia T.", channel: "TikTok", amount: 20, cmPct: -5, time: "11m ago", flag: "low-margin" },
  { id: "#10479", product: "Everyday Joggers", customer: "Leo P.", channel: "Shopify", amount: 40, cmPct: 52, time: "18m ago" },
  { id: "#10478", product: "Hydro Flask Bottle 750ml", customer: "Ava R.", channel: "Email", amount: 30, cmPct: 57, time: "24m ago" },
  { id: "#10477", product: "Featherweight Hoodie", customer: "Noah W.", channel: "Meta", amount: 80, cmPct: 48, time: "33m ago" },
  { id: "#10476", product: "Studio Wrap Jacket", customer: "Emma L.", channel: "Meta", amount: 120, cmPct: 7, time: "41m ago", flag: "low-margin" },
  { id: "#10475", product: "Performance Socks — 3-Pack", customer: "Kai N.", channel: "Shopify", amount: 15, cmPct: 45, time: "52m ago" },
  { id: "#10474", product: "Pro Compression Shorts", customer: "Zoe B.", channel: "Google", amount: 29, cmPct: 49, time: "1h ago" },
  { id: "#10473", product: "Seamless Leggings — Navy", customer: "Liam C.", channel: "Meta", amount: 43, cmPct: 57, time: "1h ago" },
];

export const CHANNEL_TONE = {
  Meta: "#2a78d6",
  Google: "#eda100",
  TikTok: "#e87ba4",
  Email: "#4a3aa7",
  Shopify: "#eb6834",
};
