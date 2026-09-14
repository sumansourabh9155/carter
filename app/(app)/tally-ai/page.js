"use client";

import { TallyChat } from "@/components/ai/TallyChat";

export default function TallyAIPage() {
  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-3xl flex-col">
      <TallyChat variant="page" />
    </div>
  );
}
