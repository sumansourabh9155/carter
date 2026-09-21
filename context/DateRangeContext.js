"use client";

import { createContext, useContext } from "react";
import { REPORTING, PRIOR, MONTH, fmtRange } from "@/lib/time";

/*
  THE REPORTING WINDOW — a fact about the data, no longer a control.

  This used to drive a 7 / 30 / 90-day picker in the top bar that nothing
  read, and then a 30-day / prior-30-day picker that did. Both are gone,
  because a global time control in the chrome is the wrong place for it:

    · it implies every number on every page re-scopes together, which was
      never true — channel figures, pacing and the pixel funnel all have
      different natural windows
    · time is now a property of the ENTITIES. A campaign has a flight, a
      creative has an age, an experiment has a duration, a budget has a month
      with days remaining. Those are the durations that change decisions, and
      none of them are a global filter
    · period-over-period comparison is already in the data (every metric
      carries `prev` and `delta`) and shown where it belongs — the "this
      period vs last" table on a product, the Δ columns on a table

  What remains is the window LABEL, so every screen can state which days its
  numbers describe instead of leaving the reader to assume.
*/
const DateRangeContext = createContext(null);

const VALUE = {
  reporting: REPORTING,
  prior: PRIOR,
  month: MONTH,
  label: fmtRange(REPORTING),
  priorLabel: fmtRange(PRIOR),
  days: REPORTING.days,
};

export function DateRangeProvider({ children }) {
  return <DateRangeContext.Provider value={VALUE}>{children}</DateRangeContext.Provider>;
}

export function useReportingWindow() {
  return useContext(DateRangeContext) ?? VALUE;
}
