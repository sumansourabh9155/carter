"use client";

import Link from "next/link";
import { useState } from "react";
import { Database, Bell, Mail, ArrowRight } from "lucide-react";
import { getProducts } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { PageHeader, PageContainer } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

function Row({ title, desc, control }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      {control}
    </div>
  );
}

export default function SettingsPage() {
  const { data: products } = useAsync(() => getProducts(), []);
  const total = products?.length || 0;
  const withCogs = products?.filter((p) => !p.estimated).length || 0;
  const [negCm2, setNegCm2] = useState(true);
  const [overspend, setOverspend] = useState(true);
  const [emailDigest, setEmailDigest] = useState(true);

  return (
    <PageContainer>
      <PageHeader eyebrow="Configuration" title="Settings" description="Cost data, alert thresholds, and notifications." />

      {/* COGS coverage — load-bearing for trustworthy margins */}
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-9 place-items-center rounded-input bg-primary/10 text-primary"><Database className="size-4.5" /></span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Cost of goods (COGS)</h3>
              {total > 0 && withCogs < total && <Badge variant="warning">{total - withCogs} estimated</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {withCogs} of {total} SKUs have real costs entered. Margins for the rest use a category default and are flagged "Estimated".
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/products">Manage COGS <ArrowRight className="size-3.5" /></Link>
          </Button>
        </div>
      </Card>

      {/* Alert thresholds */}
      <Card className="p-5">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold"><Bell className="size-4 text-muted-foreground" /> Alert thresholds</h3>
        <Separator className="my-2" />
        <Row title="Negative-CM2 product" desc="Notify when a product loses money after ads for 3+ days." control={<Switch checked={negCm2} onCheckedChange={setNegCm2} />} />
        <Separator />
        <Row title="Ad overspend" desc="Notify when a campaign paces over budget below break-even CM-ROAS." control={<Switch checked={overspend} onCheckedChange={setOverspend} />} />
        <Separator />
        <Row title="Cash runway floor" desc="Needs the cash engine — available in Phase 2." control={<Badge variant="outline">Phase 2</Badge>} />
      </Card>

      {/* Notifications */}
      <Card className="p-5">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold"><Mail className="size-4 text-muted-foreground" /> Notifications</h3>
        <Separator className="my-2" />
        <Row title="Daily email digest" desc="A morning summary of profit, alerts, and what to do." control={<Switch checked={emailDigest} onCheckedChange={setEmailDigest} />} />
      </Card>
    </PageContainer>
  );
}
