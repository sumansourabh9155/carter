# Tally V2 — Build Plan: The Autonomous Financial OS for Shopify Brands

**Status:** Proposed. This is the plan to take Tally from a Phase‑1 demo (mock facade, canned/assisted Aura, read‑only) to a **market‑ready, AI‑first, fully‑automated product** where **Aura is the product**, not a side panel.

**North star:** A Shopify brand connects Tally once, and from then on Aura runs the finance function for them — watching every dollar across margin, ads, website, supply and cash; explaining what's happening in plain English; and *doing* the work (with the founder's approval, then increasingly on autopilot).

> The bet: founders don't want another dashboard. They want the answer, and then they want it done. The winning product is the one that removes the analyst, not the one with the prettiest charts.

---

## 1. From MVP to market‑ready — the honest gap

| Layer | Today (Phase‑1 demo) | V2 (market‑ready) |
|---|---|---|
| **Data** | `lib/api/mock/*` reads seed files | Live Shopify GraphQL, ad APIs, bank, 3PL, accounting, Tally Web Pixel — ingested, normalized, reconciled |
| **Truth** | Pure margin engine on seed inputs | Real **ledger + semantic metric layer** tied to actual bank payouts; metrics defined once, computed everywhere |
| **Aura** | Single‑turn `/api/aura`, context‑injected, read‑only, manually opened; canned + embeddings fallback | **Agentic**: multi‑step tool use, proactive/scheduled, memory, and **actions with approval → autopilot** |
| **Surface** | Pages you navigate; Aura is a dock | Aura is the **home**: converse, ambient briefings, autopilot. Pages become drill‑downs Aura links to |
| **State** | In‑memory, resets on reload | Durable multi‑tenant Postgres + warehouse; audit log; per‑brand memory |
| **Trust** | "Trust over coverage," citations on canned answers | Every number cited + fresh + confidence‑scored; every action reversible + logged; eval harness gating releases |

**Rule we carry over (non‑negotiable):** *the engine is real.* No screen, mock, or AI response ever shows a number the metric layer didn't compute. Aura picks **refs**, never values.

---

## 2. Product principles

1. **Answer, then act.** Every insight ends in a proposed action Aura can execute.
2. **Never guess.** Missing data → say so, quantify the uncertainty, link the fix. Estimated inputs are flagged everywhere downstream.
3. **Cited, fresh, confident.** Each claim carries source rows, "as of" freshness, and a confidence level.
4. **Reversible by default.** Every money‑moving action has a receipt and a one‑click undo; nothing is silent.
5. **Graduated autonomy.** The founder chooses how much Aura does on its own, per action type. Trust is earned, not assumed.
6. **Plain English.** No CM1/CM2 jargon required to use it — Aura translates. The metrics are there when you want them.

---

## 3. Aura — the autonomous agent (the centerpiece)

Aura is not a feature; it's the operating layer. Everything below serves it.

### 3.1 Three modes of Aura (one brain)

1. **Converse** — the current chat, upgraded to a real agent: ask anything, Aura plans, calls tools, reasons across domains, returns a cited answer + chart + next actions.
2. **Ambient** — Aura is always running server‑side. It produces the **Daily Brief** ("here are the 3 things that moved money and what I'd do"), watches thresholds, and surfaces proactive cards *before* you ask.
3. **Autopilot** — for action types the founder has trusted, Aura executes on its own within guardrails, then reports what it did with an undo. This is the endgame and the moat.

### 3.2 The agent loop

```
Perceive → Retrieve → Plan → Act (tools) → Verify → Explain → (Execute / Recommend) → Learn
   │           │         │        │            │          │              │               │
 events,    semantic   Claude  read tools   re‑query   cited card    action w/ undo   memory,
 syncs,     layer +    plans   (metrics,    to confirm  + confidence  or approval      eval
 schedules  memory     steps   RAG, web)    the claim                  request         signal
```

