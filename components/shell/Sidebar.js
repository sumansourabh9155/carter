"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { NAV_GROUPS, NAV_FOOTER, MIRO_URL } from "@/lib/nav";
import { cn } from "@/lib/utils";

// Miro brand mark — a small nod to the board (yellow ground, "m i r o" as four
// strokes). Recognizable without ripping the exact logo; reads as an external
// tool link next to our monochrome nav icons. Deliberately NOT Carter palette.
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

/*
  Carter side-nav item — measured on the platform:
    height   36px
    padding  0 16px        gap 8px        radius 6px
    label    500 14px/14px  Text/Secondary (#455a64)
    ACTIVE   600 14px/14px  Brand/700 (#1a2c8f) + a 3px left rail.
             There is NO filled background on the active item.
*/
function NavLink({ item, active, signals }) {
  const Icon = item.icon;
  const redDot = item.signal === "productsAlert" && signals.productsAlert;
  const amberDot = item.signal === "dataIncomplete" && signals.dataIncomplete;
  const count = item.signal === "alertsCount" ? signals.alertsCount : 0;
  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex h-9 items-center gap-2 rounded-nav px-4 text-[14px] leading-none transition-colors",
        active
          ? "bg-[image:var(--gradient-nav-selected)] font-semibold text-brand-700"
          : "font-medium text-[#455a64] hover:bg-ia-gray-faded hover:text-foreground"
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-700" />
      )}
      <Icon className={cn("size-4 shrink-0", active ? "text-brand-700" : "text-muted-foreground group-hover:text-foreground")} />
      <span className="flex-1 truncate">{item.label}</span>
      {redDot && <span className="size-1.5 rounded-full bg-ia-negative" />}
      {amberDot && <span className="size-1.5 rounded-full bg-ia-notice" />}
      {count > 0 && (
        <span className="grid h-4 min-w-4 place-items-center rounded-pill bg-ia-negative px-1 text-[10px] font-semibold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}

export function Sidebar({ signals = {} }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-56px)] w-60 shrink-0 flex-col bg-sidebar md:flex">
      <nav className="flex-1 overflow-y-auto px-2 pb-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {/* Group label — 500 11px/14px, Neutral/500, padding 16px 16px 4px */}
            <div className="px-4 pb-1 pt-4 text-[11px] font-medium leading-[14px] text-neutral-500">
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
      <div className="space-y-0.5 px-2 pb-3 pt-2">
        <a
          href={MIRO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex h-9 items-center gap-2 rounded-nav px-4 text-[14px] font-medium leading-none text-[#455a64] transition-colors hover:bg-ia-gray-faded hover:text-foreground"
        >
          <MiroIcon className="size-4 shrink-0 rounded-[3px]" />
          <span className="flex-1 truncate">Miro Board PRD</span>
          <ExternalLink className="size-3 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground" />
        </a>
        <NavLink item={NAV_FOOTER} active={isActive(pathname, NAV_FOOTER.href)} signals={signals} />
      </div>
    </aside>
  );
}
