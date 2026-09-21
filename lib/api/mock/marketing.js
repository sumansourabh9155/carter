import { AD_CHANNELS, MARKETING_WEEKLY, ATTRIBUTION } from "@/lib/data/adChannels";
import { allProducts, productsSummary } from "@/lib/api/mock/products";
import { deriveChannelPerformance } from "@/lib/compute/channelMix";
import { websiteAnalytics } from "@/lib/compute/funnel";
import { storeAudience, audienceLeak } from "@/lib/compute/audience";
import { customerMix } from "@/lib/compute/customers";
import { MONTH, REPORTING, TODAY, fmtRange, daysBetween } from "@/lib/time";

function round2(v) { return v == null ? null : Math.round(v * 100) / 100; }

// The one reallocation move worth making this period: shift budget from the
// weakest CM-ROAS channel toward the strongest. Always framed as a shift
// (cut from one, add to another) — never a one-sided "spend more" nudge,
// and never a fake-precise dollar figure the merchant hasn't confirmed.
// A channel has to be RUNNING to be a source of budget, and running at a
// size worth moving. Sorting the raw list by cmRoas put X (Twitter) — $0
// spend, null CM-ROAS — at the front, so the headline recommendation on the
// most severe card read "shift $0 from X (Twitter) to Meta". A null sorts
// before every number, and nothing filtered it out.
const MIN_SOURCE_SPEND = 1000; // below this there is nothing meaningful to move
const MIN_SHIFT = 250; // and nothing worth asking someone to approve

function buildRecommendation(channels) {
  const live = channels.filter((c) => c.cmRoas != null && c.spend >= MIN_SOURCE_SPEND);
  if (live.length < 2) return null;

  const ranked = [...live].sort((a, b) => a.cmRoas - b.cmRoas);
  const from = ranked[0];
  const to = ranked[ranked.length - 1];
  if (!from || !to || from.id === to.id || to.cmRoas <= from.cmRoas) return null;

  const amount = Math.round((from.spend * 0.4) / 50) * 50;
  if (amount < MIN_SHIFT) return null;
  const urgent = from.cmRoas < 1;

  return {
    from: { id: from.id, name: from.name, color: from.color, cmRoas: from.cmRoas, spend: from.spend },
    to: { id: to.id, name: to.name, color: to.color, cmRoas: to.cmRoas, spend: to.spend },
    amount,
    urgent,
    note: urgent
      ? `${from.name} is losing money on every dollar spent — ${to.name} is converting the same dollar into ${round2(to.cmRoas / from.cmRoas)}x more profit.`
      : `${to.name} is converting ad dollars into ${round2(to.cmRoas / from.cmRoas)}x more profit than ${from.name} right now.`,
  };
}

/*
  PACING, ON A REAL CALENDAR.

  `elapsedPct` used to be `new Date().getDate() / 30`, which is wrong in every
  month that is not 30 days long and, on the 31st of a 31-day month, claims
  103% of the month has elapsed. It now comes from lib/time.js, which knows
  how many days the actual month has.

  The number a media manager actually wants is not "122% of budget" — it is
  "at this run rate you land at $X against a $Y plan". That needs a daily run
  rate, which needs a day count, which is why none of this was possible
  before the calendar spine existed.

  DAYS ELAPSED COUNTS FINISHED DAYS. On the 1st nothing has finished, so a
  run rate is refused rather than extrapolated from a few hours.
*/
function buildPacing(channels, totalBudget, spend) {
  const elapsed = MONTH.elapsed;
  const dailyRunRate = elapsed > 0 ? Math.round(spend / elapsed) : null;
  const projected = dailyRunRate != null ? dailyRunRate * MONTH.days : null;

  return {
    budget: totalBudget,
    spend,
    remaining: totalBudget - spend,
    pacePct: totalBudget ? round2((spend / totalBudget) * 100) : null,
    // Calendar facts, not approximations.
    month: MONTH.label,
    daysInMonth: MONTH.days,
    daysElapsed: elapsed,
    daysRemaining: MONTH.remaining,
    elapsedPct: MONTH.elapsedPct,
    dailyRunRate,
    // Where the month lands if nothing changes — the actual decision input.
    projected,
    projectedOver: projected != null ? projected - totalBudget : null,
    // What you would have to spend per remaining day to finish on plan.
    onPlanDailyBudget:
      MONTH.remaining > 0 ? Math.max(0, Math.round((totalBudget - spend) / MONTH.remaining)) : 0,
    reportingWindow: fmtRange(REPORTING),
    byChannel: channels
      .filter((c) => c.budget)
      .map((c) => ({
        id: c.id, name: c.name, color: c.color, spend: c.spend, budget: c.budget,
        pacePct: c.pacePct,
        projected: elapsed > 0 ? Math.round((c.spend / elapsed) * MONTH.days) : null,
      })),
  };
}

