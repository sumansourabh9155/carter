// ADS CONNECTORS — meta | google | tiktok. Read spend/attribution rows;
// WRITE stubs (pauseAdSet, setBudget) are what the actions engine will call
// in production to actually pause a losing SKU's ads or reallocate budget.
// Mock writes return a receipt describing the exact API call they'd make;
// live mode throws until its token env var exists.

import { readAds, demoLastSync } from "@/lib/connectors/mockSource";
import { NotConfiguredError } from "@/lib/connectors/types";

const PLATFORMS = {
  meta: { label: "Meta Ads", env: "META_ACCESS_TOKEN", api: "Marketing API (adset budget/status)" },
  google: { label: "Google Ads", env: "GOOGLE_ADS_DEVELOPER_TOKEN", api: "Google Ads API (campaign budgets)" },
  tiktok: { label: "TikTok Ads", env: "TIKTOK_ACCESS_TOKEN", api: "TikTok Business API (adgroup budget/status)" },
};

// Replayed writes with the same idempotencyKey must return the original
// receipt, never act twice. Mock keeps this in a session-scoped map.
const seenKeys = new Map();

export function createAdsConnector(platform) {
  const spec = PLATFORMS[platform];
  if (!spec) throw new Error(`Unknown ads platform "${platform}" — expected meta|google|tiktok`);

  const requireLive = (mode) => {
    if (mode === "live") throw new NotConfiguredError(`ads:${platform}`, [spec.env], spec.api);
  };
  const mode = "mock"; // real construction would pass mode based on env presence

  function idempotent(key, build) {
    if (key && seenKeys.has(key)) return { ...seenKeys.get(key), replayed: true };
    const receipt = build();
    if (key) seenKeys.set(key, receipt);
    return receipt;
  }

  return {
    id: `ads:${platform}`,
    label: spec.label,
    kind: "ads",
    mode,
    scopes: ["ads_read", "ads_management"],
    platform,

    async connect() {
      requireLive(mode);
      return { ok: true, mode: "mock", connectedAt: demoLastSync(), scopes: ["ads_read", "ads_management"], message: `${spec.label} connected (demo data)` };
    },

    async sync(_opts = {}) {
      requireLive(mode);
      const { data, meta } = readAds(platform);
      return {
        ok: true,
        records: data.channels.length,
        startedAt: new Date(Date.now() - 700).toISOString(),
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
        message: `${spec.label} — spend/attribution from seed data; ads restate for ~24h`,
      };
    },

    read() {
      requireLive(mode);
      return readAds(platform);
    },

    // --- WRITE surface the actions engine calls -------------------------
    pauseAdSet({ skuId, idempotencyKey } = {}) {
      requireLive(mode);
      return {
        ok: true,
        ...idempotent(idempotencyKey, () => ({
          receipt: {
            action: "pause_adset",
            platform,
            skuId,
            lines: [`Would call ${spec.label} ${spec.api} to pause ad sets for SKU ${skuId}`, "Mock — no live campaign changed"],
          },
        })),
      };
    },

    setBudget({ channelId, dailyBudget, idempotencyKey } = {}) {
      requireLive(mode);
      return {
        ok: true,
        ...idempotent(idempotencyKey, () => ({
          receipt: {
            action: "set_budget",
            platform,
            channelId,
            dailyBudget,
            lines: [`Would call ${spec.label} ${spec.api} to set daily budget $${dailyBudget} on ${channelId}`, "Mock — no live budget changed"],
          },
        })),
      };
    },
  };
}

export const ADS_PLATFORMS = Object.keys(PLATFORMS);
