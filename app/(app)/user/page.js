"use client";

import { PageHeader, PageContainer } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const FIELDS = [
  { label: "Name", value: "Maya Alvarez" },
  { label: "Email", value: "maya@coastalactive.com" },
  { label: "Role", value: "Owner" },
  { label: "Store", value: "Coastal Active · Shopify Growth" },
  { label: "Timezone", value: "America/Los_Angeles" },
];

export default function UserPage() {
  return (
    <PageContainer>
      <PageHeader eyebrow="Account" title="User" description="Your profile and how Tally identifies you." />
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-700 text-lg text-white">MA</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Maya Alvarez</h2>
              <Badge variant="success">Owner</Badge>
            </div>
            <p className="text-sm text-muted-foreground">maya@coastalactive.com</p>
          </div>
          <Button variant="outline" className="ml-auto">Edit profile</Button>
        </div>
        <div className="mt-6 divide-y divide-border border-t border-border">
          {FIELDS.map((f) => (
            <div key={f.label} className="flex items-center justify-between py-3">
              <span className="text-sm text-muted-foreground">{f.label}</span>
              <span className="text-sm font-medium">{f.value}</span>
            </div>
          ))}
        </div>
      </Card>
    </PageContainer>
  );
}
