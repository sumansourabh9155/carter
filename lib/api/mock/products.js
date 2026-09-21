import { SKUS } from "@/lib/data/skus";
import { deriveSku, aggregate } from "@/lib/compute/margin";
import { deriveChannelPerformance } from "@/lib/compute/channelMix";
import { buildCashCalendar } from "@/lib/compute/cashCalendar";
import { productAudience } from "@/lib/compute/audience";
import { productFunnel } from "@/lib/compute/funnel";
import { applyOverridesToRawSku } from "@/lib/actions/overrides";

/*
  PERIOD SELECTION — what the date control in the top bar actually changes.

  "prior" swaps each SKU's raw inputs for its `prev` block and runs the SAME
  margin engine over them. It is not a scaled copy of the current period: the
  prior window has its own units, revenue, fees, returns and ad spend in the
  seed, so switching genuinely re-reads rather than re-labelling.

  The overlay is applied to the current period only. An action you take today
  cannot retroactively change what last month spent, and showing it as if it
  could would break the one guarantee the audit log makes.
*/
function rawForPeriod(raw, period) {
  if (period !== "prior" || !raw.prev) return applyOverridesToRawSku(raw);
  return { ...raw, ...raw.prev, prev: null };
}

// Every raw SKU passes through the actions overlay BEFORE the margin engine,
// so an executed action (e.g. "pause ads" zeroing a SKU's ad spend) really
// re-flows into CM2 / CM-ROAS / insights on the next render — not a fake toast.
export function allProducts(period = "current") {
  return SKUS.map((raw) => deriveSku(rawForPeriod(raw, period)));
}

export function productsSummary(period = "current") {
  return aggregate(allProducts(period));
}

// Channel breakdown is a detail-page concern only — the list page doesn't
// need per-channel math for every row.
export function oneProduct(id) {
  const raw = SKUS.find((s) => s.id === id || s.sku === id);
  if (!raw) return null;
  const derived = deriveSku(applyOverridesToRawSku(raw));
  return {
    ...derived,
    channelPerformance: deriveChannelPerformance(derived),
    audience: productAudience(derived.id),
    funnel: productFunnel(derived.id),
  };
}

// The reveal target: highest-revenue SKU that is unprofitable after ad spend.
export function losingHero() {
  return allProducts()
    .filter((p) => p.losingMoney)
    .sort((a, b) => b.revenue - a.revenue)[0] || null;
}

// Portfolio-wide cash calendar — what reordering everything that needs it
// will actually cost, and when.
export function cashCalendar() {
  return buildCashCalendar(allProducts());
}

// Where returns are eating margin — a pure-Shopify signal no ad platform can
// see. Returns already subtract from CM1, so the dollar figure here is
// exactly what CM1 would gain if returns went to zero.
export function returnsRanking() {
  return allProducts()
    .filter((p) => p.returns > 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      image: p.image,
      returns: p.returns,
      returnsPct: Math.round((p.returns / p.revenue) * 1000) / 10,
    }))
    .sort((a, b) => b.returns - a.returns);
}
