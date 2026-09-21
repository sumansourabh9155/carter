"use client";

import { PageHeader, PageContainer } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const FIELDS = [
  { label: "Name", value: "Suman Sourabh" },
  { label: "Email", value: "suman@coastalactive.com" },
  { label: "Role", value: "Owner" },
  { label: "Brand", value: "Coastal Active" },
  { label: "Media under management", value: "$44,500 / month" },
  { label: "Timezone", value: "America/Los_Angeles" },
];

export default function UserPage() {
  return (
    <PageContainer>
      <PageHeader eyebrow="Account" title="User" description="Your profile and how Carter identifies you." />
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="bg-[image:var(--gradient-primary-button)] text-lg text-white">SS</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Suman Sourabh</h2>
              <Badge variant="positive">Owner</Badge>
            </div>
            <p className="text-sm text-muted-foreground">suman@coastalactive.com</p>
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
