// SHOPIFY CONNECTOR — orders, products, fulfilment/returns. Mock mode reads
// the seed through mockSource; live mode throws NotConfiguredError naming the
// env vars it will need, so it can never pretend to have real data.

import { readShopify, demoLastSync } from "@/lib/connectors/mockSource";
import { NotConfiguredError, SEED_FRESHNESS } from "@/lib/connectors/types";

const LIVE_ENV = ["SHOPIFY_SHOP", "SHOPIFY_ACCESS_TOKEN"];
const SCOPES = ["read_orders", "read_products", "read_inventory", "read_fulfillments"];

export function createShopifyConnector({ mode = "mock" } = {}) {
  const requireLive = () => {
    throw new NotConfiguredError("shopify", LIVE_ENV, "Shopify Admin GraphQL API");
  };

  return {
    id: "shopify",
    label: "Shopify",
    kind: "shopify",
    mode,
    scopes: SCOPES,

    async connect() {
      if (mode === "live") requireLive();
      return { ok: true, mode: "mock", connectedAt: demoLastSync(), scopes: SCOPES, message: "Connected to demo store (seed data)" };
    },

    async sync(_opts = {}) {
      if (mode === "live") requireLive();
      const { data, meta } = readShopify();
      const startedAt = new Date(Date.now() - 900).toISOString();
      return {
        ok: true,
        records: data.products.length,
        startedAt,
        finishedAt: new Date().toISOString(),
        cursor: null, // seed pull is never truncated
        errors: [],
        fieldFreshness: meta.fieldFreshness,
      };
    },

    healthcheck() {
      return {
        status: "healthy",
        lastSyncAt: demoLastSync(),
        staleFields: [],
        message: "Demo store — orders/products/returns from seed data (live sync not connected)",
      };
    },

    read() {
      if (mode === "live") requireLive();
      return readShopify();
    },
  };
}

export { SEED_FRESHNESS };
