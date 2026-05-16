"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

export function RunActions({ runId, isActive }: { runId: string; isActive: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function call(endpoint: "cancel" | "retry") {
    startTransition(() => {
      void (async () => {
        const res = await fetch(`/api/v1/runs/${runId}/${endpoint}`, { method: "POST" });
        if (!res.ok) return;
        router.refresh();
      })();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {isActive && (
        <Button variant="outline" size="sm" onClick={() => call("cancel")} disabled={pending}>
          Cancel run
        </Button>
      )}
      <Button size="sm" onClick={() => call("retry")} disabled={pending}>
        Retry run
      </Button>
    </div>
  );
}
