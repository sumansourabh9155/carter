import { DateRangeProvider } from "@/context/DateRangeContext";
import { AIPanelProvider } from "@/context/AIPanelContext";
import { AppShell } from "@/components/shell/AppShell";

export default function AppGroupLayout({ children }) {
  return (
    <DateRangeProvider>
      <AIPanelProvider>
        <AppShell>{children}</AppShell>
      </AIPanelProvider>
    </DateRangeProvider>
  );
}
