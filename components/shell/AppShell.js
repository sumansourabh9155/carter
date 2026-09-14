"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { AIPanel } from "@/components/ai/AIPanel";
import { getLosingHero, getDataReadiness, getInsightsBoard } from "@/lib/api";

// Quiet authorship credit — fixed bottom-right, low-key by default, clearer on
// hover. pointer-events sit only on the pill so it never blocks the page.
function MadeByBadge() {
  return (
    <div className="pointer-events-none fixed bottom-3 right-4 z-40 select-none">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-card/90 px-3 py-1.5 text-[11px] opacity-95 shadow-sm backdrop-blur-sm transition-opacity hover:opacity-100">
        <span className="size-1.5 shrink-0 rounded-full bg-gradient-to-br from-orange-500 to-orange-700" />
        <span className="text-muted-foreground">
          Built by <span className="font-semibold text-foreground">Suman Sourabh</span> &amp; <span className="font-semibold text-foreground">Kanhaiya Kumar</span>
        </span>
      </div>
    </div>
  );
}

export function AppShell({ children }) {
  const pathname = usePathname();
  // Keep the pitch deck pristine — no floating credit over the slide controls.
  const showCredit = !pathname.startsWith("/presentation");
  const [signals, setSignals] = useState({ productsAlert: false, alertsCount: 0, dataIncomplete: false });

  useEffect(() => {
    let active = true;
    Promise.all([getLosingHero(), getDataReadiness(), getInsightsBoard()]).then(([hero, readiness, board]) => {
      if (active) {
        // The badge = how many things actually need action on /insights,
        // straight from the same engine the page renders.
        setSignals({
          productsAlert: Boolean(hero),
          alertsCount: board.health.actionCount,
          dataIncomplete: readiness.incompleteCount > 0,
        });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar signals={signals} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar signals={signals} />
        <main className="flex-1">{children}</main>
      </div>
      <AIPanel />
      {showCredit && <MadeByBadge />}
    </div>
  );
}
