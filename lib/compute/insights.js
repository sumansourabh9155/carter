// INSIGHTS ENGINE — the re-stitch. Every other compute module answers ONE
// domain (margin, ads, funnel, audience, cash); this one crosses all of them
// and emits prioritized, action-typed recommendations: what to scale, what to
// kill, where budget leaks, what to reorder, what it costs. This is what
// makes Carter a decision tool, not a Shopify report.
//
// Deterministic and honest — every number comes from the same engines the
// rest of the app uses; this module only ranks and phrases.

import { allProducts, productsSummary, cashCalendar } from "@/lib/api/mock/products";
import { deriveChannelPerformance } from "@/lib/compute/channelMix";
import { marketingData } from "@/lib/api/mock/marketing";
import { websiteAnalytics } from "@/lib/compute/funnel";
import { portfolioRollup } from "@/lib/compute/rollup";
import { attributionGap, experimentBoard } from "@/lib/compute/incrementality";
import { creativePerformance } from "@/lib/compute/creative";
import { planBudget } from "@/lib/compute/planner";
import { money, pct, multiple, signed, signedMoney, signedMultiple, plural } from "@/lib/format";

// Severity ordering for a DTC operator: stop losing money > plug a leak >
// grab upside > housekeeping. Dollar impact ranks within a tier.
const SEV_BASE = { critical: 1_000_000, warning: 100_000, opportunity: 10_000, info: 100 };
const round1 = (v) => Math.round(v * 10) / 10;

function productInsight(p, funnel, cp) {
  const ref = { label: p.name, href: `/products/${p.id}` };
  const cands = [];

  // Keyed on mediaCm2, not cm2. The question a budget decision can answer is
  // "did the ADS pay", and a SKU can be healthy overall while its media is
  // underwater — four in this catalogue are.
  if (p.mediaLosing) {
    cands.push({
      severity: "critical", verdict: "Cut ads",
      title: `${p.name} ads cost more than the margin they bring in`,
      body: `${money(p.adSpend)} of spend against ${money(p.paidCm1)} of attributed CM1 — ${money(p.mediaCm2)} on the media (${multiple(p.cmRoas)} CM-ROAS). ${p.losingMoney ? "The SKU is underwater overall too." : `The SKU still clears ${money(p.cm2)} CM2 on its earned demand, so this is a budget problem, not a product one.`}`,
      metric: `${money(p.mediaCm2)} / mo`, ref, impact: Math.abs(p.mediaCm2),
    });
  }
  if (p.stockoutRisk && !p.mediaLosing) {
    cands.push({
      severity: "critical", verdict: "Reorder now",
      title: `${p.name} sells out before a reorder can land`,
      body: `~${p.projectedDaysToStockout} days of stock vs a ${p.leadTimeDaysUsed}-day lead time. Order ~${p.suggestedReorderQty?.toLocaleString()} units now or lose the sales on a profitable SKU.`,
      metric: `${p.projectedDaysToStockout}d left`, ref, impact: Math.max(500, p.cm2),
    });
  }
  if (!p.stockoutRisk && p.daysOfCover != null && p.daysOfCover > 75 && p.trendPct < 0) {
    cands.push({
      severity: "warning", verdict: "Clear stock",
      title: `${p.name} is slow-moving dead stock`,
      body: `${p.daysOfCover} days of cover and demand is ${signed(p.trendPct).text} — cash sitting on the shelf. Discount or bundle to clear it (cheap to discount at ${pct(p.cm1Pct)} CM1).`,
      metric: `${p.daysOfCover}d cover`, ref, impact: Math.min(p.onHand * p.unitCost * 0.1, 8000),
    });
  }
  const retPct = p.revenue ? (p.returns / p.revenue) * 100 : 0;
  if (retPct >= 5.5) {
    cands.push({
      severity: "warning", verdict: "Review fit",
      title: `${p.name} returns are eroding its margin`,
      body: `Returns are ${pct(round1(retPct))} of revenue (${money(p.returns)}) — above the ~3–4% norm. That's product fit, not traffic: review sizing/photos before scaling spend.`,
      metric: `${money(p.returns)}`, ref, impact: p.returns,
    });
  }
  if (funnel && funnel.verdict === "lowinterest") {
    cands.push({
      severity: "warning", verdict: "Fix page",
      title: `${p.name} gets traffic but few carts`,
      body: `${funnel.views.toLocaleString()} views, only ${pct(funnel.viewToAtcPct)} add to cart. The page or ad targeting is the problem, not demand — fix the listing before buying more clicks.`,
      // The margin sitting behind the gap between this page's add-to-cart
      // rate and the catalogue average — not a round number someone typed.
      metric: `${pct(funnel.viewToAtcPct)} to cart`, ref,
      impact: Math.max(0, Math.round((p.cm1 / Math.max(1, p.units)) * funnel.views * ((funnel.catalogAvgViewToAtcPct ?? funnel.viewToAtcPct) - funnel.viewToAtcPct) / 100)),
    });
  }
  if (p.quadrant === "hero" && p.cmRoas != null && p.cmRoas >= SCALE_CMROAS && !p.stockoutRisk && p.trendPct >= 0 && !p.mediaLosing) {
    cands.push({
      severity: "opportunity", verdict: "Scale",
      title: `${p.name} is a hero with room to scale`,
      body: `${pct(p.cm1Pct)} CM1 at ${multiple(p.cmRoas)} CM-ROAS, stock to back it, trend ${signed(p.trendPct).text}.${cp?.best ? ` Push its best channel, ${cp.best.name}.` : ""}`,
      metric: `${multiple(p.cmRoas)} CM-ROAS`, ref, impact: Math.max(1000, p.cm2 * 0.3),
    });
  }

  if (!cands.length) return null;
  // One insight per product — the most important verdict for that SKU.
  cands.sort((a, b) => (SEV_BASE[b.severity] + (b.impact || 0)) - (SEV_BASE[a.severity] + (a.impact || 0)));
  return cands[0];
}

