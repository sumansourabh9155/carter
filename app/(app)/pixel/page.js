"use client";

import { Check, Plus, Code2, Radio, Pause, Trash2, ChevronDown } from "lucide-react";
import { PageHeader, PageContainer } from "@/components/PageHeader";
import { Card, CardHeading } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableToolbar,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/*
  Pixel Setup — Carter's "Pixel & Events → Pixel Setup" screen, populated with
  this store's real collection edge. Carter owns the pixel; this app reads the
  same event stream to build the on-site funnel (see /pixel/funnel), so the two
  halves are one section rather than two competing trackers.
*/
const STEPS = [
  { n: 1, title: "Drop the snippet", detail: "One async script in your <head>.", done: true },
  { n: 2, title: "Tag page types", detail: "data-page-type on <body>.", done: true },
  { n: 3, title: "Verify events", detail: "Confirm events fire in real time.", done: true },
  { n: 4, title: "Set up CAPI", detail: "Server-side feeds for dedup.", done: false },
];

const PIXELS = [
  { name: "Coastal Active storefront", id: "CRT-3467-FF9D", domain: "coastalactive.myshopify.com", created: "11 Sept 2026, 21:37" },
  { name: "Coastal Active storefront", id: "CRT-CF22-C5E0", domain: "coastalactive.myshopify.com", created: "3 Sept 2026, 02:22" },
  { name: "Coastal Active checkout", id: "CRT-C129-4251", domain: "coastalactive.myshopify.com", created: "31 Aug 2026, 15:02" },
];

const CONNECTIONS = [
  { name: "Pixel events", state: "receiving" },
  { name: "Shopify orders", state: "receiving" },
  { name: "Meta CAPI", state: "receiving" },
  { name: "Google Ads", state: "receiving" },
  { name: "TikTok Events API", state: "receiving" },
  { name: "Snapchat CAPI", state: "connect" },
];

const EVENT_HEALTH = [
  { event: "page_view", volume: "4.21M", delivery: 99.8 },
  { event: "view_item", volume: "1.88M", delivery: 99.4 },
  { event: "add_to_cart", volume: "612K", delivery: 98.1 },
  { event: "begin_checkout", volume: "288K", delivery: 96.2 },
  { event: "purchase", volume: "198K", delivery: 99.9 },
  { event: "login", volume: "162K", delivery: 99.1 },
  { event: "search", volume: "402K", delivery: 91.4 },
];

const PAGE_TYPE_MAP = [
  { type: "home", events: ["page_view"] },
  { type: "category", events: ["page_view", "view_item_list"] },
  { type: "product", events: ["page_view", "view_item"] },
  { type: "search", events: ["page_view", "search"] },
  { type: "cart", events: ["page_view"] },
  { type: "checkout", events: ["page_view", "begin_checkout", "add_payment_info"] },
  { type: "confirmation", events: ["page_view", "purchase"] },
  { type: "account", events: ["login", "sign_up"] },
];

const SOURCES = [
  { name: "Pixel", transport: "HTTPS → Kafka", cadence: "Real-time", freshness: "<5 min", status: "live" },
  { name: "Shopify Orders API", transport: "HTTPS + webhook", cadence: "Real-time", freshness: "<5 min", status: "live" },
  { name: "Meta CAPI", transport: "HTTPS + webhook", cadence: "Real-time", freshness: "<10 min", status: "live" },
  { name: "Google Ads logs", transport: "S3", cadence: "Hourly", freshness: "<2 hr", status: "live" },
  { name: "TikTok Events API", transport: "HTTPS", cadence: "Real-time", freshness: "<10 min", status: "live" },
  { name: "Snapchat CAPI", transport: "HTTPS", cadence: "Real-time", freshness: "elevated latency 14 min", status: "lag" },
];