- **Perceive:** triggered by a user message, a sync completion, a scheduled cron, or a threshold breach.
- **Plan:** Claude decomposes the goal into tool calls (not a single canned answer). Multi‑step by default.
- **Act:** Aura calls **tools** (§3.3). Tools return real computed values + row‑level citations.
- **Verify:** before asserting a number, Aura re‑reads it from the metric layer; a critic pass checks the claim is supported (§3.9).
- **Explain/Execute:** returns a structured, cited card; if an action is warranted, either proposes it (with a one‑click execute) or — on autopilot — executes and reports.
- **Learn:** outcomes, overrides, and feedback update per‑brand memory and the eval set.

### 3.3 Tools = the semantic metric layer (Aura's hands)

Aura's power is bounded by its tools. Every tool is a typed function over the **real** metric layer; Aura never computes math itself. Tool families:

- **Read/metric tools:** `getMetric(name, {scope, range, filters})`, `rankProducts(by, …)`, `channelPerformance(…)`, `funnel(scope)`, `cashCalendar()`, `runwayForSku(id)`, `cohort(…)`, `attribution(…)`. Each returns value **+ citation rows + freshness + confidence**.
- **Chart tools:** the existing `resolveChartRef` pattern, expanded — Aura returns a ref, the server resolves data. Never inline values.
- **Retrieval tools:** `searchLedger(query)`, `searchBrandDocs(query)` (policies, supplier terms, past decisions), `searchHistory(query)` (prior Aura threads & actions).
- **Simulation tools:** `simulate(action)` → projected P&L/cash impact **before** acting (e.g., "pause this ad set → +$X CM2, −Y orders"). This is what makes recommendations trustworthy.
- **Action tools (write):** `pauseAdSet`, `shiftBudget`, `draftPO`/`submitReorder`, `proposePriceChange`, `createAlert`, `notify`, `openTicket`. Gated by policy (§3.5) and always reversible (§3.7).
- **External tools (MCP):** ad platforms, Shopify Admin, Slack/email, accounting — exposed to Aura as MCP servers so the tool surface is uniform and auditable.

> Design constraint: tools are the **only** way Aura touches data or the world. This makes Aura testable, permissionable, and safe — and means new capabilities ship as new tools, not new prompts.

### 3.4 Retrieval & memory (brand context)

