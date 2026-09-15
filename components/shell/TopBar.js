"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Sparkles, ChevronDown, User, Settings, LogOut, Search } from "lucide-react";
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
const NO_RANGE = ["/settings", "/integrations", "/user", "/carter-ai", "/presentation"];
// The pitch deck isn't "this store's data" — the merchant identity and sync
// status are meaningless noise sitting on top of an investor slide.
const NO_STORE_CHROME = ["/presentation"];

/*
  Carter top bar — measured off the live platform:
    <header>  56px tall, FULL width, bg Brand/900 (#0c1646), padding 0 16px,
              gap 8. The side nav starts below it, not beside it.
    brand     24x24 mark, a 1x16 Brand/700 divider, then the wordmark at
              600 20px/28px in white.
    search    up to 520x32, bg Brand/800 (#121f69), radius 6, padding 0 10,
              gap 8; the input is transparent, white, 400 12px/16px.
  Everything here sits on navy, so controls use the Brand ramp and white
  alphas rather than the neutral surface ramp.
*/
function CarterMark() {
  return (
    <span
      aria-hidden="true"
      className="grid size-6 shrink-0 place-items-center rounded-[6px] bg-white/10 text-[13px] font-bold leading-none text-white"
    >
      C
    </span>
  );
}

export function TopBar({ signals = {} }) {
  const pathname = usePathname();
  const { range, setRange } = useDateRange();
  const { openPanel } = useAIPanel();
  const showRange = !NO_RANGE.some((p) => pathname.startsWith(p));
  const showStoreChrome = !NO_STORE_CHROME.some((p) => pathname.startsWith(p));

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 bg-brand-900 px-4">
      {/* Brand cluster */}
      <Link href="/insights" className="flex shrink-0 items-center gap-2">
        <CarterMark />
        <span className="h-4 w-px shrink-0 rounded-full bg-brand-700" />
        <span className="text-[20px] font-semibold leading-7 text-white">Carter</span>
      </Link>

      {/* Global search — presentational for now; mirrors the platform bar. */}
      <div className="ml-4 hidden h-8 min-w-0 max-w-[520px] flex-1 items-center gap-2 rounded-nav bg-brand-800 px-2.5 lg:flex">
        <Search className="size-3.5 shrink-0 text-brand-200/70" />
        <input
          type="search"
          aria-label="Search Carter"
          placeholder="Search products, campaigns, channels"
          className="min-w-0 flex-1 bg-transparent text-[12px] leading-4 text-white outline-none placeholder:text-brand-200/60"
        />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {showStoreChrome && (
          <span className="hidden text-[12px] leading-4 text-brand-200/80 xl:inline">Coastal Active</span>
        )}

        {showRange && (
          <div className="flex items-center gap-0.5 rounded-nav bg-brand-800 p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={cn(
                  "rounded-button px-2 py-1 text-[11px] font-semibold leading-[14px] transition-colors",
                  range === r.id ? "bg-white/15 text-white" : "text-brand-200/70 hover:text-white"
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
          const dot =
            health.overall === "healthy" ? "bg-ia-positive" : health.overall === "failed" ? "bg-ia-negative" : "bg-ia-notice";
          return (
            <Link
              href="/integrations"
              title={health.summary}
              className="hidden h-8 items-center gap-1.5 rounded-nav bg-brand-800 px-2.5 text-[11px] font-medium leading-[14px] text-brand-200/80 transition-colors hover:text-white md:flex"
            >
              <span className={cn("size-1.5 shrink-0 rounded-full", dot)} />
              {health.overall === "healthy" ? "All sources synced" : "Sync needs attention"}
            </Link>
          );
        })()}

        <button
          onClick={() => openPanel()}
          className="flex h-8 items-center gap-1.5 rounded-nav bg-white/10 px-2.5 text-[12px] font-semibold leading-[18px] text-white transition-colors hover:bg-white/15"
        >
          <Sparkles className="size-3.5" />
          Ask Carter
        </button>

        <Link
          href="/insights"
          aria-label="Alerts"
          className="relative grid size-8 place-items-center rounded-nav text-brand-200/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Bell className="size-4" />
          {signals.alertsCount > 0 && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-ia-negative" />}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 rounded-nav p-1 outline-none transition-colors hover:bg-white/10">
            <Avatar className="size-6">
              <AvatarFallback className="bg-white/15 text-[10px] font-semibold text-white">MA</AvatarFallback>
            </Avatar>
            <ChevronDown className="size-3.5 text-brand-200/80" />
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
