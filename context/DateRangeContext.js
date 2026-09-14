"use client";

import { createContext, useContext, useState } from "react";

const DateRangeContext = createContext(null);

export const RANGES = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
];

export function DateRangeProvider({ children }) {
  const [range, setRange] = useState("30d");
  return <DateRangeContext.Provider value={{ range, setRange }}>{children}</DateRangeContext.Provider>;
}

export function useDateRange() {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error("useDateRange must be used within DateRangeProvider");
  return ctx;
}
