"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/*
  Carter Data Table — from the Figma "table/header" style + the Table Header /
  Table Cell components (2132:160403 / 2132:160405).

    HEADER BAND  bg Surface/Page #f8fafb  (this is the grey heading band)
                 label 600 12px/16px in Text/Tertiary #7d929e
                 padding 16px h / 10px v, bottom rule Border/Default #e4eaed
    CELL         bg Neutral/0, padding 16px h / 10px v, bottom rule #e4eaed
    FOOTER       "Items Found: N" at 600 14px/20px in Neutral/500, with the
                 prev / next pager on the right (_Pagination, 1182:20186).

  TableToolbar / TablePagination are additive — existing tables keep working
  without them.
*/
function Table({ className, ...props }) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table data-slot="table" className={cn("w-full caption-bottom text-[14px] leading-5", className)} {...props} />
    </div>
  );
}

// Grey band that sits above the table body.
function TableHeader({ className, ...props }) {
  return (
    <thead
      data-slot="table-header"
      className={cn("bg-[#f8fafb] [&_tr]:border-b [&_tr]:border-border", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }) {
  return <tbody data-slot="table-body" className={cn("bg-card", className)} {...props} />;
}

function TableRow({ className, ...props }) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-border transition-colors",
        "hover:bg-surface-subtle data-[state=selected]:bg-surface-selected",
        className
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "px-4 py-2.5 text-left align-middle whitespace-nowrap",
        "text-[12px] font-semibold leading-4 text-[#7d929e]",
        className
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }) {
  return <td data-slot="table-cell" className={cn("px-4 py-2.5 align-middle whitespace-nowrap", className)} {...props} />;
}

/*
  Heading block that sits ABOVE the table inside the same card — the
  "Breadcrumb Container" pattern (1271:12909): a 600 16/24 title in Brand/800
  over a 12/16 Neutral/500 subtitle, with an optional back button in front.
*/
function TableToolbar({ className, title, description, onBack, backHref, children, ...props }) {
  const BackTag = backHref ? "a" : "button";
  return (
    <div
      data-slot="table-toolbar"
      className={cn("flex items-center gap-3 px-6 py-4", className)}
      {...props}
    >
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

/*
  Table footer pager. Left: "Items Found: N" (600 14/20, Neutral/500).
  Right: prev / next. Purely presentational unless handlers are passed.
*/
function TablePagination({
  className,
  itemsFound,
  page,
  pageCount,
  onPrev,
  onNext,
  children,
  ...props
}) {
  const canPrev = typeof page === "number" ? page > 1 : true;
  const canNext = typeof page === "number" && typeof pageCount === "number" ? page < pageCount : true;
  return (
    <div
      data-slot="table-pagination"
      className={cn("flex items-center justify-between gap-3 border-t border-border px-6 py-3", className)}
      {...props}
    >
      <div className="text-[14px] font-semibold leading-5 text-neutral-500">
        {itemsFound != null ? `Items Found: ${itemsFound}` : children}
      </div>
      <div className="flex items-center gap-2">
        {typeof page === "number" && typeof pageCount === "number" && (
          <span className="text-[12px] font-medium leading-4 text-neutral-500">
            Page {page} of {pageCount}
          </span>
        )}
        <Button variant="outline" size="icon-sm" onClick={onPrev} disabled={!canPrev} aria-label="Previous page">
          <ChevronLeft />
        </Button>
        <Button variant="outline" size="icon-sm" onClick={onNext} disabled={!canNext} aria-label="Next page">
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableToolbar,
  TablePagination,
};
