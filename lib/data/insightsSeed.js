// Findings shown on /insights. Narrative + recommended action + where it links.
// "kind" drives the icon/severity; "ref" points at the deep screen.
export const INSIGHTS_SEED = [
  {
    id: "i1", severity: "critical", kind: "margin",
    title: "Recovery Slides loses money on every order",
    body:
      "After ad spend, CM2 is negative — about −$0.78 per order. Every unit sold at the current ad budget destroys value. Cut its ads or raise price ≥ $4.",
    metric: "CM2 −$338 / mo",
    action: { label: "View product", href: "/products/p6" },
  },
  {
    id: "i2", severity: "warning", kind: "ads",
    title: "Meta CM-ROAS dropped 19% week-over-week",
    body:
      "Profit-based ROAS fell from 2.1× to 1.7×. The TOF Lookalike campaign is the likely culprit (0.8× CM-ROAS). Reduce or pause its budget.",
    metric: "1.7× CM-ROAS",
    action: { label: "View marketing", href: "/marketing" },
  },
  {
    id: "i3", severity: "opportunity", kind: "margin",
    title: "Cloud 7 Sports Bra is your highest-margin SKU",
    body:
      "61% CM1 — well above the catalog. It's a Hero with room to scale. Heavy-up Meta ASC on this SKU; estimated +$8–12K/mo in CM2.",
    metric: "61% CM1",
    action: { label: "View product", href: "/products/p2" },
  },
  {
    id: "i4", severity: "info", kind: "data",
    title: "2 products have estimated margins",
    body:
      "Yoga Flow Tank and Grip Training Gloves have no real COGS entered — their margins use a category default. Add the real costs to make their CM trustworthy.",
    metric: "2 SKUs estimated",
    action: { label: "Complete data", href: "/data-collection" },
  },
  {
    id: "i5", severity: "warning", kind: "margin",
    title: "Studio Wrap Jacket returns are eating margin",
    body:
      "Returns cost $1.3K this month — 7% of its revenue — and sales are down 10%. Review sizing or fit before scaling spend on it.",
    metric: "Returns 7% of sales",
    action: { label: "View product", href: "/products/p14" },
  },
  {
    id: "i6", severity: "opportunity", kind: "demand",
    title: "Hydro Flask is your fastest-rising SKU",
    body:
      "Up 12% month-over-month at a healthy margin. Demand is accelerating — make sure stock and ad budget can keep up.",
    metric: "+12% MoM",
    action: { label: "View product", href: "/products/p13" },
  },
  {
    id: "i7", severity: "warning", kind: "supply",
    title: "Two heroes are about to stock out",
    body:
      "Cloud 7 (~16 days) and Running Cap (~9 days) are below their supplier lead times. A reorder placed today still arrives late — act now.",
    metric: "2 SKUs at risk",
    action: { label: "Check supply", href: "/data-collection" },
  },
];
