"use client";

import { useRouter } from "next/navigation";
import { MousePointerClick } from "lucide-react";
import { getWebsite } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { FUNNEL_VERDICT_META } from "@/lib/compute/funnel";
import { PageHeader, PageContainer } from "@/components/PageHeader";
import { ProductThumb } from "@/components/ProductThumb";
import { KpiCard } from "@/components/ui/KpiCard";
import { ChartCard } from "@/components/ChartCard";
import { FunnelSteps } from "@/components/charts/FunnelSteps";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { pct } from "@/lib/format";
import { cn } from "@/lib/utils";

function VerdictBadge({ verdict }) {
  const meta = FUNNEL_VERDICT_META[verdict];
  if (verdict === "healthy") return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <Badge variant={verdict === "lowinterest" ? "destructive" : "warning"} title={meta.desc}>
      {meta.label}
    </Badge>
  );
}

export default function WebsitePage() {
  const router = useRouter();
  const { data, loading } = useAsync(() => getWebsite(), []);

  // The single worst "traffic in, no sales out" offender — the page's takeaway.
  const worst = (data?.products || []).find((p) => p.verdict === "lowinterest");

  return (
    <PageContainer>
      <PageHeader
        eyebrow="On-site behavior · Tally Web Pixel"
        title="Website"
        description="What visitors actually do between landing and buying — collected first-party via Shopify's Web Pixels API, reconciled against real orders."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading || !data
          ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)
          : (
            <>
              <KpiCard label="Sessions" value={data.sessions.toLocaleString()} unit="raw" sub="this period, all sources" delta={4.2} spark={data.weekly.map((w) => w.sessions / 1000)} />
              <KpiCard label="Session → order rate" value={data.sessionConvPct} unit="pct" sub={`${data.orders.toLocaleString()} orders`} delta={0.8} spark={data.weekly.map((w) => w.convPct)} />
              <KpiCard label="Product views" value={data.storeFunnel[0].value.toLocaleString()} unit="raw" sub="across all product pages" delta={3.1} />
              <KpiCard label="View → purchase" value={data.catalogAvg.viewToPurchasePct} unit="pct" sub="catalog average" delta={-0.3} />
            </>
          )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Where visitors drop off" subtitle="The store-wide path from a product view to a sale">
          {loading || !data ? <Skeleton className="h-48 w-full" /> : <FunnelSteps steps={data.storeFunnel} />}
        </ChartCard>

        <ChartCard title="Where sessions come from" subtitle="Sessions and real conversion by source — paid vs earned">
          {loading || !data ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="space-y-2.5">
              {data.sources.map((s) => {
                const max = data.sources[0].sessions;
                return (
                  <div key={s.id}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <span className="size-2 rounded-full" style={{ background: s.color }} />
                        {s.name}
                        {s.paid && <Badge variant="outline">Paid</Badge>}
                      </span>
                      <span className="tabular text-muted-foreground">
                        {s.sessions.toLocaleString()} sessions · <span className={cn("font-semibold", s.convPct >= data.sessionConvPct ? "text-success" : "text-foreground/70")}>{pct(s.convPct)}</span> convert
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-black/[0.05]">
                      <div className="h-full rounded-full" style={{ width: `${(s.sessions / max) * 100}%`, background: s.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>
      </div>

      {!loading && worst && (
        <Card className="flex items-start gap-3 border-destructive/25 bg-destructive/[0.04] p-4">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-destructive/15 text-destructive">
            <MousePointerClick className="size-4" />
          </span>
          <p className="text-sm">
            <span className="font-semibold">{worst.name}</span> gets the most product views in the catalog ({worst.views.toLocaleString()}) but only{" "}
            <span className="tabular font-semibold">{pct(worst.viewToAtcPct)}</span> add it to cart — vs {pct(data.catalogAvg.viewToAtcPct)} catalog average. Traffic isn't the problem;
            the product page or the product itself is. Fix the page (photos, sizing info, reviews) before spending another ad dollar driving traffic to it.
          </p>
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border p-4">
          <h3 className="text-sm font-semibold">Funnel by product</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Each stage's conversion vs the catalog average — the verdict says which fix each product actually needs.</p>
        </div>
        {loading || !data ? (
          <div className="space-y-2 p-4">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="text-right">View → cart</TableHead>
                <TableHead className="text-right">Cart → checkout</TableHead>
                <TableHead className="text-right">Units sold</TableHead>
                <TableHead className="text-right">Overall conv.</TableHead>
                <TableHead>Verdict</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.products.map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => router.push(`/products/${p.id}`)}>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      <ProductThumb id={p.id} name={p.name} size={28} />
                      <span className="text-sm font-medium">{p.name}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular">{p.views.toLocaleString()}</TableCell>
                  <TableCell className={cn("text-right tabular", p.verdict === "lowinterest" && "font-semibold text-destructive")}>{pct(p.viewToAtcPct)}</TableCell>
                  <TableCell className={cn("text-right tabular", p.verdict === "checkoutdrop" && "font-semibold text-warning")}>{pct(p.atcToCheckoutPct)}</TableCell>
                  <TableCell className="text-right tabular">{p.units.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular">{pct(p.overallConvPct)}</TableCell>
                  <TableCell><VerdictBadge verdict={p.verdict} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </PageContainer>
  );
}
