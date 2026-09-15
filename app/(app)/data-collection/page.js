"use client";

import { useEffect, useMemo, useState } from "react";
import { Database, Upload, Lock, Sparkles, SlidersHorizontal, Check, TriangleAlert } from "lucide-react";
import { getDataCollection, updateSkuData } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { deriveSku } from "@/lib/compute/margin";
import { computeCompleteness, overallReadiness } from "@/lib/dataFields";
import { PageHeader, PageContainer } from "@/components/PageHeader";
import { ProductThumb } from "@/components/ProductThumb";
import { SkuDetailSheet } from "@/components/data/SkuDetailSheet";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableToolbar,
} from "@/components/ui/table";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogPrimitive } from "@/components/ui/dialog";
import { money, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

function ShopifyHead({ children }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Lock className="size-3 text-muted-foreground/50" /> {children}
    </span>
  );
}

// Inline editable numeric cell.
function InlineNum({ value, onCommit, estimated, prefix = "$" }) {
  return (
    <div className="relative w-28">
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span>
      <Input
        type="number"
        inputMode="decimal"
        value={value ?? ""}
        placeholder="—"
        onChange={(e) => onCommit(e.target.value === "" ? null : Number(e.target.value))}
        className={cn("h-8 pl-5 text-sm tabular", estimated && "border-warning/40 text-warning")}
      />
    </div>
  );
}

