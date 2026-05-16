"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

export function ApprovalActions({ approvalId }: { approvalId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function decide(decision: "approved" | "rejected") {
    startTransition(() => {
      void (async () => {
        const res = await fetch(`/api/v1/approvals/${approvalId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision, reviewedBy: "joel@clawbot.ai" }),
        });
        if (!res.ok) return;
        router.refresh();
      })();
    });
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => decide("rejected")} disabled={pending}>
        Reject
      </Button>
      <Button size="sm" onClick={() => decide("approved")} disabled={pending}>
        Approve
      </Button>
    </div>
  );
}
