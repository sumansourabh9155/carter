"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RefreshCw, Bell, Sparkles, ChevronDown, User, Settings, LogOut } from "lucide-react";
import { useDateRange, RANGES } from "@/context/DateRangeContext";
import { useAIPanel } from "@/context/AIPanelContext";
import { getSyncHealth } from "@/lib/connectors";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Routes where a reporting period makes no sense.
const NO_RANGE = ["/settings", "/integrations", "/user", "/tally-ai", "/presentation"];
// The pitch deck isn't "this store's data" — the merchant identity and sync
// status are meaningless noise sitting on top of an investor slide.
const NO_STORE_CHROME = ["/presentation"];

export function TopBar({ signals = {} }) {
  const pathname = usePathname();
  const { range, setRange } = useDateRange();
  const { openPanel } = useAIPanel();
  const showRange = !NO_RANGE.some((p) => pathname.startsWith(p));
  const showStoreChrome = !NO_STORE_CHROME.some((p) => pathname.startsWith(p));

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/80 px-5 backdrop-blur">
      <div className="flex items-center gap-2 text-sm">
        {showStoreChrome && (
          <>
            <span className="font-medium">Coastal Active</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">· coastalactive.myshopify.com</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        {showRange && (
          <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  range === r.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}

        {showStoreChrome && (() => {
          // Real sync health — never a silent green dot. A degraded source
          // (e.g. no bank connected) surfaces here AND on the cards it feeds.
          const health = getSyncHealth();
          const dot = health.overall === "healthy" ? "bg-success" : health.overall === "failed" ? "bg-destructive" : "bg-warning";
          return (
            <Link
              href="/integrations"
              title={health.summary}
              className="hidden items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground md:flex"
            >
              <span className={cn("size-2 rounded-full", dot)} />
              {health.overall === "healthy" ? "All sources synced" : "Sync needs attention"}
            </Link>
          );
        })()}

        <button
          onClick={() => openPanel()}
          className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
        >
          <Sparkles className="size-3.5" />
          Ask Tally
        </button>

        <Link
          href="/insights"
          className="relative grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-black/[0.04] hover:text-foreground"
        >
          <Bell className="size-4.5" />
          {signals.alertsCount > 0 && (
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />
          )}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-lg p-1 outline-none hover:bg-black/[0.04]">
            <Avatar>
              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-700 text-white">MA</AvatarFallback>
            </Avatar>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Maya · Owner</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/user"><User /> Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings"><Settings /> Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
