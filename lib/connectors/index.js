// CONNECTOR REGISTRY — the single place the app asks "what are we connected
// to and are they healthy?". Ships with the mock set registered by default.
//
// GOING LIVE (per connector, without touching a single component):
//   1. Set the connector's env vars (see each factory's NotConfiguredError).
//   2. Register the live instance here, e.g.
//        registerConnector(createShopifyConnector({ mode: "live" }))
//      replacing the mock — same id, same interface.
//   3. lib/api/index.js reads through connector.read() instead of importing
//      the seed directly. Everything above (components, health badges, the
//      actions engine's ads writes) already codes against the Connector shape,
//      so nothing else changes.

import { createShopifyConnector } from "@/lib/connectors/shopify";
import { createAdsConnector, ADS_PLATFORMS } from "@/lib/connectors/ads";
import { createPayoutsConnector } from "@/lib/connectors/payouts";
import { createPixelConnector } from "@/lib/connectors/pixel";
import { computeSyncHealth, mapConnectorToMetrics } from "@/lib/connectors/health";

const registry = new Map();

export function registerConnector(connector) {
  registry.set(connector.id, connector);
  return connector;
}

export function getConnector(id) {
  return registry.get(id) || null;
}

export function listConnectors() {
  return [...registry.values()];
}

// Default registration — the honest mock set that exists today.
function registerDefaults() {
  if (registry.size) return;
  registerConnector(createShopifyConnector({ mode: "mock" }));
  ADS_PLATFORMS.forEach((p) => registerConnector(createAdsConnector(p)));
  registerConnector(createPayoutsConnector({ mode: "mock" }));
  registerConnector(createPixelConnector({ mode: "mock" }));
}
registerDefaults();

// Aggregate health across every registered connector.
export function getSyncHealth() {
  return computeSyncHealth(listConnectors());
}

export { mapConnectorToMetrics, ADS_PLATFORMS };
