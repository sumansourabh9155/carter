// AURA'S DAILY BRIEF — the "ambient" mode of Aura (V2). Instead of waiting to
// be asked, Aura proactively synthesizes the ranked cross-domain insight board
// into a short, plain-English "here's what moved money and what I'd do" brief.
//
// Deterministic and grounded: it only ranks and phrases numbers the engines
// already computed (via insightsBoard). In production Aura narrates this live;
// this builder is the honest fallback and the data contract the narration
// must stay faithful to — it can never assert a number the board didn't carry.

import { insightsBoard } from "@/lib/compute/insights";
import { money, pct, multiple } from "@/lib/format";

const lowerFirst = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const plural = (n, one, many) => (n === 1 ? one : many);

// Impact is capped the same way the board score is, so one huge SKU can't make
// "at stake" read as the whole business.
const cappedImpact = (a) => Math.min(Math.abs(a.impact || 0), 50000);

export function buildDailyBrief() {
  const { health, actions } = insightsBoard();

  const critical = actions.filter((a) => a.severity === "critical");
  const warning = actions.filter((a) => a.severity === "warning");
  const opportunity = actions.filter((a) => a.severity === "opportunity");
  const top = actions.slice(0, 3);

  const netAtStake = Math.round(
    [...critical, ...warning].reduce((s, a) => s + cappedImpact(a), 0)
  );
  const upside = Math.round(opportunity.reduce((s, a) => s + cappedImpact(a), 0));

  const needsAttention = critical.length + warning.length;
  const allClear = needsAttention === 0;

  // Headline — what the founder should feel in one glance.
  let headline;
  if (critical.length) {
    headline = `${critical.length} ${plural(critical.length, "thing needs", "things need")} you now`;
  } else if (warning.length) {
    headline = `${warning.length} ${plural(warning.length, "thing", "things")} worth a look`;
  } else if (opportunity.length) {
    headline = `You're in good shape — ${opportunity.length} ${plural(opportunity.length, "upside", "upsides")} to grab`;
  } else {
    headline = "You're in good shape today";
  }

  // Summary — Aura's voice: lead with the single most important thing, then
  // the next, then the money at stake. Every number here comes off the board.
  const lead = top[0];
  let summary;
  if (allClear) {
    summary =
      `Nothing is losing money right now. Net profit is ${money(health.cm3)} (${pct(health.cm3Pct)} margin) at a ${multiple(health.cmRoas)} CM-ROAS.` +
      (opportunity.length
        ? ` Best move today: ${lowerFirst(opportunity[0].verdict)} — ${lowerFirst(opportunity[0].title)}.`
        : " Keep doing what you're doing.");
  } else {
    const first = `First: ${lowerFirst(lead.title)}.`;
    const second = top[1] ? ` Then ${lowerFirst(top[1].verdict)} — ${lowerFirst(top[1].title)}.` : "";
    const stake = netAtStake > 0 ? ` Handling today's list protects about ${money(netAtStake)} in contribution margin.` : "";
    summary = `${first}${second}${stake}`;
  }

  return {
    generatedFor: "the current reporting period",
    headline,
    summary,
    items: top.map((a) => ({
      id: a.id,
      severity: a.severity,
      verdict: a.verdict,
      title: a.title,
      body: a.body,
      metric: a.metric,
      action: a.ref, // { label, href }
    })),
    counts: { critical: critical.length, warning: warning.length, opportunity: opportunity.length, total: actions.length },
    netAtStake,
    upside,
    stakeLabel: netAtStake > 0 ? `${money(netAtStake)} in margin at stake` : null,
    upsideLabel: allClear && upside > 0 ? `${money(upside)} of upside on the table` : null,
    profitable: health.profitable,
    allClear,
  };
}
