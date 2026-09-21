/*
  THE CALENDAR SPINE — the one place the product knows what day it is.

  Ads and money are both time-bound and the product had no concept of time at
  all. Symptoms it was covering for:

    · pacing divided by `new Date().getDate() / 30`, which is wrong in every
      month that isn't 30 days long and silently overstates how far through
      February you are
    · campaigns had no flight dates, so "pause this campaign" could not know
      whether it ends tomorrow
    · creative had no launch date, so fatigue — the most common cause of the
      CM-ROAS decay the board detects — was unmeasurable
    · an action's outcome was measured the instant it executed, which is not
      an outcome, it is an echo
    · every "synced 8 min ago" was a string literal

  Two windows, deliberately separate, because conflating them is how a
  reporting figure ends up compared against a budget it does not cover:

    REPORTING  a CLOSED trailing 30-day window. Every margin, CM and CM-ROAS
               figure in the product describes exactly this window. It is
               complete, so it never needs projecting.
    MONTH      the LIVE calendar month, which is what a budget is set against.
               Partial by definition, so it carries elapsed/remaining days and
               a projected landing.

  Everything is derived from one anchor so the whole app agrees on "now".
*/

export const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const addDays = (d, n) => new Date(startOfDay(d).getTime() + n * DAY_MS);
export const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / DAY_MS);
export const isoDate = (d) => startOfDay(d).toISOString().slice(0, 10);

/** The single anchor. Everything else in this module is relative to it. */
export const TODAY = startOfDay(new Date());

/**
 * The closed reporting window. Ends YESTERDAY, not today: today is still
 * accumulating, and including a partial day in a 30-day total is how a
 * dashboard reports a drop every morning that isn't real.
 */
export const REPORTING = buildWindow(addDays(TODAY, -30), addDays(TODAY, -1));

/** The window immediately before it — same length, so deltas are comparable. */
export const PRIOR = buildWindow(addDays(TODAY, -60), addDays(TODAY, -31));

function buildWindow(start, end) {
  return {
    start: isoDate(start),
    end: isoDate(end),
    days: daysBetween(start, end) + 1,
    startDate: startOfDay(start),
    endDate: startOfDay(end),
  };
}

/**
 * The live calendar month, for budget pacing.
 *
 * `elapsed` counts days FINISHED, so on the 1st of the month nothing has
 * elapsed yet and a run-rate is refused rather than computed from a
 * fraction of one day.
 */
export function currentMonth(now = TODAY) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const days = end.getDate();
  const elapsed = now.getDate() - 1;
  return {
    start: isoDate(start),
    end: isoDate(end),
    label: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    days,
    elapsed,
    remaining: days - elapsed,
    elapsedPct: Math.round((elapsed / days) * 1000) / 10,
  };
}

export const MONTH = currentMonth();

/* ------------------------------------------------------------- formatting */

const MONTH_DAY = { month: "short", day: "numeric" };

export function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", MONTH_DAY);
}

/** "Aug 23 – Sep 21" — and adds the year when the range crosses one. */
export function fmtRange(win) {
  if (!win) return "—";
  const a = new Date(win.start);
  const b = new Date(win.end);
  const sameYear = a.getFullYear() === b.getFullYear();
  const right = sameYear
    ? b.toLocaleDateString("en-US", MONTH_DAY)
    : b.toLocaleDateString("en-US", { ...MONTH_DAY, year: "numeric" });
  return `${a.toLocaleDateString("en-US", MONTH_DAY)} – ${right}`;
}

/** Whole-unit relative time. "3d ago", "2h ago", "just now". */
export function timeAgo(when) {
  if (when == null) return "never";
  const ms = Date.now() - new Date(when).getTime();
  if (ms < 60_000) return "just now";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(when);
}

/** "in 4 days" / "ends today" / "2 days ago" — for flights and deadlines. */
export function untilText(date) {
  if (!date) return "—";
  const d = daysBetween(TODAY, date);
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d > 1) return `in ${d} days`;
  if (d === -1) return "yesterday";
  return `${Math.abs(d)} days ago`;
}

/**
 * How long a change needs to sit before its result means anything.
 *
 * A media change measured minutes after it lands tells you nothing: spend
 * stops immediately but the orders it would have produced arrive across the
 * attribution window. Reading the number before then reports the saving and
 * none of the cost, which flatters every decision.
 */
export const OUTCOME_MATURITY_DAYS = 7;

export function outcomeMaturity(ts, now = Date.now()) {
  const daysElapsed = Math.floor((now - ts) / DAY_MS);
  const mature = daysElapsed >= OUTCOME_MATURITY_DAYS;
  return {
    daysElapsed,
    mature,
    daysRemaining: Math.max(0, OUTCOME_MATURITY_DAYS - daysElapsed),
    note: mature
      ? `Measured over ${daysElapsed} days — past the ${OUTCOME_MATURITY_DAYS}-day attribution window.`
      : `Only ${daysElapsed === 0 ? "hours" : `${daysElapsed} days`} old. Spend stops at once but the orders it would have driven land across ${OUTCOME_MATURITY_DAYS} days, so this reads better than it will settle.`,
  };
}
