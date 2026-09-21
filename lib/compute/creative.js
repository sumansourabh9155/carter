/*
  CREATIVE FATIGUE — naming the cause the board could only describe.

  The insight board already says "Meta Ads efficiency is sliding". That is a
  symptom. This module answers why, and the answer is almost always one of
  three things, in this order of frequency:

    1. an asset has been live too long at too high a frequency
    2. the audience is saturated (frequency high, reach flat)
    3. the offer or landing page changed

  Only the first two are visible from media data, and both need TIME — which
  is why none of this existed before the calendar spine.

  HOW DECAY IS DERIVED. `week1CmRoasIndex` is the asset's first-week CM-ROAS
  indexed to its campaign's CURRENT rate. So decay is not a stored number:
  it is the distance between where the asset started and where its campaign
  sits now, which means it re-derives correctly whenever the campaign's real
  CM-ROAS moves. A creative's absolute CM-ROAS is its campaign's scaled by
  that index, never an independently invented figure.

  THRESHOLDS ARE PER PLACEMENT FAMILY. A Shopping feed does not fatigue the
  way a Reel does — the asset is the product and intent does the varying.
  Applying one global frequency cap would flag every intent placement as
  exhausted and every short-form asset as healthy.
*/

import { CREATIVES, PLACEMENT_FAMILY } from "@/lib/data/creatives";
import { marketingData } from "@/lib/api/mock/marketing";
import { TODAY, daysBetween } from "@/lib/time";

// Frequency above which a family's response reliably degrades, and the age
// past which an asset in that family is usually spent.
const FAMILY_LIMITS = {
  "social-feed": { freq: 4.5, days: 45 },
  "social-short": { freq: 4.0, days: 35 }, // short-form burns fastest
  "social-story": { freq: 5.0, days: 45 },
  intent: { freq: 12, days: 3650 }, // effectively never, by design
  mixed: { freq: 6.0, days: 120 },
};

const round1 = (v) => Math.round(v * 10) / 10;
const round2 = (v) => Math.round(v * 100) / 100;

/**
 * Every creative, joined to its campaign's real economics and scored.
 * @returns {Object[]} worst fatigue first
 */
export function creativePerformance() {
  const mkt = marketingData();

  // campaignName → { campaign, channel }
  const byCampaign = new Map();
  for (const ch of mkt.channels) {
    for (const k of ch.campaigns ?? []) byCampaign.set(k.name, { campaign: k, channel: ch });
  }

  const rows = CREATIVES.map((cr) => {
    const join = byCampaign.get(cr.campaignName);
    if (!join) return null;
    const { campaign, channel } = join;

    const daysLive = Math.max(1, daysBetween(cr.firstRunOn, TODAY));
    const family = PLACEMENT_FAMILY[cr.placement] ?? "mixed";
    const limits = FAMILY_LIMITS[family];

    // Spend and CM are shares of the campaign the margin engine derived.
    const spend = Math.round(campaign.spend * cr.spendShare);
    const cmRoas = campaign.cmRoas;
    const week1CmRoas = cmRoas != null ? round2(cmRoas * cr.week1CmRoasIndex) : null;
    const attributedCm = Math.round(spend * (cmRoas ?? 0));

    // Decay against its own launch, not against a benchmark. An asset that
    // started at 1.8x and now runs at 1.1x has lost 39% of its efficiency
    // regardless of how that compares to anything else.
    const decayPct =
      week1CmRoas && week1CmRoas > 0 ? round1(((cmRoas - week1CmRoas) / week1CmRoas) * 100) : null;

    const overFrequency = cr.frequency > limits.freq;
    const overAge = daysLive > limits.days;
    const decayed = decayPct != null && decayPct <= -20;

    // All three signals pointing the same way is a refresh; one is a watch.
    const signals = [overFrequency, overAge, decayed].filter(Boolean).length;
    const status = signals >= 2 ? "fatigued" : signals === 1 ? "tiring" : "fresh";

    // What refreshing is worth: the margin the asset would recover if it ran
    // at its own first-week efficiency again. Capped at the decay actually
    // observed — a refresh restores, it does not invent new performance.
    const recoverableCm =
      decayed && week1CmRoas ? Math.max(0, Math.round(spend * (week1CmRoas - cmRoas))) : 0;

    return {
      ...cr,
      channelId: channel.id,
      channelName: channel.name,
      channelColor: channel.color,
      daysLive,
      family,
      spend,
      attributedCm,
      cmRoas,
      week1CmRoas,
      decayPct,
      overFrequency,
      overAge,
      freqLimit: limits.freq,
      ageLimit: limits.days,
      status,
      recoverableCm,
      // The one-line diagnosis, assembled from the signals that actually fired
      // rather than a generic "consider refreshing".
      diagnosis: buildDiagnosis({ cr, daysLive, decayPct, overFrequency, overAge, limits }),
    };
  }).filter(Boolean);

  return rows.sort((a, b) => b.recoverableCm - a.recoverableCm || (a.decayPct ?? 0) - (b.decayPct ?? 0));
}

function buildDiagnosis({ cr, daysLive, decayPct, overFrequency, overAge, limits }) {
  const parts = [];
  if (overAge) parts.push(`${daysLive} days live, past the ~${limits.days}-day mark for ${cr.placement}`);
  else parts.push(`${daysLive} days live`);
  if (overFrequency) parts.push(`frequency ${cr.frequency} vs a ${limits.freq} ceiling — the same people are seeing it repeatedly`);
  else parts.push(`frequency ${cr.frequency}, still within range`);
  if (decayPct != null && decayPct <= -20) parts.push(`CM-ROAS down ${Math.abs(decayPct)}% from its own first week`);
  else if (decayPct != null && decayPct < 0) parts.push(`CM-ROAS down ${Math.abs(decayPct)}% from week one, not yet material`);
  else parts.push("holding its launch efficiency");
  return `${parts.join(" · ")}.`;
}

/**
 * Channel-level creative health — the bridge from "this channel is sliding"
 * to "because this asset is spent".
 */
export function creativeHealthByChannel() {
  const rows = creativePerformance();
  const map = new Map();
  for (const r of rows) {
    const acc = map.get(r.channelId) || {
      channelId: r.channelId, channelName: r.channelName,
      creatives: 0, fatigued: 0, recoverableCm: 0, oldestDays: 0, spendOnFatigued: 0,
    };
    acc.creatives++;
    if (r.status === "fatigued") { acc.fatigued++; acc.spendOnFatigued += r.spend; }
    acc.recoverableCm += r.recoverableCm;
    acc.oldestDays = Math.max(acc.oldestDays, r.daysLive);
    map.set(r.channelId, acc);
  }
  return [...map.values()].sort((a, b) => b.recoverableCm - a.recoverableCm);
}

/** The single asset most worth replacing, or null when nothing is spent. */
export function worstCreative() {
  return creativePerformance().find((r) => r.status === "fatigued" && r.recoverableCm > 0) ?? null;
}
