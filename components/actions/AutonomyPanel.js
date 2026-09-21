"use client";

/*
  THE AUTONOMY DIAL — how much Carter is allowed to do on its own.

  Three tiers per action type, least to most trusted:
    Watch    Carter reports it and nothing else. Execution is refused.
    Suggest  Carter prices it; a person presses the button.
    Auto     Autopilot may fire it unattended — reversible types only.

  Two things make this safe rather than scary. First, the kill switch is above
  everything and blocks every write regardless of tier, so there is always one
  control that stops all of it. Second, refusals are audited: a blocked
  attempt appears in Activity with its reason, because a policy that silently
  declines is indistinguishable from one that is broken.
*/

import { useEffect, useState } from "react";
import { ShieldCheck, Bot, Loader2, Play, Lock } from "lucide-react";
import {
  getAutonomyPolicy,
  setActionTier,
  setAutonomyKillSwitch,
  setAutonomyAutopilot,
  triggerAutopilot,
} from "@/lib/api";
import { IN_SCOPE_ACTION_TYPES, TIERS } from "@/lib/actions/types";
import { getActionOutcomes } from "@/lib/api";
import { Card, CardHeading } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { money, pct, plural, signedMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const TIER_LABEL = { watch: "Watch", suggest: "Suggest", auto: "Auto" };

function TierPicker({ value, onChange, disabled, allowAuto }) {
  return (
    <div className="inline-flex shrink-0 rounded-button bg-ia-gray-faded p-0.5 shadow-ring">
      {TIERS.map((t) => {
        // Irreversible actions can never reach the auto tier; the control
        // shouldn't offer a choice the guardrails will refuse anyway.
        const blocked = t === "auto" && !allowAuto;
        return (
          <button
            key={t}
            type="button"
            disabled={disabled || blocked}
            title={blocked ? "Not reversible — autopilot may only run reversible actions" : undefined}
            onClick={() => onChange(t)}
            className={cn(
              "rounded-[5px] px-2.5 py-1 text-[12px] font-semibold leading-4 transition-colors",
              value === t ? "bg-card text-brand-700 shadow-control-subtle" : "text-muted-foreground hover:text-foreground",
              (disabled || blocked) && "cursor-not-allowed opacity-40"
            )}
          >
            {TIER_LABEL[t]}
          </button>
        );
      })}
    </div>
  );
}

function TrackRecord({ record }) {
  if (!record) return null;

  if (record.count === 0) {
    return (
      <div className="border-y border-border bg-surface-subtle px-6 py-3">
        <div className="text-sm font-medium">No settled results yet</div>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          Forecast accuracy needs actions that have had {plural(record.maturityDays, "day")} to settle — spend stops at
          once, but the orders it would have driven arrive across the attribution window.
          {record.settlingCount > 0 && ` ${plural(record.settlingCount, "action")} still settling.`}{" "}
          Until there is a record, leave the dials on Suggest.
        </p>
      </div>
    );
  }

  const net = signedMoney(record.netCm2);
  return (
    <div className="border-y border-border bg-surface-subtle px-6 py-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Forecast accuracy</div>
          <div className="tabular text-[20px] font-semibold leading-7">
            {record.accuracyPct != null ? pct(record.accuracyPct) : "—"}
          </div>
          <div className="text-[11px] text-muted-foreground">
            median, across {plural(record.count, "settled action")}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Realised CM2</div>
          <div className={cn("tabular text-[20px] font-semibold leading-7", net.dir === "up" ? "text-success" : net.dir === "down" ? "text-destructive" : "")}>
            {net.text}
          </div>
          <div className="text-[11px] text-muted-foreground">{record.paidOff} of {record.count} paid off</div>
        </div>
        <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-muted-foreground">
          {record.trustworthy
            ? `Enough history to mean something. Accuracy is the MEDIAN error against forecast, not an average of ratios — one action landing at 900% of forecast would otherwise read as excellent.`
            : `Only ${plural(record.count, "settled action")} so far, which is too few to trust. Keep the dials on Suggest until there are at least five.`}
          {record.settlingCount > 0 && ` ${plural(record.settlingCount, "more")} still settling.`}
        </p>
      </div>
    </div>
  );
}

export function AutonomyPanel({ onChanged }) {
  const [policy, setPolicy] = useState(null);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const [record, setRecord] = useState(null);

  useEffect(() => {
    getAutonomyPolicy().then(setPolicy);
    getActionOutcomes().then(setRecord);
  }, []);

  if (!policy) return <Skeleton className="h-[320px] w-full rounded-card" />;

  const locked = policy.killSwitch;

  async function pickTier(typeId, tier) {
    setPolicy(await setActionTier(typeId, tier));
  }

  async function runNow() {
    setRunning(true);
    const res = await triggerAutopilot();
    setRunning(false);
    setLastRun(res);
    onChanged?.();
  }

  return (
    <Card className="overflow-hidden p-0">
      <CardHeading
        title="Autonomy"
        description="How much Carter may do on its own, per action type. Every attempt — allowed or refused — is logged in Activity."
      >
        <Badge variant={locked ? "negative" : "positive"}>
          <ShieldCheck className="size-3" /> {locked ? "All writes blocked" : "Active"}
        </Badge>
      </CardHeading>

      {/*
        THE TRACK RECORD — the reason anyone would ever move a dial to Auto.

        Autonomy is not granted on the strength of a good demo. It is granted
        on evidence that the forecasts hold up, which is why this sits above
        the tiers rather than buried in a log. Only SETTLED outcomes count: a
        record built from same-day readings would flatter every decision, and
        the first person to check it would stop believing the rest.
      */}
      <TrackRecord record={record} />

      {/* The one control that stops everything, above everything it stops. */}
      <div className="flex items-center justify-between gap-4 border-y border-border bg-surface-subtle px-6 py-3">
        <div className="flex items-start gap-2.5">
          <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <div className="text-sm font-medium">Kill switch</div>
            <div className="text-xs text-muted-foreground">
              Blocks every write regardless of tier — including anything you press yourself.
            </div>
          </div>
        </div>
        <Switch
          checked={policy.killSwitch}
          onCheckedChange={async (on) => setPolicy(await setAutonomyKillSwitch(on))}
        />
      </div>

      <div className="divide-y divide-border-subtle px-6">
        {IN_SCOPE_ACTION_TYPES.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-4 py-3.5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t.label}</span>
                {!t.reversible && <Badge variant="notice" size="sm">Not reversible</Badge>}
                {t.caps.maxDollars > 0 && (
                  <Badge variant="outline" size="sm">Cap {money(t.caps.maxDollars)}</Badge>
                )}
              </div>
              <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t.description}</div>
            </div>
            <TierPicker
              value={policy.tiers[t.id]}
              onChange={(tier) => pickTier(t.id, tier)}
              disabled={locked}
              allowAuto={t.reversible}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-subtle px-6 py-3">
        <div className="flex items-start gap-2.5">
          <Bot className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <div className="text-sm font-medium">Autopilot</div>
            <div className="text-xs text-muted-foreground">
              Sweeps the board and fires only what you've set to Auto. Idempotent — it won't act twice on the same finding.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Switch
            checked={policy.autopilotEnabled}
            onCheckedChange={async (on) => setPolicy(await setAutonomyAutopilot(on))}
            disabled={locked}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={runNow}
            disabled={locked || !policy.autopilotEnabled || running}
          >
            {running ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
            Run now
          </Button>
        </div>
      </div>

      {lastRun && (
        <div className="border-t border-border px-6 py-3 text-xs">
          <span className="font-medium">
            Autopilot applied {lastRun.executed.length} {lastRun.executed.length === 1 ? "action" : "actions"}
          </span>
          {lastRun.skipped.length > 0 && (
            <span className="text-muted-foreground"> · skipped {lastRun.skipped.length}</span>
          )}
          {lastRun.executed.length === 0 && lastRun.skipped.length > 0 && (
            <div className="mt-1 text-muted-foreground">{lastRun.skipped[0].reason}</div>
          )}
        </div>
      )}
    </Card>
  );
}
