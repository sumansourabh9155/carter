import {
  Lightbulb,
  LayoutDashboard,
  Package,
  Megaphone,
  Sparkles,
  Database,
  Plug,
  User,
  Settings,
  MonitorPlay,
  MousePointerClick,
} from "lucide-react";

// Sidebar information architecture. Alerts live inside Insights (not a
// separate tab) — one place to see everything that needs attention.
export const NAV_GROUPS = [
  {
    label: "Pitch",
    items: [{ href: "/presentation", label: "Presentation", icon: MonitorPlay }],
  },
  {
    label: "Overview",
    items: [
      { href: "/insights", label: "Insights", icon: Lightbulb, signal: "alertsCount" },
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Analyze",
    items: [
      { href: "/products", label: "Products", icon: Package, signal: "productsAlert" },
      { href: "/marketing", label: "Marketing", icon: Megaphone },
      { href: "/website", label: "Website", icon: MousePointerClick },
    ],
  },
  {
    label: "Setup",
    items: [
      { href: "/data-collection", label: "Data Collection", icon: Database, signal: "dataIncomplete" },
      { href: "/integrations", label: "Integrations", icon: Plug },
      { href: "/user", label: "User", icon: User },
    ],
  },
  {
    // Last on purpose — Carter sits on top of the whole platform's data
    // (margins, ads, supply, cash, the collected inputs) and can answer anything.
    label: "Ask Carter",
    items: [{ href: "/carter-ai", label: "Carter", icon: Sparkles }],
  },
];

// Pinned to the bottom of the sidebar.
export const NAV_FOOTER = { href: "/settings", label: "Settings", icon: Settings };

// External link to the project's Miro board / PRD (opens in a new tab),
// pinned just above Settings.
export const MIRO_URL = "https://miro.com/app/board/uXjVHCIVqVk=/?share_link_id=811895959040";
