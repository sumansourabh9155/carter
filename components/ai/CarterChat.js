"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowUp, Square, RotateCcw, FileText, ShieldCheck, Clock, Lightbulb, CornerDownRight, MessageSquarePlus, Zap } from "lucide-react";
import { askCarter } from "@/lib/api";
import { STARTER_GROUPS, FOLLOWUPS, resetChatContext } from "@/lib/api/mock/ai";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MarginWaterfall } from "@/components/charts/MarginWaterfall";
import { RankBars } from "@/components/charts/RankBars";
import { CmRoasTrend } from "@/components/charts/CmRoasTrend";
import { FunnelSteps } from "@/components/charts/FunnelSteps";
import { LinesChart } from "@/components/charts/LinesChart";
import { CompareBars } from "@/components/charts/CompareBars";
import { AudienceBreakdown } from "@/components/charts/AudienceBreakdown";

const STORAGE_KEY = "carter-chat-v1";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Minimal **bold** renderer for canned answers.
function Rich({ text }) {
  const parts = text.split("**");
  return (
    <>
      {parts.map((p, i) => (i % 2 ? <strong key={i} className="font-semibold text-foreground">{p}</strong> : <span key={i}>{p}</span>))}
    </>
  );
}

// Renders the chart Aura chose (by ref) with the REAL data the server
// resolved it to — Aura never supplies these values itself.
function ChatChart({ chart }) {
  if (!chart) return null;
  return (
    <div className="rounded-card shadow-ring bg-card p-4">
      <h4 className="text-sm font-semibold">{chart.title}</h4>
      {chart.subtitle && <p className="mt-0.5 mb-3 text-xs text-muted-foreground">{chart.subtitle}</p>}
      {chart.type === "waterfall" && <MarginWaterfall data={chart.data} height={180} />}
      {chart.type === "rankbars" && (
        <RankBars items={chart.items} breakeven={chart.breakeven} showBreakeven={chart.showBreakeven} format={chart.format} />
      )}
      {chart.type === "trend" && <CmRoasTrend data={chart.data} height={180} />}
      {chart.type === "funnel" && <FunnelSteps steps={chart.steps} />}
      {chart.type === "lines" && <LinesChart data={chart.data} xKey={chart.xKey} series={chart.series} yFormat={chart.yFormat} height={190} />}
      {chart.type === "compare" && <CompareBars aName={chart.aName} bName={chart.bName} rows={chart.rows} />}
      {chart.type === "audience" && <AudienceBreakdown segments={chart.segments} blendedCmRoas={chart.blendedCmRoas} />}
    </div>
  );
}