/*
  ONE AD-SPEND NUMBER, NOT TWO.

  Channel spend, attributed revenue and attributed CM used to be seeded in
  AD_CHANNELS, independently of the per-SKU `adSpend` in the catalogue. The
  two disagreed by 36% — $54,707 booked against SKUs, $40,200 reported across
  channels — with nothing in the product saying which was real. Worse, the
  actions engine pauses against SKU spend while the Channels view reports
  channel spend, so a pause could bank a saving the other screen never showed.

  They are now one number by construction: every channel is summed from the
  SKUs that ran on it, using the same SKU×channel mix the product detail page
  uses. The seed keeps only what genuinely comes from outside the margin
  engine — what the platform CLAIMS, tracking confidence, the prior CM-ROAS,
  the budget, and the campaign split.
*/
function deriveChannelTotals(products) {
  const byChannel = new Map();
  for (const p of products) {
    const cp = deriveChannelPerformance(p);
    if (!cp) continue;
    for (const c of cp.channels) {
      const acc = byChannel.get(c.id) || { spend: 0, attributedCm: 0, attributedRevenue: 0, units: 0 };
      acc.spend += c.spend;
      acc.attributedCm += c.cm1;
      acc.attributedRevenue += c.revenue;
      acc.units += c.units;
      byChannel.set(c.id, acc);
    }
  }
  return byChannel;
}

