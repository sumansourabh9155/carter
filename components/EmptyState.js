import Link from "next/link";
import { Button } from "@/components/ui/button";

// Shared by every stubbed / not-yet-connected route.
export function EmptyState({ icon: Icon, title, body, cta, badge }) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-6">
      <div className="max-w-md text-center">
        {Icon && (
          <span className="mx-auto mb-5 grid size-14 place-items-center rounded-card shadow-ring bg-card text-muted-foreground">
            <Icon className="size-6" />
          </span>
        )}
        {badge && (
          <div className="mb-3 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {badge}
          </div>
        )}
        <h2 className="text-lg font-semibold">{title}</h2>
        {body && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>}
        {cta && (
          <Button asChild className="mt-5">
            <Link href={cta.href}>{cta.label}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
