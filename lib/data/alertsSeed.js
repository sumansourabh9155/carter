/*
  ALERTS — a threshold, a breach, and WHEN it happened.

  `triggeredAt` was the string "2h ago", frozen forever. An alert whose age
  never changes is indistinguishable from a mock, and age is the first thing
  anyone checks: a negative-CM2 alert from two hours ago is a decision, the
  same alert from three weeks ago is a process failure.

  Alerts now carry a real timestamp AND the duration of the breach, because
  "CM2 has been negative for 3 days" is a different problem from "CM2 went
  negative this morning" and the threshold that fired is the same.
*/

const HOUR = 60 * 60 * 1000;

export const ALERTS_SEED = [
  {
    id: "a1", type: "negative-cm2", severity: "critical", status: "triggered",
    title: "Negative-CM2 hero",
    body: "Recovery Slides media has been underwater for 3 consecutive days.",
    triggeredAt: Date.now() - 2 * HOUR,
    // How long the condition has held, which is what makes it urgent.
    breachDays: 3,
    threshold: "Media CM2 < 0 for 3+ consecutive days",
    ref: { label: "Recovery Slides", href: "/products/p6" },
  },
  {
    id: "a2", type: "ad-overspend", severity: "warning", status: "triggered",
    title: "Ad overspend",
    body: "TOF Lookalike is pacing 38% over its weekly budget at a 0.8x CM-ROAS.",
    triggeredAt: Date.now() - 26 * HOUR,
    breachDays: 6,
    threshold: "Campaign > 25% over pace AND CM-ROAS < 1.0x",
    ref: { label: "Insights · Channels", href: "/insights?view=channels" },
  },
];

export const ALERT_TYPES = [
  {
    id: "negative-cm2", label: "Negative-CM2 product", live: true,
    desc: "A product's media loses money for N consecutive days.",
    // Alert rules are time rules. A threshold with no duration fires on noise.
    window: "3 consecutive days",
  },
  {
    id: "ad-overspend", label: "Ad overspend", live: true,
    desc: "A campaign paces over budget below break-even CM-ROAS.",
    window: "rolling 7 days",
  },
  {
    id: "creative-fatigue", label: "Creative fatigue", live: true,
    desc: "An asset passes its placement's age or frequency ceiling while CM-ROAS decays.",
    window: "since the asset launched",
  },
  {
    id: "runway-floor", label: "Cash runway floor", live: false,
    desc: "Projected cash crosses your floor. Needs the cash engine — Phase 2.",
    window: "—",
  },
];
