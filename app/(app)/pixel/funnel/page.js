"use client";

/*
  Audience & Funnel — who shows up, where from, and what they do.

  This absorbed three blocks from the Reporting page, each of which answers
  "who / where from" rather than "what did it earn":

    · paid vs earned      — a traffic fact. It was a strip on Reporting AND
                            a source list here; now it is one thing, derived
                            from the sources this page already loads. That
                            also removed a duplicate getWebsite() fetch.
    · new vs returning    — customer mix is an audience question.
    · audience by device / age / geography — same.

  The audience data comes from the ad platforms (the paid slice only) while
  the funnel comes from the Carter Web Pixel (everyone). That is a real
  difference in provenance, so each block says which source it is reading
  rather than letting the page imply one number covers both.

  NOT here: channel and campaign economics (Insights › Channels) and per-SKU
  margin (Products). This page reports behaviour, not money earned.
*/

import { useRouter } from "next/navigation";
import { MousePointerClick, Users } from "lucide-react";
import { getWebsite, getMarketing } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { FUNNEL_VERDICT_META } from "@/lib/compute/funnel";
import { PageHeader, PageContainer } from "@/components/PageHeader";
import { ProductThumb } from "@/components/ProductThumb";
import { KpiCard } from "@/components/ui/KpiCard";
import { ChartCard } from "@/components/ChartCard";
import { FunnelSteps } from "@/components/charts/FunnelSteps";
import { AudienceBreakdown } from "@/components/charts/AudienceBreakdown";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableToolbar,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/ui/LoadError";
import { money, pct, multiple } from "@/lib/format";
import { cn } from "@/lib/utils";

function VerdictBadge({ verdict }) {
  const meta = FUNNEL_VERDICT_META[verdict];
  if (verdict === "healthy") return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <Badge variant={verdict === "lowinterest" ? "negative" : "notice"} title={meta.desc}>
      {meta.label}
    </Badge>
  );
}

// Two-segment share bar — used for paid/earned and new/returning, which are
// the same shape of fact told about different populations.
function SplitBar({ label, aPct, bPct, aColor = "bg-primary", bColor = "bg-emerald-500/70", right }) {
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-xs">
        <span className="font-medium">{label}</span>
        {right && <span className="tabular text-muted-foreground">{right}</span>}
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-ia-gray">
        <div className={cn("h-full", aColor)} style={{ width: `${aPct}%` }} />
        <div className={cn("h-full", bColor)} style={{ width: `${bPct}%` }} />
      </div>
    </div>
  );
}

/*
  THE FRAME FOR EVERY OTHER NUMBER ON THIS PAGE, and for the whole Channels
  view on Insights: ad budget can only move the paid slice. Derived from the
  traffic sources this page already loads rather than from a second fetch.
*/
function PaidVsEarnedCard({ web }) {
  if (!web) return <Skeleton className="h-[120px] w-full rounded-card" />;

  const paid = web.sources.filter((s) => s.paid).reduce((a, s) => a + s.orders, 0);
  const paidPct = Math.round((paid / web.orders) * 1000) / 10;
  const earned = web.orders - paid;

  return (
    <Card className="p-4">
      <SplitBar
        label={`Ads drive ${pct(paidPct)} of your orders`}
        aPct={paidPct}
        bPct={100 - paidPct}
        right={`${paid.toLocaleString()} paid · ${earned.toLocaleString()} earned of ${web.orders.toLocaleString()} orders`}
      />
      {/* The {" "} is load-bearing: JSX strips whitespace that spans a line
          break, so an expression followed by a newline renders as "64.5%comes". */}
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        The other {pct(Math.round((100 - paidPct) * 10) / 10)}{" "}
        comes from organic, direct and email — earned demand ad budget can&apos;t buy. Every CM-ROAS figure in Insights
        covers the paid slice only.
      </p>
    </Card>
  );
}

