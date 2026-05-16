import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { getDataSourceLabel, getHandoffs } from "@/lib/clawbot-data";
import type { Handoff } from "@/lib/types";
import { GitBranch } from "lucide-react";

export default async function HandoffsPage() {
  const { handoffs, source } = await getHandoffs();
  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Handoffs</h1>
        <p className="text-sm text-slate-400 mt-0.5">{handoffs.length} records · {getDataSourceLabel(source)}</p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="divide-y divide-slate-800/60">
          {handoffs.length === 0 ? (
            <EmptyState
              icon={GitBranch}
              title="No handoffs yet"
              description="Handoff records will appear here as workflows move from discovery to proposal or strategy."
            />
          ) : handoffs.map((handoff: Handoff) => (
            <div key={handoff.id} className="px-5 py-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-100">{handoff.title}</p>
                <p className="text-xs text-slate-500 mt-1">{handoff.summary}</p>
                <p className="text-xs text-indigo-400 mt-1">
                  {handoff.fromWorkflowId} → {handoff.toWorkflowId ?? "pending"} · {handoff.createdAt ? new Date(handoff.createdAt).toLocaleString() : ""}
                </p>
              </div>
              <StatusBadge status={handoff.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