function StepRail() {
  return (
    <Card className="px-6 py-5">
      <div className="flex flex-wrap items-center gap-y-4">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex flex-1 items-center gap-3">
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold",
                s.done ? "bg-ia-positive text-white" : "bg-ia-gray text-ia-text-gray"
              )}
            >
              {s.done ? <Check className="size-4" /> : s.n}
            </span>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold leading-5">{s.title}</div>
              <div className="text-[12px] leading-4 text-neutral-500">{s.detail}</div>
            </div>
            {i < STEPS.length - 1 && <span className="mx-2 hidden h-px flex-1 bg-border lg:block" />}
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function PixelSetupPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Measurement · collection edge"
        title="Pixel & Events"
        description="A lightweight, page-type-aware JavaScript pixel. One snippet in the site header fires the right events automatically — no per-page custom code."
      />

      <StepRail />

      <Card className="overflow-hidden p-0">
        <TableToolbar title="Pixels" description={`${PIXELS.length} pixels in this tenant`}>
          <Button><Plus /> Create pixel</Button>
        </TableToolbar>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pixel</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PIXELS.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-[12px] text-neutral-500">{p.id}</div>
                </TableCell>
                <TableCell className="text-muted-foreground">{p.domain}</TableCell>
                <TableCell><Badge variant="positive">● Active</Badge></TableCell>
                <TableCell className="text-muted-foreground">{p.created}</TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-1">
                    <Button variant="ghost" size="sm"><Code2 /> Snippet <ChevronDown /></Button>
                    <Button variant="ghost" size="sm"><Radio /> Events <ChevronDown /></Button>
                    <Button variant="outline" size="sm"><Pause /> Pause</Button>
                    <Button variant="destructive" size="sm"><Trash2 /> Delete</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-0">
          <CardHeading title="Data Connections" description="Bundles feeding the collection edge">
            <Badge variant="positive">receiving</Badge>
          </CardHeading>
          <div className="flex flex-wrap gap-2 px-6 pb-5">
            {CONNECTIONS.map((c) => (
              <span key={c.name} className="inline-flex items-center gap-2 rounded-nav bg-card px-2.5 py-1.5 text-[12px] font-medium shadow-ring">
                {c.name}
                {c.state === "receiving" ? (
                  <Badge variant="positive" size="sm">receiving</Badge>
                ) : (
                  <Button size="xs">Connect</Button>
                )}
              </span>
            ))}
          </div>
        </Card>

        <Card className="p-0">
          <CardHeading title="Event Health" description="Volume + delivery rate (last 24h)">
            <Badge variant="notice">6 of 7 healthy</Badge>
          </CardHeading>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead className="text-right">Volume</TableHead>
                <TableHead className="text-right">Delivery</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {EVENT_HEALTH.map((e) => (
                <TableRow key={e.event}>
                  <TableCell className="font-mono text-[13px]">{e.event}</TableCell>
                  <TableCell className="tabular text-right">{e.volume}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-ia-gray">
                        <span
                          className={cn("block h-full rounded-full", e.delivery >= 95 ? "bg-ia-positive" : "bg-ia-notice")}
                          style={{ width: `${e.delivery}%` }}
                        />
                      </span>
                      <span className="tabular w-12 text-right text-[12px]">{e.delivery}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <TableToolbar title="Pixel Event Mapping with Page Type" description="The pixel auto-fires the matching event set per page type" />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>data-page-type</TableHead>
              <TableHead>Auto-fired events</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PAGE_TYPE_MAP.map((r) => (
              <TableRow key={r.type}>
                <TableCell className="font-mono text-[13px]">{r.type}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    {r.events.map((e) => (
                      <span key={e} className="rounded-button bg-surface-subtle px-2 py-0.5 font-mono text-[12px] text-[#486570]">{e}</span>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="overflow-hidden p-0">
        <TableToolbar title="Source Inventory" description="Transport, cadence and freshness per source">
          <Badge variant="notice">1 elevated latency</Badge>
        </TableToolbar>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Transport</TableHead>
              <TableHead>Cadence</TableHead>
              <TableHead>Freshness</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SOURCES.map((s) => (
              <TableRow key={s.name}>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <span className={cn("size-1.5 rounded-full", s.status === "live" ? "bg-brand-500" : "bg-ia-notice")} />
                    <span className="font-semibold">{s.name}</span>
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{s.transport}</TableCell>
                <TableCell className="text-muted-foreground">{s.cadence}</TableCell>
                <TableCell className={cn(s.status === "lag" ? "text-ia-notice" : "text-muted-foreground")}>{s.freshness}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={s.status === "live" ? "positive" : "notice"}>{s.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </PageContainer>
  );
}
