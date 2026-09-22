"use client";

import { useMemo, useState } from "react";

/*
  Table sorting, shared by every table in the product so the ordering rules
  are decided once.

  Two rules that matter on a margin table specifically:

  NULLS SINK. A SKU with no ad spend has `cmRoas: null` — not zero, because
  dividing by zero spend is undefined, not "no return". Sorted naively, null
  either sorts as 0 (making unspent SKUs look like the worst performers) or
  sorts first (burying the real answer under rows that have no answer). Both
  are misreadings a director would act on. Nulls go to the bottom in BOTH
  directions instead, so the top of the list is always rows that have a value.

  THE SORT IS STABLE, on the incoming order. The default order is meaningful
  here — the API hands rows back ranked by contribution margin — so ties keep
  that ranking as their secondary sort rather than scrambling per render.
*/
export function useTableSort(rows, initial = null) {
  const [sort, setSort] = useState(initial);

  const sorted = useMemo(() => {
    if (!rows || !sort?.key) return rows;

    const mult = sort.dir === "asc" ? 1 : -1;

    // Decorate with the original index so ties resolve to the incoming order.
    return rows
      .map((row, i) => ({ row, i }))
      .sort((a, b) => {
        const av = valueAt(a.row, sort.key);
        const bv = valueAt(b.row, sort.key);

        const aEmpty = av == null || (typeof av === "number" && Number.isNaN(av));
        const bEmpty = bv == null || (typeof bv === "number" && Number.isNaN(bv));
        if (aEmpty && bEmpty) return a.i - b.i;
        if (aEmpty) return 1; // not `mult`-aware on purpose — nulls always sink
        if (bEmpty) return -1;

        if (typeof av === "string" || typeof bv === "string") {
          const cmp = String(av).localeCompare(String(bv), "en", { numeric: true });
          return cmp !== 0 ? cmp * mult : a.i - b.i;
        }

        return av !== bv ? (av < bv ? -1 : 1) * mult : a.i - b.i;
      })
      .map((d) => d.row);
  }, [rows, sort]);

  return { sort, setSort, sorted };
}

/* Dotted path lookup, so a column can sort on a nested engine field like
   "delta.cm2.abs" without the page flattening its rows first. */
function valueAt(obj, path) {
  if (!path.includes(".")) return obj?.[path];
  return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
}