export default function AudienceFunnelPage() {
  const router = useRouter();
  const { data, loading, error } = useAsync(() => getWebsite(), []);
  // Audience + customer mix come off the ad platforms, not the pixel — a
  // separate read, and labelled as such wherever it renders. It fails
  // independently too, so it reports independently.
  const { data: mkt, error: mktError } = useAsync(() => getMarketing(), []);

  // The single worst "traffic in, no sales out" offender — the page's takeaway.
  const worst = (data?.products || []).find((p) => p.verdict === "lowinterest");

  return (
    <PageContainer>
      <PageHeader
        eyebrow="On-site behavior · Carter Web Pixel"
        title="Audience & Funnel"
        description="Who arrives, where they come from, and what they do between landing and buying — first-party via Shopify's Web Pixels API, reconciled against real orders."
      />

      {error && <LoadError what="on-site pixel data" error={error} />}

      <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", error && "hidden")}>
        {loading || !data
          ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)
          : (
            <>
              <KpiCard label="Sessions" value={data.sessions.toLocaleString()} unit="raw" sub="this period, all sources" spark={data.weekly.map((w) => w.sessions / 1000)} />
              <KpiCard label="Session → order rate" value={data.sessionConvPct} unit="pct" sub={`${data.orders.toLocaleString()} orders`} spark={data.weekly.map((w) => w.convPct)} />
              <KpiCard label="Product views" value={data.storeFunnel[0].value.toLocaleString()} unit="raw" sub="across all product pages" />
              <KpiCard label="View → purchase" value={data.catalogAvg.viewToPurchasePct} unit="pct" sub="catalog average" />
            </>
          )}
      </div>

      {!error && <PaidVsEarnedCard web={data} />}

      <div className={cn("grid gap-4 lg:grid-cols-2", error && "hidden")}>
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
                        {s.paid && <Badge variant="outline" size="sm">Paid</Badge>}
                      </span>
                      <span className="tabular text-muted-foreground">
                        {s.sessions.toLocaleString()} sessions · <span className={cn("font-semibold", s.convPct >= data.sessionConvPct ? "text-ia-positive" : "text-foreground/70")}>{pct(s.convPct)}</span> convert
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-ia-gray">
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
        <Card className="relative flex items-start gap-3 overflow-hidden p-4 pl-5">
          <span className="absolute left-0 top-0 h-full w-[3px] bg-ia-negative" />
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-input bg-ia-negative-faded text-destructive">
            <MousePointerClick className="size-4" />
          </span>
          <p className="text-sm">
            <span className="font-semibold">{worst.name}</span> gets the most product views in the catalog ({worst.views.toLocaleString()}) but only{" "}
            <span className="tabular font-semibold">{pct(worst.viewToAtcPct)}</span> add it to cart — vs {pct(data.catalogAvg.viewToAtcPct)} catalog average. Traffic isn&apos;t the problem;
            the product page or the product itself is. Fix the page (photos, sizing info, reviews) before spending another ad dollar driving traffic to it.
          </p>
        </Card>
      )}

      {/* --- who, from the ad platforms ------------------------------------ */}
      <div>
        <div className="mb-3 flex items-start gap-2">
          <Users className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <h2 className="text-[16px] font-semibold leading-6 text-brand-800">Who your ad dollars reach — and who pays off</h2>
            <p className="mt-0.5 text-[12px] leading-4 text-neutral-500">
              From your ad platforms&apos; audience reporting, so this covers <span className="font-medium">paid orders only</span> — not the
              earned traffic above. Bar = share of ad spend · chip = CM-ROAS against your{" "}
              {mkt ? `${multiple(mkt.audience.blendedCmRoas)} blended` : "blended"} rate.
            </p>
          </div>
        </div>

        {mktError ? (
          <LoadError what="ad-platform audience data" error={mktError} />
        ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {!mkt
            ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-64 w-full" />)
            : [
                { key: "device", title: "By device" },
                { key: "age", title: "By age" },
                { key: "geography", title: "By geography" },
              ].map(({ key, title }) => (
                <ChartCard key={key} title={title} subtitle={mkt.audience[key].label}>
                  <AudienceBreakdown segments={mkt.audience[key].segments} blendedCmRoas={mkt.audience.blendedCmRoas} />
                </ChartCard>
              ))}
        </div>
        )}
      </div>

      <ChartCard title="New vs. returning customers" subtitle="Who's actually driving revenue this period">
        {mktError ? (
          <p className="text-xs text-muted-foreground">Ad-platform customer mix is unavailable right now.</p>
        ) : !mkt ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="space-y-4">
            <SplitBar
              label="Revenue"
              aPct={mkt.customerMix.newRevenuePct}
              bPct={mkt.customerMix.returningRevenuePct}
              bColor="bg-sky-400"
              right={`${pct(mkt.customerMix.newRevenuePct)} new · ${pct(mkt.customerMix.returningRevenuePct)} returning`}
            />
            <SplitBar
              label="Orders (ad-attributed)"
              aPct={mkt.customerMix.newOrdersPct}
              bPct={mkt.customerMix.returningOrdersPct}
              bColor="bg-sky-400"
              right={`${pct(mkt.customerMix.newOrdersPct)} new · ${pct(mkt.customerMix.returningOrdersPct)} returning`}
            />
            <div className="flex flex-wrap gap-4 pt-1 text-xs text-muted-foreground">
              <span><span className="mr-1.5 inline-block size-2 rounded-full bg-primary" />New — {money(mkt.customerMix.newRevenue)} · {money(mkt.customerMix.newAov)} AOV</span>
              <span><span className="mr-1.5 inline-block size-2 rounded-full bg-sky-400" />Returning — {money(mkt.customerMix.returningRevenue)} · {money(mkt.customerMix.returningAov)} AOV</span>
            </div>

            {/* WHICH CHANNEL DOES WHICH JOB. This is what the mix is for:
                prospecting and retention are funded differently, and until
                the split was derived from per-source order counts the
                product could not say which channel was doing which. */}
            {mkt.customerMix.topAcquirer && mkt.customerMix.topRetainer && (
              <p className="rounded-input bg-ia-gray-faded px-3 py-2.5 text-[12px] leading-relaxed text-foreground/90 shadow-ring">
                <span className="font-semibold">{mkt.customerMix.topAcquirer.name}</span> is doing the recruiting —{" "}
                {pct(mkt.customerMix.topAcquirer.newSharePct)} of its orders are first-time buyers.{" "}
                <span className="font-semibold">{mkt.customerMix.topRetainer.name}</span> is almost entirely repeat at{" "}
                {pct(mkt.customerMix.topRetainer.newSharePct)} new, so judging it on CM-ROAS alone undersells what it does.
                Repeat orders are {mkt.customerMix.repeatAovMultiple}× the basket of a first order.
              </p>
            )}
          </div>
        )}
      </ChartCard>

      <Card className={cn("overflow-hidden p-0", error && "hidden")}>
        <TableToolbar
          title="Funnel by product"
          description="Each stage's conversion vs the catalog average — the verdict says which fix each product actually needs."
        />
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
