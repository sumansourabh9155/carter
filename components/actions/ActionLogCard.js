"use client";

/*
  THE AUDIT LOG — the trust artifact.

  An autonomy system that can move money has to be able to answer "what did
  you do, on whose authority, and how do I take it back". Blocked attempts are
  listed alongside executed ones on purpose: a policy that silently refuses is
  indistinguishable from one that is broken.
*/

import { useEffect, useState } from "react";
import { History, Undo2, Check, ShieldX, Loader2, Bot, User } from "lucide-react";
import { getActionLog, getActionOutcomes, revertAction, clearActionLog } from "@/lib/api";
import { Card, CardHeading } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { signedMoney, plural } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS = {
  executed: { label: "Applied", variant: "positive", Icon: Check },
  undone: { label: "Reverted", variant: "neutral", Icon: Undo2 },
  blocked: { label: "Blocked", variant: "negative", Icon: ShieldX },
  proposed: { label: "Proposed", variant: "outline", Icon: History },
};

function when(ts) {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(ts).toLocaleDateString();
}

function Row({ entry, outcome, onChanged }) {
  const [busy, setBusy] = useState(false);
  const s = STATUS[entry.status] ?? STATUS.proposed;
  const canUndo = entry.status === "executed" && Boolean(entry.undo);
  const delta = entry.simulation ? signedMoney(entry.simulation.cm2DeltaMonthly) : null;

  async function undo() {
    setBusy(true);
    await revertAction(entry.id);
    setBusy(false);
    onChanged();
  }

  return (
    <div className="flex items-start gap-3 border-b border-border px-6 py-3 last:border-b-0">
      <span
        className={cn(
          "mt-0.5 grid size-7 shrink-0 place-items-center rounded-button",
          entry.status === "executed" && "bg-ia-positive-faded text-success",
          entry.status === "blocked" && "bg-ia-negative-faded text-destructive",
          (entry.status === "undone" || entry.status === "proposed") && "bg-ia-gray-faded text-muted-foreground"
        )}
      >
        <s.Icon className="size-3.5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold">{entry.title}</span>
          <Badge variant={s.variant} size="sm">{s.label}</Badge>
          {entry.executedBy === "autopilot" && (
            <Badge variant="outline" size="sm"><Bot /> Autopilot</Badge>
          )}
          {outcome?.verdict && (
            <Badge variant={OUTCOME_TONE[outcome.verdict] ?? "neutral"} size="sm">
              {outcome.verdict}{outcome.accuracyPct != null ? ` · ${outcome.accuracyPct}%` : ""}
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
          {entry.receipt?.lines?.[0]}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            {entry.executedBy === "autopilot" ? <Bot className="size-3" /> : <User className="size-3" />}
            {entry.executedBy === "autopilot" ? "Autopilot" : "You"} · {when(entry.ts)}
          </span>
          <span>Tier: {entry.tier}</span>
          {delta && entry.status !== "blocked" && (
            <span className="tabular">Forecast {delta.text} / mo CM2</span>
          )}
          {outcome?.actual != null && (
            <span className={cn("tabular", outcome.actual >= 0 ? "text-success" : "text-destructive")}>
              Actual {signedMoney(outcome.actual).text}
            </span>
          )}
        </div>
      </div>

      {canUndo && (
        <Button variant="outline" size="sm" onClick={undo} disabled={busy}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Undo2 className="size-3.5" />} Undo
        </Button>
      )}
    </div>
  );
}

/*
  DID IT WORK?

  The log said what was done and never came back to it. That leaves the one
  question a media team asks about every change unanswered — and it is the
  only evidence that could ever justify letting autopilot run unattended.

  Predicted is the simulation's forecast at the moment of execution. Actual
  is the change in store CM2 against a baseline captured immediately before
  the effect landed. They are shown side by side, including when the forecast
  missed: reprinting the prediction as the result is what a tool does when it
  has nothing to prove.
*/
function OutcomeStrip({ outcomes }) {
  if (!outcomes || outcomes.count === 0) return null;
  const net = signedMoney(outcomes.netCm2);
  const predicted = signedMoney(outcomes.predictedCm2);

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border bg-surface-subtle px-6 py-3">
      <div>
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Realised CM2</div>
        <div className={cn("tabular text-[18px] font-semibold leading-6", net.dir === "up" ? "text-success" : net.dir === "down" ? "text-destructive" : "")}>
          {net.text}
        </div>
      </div>
      <div>
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Forecast</div>
        <div className="tabular text-[18px] font-semibold leading-6 text-muted-foreground">{predicted.text}</div>
      </div>
      <div className="min-w-0 flex-1 text-[11px] leading-relaxed text-muted-foreground">
        Across {plural(outcomes.count, "measured action")} · {outcomes.paidOff} paid off. Forecast accuracy is shown per
        action below, misses included.
      </div>
    </div>
  );
}

const OUTCOME_TONE = {
  "as forecast": "positive",
  "better than forecast": "positive",
  "under forecast": "notice",
  "wrong direction": "negative",
};

export function ActionLogCard({ refreshKey = 0, onChanged }) {
  const [log, setLog] = useState(null);
  const [outcomes, setOutcomes] = useState(null);

  // refreshKey lets the page pull the log after an action fires elsewhere on
  // the screen, without this card owning the action flow.
  useEffect(() => {
    let live = true;
    getActionLog().then((l) => live && setLog(l));
    getActionOutcomes().then((o) => live && setOutcomes(o));
    return () => { live = false; };
  }, [refreshKey]);

  const reload = () => {
    getActionLog().then(setLog);
    getActionOutcomes().then(setOutcomes);
    onChanged?.();
  };

  const outcomeById = new Map((outcomes?.entries ?? []).map((e) => [e.id, e]));

  async function clearAll() {
    setLog(null);
    await clearActionLog();
    reload();
  }

  return (
    <Card className="overflow-hidden p-0">
      <CardHeading
        title="Activity"
        description="Every action Carter applied, who fired it, and how to take it back."
      >
        {log?.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll}>Reset</Button>
        )}
      </CardHeading>

      {log === null ? (
        <div className="space-y-2 px-6 pb-4">
          {[0, 1].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : log.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 px-6 pb-10 pt-6 text-center">
          <span className="grid size-10 place-items-center rounded-card bg-ia-gray-faded text-muted-foreground">
            <History className="size-4.5" />
          </span>
          <p className="text-sm font-medium">Nothing applied yet</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Act on a card above and it lands here with its receipt — reversible for as long as the action allows.
          </p>
        </div>
      ) : (
        <div>
          <OutcomeStrip outcomes={outcomes} />
          <div className="border-t border-border">
          {log.slice(0, 8).map((e) => (
            <Row key={e.id} entry={e} outcome={outcomeById.get(e.id)} onChanged={reload} />
          ))}
          </div>
        </div>
      )}
    </Card>
  );
}
