import { TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/card";

/*
  WHAT A SECTION SHOWS WHEN ITS DATA DIDN'T ARRIVE.

  The alternative — and what these screens did before — is an endless
  skeleton, which reads as "still loading" no matter how long you wait. A
  reader can't tell a slow fetch from a dead one, so they conclude the page
  is broken and stop trusting the rest of it. This says which part failed and
  leaves the rest of the page usable.
*/
export function LoadError({ what = "this section", error, className }) {
  return (
    <Card className={className}>
      <div className="flex items-start gap-3 p-4">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-input bg-ia-notice-faded text-ia-notice">
          <TriangleAlert className="size-4" />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-medium">Couldn&apos;t load {what}</div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            The rest of this page is still accurate — only this part is missing. Reload to try again.
            {error?.message ? <span className="ml-1 opacity-70">({error.message})</span> : null}
          </p>
        </div>
      </div>
    </Card>
  );
}
