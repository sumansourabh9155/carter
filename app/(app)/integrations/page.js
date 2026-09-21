"use client";

import { useState } from "react";
import { Check, RefreshCw, MousePointerClick, Radio, ServerCog } from "lucide-react";
import { PageHeader, PageContainer } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/*
  Sources feeding the collection edge. Commerce sources (Shopify) stay —
  they're what makes margin true — alongside Carter's own channel feeds and
  server-side conversion APIs, which are what make credited revenue true.
  Grouped so the two jobs read distinctly.
*/
const INITIAL_CONNECTIONS = [
  // Commerce — the cost + order spine
  { id: "shopify", name: "Shopify", logo: "shopify.svg", status: "connected", detail: "Orders, products, catalogue · synced 8m ago", group: "Commerce" },
  { id: "webpixel", name: "Carter Pixel", icon: MousePointerClick, status: "connected", detail: "On-site behavior via Shopify Web Pixels API · streaming live", group: "Commerce" },

  // Channels — spend & catalog
  { id: "meta", name: "Meta Ads", logo: "meta.svg", status: "connected", detail: "Spend & catalog · synced 12m ago", group: "Channels" },
  { id: "google", name: "Google Ads", logo: "google.svg", status: "connected", detail: "Spend & conversions · synced 15m ago", group: "Channels" },
  { id: "tiktok", name: "TikTok Ads", logo: "tiktok.svg", status: "connected", detail: "Spend & catalog · synced 5m ago", group: "Channels" },
  { id: "snapchat", name: "Snapchat Ads", logo: "snapchat.svg", status: "connected", detail: "Spend & catalog · synced 10m ago", group: "Channels" },
  { id: "twitter", name: "X (Twitter) Ads", logo: "x.svg", status: "connected", detail: "Spend & catalog · synced 18m ago", group: "Channels" },
  { id: "dv360", name: "DV360", icon: Radio, status: "available", detail: "Floodlight logs · real-time, <10 min freshness", group: "Channels" },
  { id: "ttd", name: "The Trade Desk", icon: Radio, status: "available", detail: "Channel logs via S3 · hourly", group: "Channels" },

  // Server-side — dedup & match rate
  { id: "metacapi", name: "Meta CAPI", icon: ServerCog, status: "connected", detail: "Server-side conversions · dedupes against pixel", group: "Server-side" },
  { id: "tiktokevents", name: "TikTok Events API", icon: ServerCog, status: "connected", detail: "Server-side conversions · synced 6m ago", group: "Server-side" },
  { id: "snapcapi", name: "Snapchat CAPI", icon: ServerCog, status: "available", detail: "Improves match rate on Snapchat spend", group: "Server-side" },

];

// Bank and accounting connectors were removed: treasury and bookkeeping are
// merchant finance, not retail media. Carter measures money that moves through
// campaigns, not the advertiser's books.
const GROUP_ORDER = ["Commerce", "Channels", "Server-side"];

function StatusBadge({ status }) {
  if (status === "connected") return <Badge variant="success"><Check className="size-3" /> Connected</Badge>;
  if (status === "available") return <Badge variant="outline">Not connected</Badge>;
  return <Badge variant="secondary">Phase 2+</Badge>;
}

export default function IntegrationsPage() {
  const [connections, setConnections] = useState(INITIAL_CONNECTIONS);
  const [syncingId, setSyncingId] = useState(null);

  function sync(id) {
    setSyncingId(id);
    setTimeout(() => {
      setConnections((prev) =>
        prev.map((c) => (c.id === id ? { ...c, detail: c.detail.replace(/synced .+$/, "synced just now") } : c))
      );
      setSyncingId(null);
    }, 700);
  }

  return (
    <PageContainer>
      <PageHeader eyebrow="Your data sources" title="Integrations" description="Connect once; Carter keeps everything reconciled. Sync health is shown — never a silent failure." />
      {GROUP_ORDER.map((group) => {
        const rows = connections.filter((c) => c.group === group);
        if (!rows.length) return null;
        return (
          <div key={group}>
            <div className="mb-2 text-[12px] font-semibold leading-[18px] text-[#587b89]">{group}</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {rows.map((c) => (
          <Card key={c.id} className="flex items-center gap-4 p-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-card shadow-ring bg-white p-2.5">
              {c.icon ? (
                <c.icon className="size-5 text-muted-foreground" />
              ) : (
                <img src={`/logos/${c.logo}`} alt={c.name} className="h-full w-full object-contain" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{c.name}</span>
                <StatusBadge status={c.status} />
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.detail}</p>
            </div>
            {c.status === "connected" ? (
              <Button variant="ghost" size="sm" onClick={() => sync(c.id)} disabled={syncingId === c.id}>
                <RefreshCw className={cn("size-3.5", syncingId === c.id && "animate-spin")} />
                {syncingId === c.id ? "Syncing…" : "Sync"}
              </Button>
            ) : c.status === "available" ? (
              <Button size="sm">Connect</Button>
            ) : (
              <Button size="sm" variant="outline" disabled>Soon</Button>
            )}
          </Card>
              ))}
            </div>
          </div>
        );
      })}
    </PageContainer>
  );
}