function AnswerCard({ payload, lastUserText, onRegenerate, onFollowup }) {
  // Aura returns follow-ups written for THIS conversation; the static map is
  // only the fallback for the deterministic (offline) answer stack.
  const followups = payload.followups?.length
    ? payload.followups.map((q) => ({ label: q, q }))
    : FOLLOWUPS[payload.id] || FOLLOWUPS.default;
  return (
    <div className="space-y-3">
      {payload.source === "aura" && (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[0.06] px-2.5 py-1 text-[11px] font-medium text-primary">
          <Zap className="size-3" /> Reasoned by Aura over your live data — cross-check before acting on anything critical
        </div>
      )}
      <p className="text-sm leading-relaxed text-foreground/90"><Rich text={payload.answer} /></p>

      {payload.bullets?.length > 0 && (
        <ul className="space-y-1">
          {payload.bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-sm text-muted-foreground">
              <span className="text-primary">→</span>
              <span><Rich text={b} /></span>
            </li>
          ))}
        </ul>
      )}

      {payload.metrics?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {payload.metrics.map((m) => (
            <div key={m.label} className="rounded-input shadow-ring bg-card px-3 py-1.5">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.label}</div>
              <div className="tabular text-sm font-semibold">{m.value}</div>
            </div>
          ))}
        </div>
      )}

      <ChatChart chart={payload.chart} />

      {payload.citations?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {payload.citations.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="inline-flex items-center gap-1 rounded-button bg-primary/10 px-2 py-1 text-xs text-primary transition-colors hover:bg-primary/15"
            >
              <FileText className="size-3" />
              {c.label}
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-2 text-[11px] text-muted-foreground">
        {payload.confidence !== "—" && (
          <span className="inline-flex items-center gap-1"><ShieldCheck className="size-3" /> Confidence: {payload.confidence}</span>
        )}
        <span className="inline-flex items-center gap-1"><Clock className="size-3" /> {payload.freshness}</span>
        <button onClick={() => onRegenerate(lastUserText)} className="inline-flex items-center gap-1 hover:text-foreground">
          <RotateCcw className="size-3" /> Regenerate
        </button>
      </div>

      {followups.length > 0 && onFollowup && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <CornerDownRight className="size-3 text-muted-foreground/60" />
          {followups.map((f) => (
            <button
              key={f.q}
              onClick={() => onFollowup(f.q)}
              className="rounded-full shadow-ring bg-card px-2.5 py-1 text-xs text-foreground/80 transition-colors hover:border-primary/40 hover:bg-primary/[0.06] hover:text-primary"
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CarterChat({ seedPrompt, onConsumeSeed, variant = "page" }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef(false);
  const scrollRef = useRef(null);

  const update = (id, patch) =>
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  async function run(text) {
    if (!text.trim() || busy) return;
    abortRef.current = false;
    setBusy(true);
    const uid = `u${Date.now()}`;
    const aid = `a${Date.now()}`;

    // Snapshot prior turns before this one is appended — only matters for
    // the Aura fallback (lib/api/mock/ai.js), so a "what about it?" resolves
    // instead of being asked cold every time.
    const history = messages
      .filter((m) => m.role === "user" || (m.role === "assistant" && m.phase === "done" && m.payload))
      .map((m) => ({ role: m.role, content: m.role === "user" ? m.text : m.payload.answer }));

    setMessages((prev) => [
      ...prev,
      { id: uid, role: "user", text },
      { id: aid, role: "assistant", phase: "thinking", step: 0, payload: null, lastUserText: text },
    ]);
    setInput("");

    const payload = await askCarter(text, history);
    update(aid, { steps: payload.steps });
    for (let i = 0; i < payload.steps.length; i++) {
      await sleep(600);
      if (abortRef.current) break;
      update(aid, { step: i + 1 });
    }
    update(aid, { phase: "done", payload });
    setBusy(false);
  }

  function stop() {
    abortRef.current = true;
  }

  // Auto-run a seeded prompt (from an "Ask Carter" affordance).
  useEffect(() => {
    if (seedPrompt?.text) {
      run(seedPrompt.text);
      onConsumeSeed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedPrompt?.at]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Rehydrate the thread from localStorage so a conversation survives reloads.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved) && saved.length) setMessages(saved);
      }
    } catch {}
  }, []);

  // Persist completed turns (skip in-flight "thinking" placeholders).
  useEffect(() => {
    try {
      const done = messages.filter((m) => m.role === "user" || m.phase === "done");
      if (done.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(done));
    } catch {}
  }, [messages]);

  function newChat() {
    setMessages([]);
    setInput("");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    resetChatContext();
  }

  const empty = messages.length === 0;
  const [examplesOpen, setExamplesOpen] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <span className="mb-4 grid size-14 place-items-center rounded-card bg-[image:var(--gradient-primary-button)] text-white shadow-mid">
              <Sparkles className="size-6" />
            </span>
            <h3 className="text-base font-semibold">Ask Carter anything</h3>
            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
              Your AI CFO — it reasons across margin, ads, inventory &amp; cash to answer the questions no single number can. Always cited.
            </p>
            <Button variant="outline" className="mt-5" onClick={() => setExamplesOpen(true)}>
              <Lightbulb className="size-4" /> Browse example questions
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex justify-end">
              <button
                onClick={newChat}
                className="inline-flex items-center gap-1 rounded-button px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-ia-gray hover:text-foreground"
              >
                <MessageSquarePlus className="size-3.5" /> New chat
              </button>
            </div>
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-card rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                    {m.text}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex gap-2.5">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-input bg-[image:var(--gradient-primary-button)] text-white">
                    <Sparkles className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    {m.phase === "thinking" ? (
                      <div className="space-y-1.5">
                        {(m.steps || ["Thinking…"]).slice(0, Math.max(1, m.step || 1)).map((s, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                            {s}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <AnswerCard payload={m.payload} lastUserText={m.lastUserText} onRegenerate={run} onFollowup={run} />
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(input);
          }}
          className="flex items-end gap-2 rounded-card shadow-ring bg-card p-2 focus-within:border-primary/40"
        >
          <button
            type="button"
            onClick={() => setExamplesOpen(true)}
            title="Example questions"
            className="grid size-8 shrink-0 self-end place-items-center rounded-input text-muted-foreground transition-colors hover:bg-ia-gray hover:text-foreground"
          >
            <Lightbulb className="size-4" />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                run(input);
              }
            }}
            rows={1}
            placeholder="Ask about profit, ads, or a product…"
            className="max-h-28 flex-1 resize-none bg-transparent px-1.5 py-1 text-sm outline-none placeholder:text-muted-foreground"
          />
          {busy ? (
            <Button type="button" size="icon" variant="secondary" onClick={stop}>
              <Square className="size-3.5" />
            </Button>
          ) : (
            <Button type="submit" size="icon" disabled={!input.trim()}>
              <ArrowUp className="size-4" />
            </Button>
          )}
        </form>
        <p className="mt-1.5 px-1 text-center text-[10px] text-muted-foreground/70">
          Read-only in this demo · Carter never guesses — it cites or asks
        </p>
      </div>

      <Dialog open={examplesOpen} onOpenChange={setExamplesOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>What can I ask Carter?</DialogTitle>
            <DialogDescription>The hard, cross-domain questions — pick one to start.</DialogDescription>
          </DialogHeader>
          <div className="-mr-1 max-h-[58vh] space-y-4 overflow-y-auto pr-1">
            {STARTER_GROUPS.map((group) => (
              <div key={group.category}>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {group.category}
                </div>
                <div className="space-y-1.5">
                  {group.prompts.map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setExamplesOpen(false);
                        run(p);
                      }}
                      className="w-full rounded-input shadow-ring bg-card px-3 py-2 text-left text-sm leading-snug text-foreground/90 transition-colors hover:border-primary/30 hover:bg-ia-gray"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
