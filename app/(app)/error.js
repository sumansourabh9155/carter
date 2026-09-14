"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-6">
      <div className="max-w-md text-center">
        <span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <TriangleAlert className="size-6" />
        </span>
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="mt-1 text-sm text-muted-foreground">{error?.message || "An unexpected error occurred."}</p>
        <Button className="mt-5" onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