/* --------------------------------------------------------- portfolio level */

// PORTFOLIO INSIGHTS — the tier above the SKU.
//
// A per-SKU board is unreadable past a few hundred SKUs: 50,000 products means
// 50,000 cards, and the top of the list fills with variants of whichever item
// happens to be largest. Category insights carry the same dollars in one card,
// so the board stays the same size as the catalogue grows. They deliberately
// rank ABOVE per-SKU cards, because they represent more money.
//
// Every figure comes off the same aggregate() the store totals use, so a
// category card can never disagree with the number on the KPI row.

// Below this, a category's swing is period noise rather than something to act
// on; it keeps the board from filling with ±$50 movements.
// Thresholds are set against the HONEST CM-ROAS scale. On the old inflated
// basis (total CM1 ÷ spend) a 3.0x bar meant "fine"; on an attributed basis
// 3.0x is exceptional and the bar would never fire.
const SCALE_CMROAS = 1.8;   // comfortably above break-even, worth more budget
const MATERIAL_CM2_SWING = 1500;
const MATERIAL_ROAS_DROP = 0.25; // in CM-ROAS multiples

function categoryInsights(rollup) {
  const out = [];

  for (const g of rollup.groups) {
    // A "category" of one is just a SKU with extra words. Let its own card
    // through instead — it names the product, which is more useful.
    if (g.skuCount < 2) continue;

    const ref = { label: g.label, href: `/products?category=${encodeURIComponent(g.key)}` };
    const t = g.totals;
    const d = t.delta;
    // Carried so the actions engine can execute on the whole group in one
    // step — a category verdict has to move every SKU behind it, or the card
    // is advice rather than an action.
    const skuIds = g.skus.map((s) => s.id);

    // A whole category under water — one card replacing N SKU cards.
    if (t.cm2 < 0) {
      out.push({
        severity: "critical", verdict: "Cut ads", scope: "category",
        skuIds,
        title: `${g.label} loses money as a category`,
        body: `${plural(g.skuCount, "SKU")}, ${money(t.revenue)} revenue, and CM2 of ${money(t.cm2)} after ${money(t.adSpend)} of ad spend. ${g.losingCount} of them are individually unprofitable — treat this as one budget decision, not ${g.skuCount}.`,
        metric: `${money(t.cm2)} / mo`, ref, impact: Math.abs(t.cm2),
      });
      continue; // a loss-making category is the whole story; don't also flag its trend
    }

    // Efficiency falling on real money. Ranked on the DOLLARS behind the
    // drop, not the size of the drop — a 0.3× slide on the biggest category
    // outranks a 2× collapse on a rounding-error one.
    if (d?.cmRoas?.abs != null && d.cmRoas.abs <= -MATERIAL_ROAS_DROP && t.adSpend > 0) {
      out.push({
        severity: "warning", verdict: "Shift budget", scope: "category",
        skuIds,
        title: `${g.label} is getting less back per ad dollar`,
        body: `CM-ROAS fell ${multiple(t.prev.cmRoas)} → ${multiple(t.cmRoas)} while spend went ${money(t.prev.adSpend)} → ${money(t.adSpend)}. That is ${money(Math.abs(d.cm2.abs))} of CM2 ${d.cm2.dir === "down" ? "lost" : "moved"} across ${plural(g.skuCount, "SKU")} — find the campaign before the next budget cycle.`,
        metric: `${signedMultiple(d.cmRoas.abs).text}`, ref, impact: Math.abs(d.cm2.abs),
      });
      continue;
    }

    // Margin dollars falling materially even though efficiency held.
    if (d?.cm2?.dir === "down" && Math.abs(d.cm2.abs) >= MATERIAL_CM2_SWING) {
      out.push({
        severity: "warning", verdict: "Trim spend", scope: "category",
        skuIds,
        title: `${g.label} contribution is down ${money(Math.abs(d.cm2.abs))}`,
        body: `CM2 ${money(t.prev.cm2)} → ${money(t.cm2)}${d.cm2.pct != null ? ` (${signed(d.cm2.pct).text})` : ""} on ${money(t.revenue)} of revenue. Efficiency held at ${multiple(t.cmRoas)} CM-ROAS, so this is volume or mix — check which SKUs moved.`,
        metric: `${signedMoney(d.cm2.abs).text}`, ref, impact: Math.abs(d.cm2.abs),
      });
      continue;
    }

    // Scaling profitably — the one worth putting money behind.
    if (d?.cm2?.dir === "up" && d.cm2.abs >= MATERIAL_CM2_SWING && t.cmRoas != null && t.cmRoas >= 2 && d.cmRoas?.dir !== "down") {
      out.push({
        severity: "opportunity", verdict: "Scale", scope: "category",
        skuIds,
        title: `${g.label} is compounding — ${signedMoney(d.cm2.abs).text} CM2`,
        body: `${multiple(t.cmRoas)} CM-ROAS across ${plural(g.skuCount, "SKU")} and holding as spend grows, ${pct(g.revenueSharePct)} of portfolio revenue. This is where incremental budget has the most room.`,
        metric: `${multiple(t.cmRoas)} CM-ROAS`, ref, impact: d.cm2.abs,
      });
    }
  }

  return out;
}

