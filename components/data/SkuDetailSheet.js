"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ProductThumb } from "@/components/ProductThumb";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FIELD_GROUPS, fieldFilled } from "@/lib/dataFields";
import { cn } from "@/lib/utils";

function FieldInput({ field, value, onChange }) {
  const base = "h-9";
  if (field.type === "bool") {
    return <Switch checked={Boolean(value)} onCheckedChange={onChange} />;
  }
  if (field.type === "select") {
    return (
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className={cn(base, "w-full rounded-button border border-input bg-transparent px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50")}
      >
        <option value="" className="bg-card">— select —</option>
        {field.options.map((o) => (
          <option key={o} value={o} className="bg-card">{o}</option>
        ))}
      </select>
    );
  }
  if (field.type === "date") {
    return <Input type="date" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} className="[color-scheme:light]" />;
  }
  const numeric = field.type === "money" || field.type === "int" || field.type === "pct";
  return (
    <div className="relative">
      {field.type === "money" && <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>}
      {field.type === "pct" && <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>}
      <Input
        type={numeric ? "number" : "text"}
        inputMode={numeric ? "decimal" : undefined}
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "") return onChange(null);
          onChange(numeric ? Number(v) : v);
        }}
        className={cn(field.type === "money" && "pl-6", field.type === "pct" && "pr-7")}
      />
    </div>
  );
}

export function SkuDetailSheet({ open, onOpenChange, sku, onSave }) {
  const [draft, setDraft] = useState(sku || {});

  useEffect(() => {
    if (sku) setDraft(sku);
  }, [sku]);

  if (!sku) return null;

  function set(key, val) {
    setDraft((d) => {
      const next = { ...d, [key]: val };
      // Entering a real manufacturing cost upgrades it from "estimated".
      if (key === "manufacturingCost") next.costSource = "real";
      return next;
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto p-0">
        <SheetHeader>
          <div className="flex items-center gap-2.5">
            <ProductThumb id={sku.id} name={sku.name} size={40} rounded="rounded-input" />
            <div>
              <SheetTitle>{sku.name}</SheetTitle>
              <SheetDescription>{sku.sku} · complete the data Shopify can't provide</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-6 p-5">
          {FIELD_GROUPS.map((group) => (
            <div key={group.id}>
              <div className="mb-1 flex items-center justify-between">
                <h4 className="text-sm font-semibold">{group.label}</h4>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">{group.desc}</p>
              <div className="space-y-3">
                {group.fields.map((field) => {
                  const filled = fieldFilled(draft, field.key);
                  return (
                    <div key={field.key} className="grid grid-cols-[1fr_150px] items-center gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-sm">
                          {field.label}
                          {field.required && !filled && <span className="size-1.5 rounded-full bg-warning" title="Recommended" />}
                        </div>
                        <div className="text-[11px] text-muted-foreground">Powers: {field.powers}</div>
                      </div>
                      <FieldInput field={field} value={draft[field.key]} onChange={(v) => set(field.key, v)} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <SheetFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSave(draft)}>Save data</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
