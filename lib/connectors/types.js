// CONNECTOR CONTRACTS — the typed seam where real Shopify/ads/bank/pixel sync
// drops in later. Everything downstream (data facade, health badges, actions
// engine) codes against these shapes, so a live implementation replaces a
// mock connector without reshaping anything above it.
//
// Concerns the live implementations must honor (documented here so the mock
// contracts already carry the option fields):
//   OAuth / token refresh   connect() owns the token exchange and refresh;
//                           sync() surfaces an expired grant as SyncError
//                           code AUTH_EXPIRED (retryable: false) — never a
//                           silent empty result.
//   Pagination              sync() returns `cursor` when a pull was
//                           truncated; the caller passes it back via
//                           sync({ cursor }) to resume. null cursor = done.
//   Rate limits             surface as SyncError code RATE_LIMITED with
//                           retryable: true; the CALLER schedules the retry —
//                           connectors never sleep/loop internally.
//   Backfill                sync({ backfill: true }) pulls full history
//                           instead of the incremental window; expected to be
//                           slow and cursor-paged.
//   Idempotency             every write (see ads.js) takes an idempotencyKey;
//                           a replay with the same key returns the original
//                           receipt instead of acting twice.

/** @typedef {"shopify"|"ads"|"payouts"|"pixel"} ConnectorKind */

/**
 * @typedef {Object} SyncOptions
 * @property {string}  [since]    ISO timestamp — incremental pull of records changed after this moment
 * @property {string}  [cursor]   opaque resume token from a prior SyncResult (pagination)
 * @property {boolean} [backfill] pull full history instead of the incremental window
 * @property {number}  [limit]    soft page-size hint; the connector may clamp it
 */

/**
 * @typedef {Object} SyncError
 * @property {string}  code      one of SYNC_ERROR_CODES
 * @property {string}  message   plain-language, operator-readable
 * @property {boolean} retryable true → caller may retry with backoff; false → needs human action
 */

/**
 * @typedef {Object} SyncResult
 * @property {boolean}     ok
 * @property {number}      records    rows pulled in this run
 * @property {string}      startedAt  ISO timestamp
 * @property {string}      finishedAt ISO timestamp
 * @property {?string}     cursor     resume token when truncated; null when the pull completed
 * @property {SyncError[]} errors     partial failures — ok can be true with warnings here
 * @property {Object<string,string>} fieldFreshness per-field freshness: ISO timestamp of the
 *   last verified pull, or the sentinel SEED_FRESHNESS ("seed") when the value comes from
 *   demo seed data rather than a real sync
 */

/**
 * @typedef {Object} SyncHealth
 * @property {"healthy"|"degraded"|"failed"|"never_synced"} status
 * @property {?string}  lastSyncAt  ISO timestamp; null when never synced
 * @property {string[]} staleFields fields older than the kind's freshness window
 * @property {string}   message     plain-language state — always says when data is mock/seed
 */

/**
 * @typedef {Object} ConnectionResult
 * @property {boolean}       ok
 * @property {"mock"|"live"} mode
 * @property {?string}       connectedAt
 * @property {string[]}      scopes
 * @property {string}        message
 */

/**
 * @typedef {Object} ReadEnvelope
 * @property {any} data domain payload (shape per connector — see each factory)
 * @property {{ source: "seed"|"live", lastSyncAt: ?string, fieldFreshness: Object<string,string> }} meta
 */

/**
 * @typedef {Object} Connector
 * @property {string}        id
 * @property {string}        label
 * @property {ConnectorKind} kind
 * @property {"mock"|"live"} mode
 * @property {string[]}      scopes OAuth scopes the live connection will request
 * @property {() => Promise<ConnectionResult>} connect
 * @property {(opts?: SyncOptions) => Promise<SyncResult>} sync
 * @property {() => SyncHealth} healthcheck SYNC on purpose: it reads recorded sync
 *   state, never the network, so the UI can badge cards without a spinner
 * @property {() => ReadEnvelope} read current snapshot of the connector's domain data
 */

export const CONNECTOR_KINDS = ["shopify", "ads", "payouts", "pixel"];

export const SYNC_STATUS = {
  HEALTHY: "healthy",
  DEGRADED: "degraded",
  FAILED: "failed",
  NEVER_SYNCED: "never_synced",
};

// Sentinel freshness value: the field came from demo seed data, not a sync.
export const SEED_FRESHNESS = "seed";

export const SYNC_ERROR_CODES = {
  NOT_CONFIGURED: "NOT_CONFIGURED", // live mode without its env vars
  AUTH_EXPIRED: "AUTH_EXPIRED", // OAuth grant/token needs re-auth
  RATE_LIMITED: "RATE_LIMITED", // provider throttled the pull; retryable
  CURSOR_EXPIRED: "CURSOR_EXPIRED", // resume token no longer valid; restart the pull
  PARTIAL_FAILURE: "PARTIAL_FAILURE", // some pages/fields failed; result is incomplete
};

// Thrown by every live-mode operation until its env vars exist. A named error
// (not a generic throw) so callers can catch it and fall back to mock
// EXPLICITLY — a live connector never pretends to have data.
export class NotConfiguredError extends Error {
  constructor(connectorId, envVars, hint = "") {
    super(
      `${connectorId}: live mode is not configured. Set ${envVars.join(", ")}${hint ? ` — ${hint}` : ""}.`
    );
    this.name = "NotConfiguredError";
    this.code = SYNC_ERROR_CODES.NOT_CONFIGURED;
    this.connectorId = connectorId;
    this.envVars = envVars;
    this.retryable = false;
  }
}