// Channel efficiency decay — the only place the seed already carried a prior
// (prevCmRoas), now phrased as the change rather than the level.
function channelTrendInsights(marketing) {
  const out = [];
  for (const c of marketing.channels) {
    if (c.prevCmRoas == null || c.cmRoas == null || c.spend < 500) continue;
    const drop = round1(c.cmRoas - c.prevCmRoas);
    if (drop > -MATERIAL_ROAS_DROP) continue;
    out.push({
      severity: "warning", verdict: "Shift budget", scope: "channel",
      title: `${c.name} efficiency is sliding`,
      body: `CM-ROAS ${multiple(c.prevCmRoas)} → ${multiple(c.cmRoas)} on ${money(c.spend)} of spend. ${c.trackingConfidence === "low" ? "Tracking confidence here is low, so confirm against owned orders before cutting." : "Owned-order attribution backs this, so the decline is real."}`,
      metric: `${signedMultiple(drop).text}`, ref: { label: "Channels", href: "/insights?view=channels" }, impact: Math.abs(drop) * c.spend,
    });
  }
  return out;
}

/*
  IMPACT IS MARGIN AT RISK, IN DOLLARS. NOTHING ELSE.

  Every card's `impact` is summed into the Daily Brief's "$X in margin at
  stake", so a value that isn't margin silently corrupts the headline. Two
  were wrong: an over-funded segment used `spend × 0.25` (where did 25% come
  from? nowhere), and a below-break-even channel used its entire GROSS SPEND,
  which is the size of the budget, not the size of the loss.

  Both are now the actual recoverable margin:
    below break-even   spend × (1 − cmRoas)   the margin destroyed vs. breaking even
    over-funded segment spend × (blend − segment cmRoas)  the margin the same
                       dollars would earn at your blended rate instead

  (A channel's efficiency slide is already correct: Δ(CM per $) × $ = ΔCM.)
*/
/* ------------------------------------------------- measurement + creative */

