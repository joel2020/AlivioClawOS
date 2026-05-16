"use client";

import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="p-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900">
        <EmptyState
          icon={AlertTriangle}
          title="Something went wrong"
          description="The dashboard hit an unexpected error. Retry the route or check the control API."
          action={<Button onClick={reset}>Try again</Button>}
        />
      </div>
    </div>
  );
}
