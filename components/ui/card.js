"use client";

import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  Carter Card — measured on the live platform:
    radius   12px
    fill     #ffffff
    EDGE     inset ring `0 0 0 1px #e4eaed` — NOT a css border. Across the
             platform 62 elements use an inset ring and exactly one uses a
             real border, so the ring is the house style.
    padding  20px 24px          cards stack 24px apart

  HEADING HIERARCHY lives INSIDE the card (Figma "Breadcrumb Container",
  1271:12909) — it is not a page-level title floating above it:
      title     600 16px/24px  Brand/800  #121f69
      subtitle  400 12px/16px  Neutral/500 #7d929e   (2px below the title)
      back      32px square, inset ring, chevron-left, in FRONT of the title
  A smaller in-card label (CardEyebrow) is 500 12/18 in Text/600 #486570.
*/
function Card({ className, ...props }) {
  return (
    <div
      data-slot="card"
      className={cn(
        // ring + lift, not ring alone. The page ground is #fbfbfb and cards
        // are #ffffff — only ~4 levels apart — so the fill cannot carry the
        // separation. The edge does: an inset ring plus elevation-control's
        // 1px lift, which is the pairing the platform uses on raised chips.
        "rounded-card bg-card text-card-foreground shadow-ring-lift transition-shadow",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }) {
  return <div data-slot="card-header" className={cn("flex flex-col gap-1 px-6 pb-4 pt-5", className)} {...props} />;
}

/*
  The card's own heading row: [back] title / subtitle [actions].
  Pass `onBack` or `backHref` to surface the back button.
*/
function CardHeading({ className, title, description, onBack, backHref, children, ...props }) {
  const BackTag = backHref ? "a" : "button";
  return (
    <div data-slot="card-heading" className={cn("flex items-center gap-3 px-6 pb-4 pt-5", className)} {...props}>
      {(onBack || backHref) && (
        <BackTag
          {...(backHref ? { href: backHref } : { type: "button", onClick: onBack })}
          aria-label="Go back"
          className="grid size-8 shrink-0 place-items-center rounded-button bg-card text-[#486570] shadow-ring transition-colors hover:bg-surface-subtle"
        >
          <ChevronLeft className="size-4" />
        </BackTag>
      )}
      <div className="min-w-0 flex-1">
        {title && <div className="text-[16px] font-semibold leading-6 text-brand-800">{title}</div>}
        {description && <div className="mt-0.5 text-[12px] leading-4 text-neutral-500">{description}</div>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}

function CardTitle({ className, ...props }) {
  // Figma "Body/Semi Bold" — 600 16/24 in Brand/800.
  return (
    <div data-slot="card-title" className={cn("text-[16px] font-semibold leading-6 text-brand-800", className)} {...props} />
  );
}

// Smaller in-card label (the "Campaign" style label above a field group).
function CardEyebrow({ className, ...props }) {
  return (
    <div data-slot="card-eyebrow" className={cn("text-[12px] font-medium leading-[18px] text-[#486570]", className)} {...props} />
  );
}

function CardDescription({ className, ...props }) {
  return (
    <div data-slot="card-description" className={cn("text-[12px] leading-4 text-neutral-500", className)} {...props} />
  );
}

function CardContent({ className, ...props }) {
  return <div data-slot="card-content" className={cn("px-6 pb-5", className)} {...props} />;
}

function CardFooter({ className, ...props }) {
  return <div data-slot="card-footer" className={cn("flex items-center px-6 pb-5", className)} {...props} />;
}

export { Card, CardHeader, CardHeading, CardTitle, CardEyebrow, CardDescription, CardContent, CardFooter };
