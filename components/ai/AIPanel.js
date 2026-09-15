"use client";

import { X, Sparkles } from "lucide-react";
import { useAIPanel } from "@/context/AIPanelContext";
import { CarterChat } from "@/components/ai/CarterChat";
import { cn } from "@/lib/utils";

// Right-dock surface. The same conversation core is reused full-page at /carter-ai.
export function AIPanel() {
  const { open, closePanel, pendingPrompt, consumePrompt } = useAIPanel();

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-neutral-900/40 backdrop-blur-[1px] lg:hidden" onClick={closePanel} />}
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 flex h-screen w-full max-w-[400px] flex-col border-l border-border bg-card shadow-high transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
        aria-hidden={!open}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-input bg-[image:var(--gradient-primary-button)] text-white">
              <Sparkles className="size-3.5" />
            </span>
            <span className="text-sm font-semibold">Carter</span>
          </div>
          <button onClick={closePanel} className="grid size-8 place-items-center rounded-input text-muted-foreground hover:bg-ia-gray hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1">
          {open && <CarterChat variant="dock" seedPrompt={pendingPrompt} onConsumeSeed={consumePrompt} />}
        </div>
      </aside>
    </>
  );
}
