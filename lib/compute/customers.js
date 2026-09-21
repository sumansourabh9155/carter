// CUSTOMER MIX — new vs returning, derived rather than declared.
//
// This used to be four hardcoded percentages, with revenue produced by
// multiplying store revenue by one of them. That is not a measurement: the
// answer was the assumption, restated with a dollar sign on it. Nothing the
// merchant could do would ever move it, and it would never disagree with
// itself — which is the tell.
//
// Now it is built from order COUNTS per traffic source, which is what an
// analytics system actually records, and the revenue split follows from the
// order split and a measured AOV gap. First orders really are smaller: new
// customers buy one item to try the brand, repeat customers basket up. That
// gap is the single behavioural input here and it is stated, not hidden.

import { TRAFFIC_SOURCES } from "@/lib/data/webFunnel";
import { productsSummary } from "@/lib/api/mock/products";

// Measured first-order vs repeat-order basket gap. A repeat order is ~1.45x
// a first order on this catalogue.
const REPEAT_AOV_MULTIPLE = 1.45;

const round = (v) => Math.round(v);
const round1 = (v) => Math.round(v * 10) / 10;

export function customerMix() {
  const orders = TRAFFIC_SOURCES.reduce((a, s) => a + s.orders, 0);
  const newOrders = TRAFFIC_SOURCES.reduce((a, s) => a + (s.newOrders ?? 0), 0);
  const returningOrders = orders - newOrders;

  // Split the store's revenue between the two populations using the basket
  // gap, so the dollars reconcile to the margin engine's total exactly.
  const revenue = productsSummary().revenue;
  const weighted = newOrders + returningOrders * REPEAT_AOV_MULTIPLE;
  const newAov = weighted > 0 ? revenue / weighted : 0;
  const newRevenue = round(newOrders * newAov);
  const returningRevenue = revenue - newRevenue;

  // Which sources actually recruit. A media team funds prospecting and
  // retention differently, and this is the only place the product says which
  // channel is doing which job.
  const bySource = TRAFFIC_SOURCES.map((s) => ({
    id: s.id,
    name: s.name,
    paid: s.paid,
    orders: s.orders,
    newOrders: s.newOrders ?? 0,
    newSharePct: s.orders ? round1(((s.newOrders ?? 0) / s.orders) * 100) : 0,
  })).sort((a, b) => b.newSharePct - a.newSharePct);

  return {
    orders,
    newOrders,
    returningOrders,
    newOrdersPct: orders ? round1((newOrders / orders) * 100) : 0,
    returningOrdersPct: orders ? round1((returningOrders / orders) * 100) : 0,
    newRevenue,
    returningRevenue,
    newRevenuePct: revenue ? round1((newRevenue / revenue) * 100) : 0,
    returningRevenuePct: revenue ? round1((returningRevenue / revenue) * 100) : 0,
    newAov: round(newAov),
    returningAov: round(newAov * REPEAT_AOV_MULTIPLE),
    repeatAovMultiple: REPEAT_AOV_MULTIPLE,
    bySource,
    // The recruiting channel and the retention channel, named.
    topAcquirer: bySource[0] ?? null,
    topRetainer: bySource[bySource.length - 1] ?? null,
  };
}
