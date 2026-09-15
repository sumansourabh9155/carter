# Carter — Final App-Flow & Architecture Plan

**Status:** Approved-for-build. This is the document development works from.
**Build target:** new folder `carter-app/` — a standalone branded dark-theme web app for the Phase-1 wedge demo.
**Stack (locked, mirrors prototype):** Next.js 16 (App Router) · React 19 · plain JavaScript (no TypeScript) · Recharts 3 · React inline styles · dark theme (`#0a0f1a` / `#060b12`, indigo `#4f46e5` / `#818cf8`).

---

## 0. Demo lane vs. product build lane (read this first)

This plan describes a **demo lane**: a screen-first, mock-data build whose single job is the sub-10-minute *"your bestseller is losing money after ad spend"* reveal.

It **deliberately diverges** from the real Phase-1 *product* sequence. PRODUCT_SPEC.md:343 / PRD.md risk #7 are explicit: the real product must build the **ledger + semantic metric layer + margin engine that ties CM1 to a real bank payout FIRST**, screens last. We are inverting that for a demo. Nobody should read this document's screen order as the production build order.

To keep the wedge **honest even on mock data**, the one hard rule we carry over from the product lane: **the margin engine is real.** Seed data holds *raw inputs only*; CM1/CM2/CM3 are always *derived*, never stored literals. A demo that shows a margin number the engine didn't compute recreates the exact silo trap the product exists to kill.

**Decisions locked by the critiques (so they are not re-litigated in code):**
- **Cash flow is NOT Phase 1.** No runway KPI on `/home`, no built `/cash-flow` route. It becomes a stub. (PRD.md:576, :610)
- **2 live alerts, not 3.** Negative-CM2 hero + ad overspend are live. Runway-breach shows as a greyed Phase-2 alert type (no cash engine to fire it).
- **No store switcher.** Static brand label only. Multi-brand is scale-phase. (PRODUCT_SPEC.md:372)
- **No command palette, no "compare-to" date control.** Net-new, not in spec, pure bug surface. Cut.
- **One AI surface:** the right-dock `AIPanel`. No separate full-page `/ask` route in the demo.
- **The whole `(app)` shell is client-rendered.** Contexts + Recharts + `useEffect` fetching force it. We do not design around RSC we won't get.

---

## 1. Information Architecture — final route map

Route group `(app)/` holds the authenticated shell. `(auth)/` and `onboarding/` sit **outside** the shell. The demo spine is **5 screens built to full depth**; everything else is a purposeful stub or deferred (never a dead link).

### Primary nav — the live wedge pillars (built to depth)
| Route | Purpose | Status |
|---|---|---|
| `/` → redirect to `/home` | Entry | built |
| `/home` | Daily answer: "Am I making money?" KPIs + top alert + setup checklist | **built** |
| `/products` | Profitability engine — Heroes & Anchors, CM1/2/3 table (the wedge) | **built** |
| `/products/[sku]` | Single-SKU CM1→CM2→CM3 waterfall + cost/returns/ad detail | **built** |
| `/marketing` | Ad-spend intelligence — CM-ROAS vs revenue-ROAS, product-linked spend | **built** |
| `/alerts` | Alert center — the 2 live alerts + history (light list) | **built (light)** |

### Secondary / deferred (stub `EmptyState`, greyed in nav, below a divider)
| Route | Purpose |
|---|---|
| `/cash-flow` | **Stub** — "Connect your bank to forecast runway · coming Phase 2" |
| `/inventory` | **Stub** — Phase 2 |
| `/reports` | **Stub** — Phase 2 |

### Settings (pinned gear, never in primary nav)
| Route | Purpose | Status |
|---|---|---|
| `/settings` → redirect `/settings/integrations` | index | built |
| `/settings/integrations` | Connect/manage Shopify, ad channels + sync status | built |
| `/settings/cogs` | COGS input/import (the data powering CM1) — CSV + per-SKU edit | **built (load-bearing)** |
| `/settings/alerts` | Alert thresholds; runway-breach shown greyed "Phase 2" | built |
| `/settings/team` | **Stub** (shared `EmptyState`) |
| `/settings/billing` | **Stub** (shared `EmptyState`) |

