import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";

/*
  Carter Input — measured on the live platform:
    height  36px (medium) / 48px (large) / 32px (the toolbar search)
    radius  8px form fields, 6px toolbar search
    padding 0 10-12px
    EDGE    inset ring `0 0 0 1px #e4eaed` — not a border, so focus can swap
            the ring colour without shifting layout.
    text    400 12px/16px in toolbar search; 14px in form fields.
*/
const inputVariants = cva(
  [
    "flex w-full min-w-0 bg-card px-3 text-foreground outline-none transition-shadow",
    "placeholder:text-muted-foreground",
    "shadow-ring hover:shadow-[inset_0_0_0_1px_var(--border-hover)]",
    "focus-visible:shadow-[inset_0_0_0_1px_var(--border-focus),0_0_0_3px_rgba(59,91,219,0.2)]",
    "disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-text-disabled",
    "aria-invalid:shadow-[inset_0_0_0_1px_var(--border-negative)]",
  ].join(" "),
  {
    variants: {
      inputSize: {
        sm: "h-8 rounded-nav text-[12px] leading-4",
        md: "h-9 rounded-input text-[14px] leading-5",
        lg: "h-12 rounded-input text-[16px] leading-6",
      },
    },
    defaultVariants: { inputSize: "md" },
  }
);

function Input({ className, type, inputSize, ...props }) {
  return <input type={type} data-slot="input" className={cn(inputVariants({ inputSize }), className)} {...props} />;
}

export { Input, inputVariants };