- **Structured context** (today's `buildAuraContext`) → grows into a **compact, always‑fresh brand snapshot** injected each turn (totals, top movers, open alerts, estimated‑data gaps).
- **Vector retrieval** over: the brand's ledger annotations, supplier contracts/terms, prior decisions, past Aura threads, and a knowledge base of DTC finance playbooks.
- **Per‑brand memory:** goals ("target 30% net margin"), preferences ("never touch TikTok budget"), risk tolerance, glossary of their product nicknames, and a running "what Aura has learned about this store."
- **Personalization loop:** every override ("no, don't pause that") is stored and shapes future recommendations.

### 3.5 Autonomy tiers + guardrails (how trust is earned)

Per **action type**, the founder sets a tier (defaults conservative):

| Tier | Behaviour | Default for |
|---|---|---|
| **Watch** | Aura only informs | New/high‑stakes actions |
| **Suggest** | Aura proposes; one‑click to execute | Most actions |
| **Auto (guarded)** | Aura executes within limits, then reports + undo | Reorders under $X, budget shifts under Y%, alerting |
| **Auto (broad)** | Aura executes freely within policy | Earned over time per brand |

Guardrails on every write: spend/quantity caps, rate limits, "no action that moves > $X without approval," business‑hours windows, blast‑radius limits, and a global **kill switch**. All actions are simulated first (§3.3) and logged (§3.7).

### 3.6 Proactive & scheduled intelligence

- **Daily Brief** (cron): "3 things that moved money, ranked by impact, each with a proposed action." Delivered in‑app + email/Slack.
- **Watchers:** CM2‑turns‑negative, CM‑ROAS drop, stockout risk, cash‑due spike, return‑rate spike, conversion drop on a hero SKU. Each watcher is an Aura tool subscription that fires an agent run.
- **Scheduled analyses:** weekly margin review, monthly close summary, pre‑reorder cash check — authored as saved Aura routines.
- **Event‑driven:** sync completes → Aura diffs vs last period → surfaces only what changed and matters.

### 3.7 The actions engine (execute → verify → undo)

- **Action model:** `{type, params, simulatedImpact, policyCheck, approvals, status, receipt, undoToken}`.
- **Execution adapters** per external system (Meta/Google/TikTok budget & status, Shopify price/PO, 3PL reorder, accounting entry).
- **Idempotency + receipts:** every action is idempotent, produces a human‑readable receipt, and stores an **undo** that reverses it (or a compensating action where true undo is impossible).
- **Audit log:** immutable, per‑brand, exportable — who/what/when/why (the Aura reasoning trace is attached). This is both a trust feature and a compliance requirement.

### 3.8 Model strategy (Claude)

- **Routing:** **Haiku 4.5** for high‑volume watchers/classification/extraction; **Sonnet 5** for the default agent loop and most reasoning; **Opus 4.8** for hard multi‑step analyses, the Daily Brief synthesis, and adversarial verification. Escalate on low confidence.
- **Prompt caching** on the stable system prompt + tool schemas + brand snapshot → big cost/latency win at scale.
- **Tool use / structured outputs** for every tool call and for the cited‑card schema (no free‑text parsing).
- **MCP** for external systems so the tool surface is uniform and swappable.
- **Cost governance:** per‑brand token budgets, cache‑hit monitoring, batch the ambient/scheduled work off‑peak. Track $/active‑brand/month as a first‑class metric.

### 3.9 Aura evaluation & safety harness (release‑gating)

- **Golden set:** hundreds of real founder questions with known‑correct answers/actions from the metric layer; every release must pass.
- **Grounding check:** automated critic verifies each asserted number traces to a citation row; unsupported claims fail the build.
- **Adversarial/regression evals:** hallucination probes, "refuse to guess" checks, action‑safety red‑team (does Aura ever propose an unsafe or unbounded action?).
- **Online quality:** thumbs, override rate, "was this right in hindsight" (did the recommended action actually improve CM?), latency, cost.
- **Shadow mode:** new autonomy tiers run in suggest‑only shadow, compared against human decisions, before promotion.

---

## 4. The financial core (what Aura reasons over)

Built **before** heavy UI — it is the source of truth and Aura's substrate. (This inverts the demo's screen‑first order, as PRODUCT_SPEC/PRD always intended for the real product.)

1. **Ingestion & normalization** — raw events from every source into a canonical schema; per‑field freshness; partial‑failure tolerant; backfillable.
2. **Ledger** — event‑sourced, reconcilable to real bank payouts. CM1 must tie to money that actually landed, not an estimate.
3. **Semantic metric layer** — every metric (CM1/2/3, CM‑ROAS, MER, contribution, cohort LTV, runway, days‑of‑cover) defined **once as code**, with lineage, units, and freshness. UI, Aura tools, reports, and alerts all read the same definitions. No metric is ever hardcoded in a screen again.
4. **Engines** (pure, tested, versioned):
   - **Margin** (exists today — harden & tie to payouts).
   - **Attribution** — multi‑touch, honest about uncertainty; CM‑ROAS as the headline.
   - **Demand/supply** — trend‑adjusted velocity, reorder points, stockout dates.
   - **Cash‑flow** — forecast runway from AP/AR, supplier terms, ad spend, reorders.
   - **Simulation** — the "what if" engine actions call before executing.

---

## 5. Data & integrations layer

- **Shopify** — Admin GraphQL (orders, products, payouts, fulfillment), webhooks for real‑time, Web Pixel (already prototyped) for on‑site funnel.
- **Ads** — Meta, Google, TikTok (spend, structure, status, budget writes). Snap/X later.
- **Money** — bank/payout reconciliation (Plaid or Shopify Payments payouts), accounting sync (QuickBooks/Xero).
- **Supply** — 3PL/inventory + supplier terms (lead time, MOQ, deposit, payment terms) — the merchant‑supplied data that powers supply + cash and that no ad platform can see.
- **Ingestion concerns (real work the facade hides):** OAuth + token refresh, pagination, rate limits, partial failures, per‑field freshness, historical backfill, dedupe/idempotency, schema drift. **Sync health is first‑class** — a failed connector surfaces on the affected metric *and* globally; never a silent green dot.