/*
  INCREMENTALITY INSIGHTS — the highest-severity finding this product can make.

  Everything else on the board reasons from attribution, which answers "what
  preceded the order". When a holdout says a channel's real incremental
  CM-ROAS is half its attributed one, every other card about that channel is
  built on a number that is twice too generous. That outranks any of them.

  It also surfaces the absence of evidence. A brand with 45% of spend tested
  is doing better than most and still has half its budget on faith; saying so
  is more useful than another efficiency card.
*/
function incrementalityInsights(marketing) {
  const out = [];
  const gap = attributionGap(marketing.channels);
  const board = experimentBoard();
  const ref = { label: "Experiments", href: "/insights?view=experiments" };

  for (const r of gap.rows) {
    if (r.verdict === "attribution holds" || !(r.overstatedCm > 0)) continue;
    const severe = r.ratio != null && r.ratio < 0.5;
    out.push({
      severity: severe ? "critical" : "warning",
      verdict: "Shift budget", scope: "channel",
      title: `${r.name} is ${severe ? "mostly not incremental" : "over-credited by attribution"}`,
      body: `A ${r.testedDays}-day holdout measured ${multiple(r.incrementalCmRoas)} incremental CM-ROAS against the ${multiple(r.attributedCmRoas)} attribution reports — ${pct(Math.round((1 - r.ratio) * 100))} of the credit is demand that would have arrived anyway. On ${money(r.spend)} of spend that is ${money(r.overstatedCm)} of margin this product has been counting twice.`,
      metric: `${multiple(r.incrementalCmRoas)} real`,
      ref, impact: r.overstatedCm,
    });
  }

  // Coverage is a risk statement, not a margin loss — tagged accordingly so
  // it ranks without inflating "margin at stake".
  if (gap.coveragePct < 60 && gap.untested.length) {
    const untestedSpend = gap.untested.reduce((a, u) => a + u.spend, 0);
    out.push({
      severity: "warning", verdict: "Test this", scope: "store",
      title: `${pct(100 - gap.coveragePct)} of ad spend has never been tested`,
      body: `${money(untestedSpend)} runs on ${gap.untested.map((u) => u.name).join(", ")} with no holdout behind it. Attribution is the only evidence those channels have, and where a test HAS run it came back ${gap.rows.length ? `${multiple(gap.rows[0].ratio)} of the attributed figure` : "materially lower"}. Queue the largest one next.`,
      metric: `${pct(gap.coveragePct)} tested`,
      ref, impactKind: "risk", impact: untestedSpend,
    });
  }

  for (const x of board.experiments) {
    if (x.status !== "underpowered") continue;
    out.push({
      severity: "info", verdict: "Re-run test", scope: "store",
      title: `${x.name} ran too short to conclude`,
      body: `${x.days} days against a ${x.minDays}-day minimum, so the interval spans ${pct(x.liftLoPct)} to ${pct(x.liftHiPct)} — too wide to plan against. Re-run it for at least ${x.minDays} days before the result informs a budget.`,
      metric: `${x.days}d of ${x.minDays}d`,
      ref, impactKind: "risk", impact: x.treatmentSpend,
    });
  }

  return out;
}

/*
  CREATIVE FATIGUE — naming the cause behind a channel decline.

  The board already reports that a channel is sliding. This says why, and
  routes to the action that fixes it rather than to a budget shift that only
  relocates the problem.
*/
function creativeInsights() {
  const out = [];
  for (const cr of creativePerformance()) {
    if (cr.status !== "fatigued" || cr.recoverableCm < 500) continue;
    out.push({
      severity: "warning", verdict: "Refresh creative", scope: "creative",
      creativeId: cr.id,
      title: `“${cr.name}” is spent on ${cr.channelName}`,
      body: `${cr.diagnosis} At ${money(cr.spend)} of spend behind it, running at its own launch efficiency again is worth about ${money(cr.recoverableCm)}/mo. This is the cause behind ${cr.channelName}'s decline, not a separate problem.`,
      metric: `${cr.daysLive}d live`,
      ref: { label: cr.channelName, href: "/insights?view=channels" },
      impact: cr.recoverableCm,
    });
  }
  return out.slice(0, 3);
}