function ReadinessPanel({ readiness }) {
  return (
    <Card className="p-5">
      <div className="grid gap-5 lg:grid-cols-[200px_1fr] lg:gap-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" /> Model readiness
          </div>
          <div className="tabular mt-1 text-4xl font-semibold">{readiness.pct}%</div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-ia-gray">
            <div className="h-full rounded-full bg-[image:var(--gradient-primary-button)]" style={{ width: `${readiness.pct}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            More complete data = more accurate margins, forecasts, and suggestions.
          </p>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {readiness.predictions.map((p) => {
            const ready = p.ready === p.total;
            return (
              <div key={p.id} className="flex items-center gap-3 rounded-input shadow-ring bg-ia-gray-faded px-3 py-2.5">
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-button", ready ? "bg-success/15 text-success" : "bg-warning/15 text-warning")}>
                  {ready ? <Check className="size-4" /> : <TriangleAlert className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.label}</div>
                  <div className="text-[11px] text-muted-foreground">{p.ready}/{p.total} SKUs ready</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function ImportDialog() {
  const [done, setDone] = useState(false);
  return (
    <Dialog onOpenChange={(o) => !o && setDone(false)}>
      <DialogTrigger asChild>
        <Button variant="outline"><Upload className="size-4" /> Import CSV</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import cost data</DialogTitle>
          <DialogDescription>Bulk-fill manufacturing, delivery, and supplier data from a spreadsheet.</DialogDescription>
        </DialogHeader>
        {done ? (
          <div className="flex items-center gap-3 rounded-input border border-success/30 bg-success/[0.06] p-4 text-sm">
            <Check className="size-4 text-success" /> Imported. Margins and predictions will recompute on the next sync.
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">Expected columns (SKU is the match key):</p>
            <code className="block overflow-x-auto rounded-input shadow-ring bg-surface-subtle px-3 py-2 text-xs text-foreground/80">
              sku, manufacturing_cost, delivery_cost, packaging_cost, lead_time_days, moq, supplier, payment_terms
            </code>
            <textarea
              rows={4}
              placeholder="Paste CSV rows here…"
              className="w-full resize-none rounded-input border border-input bg-transparent p-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>
        )}
        {!done && (
          <DialogFooter>
            <DialogPrimitive.Close asChild><Button variant="ghost">Cancel</Button></DialogPrimitive.Close>
            <Button onClick={() => setDone(true)}>Import</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function DataCollectionPage() {
  const { data, loading } = useAsync(() => getDataCollection(), []);
  const [rows, setRows] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (data) setRows(data);
  }, [data]);

  const derived = useMemo(
    () => (rows ? rows.map((r) => ({ raw: r, d: deriveSku(r), c: computeCompleteness(r) })) : []),
    [rows]
  );
  const readiness = useMemo(() => (rows ? overallReadiness(rows) : null), [rows]);

  function patchRow(id, patch) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    updateSkuData(id, patch);
  }

  function saveSheet(draft) {
    setRows((prev) => prev.map((r) => (r.id === draft.id ? draft : r)));
    updateSkuData(draft.id, draft);
    setSelected(null);
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Feed the engine"
        title="Data Collection"
        description="Shopify gives us sales. You give us the costs and operations it can't — the inputs that make margins true and predictions accurate."
      >
        <ImportDialog />
      </PageHeader>

      {readiness ? <ReadinessPanel readiness={readiness} /> : <Skeleton className="h-32 w-full" />}

      <Card className="overflow-hidden p-0">
        <TableToolbar
          title="Cost inputs by SKU"
          description="Locked columns are fetched from Shopify · editable columns are yours to fill."
        />
        <div className="flex items-center gap-2 border-y border-border bg-surface-subtle px-6 py-2.5 text-[12px] leading-4 text-muted-foreground">
          <Lock className="size-3.5 shrink-0" /> Locked columns are read-only.
        </div>
        {loading || !rows ? (
          <div className="space-y-2 p-4">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-11 w-full" />)}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Product</TableHead>
                <TableHead className="text-right"><ShopifyHead>On-hand</ShopifyHead></TableHead>
                <TableHead className="text-right"><ShopifyHead>Units</ShopifyHead></TableHead>
                <TableHead>Mfg $/unit</TableHead>
                <TableHead>Delivery $/unit</TableHead>
                <TableHead>Packaging $/unit</TableHead>
                <TableHead className="text-right">CM1 (live)</TableHead>
                <TableHead>Data</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {derived.map(({ raw, d, c }) => (
                <TableRow key={raw.id} className="hover:bg-transparent">
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <ProductThumb id={raw.id} name={raw.name} size={34} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium">{raw.name}</span>
                          {d.estimated && <Badge variant="warning">Est. cost</Badge>}
                          {d.stockoutRisk && <Badge variant="destructive">Stockout risk</Badge>}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{raw.sku}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="tabular text-sm">{raw.onHand?.toLocaleString() ?? "—"}</span>
                    {d.daysOfCover != null && <div className="text-[10px] text-muted-foreground">{d.daysOfCover}d cover</div>}
                  </TableCell>
                  <TableCell className="text-right tabular text-sm">{raw.units.toLocaleString()}</TableCell>
                  <TableCell><InlineNum value={raw.manufacturingCost} estimated={d.estimated} onCommit={(v) => patchRow(raw.id, { manufacturingCost: v, costSource: "real" })} /></TableCell>
                  <TableCell><InlineNum value={raw.deliveryCost} onCommit={(v) => patchRow(raw.id, { deliveryCost: v })} /></TableCell>
                  <TableCell><InlineNum value={raw.packagingCost} onCommit={(v) => patchRow(raw.id, { packagingCost: v })} /></TableCell>
                  <TableCell className="text-right">
                    <span className={cn("tabular text-sm", d.cm1 < 0 && "text-destructive")}>{money(d.cm1)}</span>
                    <div className="text-[10px] text-muted-foreground">{pct(d.cm1Pct)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-ia-gray">
                        <div className={cn("h-full rounded-full", c.pct === 100 ? "bg-success" : "bg-warning")} style={{ width: `${c.pct}%` }} />
                      </div>
                      <span className="tabular text-[11px] text-muted-foreground">{c.pct}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => setSelected(raw)}>
                      <SlidersHorizontal className="size-3.5" /> Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Database className="size-3.5" /> Tip: completing supplier lead times and terms unlocks reorder alerts and the cash-flow forecast in Phase 2.
      </p>

      <SkuDetailSheet open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)} sku={selected} onSave={saveSheet} />
    </PageContainer>
  );
}
