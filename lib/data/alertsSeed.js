// The 2 live alert types for the Phase-1 demo. Runway-breach is shown elsewhere
// as a greyed "Phase 2" type (no cash engine to fire it yet).
export const ALERTS_SEED = [
  {
    id: "a1", type: "negative-cm2", severity: "critical", status: "triggered",
    title: "Negative-CM2 hero",
    body: "Recovery Slides has had CM2 < 0 for 3 consecutive days.",
    triggeredAt: "2h ago",
    ref: { label: "Recovery Slides", href: "/products/p6" },
  },
  {
    id: "a2", type: "ad-overspend", severity: "warning", status: "triggered",
    title: "Ad overspend",
    body: "TOF Lookalike spend is pacing 38% over its weekly budget at a 0.8× CM-ROAS.",
    triggeredAt: "Yesterday",
    ref: { label: "Marketing", href: "/marketing" },
  },
];

export const ALERT_TYPES = [
  { id: "negative-cm2", label: "Negative-CM2 product", live: true, desc: "A product loses money after ad spend for N consecutive days." },
  { id: "ad-overspend", label: "Ad overspend", live: true, desc: "A campaign paces over budget below break-even CM-ROAS." },
  { id: "runway-floor", label: "Cash runway floor", live: false, desc: "Projected cash crosses your floor. Needs the cash engine — Phase 2." },
];
