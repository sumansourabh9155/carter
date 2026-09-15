import { cn } from "@/lib/utils";

// Real product photo thumbnail. Images live in /public/products/{id}.jpg.
// Plain <img> so no next/image remote config is needed.
export function ProductThumb({ id, name, size = 36, rounded = "rounded-button", className = "" }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden shadow-ring bg-secondary", rounded, className)}
      style={{ width: size, height: size }}
    >
      <img
        src={`/products/${id}.jpg`}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    </span>
  );
}