/*
  THE PLAN vs THE SPLIT. When the optimiser says a different allocation earns
  materially more profit from the SAME or less money, that is a single
  decision worth more than most of the board.
*/
function plannerInsight(marketing) {
  const plan = planBudget(marketing.channels, marketing.pacing?.budget ?? 0);
  if (!plan || plan.upliftCm2 < 1000) return null;
  return {
    severity: "warning", verdict: "Shift budget", scope: "store",
    title: `A different split earns ${money(plan.upliftCm2)} more from ${plan.spendCutFromCurrent > 0 ? "less" : "the same"} spend`,
    body: `Allocating by marginal return puts ${money(plan.allocated)} to work instead of ${money(plan.currentSpend)} and lifts CM2 from ${money(plan.currentCm2)} to ${money(plan.plannedCm2)}. ${plan.stoppedEarly ? "The curves refuse the rest of the budget — past this point a dollar returns less than a dollar." : ""} Every channel's curve is fitted through its own current performance.`,
    metric: `${signedMoney(plan.upliftCm2).text} CM2`,
    ref: { label: "Planner", href: "/insights?view=channels" },
    impact: plan.upliftCm2,
  };
}

function storeInsights(summary, marketing, cash) {
  const out = [];
  // Only channels actually running this period can be judged. A connected
  // channel with no spend is paused, not failing.
  const chans = marketing.channels.filter((c) => c.spend > 0 && c.cmRoas != null);
  const MIN_SPEND_TO_JUDGE = 500; // below this the CM-ROAS is a sample-size artefact
  const worst = chans
    .filter((c) => c.cmRoas < 1 && c.spend >= MIN_SPEND_TO_JUDGE)
    .sort((a, b) => b.spend - a.spend)[0];
  const best = [...chans].sort((a, b) => b.cmRoas - a.cmRoas)[0];
  if (worst && best) {
    out.push({
      severity: "warning", verdict: "Shift budget",
      title: `${worst.name} is spending below break-even`,
      body: `${money(worst.spend)} at ${multiple(worst.cmRoas)} CM-ROAS — under 1.0×, so every dollar comes back smaller. That is ${money(Math.round(worst.spend * (1 - worst.cmRoas)))} of margin destroyed against simply breaking even. Shift toward ${best.name} (${multiple(best.cmRoas)}).`,
      metric: `${multiple(worst.cmRoas)}`, ref: { label: "Channels", href: "/insights?view=channels" },
      impact: Math.max(0, worst.spend * (1 - worst.cmRoas)),
    });
  }
  if (marketing.audienceLeak) {
    const l = marketing.audienceLeak;
    out.push({
      severity: "warning", verdict: "Trim spend",
      title: `${l.dim} · ${l.label} is an over-funded ad segment`,
      body: `Takes ${pct(l.spendSharePct)} of ad spend at ${multiple(l.cmRoas)} CM-ROAS — below your ${multiple(l.blendedCmRoas)} blend, driving just ${pct(l.orderSharePct)} of orders. Moving those dollars to blended efficiency is worth about ${money(Math.round(l.spend * (l.blendedCmRoas - l.cmRoas)))} of margin.`,
      metric: `${multiple(l.cmRoas)}`, ref: { label: "Channels", href: "/insights?view=channels" },
      impact: Math.max(0, l.spend * (l.blendedCmRoas - l.cmRoas)),
    });
  }
  if (cash.totalDepositDue > 0) {
    out.push({
      severity: "info", verdict: "Plan cash",
      title: `${money(cash.totalDepositDue)} in supplier deposits due now`,
      body: `${cash.items.length} reorders need deposits now, with ${money(cash.totalBalanceDue)} more due on terms. Make sure the cash is on hand before committing.`,
      metric: `${money(cash.totalDepositDue)}`, ref: { label: "Cash calendar", href: "/insights" }, impact: 3000,
    });
  }
  // PACING — only possible now that channels carry a budget. Being over plan
  // is not itself a loss, so this is a warning about commitment, not margin:
  // impact is the overspend, which is real money already out the door.
  const pace = marketing.pacing;
  // MATERIALITY BAND. Severity keyed on `pacePct > 100` alone called 100.1%
  // of plan a critical — which is what the board showed after every other
  // problem had been fixed, so the page could never reach "all clear".
  // Being a rounding error over plan is not an emergency.
  const OVER_PLAN_CRITICAL = 110;
  if (pace?.budget && pace.pacePct > pace.elapsedPct + 10 && pace.pacePct > 102) {
    const over = Math.round(pace.spend - pace.budget * (pace.elapsedPct / 100));
    out.push({
      severity: pace.pacePct > OVER_PLAN_CRITICAL ? "critical" : "warning",
      // Not "Trim spend" — that maps to a net-neutral reallocation, which
      // cannot bring a total back inside a plan.
      verdict: "Pull spend back", scope: "store",
      title: pace.pacePct > 100
        ? `You are ${pct(pace.pacePct - 100)} over the monthly ad budget`
        : `Ad spend is pacing ahead of plan`,
      body: `${money(pace.spend)} spent against a ${money(pace.budget)} plan — ${pct(pace.pacePct)} of budget at ${pct(pace.elapsedPct)} of the month. ${money(over)} ahead of an even pace${pace.remaining < 0 ? `, and the plan is already ${money(Math.abs(pace.remaining))} exhausted` : ""}. Either raise the budget deliberately or pull the weakest channel back.`,
      metric: `${pct(pace.pacePct)} of plan`,
      ref: { label: "Channels", href: "/insights?view=channels" },
      // COMMITMENT, not margin. Overspend is money already out the door, not
      // margin you can still recover, so it ranks the card but is excluded
      // from the "margin at stake" total. Summing the two would inflate the
      // headline by the size of the budget.
      impactKind: "commitment",
      impact: Math.abs(over),
    });
  }

  if (summary.estimatedCount > 0) {
    out.push({
      severity: "info", verdict: "Complete data",
      title: `${summary.estimatedCount} SKUs still have estimated costs`,
      body: `Their margins are educated guesses until you add real COGS — complete them so every number you act on here is trustworthy.`,
      metric: `${summary.estimatedCount} SKUs`, ref: { label: "Products", href: "/products" }, impact: 800,
    });
  }
  return out;
}