// Derive CM-ROAS per channel and campaign (never stored).
export function marketingData() {
  const products = allProducts();
  const derived = deriveChannelTotals(products);
  /*
    THE PRIOR PERIOD, DERIVED — not seeded.

    `prevCmRoas` used to be a literal on each channel, written when CM-ROAS
    was total CM1 ÷ spend and therefore sat around 2.0. Against the honest
    attributed basis (~1.1) every one of those literals made its channel look
    like it had collapsed, and the board filled with false alarms.

    Running the prior period's own raw inputs through the same channel mix
    removes the calibration problem permanently: both sides of the comparison
    are produced by one code path, so they cannot drift apart again.
  */
  const priorDerived = deriveChannelTotals(allProducts("prior"));
  // Units per order, from the pixel — so "orders" on a channel is an order
  // count and not a unit count wearing its name.
  const web = websiteAnalytics();
  const unitsPerOrder = web.orders > 0 ? products.reduce((a, p) => a + p.units, 0) / web.orders : 1;

  const channels = AD_CHANNELS.map((c) => {
    const d = derived.get(c.id) || { spend: 0, attributedCm: 0, attributedRevenue: 0, units: 0 };
    const spend = Math.round(d.spend);
    const attributedCm = Math.round(d.attributedCm);
    const attributedRevenue = Math.round(d.attributedRevenue);
    const orders = Math.max(1, Math.round(d.units / unitsPerOrder));
    const pd = priorDerived.get(c.id);
    const prevCmRoas = pd && pd.spend > 0 ? round2(pd.attributedCm / pd.spend) : null;
    // Campaign spend is a SHARE of the channel, so it re-scales with the
    // derived total instead of summing to a different number than its parent.
    const seededCampaignSpend = c.campaigns.reduce((a, k) => a + k.spend, 0) || 1;
    const campaigns = c.campaigns.map((k) => {
      const share = k.spend / seededCampaignSpend;
      const kSpend = Math.round(spend * share);
      const kCm = Math.round(attributedCm * (k.attributedCm / (c.campaigns.reduce((a, x) => a + x.attributedCm, 0) || 1)));
      // Flight state, derived. "Always-on" and "ends in 2 days" need
      // different decisions and the product could not tell them apart.
      const daysRunning = k.startedOn ? daysBetween(k.startedOn, TODAY) : null;
      const daysLeft = k.endsOn ? daysBetween(TODAY, k.endsOn) : null;
      return {
        ...k,
        spend: kSpend,
        attributedCm: kCm,
        orders: Math.max(1, Math.round(orders * share)),
        cmRoas: kSpend > 0 ? round2(kCm / kSpend) : null,
        daysRunning,
        daysLeft,
        alwaysOn: k.endsOn == null,
        // A campaign inside its last few days cannot absorb a budget change.
        endingSoon: daysLeft != null && daysLeft >= 0 && daysLeft <= 5,
        ended: daysLeft != null && daysLeft < 0,
      };
    });

    return {
      ...c,
      spend,
      attributedCm,
      attributedRevenue,
      orders,
      cmRoas: spend > 0 ? round2(attributedCm / spend) : null,
      revRoas: spend > 0 ? round2(attributedRevenue / spend) : null,
      cac: orders > 0 ? Math.round(spend / orders) : null,
      prevCmRoas,
      prevSpend: pd ? Math.round(pd.spend) : null,
      cmRoasDelta: prevCmRoas ? round2(((attributedCm / spend - prevCmRoas) / prevCmRoas) * 100) : null,
      // How much higher the platform's own dashboard claims vs. what Carter can
      // verify against real orders — the "honest scoreboard" gap.
      platformGapPct: round2(((c.platformReportedRevenue - attributedRevenue) / attributedRevenue) * 100),
      // Pacing needs a plan to pace against. Budget is the one genuinely
      // external input here — nobody can derive what you decided to spend.
      budget: c.monthlyBudget ?? null,
      pacePct: c.monthlyBudget ? round2((spend / c.monthlyBudget) * 100) : null,
      campaigns,
    };
  });

  const totals = channels.reduce(
    (a, c) => ({ spend: a.spend + c.spend, cm: a.cm + c.attributedCm, rev: a.rev + c.attributedRevenue, orders: a.orders + c.orders }),
    { spend: 0, cm: 0, rev: 0, orders: 0 }
  );

  // Blended CM-ROAS for the prior period, rebuilt from each channel's own
  // prior figure rather than stored separately. Spend is held at today's mix,
  // which is the honest reading: it isolates the change in EFFICIENCY from
  // the change in how budget was split.
  const prevBlendedCmRoas = totals.spend
    ? round2(channels.reduce((a, c) => a + (c.prevCmRoas ?? c.cmRoas) * c.spend, 0) / totals.spend)
    : null;

  const totalBudget = channels.reduce((a, c) => a + (c.budget ?? 0), 0);
  const storeRevenue = productsSummary().revenue;

  return {
    channels,
    weekly: MARKETING_WEEKLY,
    attribution: ATTRIBUTION,
    // Every figure below describes exactly this window. Stated so no screen
    // has to imply it.
    window: { ...REPORTING, label: fmtRange(REPORTING) },
    // PACING — spend against plan. A media manager works to a budget; without
    // one there is nothing to be over or under, and "shift budget" has no
    // envelope to shift inside.
    pacing: buildPacing(channels, totalBudget, totals.spend),
    customerMix: customerMix(),
    audience: storeAudience(),
    audienceLeak: audienceLeak(),
    recommendation: buildRecommendation(channels),
    totals: {
      ...totals,
      cmRoas: round2(totals.cm / totals.spend),
      revRoas: round2(totals.rev / totals.spend),
      cac: Math.round(totals.spend / totals.orders),
      storeRevenue,
      prevCmRoas: prevBlendedCmRoas,
      /*
        THE NUMBER THE PLATFORMS THEMSELVES REPORT — their claimed revenue
        over spend, not Carter's verified revenue over spend. It is the top
        rung of the ladder and the only figure a media team recognises from
        their own ad manager, so it has to be the platforms' own arithmetic
        rather than ours applied to their revenue.
      */
      platformRoas: totals.spend
        ? round2(channels.reduce((a, c) => a + (c.platformReportedRevenue ?? 0), 0) / totals.spend)
        : null,
      // Store-level revenue / spend movement comes off the margin engine, so
      // the Channels view and the Today view can never quote different deltas.
      storeDelta: productsSummary().delta ?? null,
    },
  };
}
