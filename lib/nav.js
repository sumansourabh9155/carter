import {
  Package,
  FileChartColumn,
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

  Measurement leads with Products on purpose: per-SKU contribution margin is
  the capability this app brings to Carter that the platform doesn't otherwise
  have, so it sits as the first peer of Reporting rather than buried in a
  catalogue section.

  Items may declare `children` — rendered as a collapsible group, matching
  Carter's Pixel & Events / Ad Campaigns / Wallet pattern.
*/
export const NAV_GROUPS = [
  {
    label: "Measurement",
    items: [
      { href: "/products", label: "Products", icon: Package, signal: "productsAlert" },
      { href: "/reporting", label: "Reporting", icon: FileChartColumn },
      { href: "/insights", label: "Insights", icon: Lightbulb, signal: "alertsCount" },
      {
        href: "/pixel",
        label: "Pixel & Events",
        icon: Layers,
        children: [
          { href: "/pixel", label: "Pixel Setup" },
          { href: "/pixel/funnel", label: "On-site Funnel" },
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

// External link to the project's Miro board / PRD (opens in a new tab),
// pinned to the bottom of the sidebar.
export const MIRO_URL = "https://miro.com/app/board/uXjVHCIVqVk=/?share_link_id=811895959040";
