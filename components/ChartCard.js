import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/*
  Title-as-question wrapper for any chart/visual block.

  The heading uses Carter's in-card hierarchy (Figma "Breadcrumb Container",
  1271:12909): a 600 16px/24px title in Brand/800 over a 12px/16px subtitle
  in Neutral/500. Card padding is the platform's 20px / 24px.
*/
export function ChartCard({ title, subtitle, action, children, className }) {
  return (
    <Card className={cn("px-6 py-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[16px] font-semibold leading-6 text-brand-800">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[12px] leading-4 text-neutral-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}
