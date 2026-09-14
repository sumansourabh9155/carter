"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { NAV_GROUPS, NAV_FOOTER, MIRO_URL } from "@/lib/nav";
import { cn } from "@/lib/utils";

// Miro brand mark — a small nod to the board (yellow ground, "m i r o" as four
// strokes). Recognizable without ripping the exact logo; reads as an external
// tool link next to our monochrome nav icons.
function MiroIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="5" fill="#FFDD33" />
      <g fill="#050038">
        <rect x="6" y="8" width="2.1" height="9" rx="1" />
        <rect x="9.7" y="7" width="2.1" height="10" rx="1" />
        <rect x="13.4" y="8.5" width="2.1" height="8.5" rx="1" />
        <rect x="17.1" y="6.5" width="2.1" height="10.5" rx="1" />
      </g>
    </svg>
  );
}

function isActive(pathname, href) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function NavLink({ item, active, signals }) {
  const Icon = item.icon;
  const redDot = item.signal === "productsAlert" && signals.productsAlert;
  const amberDot = item.signal === "dataIncomplete" && signals.dataIncomplete;
  const count = item.signal === "alertsCount" ? signals.alertsCount : 0;
  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        active ? "bg-primary/12 text-foreground" : "text-sidebar-foreground hover:bg-black/[0.04] hover:text-foreground"
      )}
    >
      {active && <span className="absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-r-full border-l-2 border-primary" />}
      <Icon className={cn("size-4.5 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
      <span className={cn("flex-1 truncate", active && "font-medium")}>{item.label}</span>
      {redDot && <span className="size-2 rounded-full bg-destructive" />}
      {amberDot && <span className="size-2 rounded-full bg-warning" />}
      {count > 0 && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
          {count}
        </span>
      )}
    </Link>
  );
}

export function Sidebar({ signals = {} }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-border bg-sidebar">
      {/* Brand */}
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-700 text-sm font-bold text-white">
            T
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Tally</div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Financial OS</div>
          </div>
        </div>
      </div>

      {/* Groups */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-3">
            <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} signals={signals} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer — external Miro board sits just above Settings */}
      <div className="space-y-0.5 border-t border-border px-2.5 py-3">
        <a
          href={MIRO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-black/[0.04] hover:text-foreground"
        >
          <MiroIcon className="size-4.5 shrink-0 rounded-[4px]" />
          <span className="flex-1 truncate">Miro Board PRD</span>
          <ExternalLink className="size-3.5 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
        </a>
        <NavLink item={NAV_FOOTER} active={isActive(pathname, NAV_FOOTER.href)} signals={signals} />
      </div>
    </aside>
  );
}
