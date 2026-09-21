// THE ONE HONEST SOURCE (today) — reads the demo seed modules and exposes
// them through the connector read interface, every field stamped SEED_FRESHNESS
// so nothing downstream ever mistakes demo data for a real sync. Each mock
// connector (shopify/ads/pixel) reads through here.

import { SKUS, STORE } from "@/lib/data/skus";
import { AD_CHANNELS, MARKETING_WEEKLY } from "@/lib/data/adChannels";
import { PRODUCT_FUNNEL, TRAFFIC_SOURCES, WEEKLY_SESSIONS } from "@/lib/data/webFunnel";
import { SEED_FRESHNESS } from "@/lib/connectors/types";

// A recent, plausible "last synced" moment so demo health reads as connected
// (the message always says the data is seed, so this is honest, not faked
// liveness). Computed per call; fine in app runtime.
export function demoLastSync() {
  return new Date(Date.now() - 8 * 60 * 1000).toISOString(); // ~8 min ago
}

// Stamp every top-level field of a payload as SEED-sourced.
function seedFreshness(fields) {
  const out = {};
  for (const f of fields) out[f] = SEED_FRESHNESS;
  return out;
}

function envelope(data, fields) {
  return { data, meta: { source: "seed", lastSyncAt: demoLastSync(), fieldFreshness: seedFreshness(fields) } };
}

export function readShopify() {
  return envelope(
    {
      store: STORE,
      products: SKUS.map((s) => ({
        id: s.id, sku: s.sku, name: s.name, category: s.category,
        units: s.units, revenue: s.revenue, onHand: s.onHand,
        fees: s.fees, returns: s.returns,
      })),
    },
    ["revenue", "units", "onHand", "fees", "returns"]
  );
}

export function readAds(platform) {
  const rows = platform ? AD_CHANNELS.filter((c) => c.id === platform || c.platform === platform) : AD_CHANNELS;
  return envelope(
    { channels: rows, weekly: MARKETING_WEEKLY },
    ["spend", "attributedRevenue", "attributedCm", "orders"]
  );
}

export function readPixel() {
  return envelope(
    { productFunnel: PRODUCT_FUNNEL, trafficSources: TRAFFIC_SOURCES, weeklySessions: WEEKLY_SESSIONS },
    ["views", "atc", "checkout", "sessions", "orders"]
  );
}
