"use client";

import { CarterChat } from "@/components/ai/CarterChat";

export default function CarterAIPage() {
  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-3xl flex-col">
      <CarterChat variant="page" />
    </div>
  );
}
