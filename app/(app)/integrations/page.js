"use client";

import { useState } from "react";
import { Check, RefreshCw, Landmark, MousePointerClick } from "lucide-react";
import { PageHeader, PageContainer } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const INITIAL_CONNECTIONS = [
  { id: "shopify", name: "Shopify", logo: "shopify.svg", status: "connected", detail: "Orders, products, payouts · synced 8m ago", phase: 1 },
  { id: "webpixel", name: "Carter Web Pixel", icon: MousePointerClick, status: "connected", detail: "On-site behavior via Shopify Web Pixels API · streaming live", phase: 1 },
  { id: "meta", name: "Meta Ads", logo: "meta.svg", status: "connected", detail: "Spend & catalog · synced 12m ago", phase: 1 },
  { id: "google", name: "Google Ads", logo: "google.svg", status: "connected", detail: "Spend & conversions · synced 15m ago", phase: 1 },
  { id: "tiktok", name: "TikTok Ads", logo: "tiktok.svg", status: "connected", detail: "Spend & catalog · synced 5m ago", phase: 1 },
  { id: "snapchat", name: "Snapchat Ads", logo: "snapchat.svg", status: "connected", detail: "Spend & catalog · synced 10m ago", phase: 1 },
  { id: "twitter", name: "X (Twitter) Ads", logo: "x.svg", status: "connected", detail: "Spend & catalog · synced 18m ago", phase: 1 },
  { id: "bank", name: "Bank", icon: Landmark, status: "phase2", detail: "Powers cash-flow forecasting", phase: 2 },
  { id: "qbo", name: "QuickBooks / Xero", logo: "qbo.svg", status: "phase2", detail: "Two-way accounting sync", phase: 3 },
];

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
      <div className="grid gap-3 sm:grid-cols-2">
        {connections.map((c) => (
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
    </PageContainer>
  );
}
