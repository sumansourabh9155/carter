import { DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata = {
  title: "Tally — Financial OS for Shopify",
  description:
    "The financial operating system for Shopify brands. True SKU-level profit, ad-spend intelligence, and an AI that connects margin, ads, supply, and cash.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${jetbrainsMono.variable}`}>
      {/* suppressHydrationWarning: browser extensions (Grammarly et al.) inject
          attributes into <body> before React hydrates, triggering a noisy but
          harmless mismatch warning. Scoped to this element only — real
          hydration bugs in children still surface. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
