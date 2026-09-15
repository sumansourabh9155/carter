import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

// Carter ships two faces (Figma "font-body" / "font-display"):
//   body    Inter          — all UI, labels, tables, controls
//   display Space Grotesk  — display/hero type only (type-display-*)
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });

export const metadata = {
  title: "Carter",
  description:
    "Carter — the B2B commerce platform. True SKU-level profit, ad-spend intelligence, and an AI that connects margin, ads, supply, and cash.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      {/* suppressHydrationWarning: browser extensions (Grammarly et al.) inject
          attributes into <body> before React hydrates, triggering a noisy but
          harmless mismatch warning. Scoped to this element only — real
          hydration bugs in children still surface. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
