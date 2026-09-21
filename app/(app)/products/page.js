"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, PackageSearch, Layers, ArrowLeft } from "lucide-react";
import { getProducts, getPortfolioRollup } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { useReportingWindow } from "@/context/DateRangeContext";
import { QUADRANT_META } from "@/lib/compute/margin";
import { LIFECYCLE_META } from "@/lib/compute/lifecycle";
import { PageHeader, PageContainer } from "@/components/PageHeader";
import { ProductThumb } from "@/components/ProductThumb";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableToolbar,
  TablePagination,
} from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CostInputs } from "@/components/data/CostInputs";
import { money, pct, multiple, signedMoney, signedMultiple, plural } from "@/lib/format";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "hero", label: "Heroes" },
  { id: "cashcow", label: "Cash Cows" },
  { id: "trafficdriver", label: "Traffic" },
  { id: "anchor", label: "Anchors" },
];

const LIFECYCLE_STAGES = ["introduction", "growth", "maturity", "decline", "unknown"];

function QuadrantTag({ q }) {
  const meta = QUADRANT_META[q];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className="size-2 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

function LifecycleTag({ stage }) {
  const meta = LIFECYCLE_META[stage];
  return (
    <span className="inline-flex items-center gap-1">
      <span className="size-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

function Money({ v }) {
  return <span className={cn("tabular", v < 0 && "text-destructive")}>{money(v)}</span>;
}

/*
  The media call on a SKU, on the same thresholds the Reporting table used
  (<1× cut, ≥3× scale). It is a READ of the margin engine, not a second
  opinion — the executable version of the same verdict is the action card on
  Insights, which runs through the actions engine.
*/
function MediaVerdict({ p }) {
  // Keyed on the MEDIA result, and on the honest CM-ROAS scale. The old bar
  // was 3.0x against a number inflated ~3x, so it effectively never fired.
  if (p.mediaLosing) return <Badge variant="negative">Cut / fix</Badge>;
  if (p.cmRoas != null && p.cmRoas >= 1.8) return <Badge variant="positive">Scale</Badge>;
  return <Badge variant="neutral">Hold</Badge>;
}

/*
  THE CATEGORY VIEW — the level a director actually opens.

  This is the same rollup the Insights board reasons over, rendered as a
  navigable table. Selecting a row does not open a separate page: it filters
  the SKU table underneath, because "which category" and "which SKUs in it"
  are one question asked at two depths.
*/
function CategoryTable({ rollup, onDrill }) {
  if (!rollup) {
    return (
      <Card className="p-4">
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <TableToolbar
        title="Performance by category"
        description="Portfolio totals with period-over-period movement. Select a row to see the SKUs behind it."
      />
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Category</TableHead>
            <TableHead className="text-right">SKUs</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">Ad spend</TableHead>
            <TableHead className="text-right">CM2</TableHead>
            <TableHead className="text-right">Δ CM2</TableHead>
            <TableHead className="text-right">CM-ROAS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rollup.groups.map((g) => {
            const t = g.totals;
            const dCm2 = t.delta ? signedMoney(t.delta.cm2.abs) : null;
            const dRoas = t.delta ? signedMultiple(t.delta.cmRoas.abs) : null;
            return (
              <TableRow key={g.key} className="cursor-pointer" onClick={() => onDrill(g.key)}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{g.label}</span>
                    {g.losingCount > 0 && <Badge variant="destructive">{g.losingCount} losing</Badge>}
                    {g.estimatedCount > 0 && <Badge variant="warning">{g.estimatedCount} est.</Badge>}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{pct(g.revenueSharePct)} of portfolio revenue</div>
                </TableCell>
                <TableCell className="text-right tabular text-sm">{g.skuCount}</TableCell>
                <TableCell className="text-right"><span className="tabular">{money(t.revenue)}</span></TableCell>
                <TableCell className="text-right"><span className="tabular">{money(t.adSpend)}</span></TableCell>
                <TableCell className="text-right"><Money v={t.cm2} /></TableCell>
                <TableCell className="text-right">
                  <span className={cn("tabular text-sm font-medium", dCm2?.dir === "up" && "text-ia-positive", dCm2?.dir === "down" && "text-ia-negative", (!dCm2 || dCm2.dir === "flat") && "text-muted-foreground")}>
                    {dCm2?.text ?? "—"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className={cn("tabular", t.cmRoas != null && t.cmRoas < 1 && "text-destructive")}>{multiple(t.cmRoas)}</span>
                  {dRoas && dRoas.dir !== "flat" && (
                    <div className={cn("tabular text-[10px]", dRoas.dir === "up" ? "text-ia-positive" : "text-ia-negative")}>{dRoas.text}</div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <TablePagination itemsFound={rollup.groups.length} />
    </Card>
  );
}

function ProductsView() {
  const router = useRouter();
  const params = useSearchParams();
  const win = useReportingWindow();
  const { data: products, loading } = useAsync(() => getProducts(), []);
  const { data: rollup } = useAsync(() => getPortfolioRollup("category"), []);
  const [filter, setFilter] = useState("all");
  const [lifecycle, setLifecycle] = useState("all");
  const [q, setQ] = useState("");
  const [view, setView] = useState("performance");

  // Category comes off the URL so an insight card, the portfolio rollup and a
  // shared link all land on the same filtered view. `null` state here would
  // fight the URL, so the URL stays the single source of truth.
  const category = params.get("category");
  const setCategory = (next) =>
    router.replace(next ? `/products?category=${encodeURIComponent(next)}` : "/products", { scroll: false });

  const categories = rollup ? rollup.groups.map((g) => g.key) : [];

  const rows = (products || [])
    .filter((p) => (category ? p.category === category : true))
    .filter((p) => (filter === "all" ? true : p.quadrant === filter))
    .filter((p) => (lifecycle === "all" ? true : p.lifecycleStage === lifecycle))
    .filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Profitability engine"
        title="Products"
        description="Contribution margin per SKU after COGS and ad spend — CM1 → CM2 — so you can see which products are worth promoting."
      />

      {/* Categories is the portfolio level; Performance is the SKU level;
          Cost inputs is where the margins get their inputs. One catalogue,
          three depths — modes of a page, not three places in the nav. */}
      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="categories"><Layers className="size-3.5" /> Categories</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="costs">Cost inputs</TabsTrigger>
        </TabsList>
      </Tabs>

      {view === "categories" && (
        <CategoryTable
          rollup={rollup}
          onDrill={(key) => { setCategory(key); setView("performance"); }}
        />
      )}

      {view === "costs" && <CostInputs />}

      {/* An active category filter is stated, not implied by a shortened
          list — an unexplained partial table is how people misread a total. */}
      {category && view === "performance" && (
        <div className="flex items-center gap-2.5 rounded-card bg-brand-50 px-4 py-2.5 shadow-ring">
          <Layers className="size-4 shrink-0 text-brand-600" />
          <span className="text-[13px]">
            Showing <span className="font-semibold">{category}</span> only — {rows.length} of {plural(products?.length ?? 0, "SKU")}.
          </span>
          <button
            onClick={() => setCategory(null)}
            className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-brand-600 hover:underline"
          >
            <ArrowLeft className="size-3" /> All products
          </button>
        </div>
      )}

      <div className={cn("flex flex-wrap items-center gap-3", view !== "performance" && "hidden")}>
        <Select value={category ?? "all"} onChange={(e) => setCategory(e.target.value === "all" ? null : e.target.value)}>
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
        <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
          {FILTERS.map((f) => (
            <option key={f.id} value={f.id}>{f.id === "all" ? "All quadrants" : f.label}</option>
          ))}
        </Select>
        <Select value={lifecycle} onChange={(e) => setLifecycle(e.target.value)}>
          <option value="all">All stages</option>
          {LIFECYCLE_STAGES.map((s) => (
            <option key={s} value={s}>{LIFECYCLE_META[s].label}</option>
          ))}
        </Select>
        <div className="relative w-full sm:ml-auto sm:w-64">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="pl-8" />
        </div>
      </div>

      <Card className={cn("overflow-hidden p-0", view !== "performance" && "hidden")}>
        {/* Section heading lives INSIDE the card, above the table — Carter's
            "Breadcrumb Container" pattern (title over subtitle). */}
        <TableToolbar
          title={category ? `${category} products` : "All products"}
          description={`${win.label} · every SKU ranked by campaign-level contribution margin, against the ${win.days} days before it.`}
          onBack={category ? () => setCategory(null) : undefined}
        />
        {loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <span className="grid size-11 place-items-center rounded-card bg-ia-gray-faded text-muted-foreground">
              <PackageSearch className="size-5" />
            </span>
            <p className="text-sm font-medium">No products match these filters</p>
            <p className="max-w-sm text-xs text-muted-foreground">Try a different category, quadrant, lifecycle stage, or search term.</p>
            <button
              onClick={() => { setFilter("all"); setLifecycle("all"); setQ(""); setCategory(null); }}
              className="mt-1 text-xs font-medium text-primary hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                {/* Ad spend + verdict came from Reporting's "product-linked
                    ad spend" table, which listed the same SKUs this table
                    already lists. Two tables, one catalogue — now one. */}
                <TableHead className="text-right">Ad spend</TableHead>
                <TableHead className="text-right">CM1</TableHead>
                <TableHead className="text-right">CM2</TableHead>
                <TableHead className="text-right">Δ CM2</TableHead>
                <TableHead className="text-right">CM-ROAS</TableHead>
                <TableHead>Verdict</TableHead>
                <TableHead>Quadrant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => router.push(`/products/${p.id}`)}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <ProductThumb id={p.id} name={p.name} size={36} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{p.name}</span>
                          {p.estimated && <Badge variant="warning">Est.</Badge>}
                          {p.mediaLosing && <Badge variant="destructive">Media losing</Badge>}
                        </div>
                        {/* Lifecycle rides in the product cell rather than
                            taking a column of its own — it's filterable
                            above, so hiding it entirely would leave a filter
                            acting on something the table never shows. */}
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span>{p.sku}</span>
                          <span className="text-border">·</span>
                          <LifecycleTag stage={p.lifecycleStage} />
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right"><span className="tabular">{money(p.revenue)}</span></TableCell>
                  <TableCell className="text-right"><span className="tabular">{money(p.adSpend)}</span></TableCell>
                  <TableCell className="text-right"><Money v={p.cm1} /> <span className="text-[11px] text-muted-foreground">{pct(p.cm1Pct)}</span></TableCell>
                  <TableCell className="text-right"><Money v={p.cm2} /></TableCell>
                  <TableCell className="text-right">
                    {p.delta ? (
                      <span className={cn("tabular text-sm", p.delta.cm2.dir === "up" && "text-ia-positive", p.delta.cm2.dir === "down" && "text-ia-negative", p.delta.cm2.dir === "flat" && "text-muted-foreground")}>
                        {signedMoney(p.delta.cm2.abs).text}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={cn("tabular", p.cmRoas < 1 && "text-destructive")}>{multiple(p.cmRoas)}</span>
                    {p.delta?.cmRoas?.dir !== "flat" && p.delta?.cmRoas?.abs != null && (
                      <div className={cn("tabular text-[10px]", p.delta.cmRoas.dir === "up" ? "text-ia-positive" : "text-ia-negative")}>
                        {signedMultiple(p.delta.cmRoas.abs).text}
                      </div>
                    )}
                  </TableCell>
                  <TableCell><MediaVerdict p={p} /></TableCell>
                  <TableCell><QuadrantTag q={p.quadrant} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {!loading && rows.length > 0 && <TablePagination itemsFound={rows.length} />}
      </Card>
    </PageContainer>
  );
}

// useSearchParams needs a Suspense boundary or the whole route opts out of
// static rendering.
export default function ProductsPage() {
  return (
    <Suspense fallback={<PageContainer><Skeleton className="h-96 w-full rounded-card" /></PageContainer>}>
      <ProductsView />
    </Suspense>
  );
}