---

## 6. Architecture & stack

- **App:** Next.js (App Router) front end; **embedded Shopify app** (App Bridge + Polaris‑compatible theming) so Tally lives inside Shopify admin, plus standalone web.
- **Services:** an API/orchestration layer; a **sync/ingestion service** (queue‑driven workers); the **Aura agent service** (tool runtime, model routing, memory); the **actions service** (adapters, approvals, undo, audit).
- **Data:** Postgres (transactional, multi‑tenant, row‑level isolation) + a columnar warehouse (analytics/metrics at scale) + object storage (receipts, exports) + vector store (retrieval).
- **Async:** durable queue + scheduler (crons/watchers), idempotent workers, backfill jobs.
- **Realtime:** webhooks in, streaming Aura responses out.
- **Multi‑tenant** from day one: every row keyed by brand; strict isolation; per‑brand rate/token budgets.
- **Observability:** tracing across sync → metric → Aura → action; per‑brand cost & freshness dashboards; alerting.

---

## 7. Trust, security, compliance

- **SOC 2 Type II** track from the start (auditable actions, access controls, change management).
- **Data isolation & encryption** at rest/in transit; least‑privilege connector scopes; secret management; token vaulting.
- **PII & financial data** handling policy; data retention & deletion (merchant offboarding wipes cleanly).
- **RBAC** (owner/finance/ops/read‑only); Aura actions inherit the acting user's permissions; autonomy tiers are per‑role.
- **Immutable audit log** for every action and Aura decision (reasoning trace attached).
- **Shopify App Store review** requirements (data handling, GDPR/CCPA webhooks, billing API).

---

## 8. Reliability & scale

- Idempotent ingestion; exactly‑once metric materialization; graceful degradation (stale‑but‑labeled beats blank).
- Aura is **resilient by design** — the existing deterministic fallback stays as the outage path; caching keeps latency/cost sane.
- SLAs on sync freshness and Aura latency; per‑brand isolation so one noisy store can't starve others.
- Load/backfill tested to target scale (10k+ brands, millions of orders).

---

## 9. Roadmap — phases with exit criteria

**Phase 0 — Foundations (harden the truth).**
Ledger + semantic metric layer + real Shopify sync (read‑only) tied to payouts; sync‑health first‑class; multi‑tenant DB; auth; audit skeleton.
*Exit:* CM1/2/3 for a real connected store reconciles to bank payouts within tolerance; every UI number reads the metric layer.

**Phase 1 — Aura goes agentic (read + proactive).**
Live tool‑using agent loop; retrieval + brand memory; Daily Brief + core watchers; eval harness gating releases; ad + web + cash data in.
*Exit:* Aura answers the golden‑set cross‑domain questions with grounded citations; Daily Brief ships value; hallucination rate below threshold.

**Phase 2 — Actions with approval.**
Simulation engine; actions engine (pause/shift/reorder/price/alert) in **Suggest** tier; receipts + undo + audit; ad‑platform & Shopify write adapters.
*Exit:* founders execute Aura's proposed actions in one click; measurable CM lift vs. control; zero unsafe actions in red‑team.

**Phase 3 — Autopilot + scale.**
Guarded autonomy per action type; shadow‑mode promotion; multi‑store; deeper attribution & cash forecasting; Shopify App Store GA; verticals beyond apparel.
*Exit:* a meaningful share of brands run key actions on autopilot with high retention and trust metrics.

---

## 10. Build order (sequencing, not dates)

