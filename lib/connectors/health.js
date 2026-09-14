// SYNC HEALTH — the "never a silent green dot" contract. Aggregates every
// registered connector's healthcheck() into a per-connector + overall status,
// and maps each connector to the metric families it feeds, so the UI can badge
// exactly the cards a degraded/failed source affects (not just a global banner).

import { SYNC_STATUS } from "@/lib/connectors/types";

// Which metric families each connector kind feeds. A degraded connector badges
// every card whose metric family appears here.
export const METRICS_BY_KIND = {
  shopify: ["revenue", "cm1", "cm2", "cm3", "units", "returns", "onHand"],
  ads: ["cmRoas", "cm2", "adSpend", "channelPerformance"],
  payouts: ["cash", "cashDue", "runway", "payouts"],
  pixel: ["funnel", "conversion", "sessions"],
};

// Worst-of ordering — the overall badge reflects the sickest connector.
const RANK = { healthy: 0, degraded: 1, never_synced: 2, failed: 3 };

function worst(a, b) {
  return RANK[b] > RANK[a] ? b : a;
}

export function mapConnectorToMetrics(kind) {
  return METRICS_BY_KIND[kind] || [];
}

// Given the connector registry (listConnectors()), produce the aggregate.
export function computeSyncHealth(connectors) {
  const perConnector = connectors.map((c) => {
    let health;
    try {
      health = c.healthcheck();
    } catch (err) {
      health = { status: "failed", lastSyncAt: null, staleFields: [], message: `Healthcheck threw: ${err.message}` };
    }
    return {
      id: c.id,
      label: c.label,
      kind: c.kind,
      mode: c.mode,
      metrics: mapConnectorToMetrics(c.kind),
      ...health,
    };
  });

  const overall = perConnector.reduce((acc, h) => worst(acc, h.status), SYNC_STATUS.HEALTHY);

  // Every metric family touched by a non-healthy connector — the UI badges these.
  const affectedMetrics = new Set();
  for (const h of perConnector) {
    if (h.status !== SYNC_STATUS.HEALTHY) h.metrics.forEach((m) => affectedMetrics.add(m));
  }

  const degraded = perConnector.filter((h) => h.status !== SYNC_STATUS.HEALTHY);
  const summary =
    overall === SYNC_STATUS.HEALTHY
      ? "All sources synced (demo data)"
      : `${degraded.length} source${degraded.length === 1 ? "" : "s"} need attention: ${degraded.map((d) => d.label).join(", ")}`;

  return { overall, summary, connectors: perConnector, affectedMetrics: [...affectedMetrics] };
}
