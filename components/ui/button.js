import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
  Carter Button — measured on the live platform (not inferred from tokens).

  The two things that make a Carter button look like a Carter button:
    1. The LABEL is "type-control-label" — 600 12px/18px. It is NOT 14px.
    2. The EDGE is an inset ring (`box-shadow: inset 0 0 0 1px`), never a
       CSS border, and filled buttons additionally carry elevation-control
       (0 4px 4px rgba(0,0,0,.08)).

  Geometry: h 36 (default) / 48 (lg) / 32 (sm) / 28 (xs), radius 4, gap 4-8.

  Colors come from the INTERACTIVE ramp:
    primary    #305eff  hover #2950da   white label
    secondary  transparent, Brand/700 label, elevation-control
    outline    transparent + neutral inset ring
    positive   transparent + #008743 ring, #008743 label
    destructive transparent + #b42318 ring, #d92d20 label
    solid-*    filled variants where a page needs weight
*/
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center whitespace-nowrap rounded-button",
    "font-semibold transition-colors outline-none shrink-0",
    "focus-visible:ring-[3px] focus-visible:ring-border-focus/40",
    "disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:pointer-events-none",
  ].join(" "),
  {
    variants: {
      variant: {
        /* Primary is a GRADIENT (Brand/600 -> Brand/700), not a flat fill. */
        primary:
          "bg-[image:var(--gradient-primary-button)] text-white shadow-control hover:bg-[image:var(--gradient-primary-button-hover)]",
        default:
          "bg-[image:var(--gradient-primary-button)] text-white shadow-control hover:bg-[image:var(--gradient-primary-button-hover)]",

        /* Secondary: white -> Neutral/50 gradient, brand label. */
        secondary:
          "bg-[image:var(--gradient-secondary-button)] text-brand-700 shadow-control hover:bg-[image:var(--gradient-secondary-button-hover)]",

        /* Neutral inset ring — dropdowns, filters, toolbar controls. */
        outline:
          "bg-[image:var(--gradient-secondary-button)] text-[#486570] shadow-ring hover:bg-[image:var(--gradient-secondary-button-hover)]",

        /* Tertiary — subtle gray fill at rest. */
        tertiary: "bg-ia-gray text-ia-text-gray hover:bg-ia-gray-hover",

        /* Transparent at rest; Tertiary's wash on hover. */
        ghost: "bg-transparent text-foreground hover:bg-ia-gray",

        /* Status outlines — the platform's Approve All / Reject All. These
           carry the SAME white -> Neutral/50 gradient as Secondary, with a
           coloured inset ring and label. */
        positive:
          "bg-[image:var(--gradient-secondary-button)] text-ia-positive-hover shadow-ring-positive hover:bg-[image:var(--gradient-secondary-button-hover)]",
        destructive:
          "bg-[image:var(--gradient-secondary-button)] text-ia-negative shadow-ring-negative hover:bg-[image:var(--gradient-secondary-button-hover)]",

        /* Solid status fills, where a page needs the extra weight. */
        "positive-solid": "bg-ia-positive text-white shadow-control hover:bg-ia-positive-hover",
        "destructive-solid": "bg-ia-negative text-white shadow-control hover:bg-ia-negative-hover",

        link: "bg-transparent text-brand-600 underline-offset-4 hover:underline",
      },
      size: {
        lg: "h-12 gap-2 px-5 text-[14px] leading-5 [&_svg:not([class*='size-'])]:size-4",
        default: "h-9 gap-1.5 px-3 text-[12px] leading-[18px] [&_svg:not([class*='size-'])]:size-4",
        md: "h-9 gap-1.5 px-3 text-[12px] leading-[18px] [&_svg:not([class*='size-'])]:size-4",
        sm: "h-8 gap-1.5 px-3 text-[12px] leading-[18px] [&_svg:not([class*='size-'])]:size-3",
        xs: "h-7 gap-1 px-2 text-[11px] leading-[14px] [&_svg:not([class*='size-'])]:size-3",
        icon: "size-9 [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "size-12 [&_svg:not([class*='size-'])]:size-4",
        "icon-sm": "size-8 [&_svg:not([class*='size-'])]:size-3",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
