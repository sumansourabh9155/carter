// PAYOUTS CONNECTOR — the bank/settlement feed that turns "revenue" into
// "cash that actually landed". Mock returns a series DERIVED from seed revenue
// (clearly labeled derived, never presented as a real bank pull); live throws
// until a bank aggregator or Shopify Payments is configured.

import { readPayouts, demoLastSync } from "@/lib/connectors/mockSource";
import { NotConfiguredError } from "@/lib/connectors/types";

const LIVE_ENV = ["PLAID_CLIENT_ID", "PLAID_SECRET"];

export function createPayoutsConnector({ mode = "mock" } = {}) {
  const requireLive = () => {
    throw new NotConfiguredError("payouts", LIVE_ENV, "Plaid or Shopify Payments payouts");
  };

  return {
    id: "payouts",
    label: "Bank payouts",
    kind: "payouts",
    mode,
    scopes: ["transactions:read", "balances:read"],

    async connect() {
      if (mode === "live") requireLive();
      return { ok: true, mode: "mock", connectedAt: demoLastSync(), scopes: ["transactions:read"], message: "Payouts derived from revenue (no bank connected)" };
    },

    async sync(_opts = {}) {
      if (mode === "live") requireLive();
      const { data, meta } = readPayouts();
      return {
        ok: true,
        records: data.series.length,
        startedAt: new Date(Date.now() - 500).toISOString(),
        finishedAt: new Date().toISOString(),
        cursor: null,
        errors: [],
        fieldFreshness: meta.fieldFreshness,
      };
    },

    healthcheck() {
      // Honest: cash figures are DERIVED, not from a real payout feed → degraded,
      // not a fake green. This is exactly the "never a silent green dot" contract.
      return {
        status: "degraded",
        lastSyncAt: demoLastSync(),
        staleFields: ["payoutAmount"],
        message: "No bank connected — cash figures are derived from revenue. Connect Plaid or Shopify Payments for real payouts.",
      };
    },

    read() {
      if (mode === "live") requireLive();
      return readPayouts();
    },
  };
}
