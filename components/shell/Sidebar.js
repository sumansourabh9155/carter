"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { NAV_GROUPS } from "@/lib/nav";
import { cn } from "@/lib/utils";

function isActive(pathname, href, exact = false) {
  if (href === "/") return pathname === "/";
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

function Signals({ item, signals }) {
  const redDot = item.signal === "productsAlert" && signals.productsAlert;
  const amberDot = item.signal === "dataIncomplete" && signals.dataIncomplete;
  const count = item.signal === "alertsCount" ? signals.alertsCount : 0;
  return (
    <>
      {redDot && <span className="size-1.5 shrink-0 rounded-full bg-ia-negative" />}
      {amberDot && <span className="size-1.5 shrink-0 rounded-full bg-ia-notice" />}
      {count > 0 && (
        <span className="grid h-4 min-w-4 shrink-0 place-items-center rounded-pill bg-ia-negative px-1 text-[10px] font-semibold text-white">
          {count}
        </span>
      )}
    </>
  );
}

/*
  Carter side-nav item — measured on the platform:
    height 36 · padding 0 16 · gap 8 · radius 6 · label 14px/1
    ACTIVE  600 weight, Brand/700, the Carter wash, and a 3px left rail.
  Sub-items sit at 25px with no icon, matching Carter's Pixel & Events group.
*/
function NavLink({ item, active, signals }) {
  const Icon = item.icon;
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
      {active && <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-700" />}
      {Icon && (
        <Icon className={cn("size-4 shrink-0", active ? "text-brand-700" : "text-muted-foreground group-hover:text-foreground")} />
      )}
      <span className="flex-1 truncate">{item.label}</span>
      <Signals item={item} signals={signals} />
    </Link>
  );
}

// Collapsible parent + its children (Carter's Pixel & Events pattern).
function NavGroupItem({ item, pathname, signals }) {
  const childActive = item.children.some((c) => isActive(pathname, c.href, c.href === item.href));
  const [open, setOpen] = useState(childActive);
  const Icon = item.icon;
  // Keep the group open whenever one of its children is the current page.
  const expanded = open || childActive;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={expanded}
        className={cn(
          "group relative flex h-9 w-full items-center gap-2 rounded-nav px-4 text-[14px] leading-none transition-colors",
          childActive ? "font-semibold text-brand-700" : "font-medium text-[#455a64] hover:bg-ia-gray-faded hover:text-foreground"
        )}
      >
        {Icon && (
          <Icon className={cn("size-4 shrink-0", childActive ? "text-brand-700" : "text-muted-foreground group-hover:text-foreground")} />
        )}
        <span className="flex-1 truncate text-left">{item.label}</span>
        <ChevronDown className={cn("size-3.5 shrink-0 transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="mt-0.5 space-y-0.5">
          {item.children.map((child) => {
            // The parent's own href doubles as the first child, so match it exactly
            // or "/pixel" would light up while on "/pixel/funnel".
            const active = isActive(pathname, child.href, child.href === item.href);
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "relative flex items-center gap-1 rounded-nav py-1 pl-4 pr-4 text-[14px] leading-none transition-colors",
                  active
                    ? "bg-[image:var(--gradient-nav-selected)] font-semibold text-brand-700"
                    : "font-medium text-[#455a64] hover:bg-ia-gray-faded hover:text-foreground"
                )}
              >
                <span className={cn("w-4 shrink-0 text-[11px]", active ? "text-brand-700" : "text-transparent")}>↳</span>
                <span className="truncate">{child.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
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
              {group.items.map((item) =>
                item.children ? (
                  <NavGroupItem key={item.href} item={item} pathname={pathname} signals={signals} />
                ) : (
                  <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} signals={signals} />
                )
              )}
            </div>
          </div>
        ))}
      </nav>

    </aside>
  );
}
