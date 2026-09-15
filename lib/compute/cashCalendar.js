// CASH CALENDAR — portfolio-wide view of what you'll actually owe suppliers,
// derived from current reorder needs. NOT a bank-balance forecast (Carter
// doesn't have real cash/bank data yet — that's Phase 2+); this is strictly
// "here's what reordering what you actually need will cost, and when."

// Feed it margin-derived SKUs (already carry reorderCostTotal etc. from
// lib/compute/margin.js).
export function buildCashCalendar(skus) {
  const items = skus
    .filter((s) => (s.needsReorderNow || s.stockoutRisk) && s.reorderCostTotal > 0)
    .map((s) => ({
      id: s.id,
      name: s.name,
      image: s.image,
      urgent: s.stockoutRisk,
      reorderCostTotal: s.reorderCostTotal,
      depositDue: s.reorderDepositDue,
      balanceDue: s.reorderBalanceDue,
      paymentTerms: s.paymentTermsUsed,
      cashEstimated: s.cashEstimated,
    }))
    .sort((a, b) => b.reorderCostTotal - a.reorderCostTotal);

  const totalDepositDue = items.reduce((a, i) => a + i.depositDue, 0);
  const totalBalanceDue = items.reduce((a, i) => a + i.balanceDue, 0);

  // Group the "due later" balances by payment terms so it reads like an
  // actual calendar (Net 30 bucket, Net 60 bucket) instead of one flat sum.
  const byTerms = Object.values(
    items.reduce((acc, i) => {
      acc[i.paymentTerms] ??= { terms: i.paymentTerms, total: 0, count: 0 };
      acc[i.paymentTerms].total += i.balanceDue;
      acc[i.paymentTerms].count += 1;
      return acc;
    }, {})
  ).sort((a, b) => a.terms.localeCompare(b.terms));

  return {
    items,
    totalDepositDue,
    totalBalanceDue,
    totalCommitted: totalDepositDue + totalBalanceDue,
    byTerms,
  };
}
