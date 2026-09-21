import {
  Package,
  Lightbulb,
  Layers,
  Plug,
  Settings,
  MonitorPlay,
} from "lucide-react";

/*
  Sidebar information architecture — mirrors the Carter platform's own IA
  (Overview · Measurement · System), so this app reads as a native section of
  Carter rather than a bolted-on tool.

  THREE ANALYSIS SURFACES, ONE QUESTION EACH. Reporting used to sit here as a
  fourth, and it re-rendered data the other three already owned: the same
  budget recommendation as an Insights action card, the same audience leak,
  the same per-product ad spend as the Products table, the same connected
  platforms as Integrations. It is gone, and each of its blocks moved to the
  surface that owns that question:

    Products          which product or category?   (catalogue economics)
    Insights          what is happening, what do I do?
                      — Today view: the decision surface
                      — Channels view: the paid-media evidence behind it
    Audience & Funnel who shows up, and what do they do?

  The rule that keeps it that way: ONE canonical home per dataset. A surface
  that needs another's numbers links to it rather than rendering its own copy.

  Measurement leads with Products on purpose: per-SKU contribution margin is
  the capability this app brings to Carter that the platform doesn't otherwise
  have.

  Items may declare `children` — rendered as a collapsible group, matching
  Carter's Pixel & Events / Ad Campaigns / Wallet pattern.
*/
export const NAV_GROUPS = [
  {
    label: "Measurement",
    items: [
      { href: "/products", label: "Products", icon: Package, signal: "productsAlert" },
      { href: "/insights", label: "Insights", icon: Lightbulb, signal: "alertsCount" },
      {
        href: "/pixel",
        label: "Pixel & Events",
        icon: Layers,
        children: [
          { href: "/pixel", label: "Pixel Setup" },
          { href: "/pixel/funnel", label: "Audience & Funnel" },
        ],
      },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/integrations", label: "Integrations", icon: Plug },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    // Internal pitch deck — kept, but last so the platform nav reads
    // professionally from the top down.
    label: "Pitch",
    items: [{ href: "/presentation", label: "Presentation", icon: MonitorPlay }],
  },
];

