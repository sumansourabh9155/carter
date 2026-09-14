// PIXEL CONNECTOR — the Tally Web Pixel (Shopify Web Pixels API): on-site
// sessions and the view → cart → checkout → purchase funnel. Mock wraps the
// web funnel seed; live would run inside the storefront sandbox and stream
// events to a collector.

import { readPixel, demoLastSync } from "@/lib/connectors/mockSource";
import { NotConfiguredError } from "@/lib/connectors/types";

const LIVE_ENV = ["TALLY_PIXEL_COLLECTOR_URL"];

export function createPixelConnector({ mode = "mock" } = {}) {
  const requireLive = () => {
    throw new NotConfiguredError("pixel", LIVE_ENV, "Shopify Web Pixels API event collector");
  };

  return {
    id: "pixel",
    label: "Tally Web Pixel",
    kind: "pixel",
    mode,
    scopes: ["read_customer_events"],

    async connect() {
      if (mode === "live") requireLive();
      return { ok: true, mode: "mock", connectedAt: demoLastSync(), scopes: ["read_customer_events"], message: "Web Pixel events from seed data" };
    },

    async sync(_opts = {}) {
      if (mode === "live") requireLive();
      const { data, meta } = readPixel();
      return {
        ok: true,
        records: data.trafficSources.length,
        startedAt: new Date(Date.now() - 400).toISOString(),
        finishedAt: new Date().toISOString(),
        cursor: null,
        errors: [],
        fieldFreshness: meta.fieldFreshness,
      };
    },

    healthcheck() {
      return {
        status: "healthy",
        lastSyncAt: demoLastSync(),
        staleFields: [],
        message: "On-site funnel from seed data (live pixel not installed on a storefront)",
      };
    },

    read() {
      if (mode === "live") requireLive();
      return readPixel();
    },
  };
}