// Verdicts the engine can still produce but this product does not surface.
// The generators are left intact so the logic isn't lost if the scope changes.
const OUT_OF_SCOPE_VERDICTS = new Set(["Reorder now", "Clear stock", "Plan cash"]);

export function insightsBoard() {
  const products = allProducts();
  const summary = productsSummary();
  const marketing = marketingData();
  const web = websiteAnalytics();
  const cash = cashCalendar();
  // Carry the catalogue average onto each row so a per-product funnel
  // insight can size its gap in margin instead of a hardcoded constant.
  const funnelById = Object.fromEntries(
    web.products.map((f) => [f.id, { ...f, catalogAvgViewToAtcPct: web.catalogAvg.viewToAtcPct }])
  );

  const rollup = portfolioRollup(products, "category");

  const byCategory = categoryInsights(rollup);

  // ROLLED-UP CARDS ABSORB THEIR MEMBERS. "Footwear loses money as a
  // category" and "Recovery Slides loses money on every order" are the same
  // decision written twice; the category card already names the SKU count and
  // the dollars. Suppressing the member cards of the SAME verdict is what
  // stops a rollup from doubling the board instead of shrinking it — the SKU
  // is still one click away on the category's own page.
  const absorbed = new Map(); // skuId → verdict already covered above it
  for (const c of byCategory) {
    for (const id of c.skuIds || []) absorbed.set(id, c.verdict);
  }

  const perProduct = products
    .map((p) => {
      const insight = productInsight(p, funnelById[p.id], deriveChannelPerformance(p));
      if (!insight) return null;
      if (absorbed.get(p.id) === insight.verdict) return null;
      return { ...insight, scope: "sku" };
    })
    .filter(Boolean);

  /*
    REPEATED VERDICTS ROLL UP.

    Four SKUs each carrying a $400–$1,100 "Cut ads" critical filled the board
    and pushed a $5,566 creative finding off it, because severity tier
    dominates impact absolutely — a $409 critical outranks a $5,000 warning.
    That is right for one SKU and wrong for four: they are one decision
    ("these four SKUs have underwater media"), and listing them separately
    spends four slots to say it.

    So: three or more SKU cards sharing a verdict become one card carrying
    their combined impact and every SKU id, which means the action still
    executes across all of them in a single confirmation.
  */
  const ROLLUP_AT = 3;
  const byVerdict = new Map();
  for (const x of perProduct) {
    if (!byVerdict.has(x.verdict)) byVerdict.set(x.verdict, []);
    byVerdict.get(x.verdict).push(x);
  }

  const rolledPerProduct = [];
  for (const [verdict, group] of byVerdict) {
    if (group.length < ROLLUP_AT) { rolledPerProduct.push(...group); continue; }
    const totalImpact = group.reduce((a, x) => a + (x.impact || 0), 0);
    const names = group.map((x) => x.ref.label);
    rolledPerProduct.push({
      severity: group[0].severity,
      verdict,
      scope: "sku-group",
      skuIds: group.map((x) => /^\/products\/([^/]+)$/.exec(x.ref.href)?.[1]).filter(Boolean),
      title: `${plural(group.length, "SKU")} need the same call: ${verdict.toLowerCase()}`,
      body: `${names.slice(0, 3).join(", ")}${names.length > 3 ? ` and ${names.length - 3} more` : ""} — ${money(totalImpact)}/mo between them. Same verdict, same fix, so it is one decision rather than ${group.length}. Acting here applies it across all of them.`,
      metric: `${money(totalImpact)} / mo`,
      ref: { label: "Products", href: "/products" },
      impact: totalImpact,
    });
  }

  // SCALE GUARD. Per-SKU cards grow 1:1 with the catalogue; portfolio cards
  // don't. Keeping only the heaviest means a 50,000-SKU tenant sees the same
  // readable board a 16-SKU one does — the dollars that fall off the bottom
  // are already counted inside their category's card.
  const SKU_INSIGHT_CAP = 8;
  const topPerProduct = [...rolledPerProduct]
    .sort((a, b) => (SEV_BASE[b.severity] + (b.impact || 0)) - (SEV_BASE[a.severity] + (a.impact || 0)))
    .slice(0, SKU_INSIGHT_CAP);

  const planner = plannerInsight(marketing);

  const all = [
    // Measurement findings rank first: they invalidate the basis the other
    // cards reason from, so acting on a CM-ROAS card before reading them is
    // acting on a number known to be wrong.
    ...incrementalityInsights(marketing),
    ...creativeInsights(),
    ...(planner ? [planner] : []),
    ...byCategory,
    ...channelTrendInsights(marketing),
    ...topPerProduct,
    ...storeInsights(summary, marketing, cash),
  ]
    // Retail-media scope: this product recommends actions on PAID MEDIA, not
    // on inventory or treasury. Reorder timing, stock clearance and supplier
    // deposits are merchant operations — filtered here at the source so both
    // the action board and the Daily Brief (which is built from it) stay in
    // scope, rather than each surface having to filter for itself.
    .filter((x) => !OUT_OF_SCOPE_VERDICTS.has(x.verdict))
    // Portfolio-scoped cards outrank SKU cards at equal severity: they carry
    // more dollars and one decision resolves many rows.
    .map((x, i) => ({
      id: `ins-${i}`,
      scope: "store",
      impactKind: "margin",
      ...x,
      score:
        SEV_BASE[x.severity] +
        Math.min(x.impact || 0, 50000) +
        (x.scope === "category" ? 25000 : 0) +
        // A measurement finding outranks a performance finding of the same
        // severity, because it changes whether the performance figure is real.
        (x.scope === "channel" && /incremental|never been tested/i.test(x.title) ? 40000 : 0),
    }))
    .sort((a, b) => b.score - a.score);

  const paidOrders = web.sources.filter((s) => s.paid).reduce((a, s) => a + s.orders, 0);

  return {
    health: {
      cm3: summary.cm3,
      cm3Pct: summary.cm3Pct,
      profitable: summary.cm3 >= 0,
      cmRoas: marketing.totals.cmRoas,
      paidPct: round1((paidOrders / web.orders) * 100),
      cashDue: cash.totalDepositDue,
      actionCount: all.filter((a) => a.severity === "critical" || a.severity === "warning").length,
      criticalCount: all.filter((a) => a.severity === "critical").length,
      // Period-over-period on the numbers the board is judged by.
      delta: summary.delta,
      prev: summary.prev,
      skuInsightsSuppressed: Math.max(0, perProduct.length - topPerProduct.length),
    },
    rollup,
    // Ten, not eight: with measurement, creative, planning, portfolio and SKU
    // findings all live, eight slots meant whole families never appeared.
    actions: all.slice(0, 10),
  };
}
