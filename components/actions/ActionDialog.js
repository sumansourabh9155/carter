"use client";

/*
  THE CONFIRM STEP — where an insight becomes a decision.

  Four states, in order: simulating → review → done → undone. The review state
  is the product: it shows what the action is worth, what it costs, what the
  math takes on faith, and whether policy will even allow it — all BEFORE the
  operator commits. Being refused after pressing a button is how people stop
  trusting a control, so guardrails are evaluated up front and the execute
  button is disabled with the reason visible.

  Assumptions are never collapsed behind a "details" link. A simulation that
  hides what it assumed is a number pretending to be a fact.
*/

import { useEffect, useState } from "react";
import {
  Check,
  Undo2,
  TriangleAlert,
  ShieldAlert,
  Loader2,
  Zap,
} from "lucide-react";
import { simulateInsightAction, runInsightAction, revertAction } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogPrimitive,
} from "@/components/ui/dialog";
import { money, signedMoney, plural } from "@/lib/format";
import { cn } from "@/lib/utils";

const CONFIDENCE_VARIANT = { High: "positive", Medium: "notice", Low: "negative" };

function Figure({ label, value, tone, hint }) {
  return (
    <div className="rounded-input bg-ia-gray-faded px-3 py-2.5 shadow-ring">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={cn(
          "tabular mt-0.5 text-[18px] font-semibold leading-6",
          tone === "up" && "text-success",
          tone === "down" && "text-destructive"
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

/**
 * @param {Object} insight   the board insight this action came from
 * @param {Function} onApplied  called ON CLOSE, once, if anything was applied
 *   or undone, so the page can refetch.
 *
 *   Deliberately not called the moment execute() returns. Executing really
 *   changes the numbers, so the board rebuilds — and the card that resolved
 *   drops off it, unmounting this dialog and taking the receipt and its Undo
 *   button with it. The operator saw a flash and no confirmation. Holding the
 *   refresh until close keeps the receipt on screen for as long as they want it.
 */
export function ActionDialog({ insight, open, onOpenChange, onApplied }) {
  const [proposal, setProposal] = useState(null);
  const [phase, setPhase] = useState("simulating");
  const [entry, setEntry] = useState(null);
  const [blockReasons, setBlockReasons] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Simulate whenever the dialog opens, and reset on close so reopening never
  // shows a previous run's receipt.
  //
  // This has to key off the `open` PROP, not the dialog's onOpenChange: the
  // card opens it with setOpen(true), which never routes through the dialog's
  // own handler, so hanging the simulation there left it spinning forever.
  useEffect(() => {
    if (!open) {
      if (dirty) {
        setDirty(false);
        onApplied?.();
      }
      setProposal(null);
      setEntry(null);
      setBlockReasons(null);
      setPhase("simulating");
      return;
    }
    let live = true;
    setPhase("simulating");
    simulateInsightAction(insight).then((p) => {
      if (!live) return;
      setProposal(p);
      setPhase(p ? "review" : "unavailable");
    });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, insight?.id]);

  async function execute() {
    setBusy(true);
    const res = await runInsightAction({ ...proposal.action, simulation: proposal.simulation });
    setBusy(false);
    setEntry(res.entry);
    if (res.ok) {
      setPhase("done");
      setDirty(true);
    } else {
      setBlockReasons(res.reasons);
      setPhase("blocked");
    }
  }

  async function undo() {
    setBusy(true);
    const res = await revertAction(entry.id);
    setBusy(false);
    if (res.ok) {
      setPhase("undone");
      setDirty(true);
    }
  }

  const sim = proposal?.simulation;
  const gate = proposal?.guardrails;
  const allowed = gate?.allowed !== false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {phase === "done" || phase === "undone" ? "Action receipt" : proposal?.type?.label || "Take action"}
          </DialogTitle>
          <DialogDescription>{insight?.title}</DialogDescription>
        </DialogHeader>

        {phase === "simulating" && (
          <div className="flex items-center gap-2.5 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Pricing this against your margin engine…
          </div>
        )}

        {phase === "unavailable" && (
          <p className="py-6 text-sm text-muted-foreground">
            This insight is informational — there is no single action to execute for it.
          </p>
        )}

        {(phase === "review" || phase === "blocked") && sim && (
          <div className="space-y-4">
            <p className="text-sm font-medium leading-snug">{sim.headline}</p>

            <div className="grid grid-cols-2 gap-2.5">
              <Figure
                label="CM2 impact"
                value={`${signedMoney(sim.cm2DeltaMonthly).text} / mo`}
                tone={signedMoney(sim.cm2DeltaMonthly).dir}
              />
              <Figure
                label={sim.cashImpact >= 0 ? "Spend freed" : "Cash committed"}
                value={money(Math.abs(sim.cashImpact))}
                hint={sim.cashImpact >= 0 ? "stops leaving the account" : "due on execution"}
              />
            </div>

            {proposal.targets?.length > 1 && (
              <div className="rounded-input bg-ia-gray-faded px-3 py-2.5 shadow-ring">
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Applies to {plural(proposal.targets.length, "SKU")}
                </div>
                <div className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  {proposal.targets.map((t) => t.name).join(" · ")}
                </div>
              </div>
            )}

            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  What this assumes
                </span>
                <Badge variant={CONFIDENCE_VARIANT[sim.confidence]} size="sm">
                  {sim.confidence} confidence
                </Badge>
              </div>
              <ul className="space-y-1">
                {sim.assumptions.map((a, i) => (
                  <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-muted-foreground">
                    <span className="mt-[7px] size-1 shrink-0 rounded-full bg-muted-foreground/50" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>

            {proposal.type && !proposal.type.reversible && (
              <div className="flex gap-2 rounded-input bg-ia-notice-faded px-3 py-2.5 text-[12px] leading-relaxed shadow-ring">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-ia-notice" />
                {proposal.type.reversalNote}
              </div>
            )}

            {!allowed && (
              <div className="flex gap-2 rounded-input bg-ia-negative-faded px-3 py-2.5 text-[12px] leading-relaxed shadow-ring">
                <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-ia-negative" />
                <div>
                  <div className="font-semibold">Your autonomy policy blocks this</div>
                  <ul className="mt-0.5 space-y-0.5">
                    {(blockReasons || gate.reasons).map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                  <div className="mt-1">Change it in Settings → Autonomy.</div>
                </div>
              </div>
            )}
          </div>
        )}

        {(phase === "done" || phase === "undone") && entry && (
          <div className="space-y-3">
            <div
              className={cn(
                "flex items-start gap-2.5 rounded-input px-3 py-3 text-sm shadow-ring",
                phase === "done" ? "bg-ia-positive-faded" : "bg-ia-gray-faded"
              )}
            >
              {phase === "done" ? (
                <Check className="mt-0.5 size-4 shrink-0 text-success" />
              ) : (
                <Undo2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              )}
              <div>
                <div className="font-medium">
                  {phase === "done" ? entry.title : `Reverted — ${entry.title}`}
                </div>
                <div className="text-[12px] text-muted-foreground">
                  {phase === "done"
                    ? "Your dashboards recompute from this on the next read."
                    : "The numbers are back to where they were."}
                </div>
              </div>
            </div>

            <ul className="space-y-1">
              {entry.receipt.lines.map((l, i) => (
                <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-muted-foreground">
                  <span className="mt-[7px] size-1 shrink-0 rounded-full bg-muted-foreground/50" />
                  {l}
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          {phase === "review" || phase === "blocked" ? (
            <>
              <DialogPrimitive.Close asChild>
                <Button variant="ghost">Cancel</Button>
              </DialogPrimitive.Close>
              <Button onClick={execute} disabled={!allowed || busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
                {busy ? "Applying…" : proposal?.type?.label}
              </Button>
            </>
          ) : phase === "done" ? (
            <>
              {entry?.undo && (
                <Button variant="outline" onClick={undo} disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Undo2 className="size-4" />} Undo
                </Button>
              )}
              <DialogPrimitive.Close asChild>
                <Button>Done</Button>
              </DialogPrimitive.Close>
            </>
          ) : (
            <DialogPrimitive.Close asChild>
              <Button variant="ghost">Close</Button>
            </DialogPrimitive.Close>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
