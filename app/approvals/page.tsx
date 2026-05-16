import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { getApprovals, getDataSourceLabel } from "@/lib/clawbot-data";
import { ApprovalActions } from "@/components/ApprovalActions";

export default async function ApprovalsPage() {
  const { approvals, source } = await getApprovals();
  const pending = approvals.filter((a) => a.status === "pending");
  const resolved = approvals.filter((a) => a.status !== "pending");

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Approvals</h1>
        <p className="text-sm text-slate-400 mt-0.5">{pending.length} pending · {resolved.length} resolved · {getDataSourceLabel(source)}</p>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 overflow-hidden">
          <div className="px-5 py-3 border-b border-amber-800/40">
            <h2 className="text-sm font-semibold text-amber-400">Pending Approvals</h2>
          </div>
          <div className="divide-y divide-slate-800/60">
            {pending.map((a) => (
              <div key={a.id} className="px-5 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{a.title}</p>
                    <p className="text-xs text-indigo-400 mt-0.5">{a.requestedBy}</p>
                    <p className="text-xs text-slate-400 mt-1.5">{a.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={a.status} />
                    <ApprovalActions approvalId={a.id} />
                  </div>
                </div>
                <p className="text-xs text-slate-600 mt-2">{new Date(a.requestedAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resolved */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-slate-100">History</h2>
        </div>
        <div className="divide-y divide-slate-800/60">
          {resolved.length === 0 ? (
            <EmptyState
              title="No resolved approvals yet"
              description="Resolved approvals will appear here after human review or automated resolution."
            />
          ) : resolved.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm text-slate-300">{a.title}</p>
                <p className="text-xs text-slate-500">{a.requestedBy} · {new Date(a.requestedAt).toLocaleString()}</p>
              </div>
              <StatusBadge status={a.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
