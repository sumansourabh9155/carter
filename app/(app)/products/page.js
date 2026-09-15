"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, PackageSearch } from "lucide-react";
import { getProducts } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
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
import { money, pct, multiple } from "@/lib/format";
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
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className="size-2 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

function Money({ v }) {
  return <span className={cn("tabular", v < 0 && "text-destructive")}>{money(v)}</span>;
}

export default function ProductsPage() {
  const router = useRouter();
  const { data: products, loading } = useAsync(() => getProducts(), []);
  const [filter, setFilter] = useState("all");
  const [lifecycle, setLifecycle] = useState("all");
  const [q, setQ] = useState("");

  const rows = (products || [])
    .filter((p) => (filter === "all" ? true : p.quadrant === filter))
    .filter((p) => (lifecycle === "all" ? true : p.lifecycleStage === lifecycle))
    .filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Profitability engine"
        title="Products"
        description="Fully-loaded contribution margin per SKU — CM1 → CM2 → CM3, computed from your real costs."
      />

      <div className="flex flex-wrap items-center gap-3">
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

      <Card className="overflow-hidden p-0">
        {/* Section heading lives INSIDE the card, above the table — Carter's
            "Breadcrumb Container" pattern (title over subtitle). */}
        <TableToolbar
          title="All products"
          description="Every SKU ranked by fully-loaded contribution margin."
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
            <p className="max-w-sm text-xs text-muted-foreground">Try a different quadrant, lifecycle stage, or search term.</p>
            <button
              onClick={() => { setFilter("all"); setLifecycle("all"); setQ(""); }}
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
                <TableHead className="text-right">CM1</TableHead>
                <TableHead className="text-right">CM2</TableHead>
                <TableHead className="text-right">CM3</TableHead>
                <TableHead className="text-right">CM-ROAS</TableHead>
                <TableHead>Quadrant</TableHead>
                <TableHead>Lifecycle</TableHead>
                <TableHead>Stock</TableHead>
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
                          {p.losingMoney && <Badge variant="destructive">Losing</Badge>}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{p.sku}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right"><span className="tabular">{money(p.revenue)}</span></TableCell>
                  <TableCell className="text-right"><Money v={p.cm1} /> <span className="text-[11px] text-muted-foreground">{pct(p.cm1Pct)}</span></TableCell>
                  <TableCell className="text-right"><Money v={p.cm2} /></TableCell>
                  <TableCell className="text-right"><Money v={p.cm3} /></TableCell>
                  <TableCell className="text-right"><span className={cn("tabular", p.cmRoas < 1 && "text-destructive")}>{multiple(p.cmRoas)}</span></TableCell>
                  <TableCell><QuadrantTag q={p.quadrant} /></TableCell>
                  <TableCell><LifecycleTag stage={p.lifecycleStage} /></TableCell>
                  <TableCell>
                    {p.stockoutRisk ? (
                      <Badge variant="destructive">Stockout risk</Badge>
                    ) : p.needsReorderNow ? (
                      <Badge variant="warning">Reorder soon</Badge>
                    ) : (
                      <span className="tabular text-xs text-muted-foreground">{p.projectedDaysToStockout ?? "—"}d left</span>
                    )}
                  </TableCell>
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
