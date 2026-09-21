"use client";

/*
  CREATIVE — the layer beneath "this channel is sliding".

  The board could detect a channel decline and not name its cause. Almost
  always the cause is here: an asset that has been live too long, shown too
  often, to the same people. Both of those are TIME facts, which is why this
  screen was impossible before the calendar existed.

  Every row shows age and frequency next to the decay, because the three
  together are the diagnosis. Decay alone could be seasonality; decay plus 65
  days live plus frequency 6.4 is fatigue, and the fix is a new asset rather
  than a budget change.

  Decay is measured against the asset's OWN first week, never against a
  benchmark or a sibling. "Down 42% from its launch" is a fact about this
  asset; "below average" is a fact about the average.
*/

import { Images, Clock, Repeat } from "lucide-react";
import { Card, CardHeading } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { money, multiple, pct, plural } from "@/lib/format";
import { fmtDate } from "@/lib/time";
import { cn } from "@/lib/utils";

const STATUS = {
  fatigued: { label: "Spent", variant: "negative" },
  tiring: { label: "Tiring", variant: "notice" },
  fresh: { label: "Fresh", variant: "positive" },
};

const FORMAT_LABEL = {
  video: "Video", static: "Static", carousel: "Carousel",
  collection: "Collection", mixed: "Mixed", feed: "Feed", text: "Text",
};

export function CreativeCard({ creatives }) {
  if (!creatives) return <Skeleton className="h-[320px] w-full rounded-card" />;

  const recoverable = creatives.reduce((a, c) => a + c.recoverableCm, 0);
  const fatigued = creatives.filter((c) => c.status === "fatigued").length;
  const oldest = Math.max(...creatives.map((c) => c.daysLive));

  return (
    <Card className="overflow-hidden p-0">
      <CardHeading
        title="Creative"
        description="Asset age, frequency and decay — the cause behind most channel declines."
      >
        {recoverable > 0 && <Badge variant="notice">{money(recoverable)} recoverable</Badge>}
      </CardHeading>

      <div className="grid gap-3 border-y border-border bg-surface-subtle px-6 py-3 sm:grid-cols-3">
        <Stat label="Assets running" value={creatives.length} hint={`${fatigued} spent`} />
        <Stat label="Oldest asset" value={plural(oldest, "day")} hint="still serving" />
        <Stat label="Recoverable margin" value={money(recoverable)} hint="at their own launch efficiency" />
      </div>

      <div className="px-6 py-1">
        {creatives.map((c) => {
          const s = STATUS[c.status];
          return (
            <div key={c.id} className="border-b border-border-subtle py-3 last:border-b-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="size-2 shrink-0 rounded-full" style={{ background: c.channelColor }} />
                <span className="text-[13px] font-medium">{c.name}</span>
                <Badge variant={s.variant} size="sm">{s.label}</Badge>
                <Badge variant="outline" size="sm">{FORMAT_LABEL[c.format] ?? c.format}</Badge>
                <span className="text-[11px] text-muted-foreground">{c.channelName} · {c.placement}</span>
                {c.recoverableCm > 0 && (
                  <span className="tabular ml-auto text-[12px] font-semibold text-ia-notice">
                    {money(c.recoverableCm)} recoverable
                  </span>
                )}
              </div>

              {/* TIME AND FREQUENCY, on the row. Both are the diagnosis. */}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                <span className={cn("inline-flex items-center gap-1 tabular", c.overAge && "font-semibold text-ia-notice")}>
                  <Clock className="size-3" /> {plural(c.daysLive, "day")} live
                  <span className="text-muted-foreground/70">· since {fmtDate(c.firstRunOn)}</span>
                </span>
                <span className={cn("inline-flex items-center gap-1 tabular", c.overFrequency && "font-semibold text-ia-notice")}>
                  <Repeat className="size-3" /> frequency {c.frequency}
                  <span className="text-muted-foreground/70">· ceiling {c.freqLimit}</span>
                </span>
                <span className="tabular">
                  {multiple(c.week1CmRoas)} → {multiple(c.cmRoas)}{" "}
                  {c.decayPct != null && (
                    <span className={cn("ml-1 font-semibold", c.decayPct <= -20 ? "text-ia-negative" : c.decayPct < 0 ? "text-ia-notice" : "text-ia-positive")}>
                      {pct(c.decayPct)}
                    </span>
                  )}
                </span>
                <span className="tabular">{money(c.spend)} spend</span>
              </div>

              {/* Decay bar: launch efficiency vs now, on the asset's own scale. */}
              {c.week1CmRoas > 0 && (
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ia-gray">
                  <div
                    className={cn("h-full rounded-full", c.status === "fatigued" ? "bg-ia-negative" : c.status === "tiring" ? "bg-ia-notice" : "bg-ia-positive")}
                    style={{ width: `${Math.max(2, Math.min(100, (c.cmRoas / c.week1CmRoas) * 100))}%` }}
                    title={`${Math.round((c.cmRoas / c.week1CmRoas) * 100)}% of its launch efficiency`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="flex items-start gap-2 border-t border-border bg-surface-subtle px-6 py-3 text-[11px] leading-relaxed text-muted-foreground">
        <Images className="mt-0.5 size-3.5 shrink-0" />
        Ceilings are per placement family — a Shopping feed does not fatigue the way a Reel does, because the asset is
        the product and intent is what varies. One global frequency cap would flag every search placement and clear
        every short-form one.
      </p>
    </Card>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="tabular text-[20px] font-semibold leading-7">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
