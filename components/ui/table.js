"use client";

import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
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
/*
  CONSUMPTION FIXES applied to the primitive, so every table in the product
  inherits them rather than each page solving it again:

    STICKY HEADER   the column labels were `position: static`, so on any table
                    longer than a screen you scroll into a wall of numbers
                    with no idea which column is which. At the catalogue size
                    this product targets, that makes the table unreadable.
    SORTABLE HEAD   nothing here was sortable. See TableHead.
*/
/*
  `maxHeight` is what makes the sticky header work at all.

  A `position: sticky` thead sticks to its nearest SCROLLPORT, and this
  wrapper is already one: `overflow-x: auto` forces the other axis from
  `visible` to `auto`, so the div is a scroll container in both directions.
  Its height, though, is just its content's height — it never scrolls
  vertically, so the header had nothing to stick against and simply scrolled
  away with the page. (That was the bug in the first version of this change.)

  Capping the height gives it something to stick to. The cap is generous, so
  short tables never grow a scrollbar and look exactly as they did; only
  tables long enough to lose their own header get an inner scroll — and those
  are the ones that needed the header pinned.
*/
function Table({ className, maxHeight = "calc(100vh - 260px)", ...props }) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-auto"
      style={{ maxHeight }}
    >
      <table data-slot="table" className={cn("w-full caption-bottom text-[14px] leading-5", className)} {...props} />
    </div>
  );
}

// Grey band above the table body. Sticky so the column labels survive a long
// scroll — they were `position: static`, which meant scrolling a catalogue
// left you in a wall of numbers with no idea which column was which.
function TableHeader({ className, ...props }) {
  return (
    <thead
      data-slot="table-header"
      className={cn("sticky top-0 z-10 bg-[#f8fafb] [&_tr]:border-b [&_tr]:border-border", className)}
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

/*
  Column label. Pass `sortKey` to make it sortable — the arrow, the hit area,
  the active styling and `aria-sort` all come along, so a page adds sorting by
  wiring one `sort` state object rather than rebuilding a header.

  Nothing in this product was sortable. On a table of sixteen numeric columns
  that means "which SKU is bleeding the most" can only be answered by reading
  every row and holding the running maximum in your head — and the catalogues
  this is built for are not sixteen rows.

  Numeric columns sort DESC first (`numeric`), because the question you ask of
  a money column is "who is the biggest", never "who is the smallest". Text
  sorts A→Z first. Getting that backwards costs a second click every time.
*/
function TableHead({ className, sortKey, sort, onSortChange, numeric, children, ...props }) {
  const sortable = Boolean(sortKey && onSortChange);
  const active = sortable && sort?.key === sortKey;
  const dir = active ? sort.dir : null;

  if (!sortable) {
    return (
      <th
        data-slot="table-head"
        className={cn(
          "px-4 py-2.5 text-left align-middle whitespace-nowrap",
          "text-[12px] font-semibold leading-4 text-[#7d929e]",
          className
        )}
        {...props}
      >
        {children}
      </th>
    );
  }

  const nextDir = active ? (dir === "asc" ? "desc" : "asc") : numeric ? "desc" : "asc";

  return (
    <th
      data-slot="table-head"
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn(
        "px-4 py-2.5 text-left align-middle whitespace-nowrap",
        "text-[12px] font-semibold leading-4 text-[#7d929e]",
        className
      )}
      {...props}
    >
      <button
        type="button"
        onClick={() => onSortChange({ key: sortKey, dir: nextDir })}
        // Inherit the cell's alignment so a right-aligned numeric column keeps
        // its label against the numbers, arrow included.
        className={cn(
          "group inline-flex w-full items-center gap-1 text-inherit transition-colors",
          "hover:text-[#486570] focus-visible:outline-none focus-visible:text-[#486570]",
          active && "text-brand-600",
          className?.includes("text-right") ? "justify-end" : "justify-start"
        )}
      >
        {children}
        <ChevronDown
          className={cn(
            "size-3 shrink-0 transition-all",
            active ? "opacity-100" : "opacity-0 group-hover:opacity-40",
            dir === "asc" && "rotate-180"
          )}
        />
      </button>
    </th>
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
