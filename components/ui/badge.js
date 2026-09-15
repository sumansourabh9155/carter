import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
  Carter Badge — measured on the live platform:
    height 20px · padding 2px 8px · radius 56px (pill) · 500 12px/16px

  Colour uses the carter-* TINT pairs (a 100-level fill with a 700-level
  label), NOT the 9%-alpha interactive washes:
      information  #e5f4fd / #01579b
      positive     #e8f5e9 / #1b5e20
      negative     #ffe6e6 / #c62828
      notice       #fff3e0 / #e65100
      brand        #e8ecfc / #121f69
      neutral      #f2f5f7 / #455a64
  Solid tones fill with the interactive hue and use a white label.
*/
const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-pill font-medium w-fit whitespace-nowrap shrink-0",
  {
    variants: {
      variant: {
        information: "bg-info-100 text-[#01579b]",
        positive: "bg-green-100 text-green-700",
        negative: "bg-red-100 text-red-700",
        notice: "bg-orange-100 text-[#e65100]",
        brand: "bg-brand-100 text-brand-800",
        neutral: "bg-neutral-100 text-[#455a64]",

        "information-solid": "bg-ia-information text-white",
        "positive-solid": "bg-ia-positive text-white",
        "notice-solid": "bg-ia-notice text-white",
        "negative-solid": "bg-ia-negative text-white",
        "neutral-solid": "bg-ia-neutral text-white",

        default: "bg-brand-100 text-brand-800",
        outline: "bg-transparent text-muted-foreground shadow-ring",

        /* Legacy aliases → tint ramp */
        secondary: "bg-neutral-100 text-[#455a64]",
        success: "bg-green-100 text-green-700",
        warning: "bg-orange-100 text-[#e65100]",
        destructive: "bg-red-100 text-red-700",
      },
      size: {
        sm: "h-4 gap-0.5 px-1 text-[10px] leading-[14px] [&>svg]:size-2",
        md: "h-5 gap-1 px-2 text-[12px] leading-4 [&>svg]:size-3",
        lg: "h-6 gap-1 px-3 text-[12px] leading-4 [&>svg]:size-4",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  }
);

function Badge({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "span";
  return <Comp data-slot="badge" className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