1. Metric layer + ledger + Shopify read sync (the substrate).
2. Aura tool runtime over the metric layer (turn read tools on first).
3. Retrieval + memory + brand snapshot.
4. Ambient: Daily Brief + watchers + eval harness.
5. Ads/web/cash ingestion + attribution/cash engines.
6. Simulation engine → actions engine (Suggest tier) → adapters → undo/audit.
7. Autonomy tiers + shadow mode + governance.
8. Embedded Shopify app + billing + App Store + SOC 2.

---

## 11. Team (minimum credible)

Backend/data eng (ingestion + ledger + metric layer), AI eng (Aura runtime, tools, evals), full‑stack (app + Shopify embed), product/design (trust UX, action flows), + fractional security/compliance. Founder owns GTM + design partners.

---

## 12. Success metrics

- **Activation:** connect → first grounded insight < 10 min; % reaching first *action*.
- **Trust:** Aura override rate ↓, action acceptance ↑, "right in hindsight" ↑, hallucination rate ~0.
- **Value:** measured CM lift for brands acting on Aura vs. control; hours saved.
- **Business:** retention, NRR, autopilot adoption, $/active‑brand AI cost, payback.

---

## 13. GTM & pricing

- **Wedge:** "Aura finds the product quietly losing money after ads in 10 minutes" → land, then expand into automation.
- **Channel:** Shopify App Store + design partners + DTC communities/agencies.
- **Pricing:** tier by GMV (as today) with an **automation/autopilot** upsell; AI cost engineered to stay a small fraction of price (caching + routing).

---

## 14. Top risks & mitigations

| Risk | Mitigation |
|---|---|
| Aura hallucinates a number | Tools‑only math; grounding critic; eval gate; citations everywhere |
| An autopilot action loses money | Simulate‑first, caps, shadow mode, undo, kill switch, graduated tiers |
| Attribution is inherently uncertain | Lead with CM‑ROAS + honest confidence; never over‑claim |
| Integrations are brittle | Sync‑health first‑class; degrade gracefully; backfill + idempotency |
| AI cost balloons | Model routing, prompt caching, off‑peak batching, per‑brand budgets |
| Trust gap blocks autonomy | Earn it: Watch → Suggest → Auto, per action, with receipts |

---

## 15. Build log (what has actually landed in this repo)

| Slice | Status | Where |
|---|---|---|
| Ambient Aura — Daily Brief | ✅ built & verified | `lib/compute/dailyBrief.js`, `getDailyBrief()` facade, `AuraDailyBrief` hero on `/insights` |
| Agentic Converse — tool-using agent loop | 🔨 in progress | `lib/ai/tools.js`, `lib/ai/agentLoop.js`, `/api/aura` upgrade (falls back to single-shot) |
| Actions engine — simulate → execute → receipt → undo | 🔨 in progress | `lib/actions/*` (+ overlay hook in `lib/api/mock/products.js`) |
| Autonomy tiers + guardrails + autopilot | 🔨 in progress | `lib/actions/policy.js`, settings UI, `runAutopilot()` |
| Eval & grounding harness | 🔨 in progress | `lib/ai/goldenSet.js`, `/api/aura/eval`, `npm run eval:aura` |
| Connector layer contracts (mock → live seam) | 🔨 in progress | `lib/connectors/*` |
| Live Shopify/ads/bank sync, multi-tenant DB, SOC 2 | ⬜ not buildable in this sandbox | interfaces above are the drop-in seam |

## 16. Open decisions (confirm before/while building)

1. **Autonomy ceiling:** how far do we let Aura act autonomously at GA — up to guarded auto for low‑stakes, or suggest‑only until v‑next? (Recommend: guarded auto for reorders/alerts/small budget shifts; suggest for everything else.)
2. **Bank/accounting source:** Shopify Payments payouts only, or Plaid + QBO/Xero for full cash truth? (Recommend: payouts first, accounting in Phase 2.)
3. **Surface priority:** embedded Shopify app first, or standalone web first? (Recommend: standalone web to move fast; embed in Phase 3 for distribution.)
4. **Build vs. buy** for warehouse/vector/queue infra.
5. **Design‑partner cohort** to co‑build actions against real spend.
