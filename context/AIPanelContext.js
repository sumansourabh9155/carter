"use client";

import { createContext, useContext, useState, useCallback } from "react";

const AIPanelContext = createContext(null);

export function AIPanelProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState(null);

  // Open the dock, optionally pre-seeding a prompt (from an "Ask Tally" affordance).
  const openPanel = useCallback((prompt) => {
    if (prompt) setPendingPrompt({ text: prompt, at: Date.now() });
    setOpen(true);
  }, []);

  const closePanel = useCallback(() => setOpen(false), []);
  const consumePrompt = useCallback(() => setPendingPrompt(null), []);

  return (
    <AIPanelContext.Provider value={{ open, openPanel, closePanel, pendingPrompt, consumePrompt }}>
      {children}
    </AIPanelContext.Provider>
  );
}

export function useAIPanel() {
  const ctx = useContext(AIPanelContext);
  if (!ctx) throw new Error("useAIPanel must be used within AIPanelProvider");
  return ctx;
}