### Outside the shell
| Route | Purpose |
|---|---|
| `(auth)/login` | "Connect your Shopify store" — single CTA, no signup form |
| `(auth)/install/callback` | Mock OAuth callback → set mock session → onboarding |
| `onboarding/[step]` | Wizard: `connect-shopify` → `import-cogs` → `connect-ads` → `reveal` |

**URL conventions:** lowercase-hyphenated, plural nouns, max one level deep. Filters/sort as query params: `/products?sort=cm3&tier=anchor`. `/marketing/[channel]` drill-down is **deferred** — the `/marketing` index alone tells the CM-ROAS story.

---

## 2. Left sidebar + global header

### Sidebar (`<Sidebar>`, 220px; collapses to 64px icon rail)
- **Surface:** `#060b12`; active item = `rgba(129,140,248,0.12)` fill + 2px `#818cf8` left border. Active state driven by **`usePathname()`**, not an `activeView` prop. (Forces Sidebar to `"use client"` — explicit, consistent with the client shell.)
- **One coherent single-stroke icon set**, uniform color. Inactive `#64748b`, active `#818cf8`. (Replaces the prototype's mixed `◈/🎯/💰/📈` emoji.)

**Order (jobs-first, 4 live items + Alerts, then a divider, then deferred):**
1. **Home** — `house`
2. **Products** — `tag` · **badge: red dot if any negative-CM2 hero exists** (the one nav embellishment worth building — it visually foreshadows the reveal)
3. **Marketing** — `megaphone`
4. **Carter AI** — `sparkles` (opens the dock; noun label for parallel scanning, grouped under the divider as the AI entry)
5. — divider —
6. **Alerts** — `bell` · badge = unread count
7. **Coming soon** group (greyed, below divider): Cash Flow, Inventory, Reports → each routes to its stub `EmptyState`
- **Pinned bottom:** Settings (`gear`).

> Note on the "4 pillars" pitch: only **margin, ads** (and later cash) are real in the demo; inventory/cash are visibly Phase 2. Nav and narrative agree — we do not claim four working pillars.

### Global top header (`<TopBar>`) — trimmed to 4 controls
| Zone | Element |
|---|---|
| Left | **Static brand label** "Coastal Active" (non-interactive — no switcher) |
| Right | **Date-range preset selector** (7d / 30d / 90d; no compare toggle); **Sync status chip** ("Synced 8 min ago · ↻"); **Notifications bell** (badge = live alerts); **Avatar menu** (Profile, Settings, Sign out) |

The date range is a single simple "reporting period" control. It is **hidden/disabled on routes where it does not apply** (`/alerts`, `/settings/*`, stubs). We do **not** narrate it as "the connected-decisions loop" — on mock data the synced deltas are cosmetic, and the cross-module engine is Phase 3.

**Division of labor:** sidebar owns *navigation*; header owns *reporting period + sync health + notifications + account*.

---

## 3. Full application flow

```
Login ──Connect Shopify──▶ (mock OAuth) ──▶ Onboarding wizard ──▶ App shell (/home)
                                                  │                      │
                                    connect→cogs→ads→REVEAL        daily core loop
```

**(a) Unauthenticated.** `(auth)/login`: branded dark page, single CTA "Connect your Shopify store." No signup form. Click → mock OAuth → `install/callback` sets a mock session → `onboarding/connect-shopify`.

**(b) Onboarding wizard** (`onboarding/[step]`, outside shell, "Step X of 4", save-and-resume):
1. **connect-shopify** — one click; skeleton "Pulling your last 90 days of orders…" → ✓ auto-completes (Rev, units, fees, shipping).
2. **import-cogs** — ask only **top 5–10 SKUs by revenue** (80/20). CSV import + "use blended-margin default" escape hatch. SKUs without COGS get an **Estimated** badge so the reveal still fires.
3. **connect-ads** — clearly **OPTIONAL** ("Skip for now"). Channel tiles; unlocks CM2 / CM-ROAS.
4. **reveal** — **the activation moment.** Full-bleed payoff: *"Your bestseller 'Performance Leggings' is losing $X per order after ad spend."* with the SKU's mini-waterfall. Two CTAs: **"See full breakdown"** → `/products/[sku]`, and **"Alert me if this gets worse"** (inline — honors PRD activation step 6 without a settings detour), then **"Go to dashboard"** → `/home`.

**(c) App shell.** `(app)/layout.js` mounts the context providers (DateRange, Store, AIPanel) **above** the route segments so dock threads and date range survive client navigation (in-memory only — resets on full reload; we do not claim more).

**(d) Daily core loop.** Maya opens `/home` → 10-second money verdict (CM3 card green/red) + top alert → taps the losing hero → `/products/[sku]` → asks Carter "why did margin drop?" in the dock → "Alert me." Devin/Priya drill `/products` or switch to `/marketing`.

---

## 4. Key user flows

**A. First-run activation → "your hero is losing money" aha**
1. Login → Connect Shopify → mock OAuth → lands connected, syncing (skeletons).
2. Wizard step 2: COGS for top SKUs (CSV or defaults).
3. (optional) connect ads.
4. Engine computes CM1/CM2/CM3 per SKU; finds the highest-revenue SKU with negative CM2.
5. **Reveal** names that SKU + per-order loss + mini-waterfall + inline alert CTA. *Target: < 10 min, same session.*

**B. Connected-decisions read: "should I scale this ad?"** (Phase 1 = read-only insight, honestly labeled)
1. On `/marketing` or a SKU page, click "Ask Carter" on a row (pre-seeds a context chip: SKU + channel + range).
2. Dock reveals named steps via timed chunk-reveal: *Computing CM2… checking CM-ROAS…*
3. Returns a structured card: current **CM-ROAS** (not revenue ROAS), the binding constraint, a verdict, each number with a **citation chip** → ledger rows, plus **confidence + freshness**.
4. Follow-up chips: "See SKU detail" · "Set CM-erosion alert." Phase 1 stops at recommendation (labeled read-only).

**C. Asking Carter AI** (single surface = dock)
1. Header `sparkles` launcher, sidebar "Carter AI" item, or inline "Ask Carter" card affordance → **the same right dock, the same thread store.**
2. Empty state shows 3–5 context-aware starters ("Which bestsellers lose money?", "Why did margin drop last week?").
3. Submit → instant thinking state → timed token reveal → structured metric card with **citation + freshness + confidence**; **STOP** (clearInterval) mid-gen, **Regenerate** (replay) after.
4. If COGS incomplete → AI says "Estimated — add real COGS for N SKUs" with a one-click deep link to `/settings/cogs`.

**D. Setting an alert** (2 live types)
1. From a metric, the reveal screen, alert center, or an AI follow-up chip.
2. Modal: alert type (**negative-CM2 hero** / **ad overspend** — live; **runway floor** shown greyed "Phase 2"), threshold, scope, channel.
3. Save → appears in `/alerts`; editable in `/settings/alerts`; bell badges when triggered.

---

## 5. Screen-by-screen (the 5-screen spine)

**`/home`** (inverted pyramid, 5–10s glance test)
- Row 1 — **4 KpiCards, all on-wedge: CM1, CM2, CM3, CM-ROAS** (the removed runway card is replaced by CM-ROAS). Each: large value, signed delta (abs + %), 30-day sparkline, gap-to-target. CM3 delta colored green/red = the verdict. The verdict card carries a **freshness + confidence affordance** (it is the single most consequential number — must not read as more certain than it is).
- Row 2 — margin **waterfall** (Rev→…→CM3) + **CM-ROAS trend** line.
- Row 3 — **Heroes & Anchors** preview (losing hero highlighted red) + top alert `InsightCard`.
- Persistent dismissible **OnboardingChecklist** until setup complete.

**`/products`** (index)
- `DataTable`: SKU · Revenue · CM1 · CM2 · CM3 · CM-ROAS, inline sparklines, conditional red for negative margin, **Estimated** badges with **inline COGS entry on an Estimated row** (don't force a settings trip for the product's most important data task). Filters (tier=hero/anchor), sort, search with visible applied-state chip + clear-all. Page-level tabs switch the CM1/CM2/CM3 lens. Row click → detail.

**`/products/[sku]`**
- Breadcrumb (Products / Performance Leggings). TitleBar actions: Recalculate, Export. SKU CM **waterfall**, units/returns/ad-spend cards, "view as table" toggle, plain-English takeaway line, inline "Ask Carter." `getProduct(sku)` returns null for bad ids → page calls `notFound()`.

**`/marketing`**
- KpiCards: blended **CM-ROAS** vs revenue-ROAS, ad spend, CM2-after-ads. Sorted-bar ranking of channels/campaigns by CM-ROAS; product-linked spend table. (No `[channel]` drill-down in demo.)

**`/alerts`** (light)
- List of active/triggered alerts as `InsightCards` (severity icon + color + label — never color alone), "Create alert," short history. 2 live types; runway type visible-but-greyed.

---

## 6. Data-state matrix (operationalizes "trust over coverage")

Every data surface (`KpiCard`, `ChartCard`, `DataTable`, AI result card) implements the **same five states**:

| State | Trigger | UI |
|---|---|---|
| **Loading** | fetch in flight | `SkeletonCard` (wired via App Router `loading.js`) |
| **Empty** | source not connected | `EmptyState` (headline + context + single CTA) |
| **Partial** | one source syncing / COGS estimated | render available data + **Estimated**/"ad data syncing" badge |
| **Stale** | past freshness watermark | freshness chip turns amber + "as of <time>" |
| **Error** | connector failed / token expired | error badge on affected metric (e.g. CM-ROAS shows "Meta disconnected"), plus the header sync chip turns red |

Sync health is **first-class** (PRD risk #8): a failed connector surfaces on the affected metric card *and* the header chip — never silent, never just a green dot.

---

## 7. Component inventory

- **AppShell** — composes Sidebar + TopBar + content slot + AIPanel; reads contexts. Client.
- **Sidebar** — nav items, icon-rail collapse, `usePathname` active state, Products red-dot badge.
- **TopBar** — static brand label, date-preset selector, SyncStatus chip, NotificationsBell, AI launcher, AvatarMenu.
- **KpiCard** — fixed anatomy (value, label, signed delta abs+%, sparkline, gap-to-target) + freshness/confidence slot. **Props-only, no data imports.**
- **ChartCard** — title-as-question, "view as table" toggle, plain-English takeaway slot, "Ask Carter" affordance.
- **DataTable** — sortable, inline sparklines, conditional formatting, Estimated badges + inline COGS edit, row→detail. Props-only.
- **DateRangePicker** — preset selector only (7/30/90); writes DateRangeContext + URL query; hidden on non-applicable routes.
- **InsightCard** — alert/insight tile (severity icon + color + label).
- **AIPanel** — right dock; timed-reveal streaming lifecycle, STOP/Regenerate, context chip, citation/confidence/freshness, structured result cards + follow-up chips; read-only labeled. **Single AI surface, single thread store.**
- **EmptyState** — 4-part; shared by all stubs (cash-flow, inventory, reports, team, billing).
- **OnboardingChecklist**, **SkeletonCard**, **Sparkline**, **Badge**, **CitationChip**, **ConfidenceChip** — primitives.
- **Charts (Recharts, themed via `chartTheme.js`):** MarginWaterfall, CmRoasTrend (line), RankBars (sorted horizontal). *Deferred:* CashProjection, RunwayBullet.

> **Port discipline:** Port `chartTheme.js` **verbatim** and the **JSX/markup** of KpiCard, WaterfallRow, the Recharts blocks. **Rewrite the data flow** — every page becomes a `"use client"` component that calls the async facade in `useEffect` and renders `SkeletonCard` until resolved. The prototype's synchronous `import { PRODUCTS }` pattern does **not** port.

---

## 8. Data / state approach (mock now, facade-isolated)

- **Single facade `lib/api/index.js`** — components import *only* from here. Functions are **async** returning promises: `getMetrics({range})`, `getProducts({range,sort})`, `getProduct(sku)` (returns null for bad id), `getMarketing()`, `getAlerts()`, `createAlert()`, `askCarter(message, context)`.
- **The wedge integrity rule (non-negotiable):** mock impls in `lib/api/mock/*` read **raw-input** datasets in `lib/data/*` and run them through the **pure engine** `lib/compute/margin.js` (CM1 = Rev − COGS − shipping − fees − returns; CM2 = CM1 − ad spend; CM3 = CM2 − overheads). **Do NOT copy the pre-computed `cm1/cm2/cm3/cmRoas/quadrant` literals from `credes/lib/sampleData.js`** — those make the engine decorative. Seed SKUs carry only: `units, revenue|unitPrice, unitCogs|null, shipping, fees, returns, adSpend, overheadAlloc, hasCogs`. The engine derives everything and sets the **Estimated** flag when COGS is null/default.
- **`askCarter` = timed chunk-reveal**, not a true AsyncIterator. The facade signature stays stream-like; the implementation reveals a canned structured payload via `setInterval`, then renders the citation/confidence/freshness card. STOP = `clearInterval`, Regenerate = replay. Robust, no React-19 token-thrash, looks identical in a demo.
- **Swap path (honest framing):** the facade boundary prevents *import churn* when real Shopify GraphQL arrives. It does **not** pre-solve pagination, rate limits, partial failure, or per-field freshness — that UI work comes with live data. **Do not build `lib/api/shopify/*` stubs now** (false API-readiness); add them in Phase 2 when wiring GraphQL.
- **State:** React Context for DateRange, Store, AIPanel (mounted at `(app)/layout.js`). No external state lib for MVP. In-memory only.

---

## 9. Design-system notes

- **Colors:** bg `#0a0f1a`; surfaces/sidebar `#060b12`; cards `#0d1117`; borders `rgba(255,255,255,0.08)`. Accent indigo `#4f46e5`/`#818cf8` = interactive. Semantics: green `#22c55e` = positive, red `#ef4444` = negative, amber `#f59e0b` = warning/stale. **Never color alone** — always pair with arrow `▲/▼` + signed value + label/icon.
- **Typography:** system-ui; numeric/financial values in monospace (matches prototype tooltip). KPI primary value largest → delta → sparkline.
- **Spacing:** 4px base (4/8/12/16/24/32); 12px card radius; 16–24px card padding.
- **Responsive (right-sized for the demo):** desktop-first (the demo is a projector/laptop). Below 768px, deliver a **clean readable stack**, not a second navigation system: KPI grid stacks, the CM table degrades to **card-per-SKU**, the date control moves into a filter sheet, the AI dock becomes a full-screen sheet. **Defer** the bottom tab bar / off-canvas drawer build (NG7 = responsive web only; native mobile patterns are post-demo). Responsive web yes; a bespoke mobile nav, no.
- **Accessibility:** verify indigo / muted-gray / chart series hit **4.5:1** (text) and **3:1** (UI/chart) on dark bg — muted grays are the risk. Keyboard-operable date picker, table, drill-downs with visible focus rings; each chart has a screen-reader summary mirroring its takeaway line; tables have header rows + captions.

---

## 10. MVP build sequence (logical phases)

**Phase 1 — wedge (build fully):**
1. Scaffold `carter-app`; **run the stack spike** (below) before any architecture.
2. Port `chartTheme.js` + theme tokens; set up route groups + `(app)/layout.js` shell (Sidebar + TopBar + contexts).
3. **`lib/data` raw-input seed + `lib/compute/margin.js` engine + `lib/api` mock facade** — built *before* screens.
4. **Onboarding wizard → reveal** (the money shot).
5. **`/home`** (4 on-wedge KPIs + waterfall + Heroes/Anchors + checklist + alert).
6. **`/products`** + **`/products/[sku]`** waterfall (the wedge proper).
7. **`/marketing`** (CM-ROAS vs revenue-ROAS).
8. **AIPanel dock** (read-only, timed reveal, citations/confidence).
9. **`/alerts`** (2 live) + **`/settings/integrations`** + **`/settings/cogs`** (real COGS edit/import).

**Stubbed in Phase 1** (route exists, purposeful `EmptyState`, greyed in nav): `/cash-flow`, `/inventory`, `/reports`, `/settings/team`, `/settings/billing`.

**Phase 2+:** ledger + semantic layer hardening, real Shopify GraphQL (`lib/api/shopify/*`), cash forecasting + runway (promotes `/cash-flow` and the runway alert), demand/supply + `/inventory`, ad-optimization *recommendations*, `/marketing/[channel]`, full `/ask` thread history, reports, multi-store. **Phase 3:** agentic actions (approve→execute→receipt→undo), the cross-module connected-decisions engine, accounting sync, embedded-Polaris App-Store surface.

---

## 11. Build order for development — exact file/screen sequence (Phase-1 demo, mock data)

**Step 0 — Stack spike (≈30 min, do before writing any architecture).** De-risk the two biggest unknowns: dependency resolution and Recharts-in-App-Router.
```
carter-app/package.json            # next ^16.2.4, react ^19, recharts ^3.8.1 (mirror credes)
carter-app/next.config.mjs
carter-app/jsconfig.json
carter-app/app/layout.js           # <html><body>, dark bg
carter-app/app/globals.css         # reset + CSS vars
carter-app/app/page.js             # redirect('/home') — verify next/navigation redirect works
carter-app/app/spike/page.js       # 'use client' + ONE Recharts chart in ResponsiveContainer
```
Run `cd carter-app && npm install && npm run dev`. Confirm: deps resolve, the chart sizes correctly, StrictMode double-invoke doesn't break it, `redirect()` works. **Do not proceed until green.** Delete `app/spike/`.

**Step 1 — Theme + tokens (ports).**
```
carter-app/lib/chartTheme.js       # PORT VERBATIM from credes/lib/chartTheme.js
carter-app/lib/theme.js            # color/spacing/typography tokens
carter-app/lib/format.js           # money / % / signed-delta formatters
```

**Step 2 — Data engine + facade (build BEFORE any screen — the wedge integrity layer).**
```
carter-app/lib/data/skus.js        # RAW INPUTS ONLY (units, revenue, unitCogs|null, shipping,
                                    #   fees, returns, adSpend, overheadAlloc, hasCogs).
                                    #   DO NOT copy cm1/cm2/cm3 literals from credes/lib/sampleData.js
carter-app/lib/data/adChannels.js  # raw spend + attributed revenue per channel (derive cmRoas)
carter-app/lib/data/alertsSeed.js  # 2 live alert instances
carter-app/lib/compute/margin.js   # PURE: deriveCM1/CM2/CM3, heroes/anchors, Estimated flag
carter-app/lib/api/mock/products.js
carter-app/lib/api/mock/marketing.js
carter-app/lib/api/mock/metrics.js
carter-app/lib/api/mock/alerts.js
carter-app/lib/api/mock/ai.js      # canned structured payloads + citation rows
carter-app/lib/api/index.js        # async facade — the ONLY data import surface
```

**Step 3 — Vertical slice: prove the whole pipe on ONE route before fanning out.**
```
carter-app/context/DateRangeContext.js
carter-app/context/StoreContext.js
carter-app/context/AIPanelContext.js
carter-app/components/ui/{SkeletonCard,EmptyState,Badge,Sparkline}.js
carter-app/components/ui/DataTable.js           # props-only
carter-app/components/charts/MarginWaterfall.js # 'use client'
carter-app/app/(app)/layout.js                  # AppShell: mounts contexts (state lives here)
carter-app/components/shell/{AppShell,Sidebar,TopBar}.js
carter-app/app/(app)/products/page.js           # 'use client' → facade in useEffect → states
carter-app/app/(app)/products/loading.js        # skeleton
carter-app/app/(app)/products/[sku]/page.js     # notFound() on null
carter-app/app/(app)/products/[sku]/not-found.js
```
This single slice exercises the async facade, the loading/empty/error/partial states, the Estimated flag, and Recharts-in-shell **once** — not eight times. Validate it end-to-end, then replicate the pattern.

**Step 4 — Onboarding → reveal (the demo money shot).**
```
carter-app/app/(auth)/login/page.js
carter-app/app/(auth)/install/callback/page.js
carter-app/app/onboarding/layout.js             # bare wizard chrome (progress bar)
carter-app/app/onboarding/[step]/page.js        # connect-shopify|import-cogs|connect-ads|reveal
carter-app/components/onboarding/{WizardStep,ConnectTile,CogsImport,RevealScreen}.js
```

**Step 5 — `/home` (4 on-wedge KPIs: CM1, CM2, CM3, CM-ROAS).**
```
carter-app/components/ui/{KpiCard,ChartCard,InsightCard,OnboardingChecklist}.js
carter-app/components/charts/CmRoasTrend.js
carter-app/app/(app)/home/page.js
carter-app/app/(app)/loading.js                 # shell-level skeleton
carter-app/app/(app)/error.js                   # shell-level error boundary
```

**Step 6 — `/marketing`.**
```
carter-app/components/charts/RankBars.js
carter-app/app/(app)/marketing/page.js
carter-app/app/(app)/marketing/loading.js
```

**Step 7 — AI dock (single AI surface).**
```
carter-app/components/ai/{AIPanel,ChatMessage,CitationChip,ConfidenceChip,StarterPrompts}.js
# askCarter = setInterval chunk-reveal of canned payload; STOP=clearInterval, Regenerate=replay
```

**Step 8 — Alerts + Settings (load-bearing COGS).**
```
carter-app/app/(app)/alerts/page.js             # 2 live + greyed runway type
carter-app/app/(app)/settings/layout.js
carter-app/app/(app)/settings/page.js           # redirect → integrations
carter-app/app/(app)/settings/integrations/page.js
carter-app/app/(app)/settings/cogs/page.js      # real CSV import + per-SKU edit
carter-app/app/(app)/settings/alerts/page.js
```

**Step 9 — Stubs (one shared `EmptyState`, greyed in nav).**
```
carter-app/app/(app)/cash-flow/page.js
carter-app/app/(app)/inventory/page.js
carter-app/app/(app)/reports/page.js
carter-app/app/(app)/settings/team/page.js
carter-app/app/(app)/settings/billing/page.js
```

**App Router boundary files (add as each route lands, not optional):** `loading.js` at `(app)/`, `products/`, `marketing/`; `error.js` at `(app)/`; `not-found.js` for `products/[sku]`. These are what make the async-facade UX feel intentional instead of flashing blank panels.

---

**Key reference files (absolute):**
- Port verbatim: `/Users/suman.sourabh/Suman Learning/hackthon/credes/lib/chartTheme.js`
- **Do NOT copy literals from** (raw-input restructure required): `/Users/suman.sourabh/Suman Learning/hackthon/credes/lib/sampleData.js` (PRODUCTS bake in `cm1/cm2/cm3/cm1Pct/quadrant`; AD_CHANNELS bake in `roas/cmRoas`)
- Presentation-only port sources: `/Users/suman.sourabh/Suman Learning/hackthon/credes/components/app/{Dashboard,Products,Marketing,CashFlow}.js`
- New build root: `/Users/suman.sourabh/Suman Learning/hackthon/carter-app/`
- Spec anchors: `/Users/suman.sourabh/Suman Learning/hackthon/credes/PRD.md`, `/Users/suman.sourabh/Suman Learning/hackthon/credes/PRODUCT_SPEC.md`