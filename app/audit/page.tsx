import { EmptyState } from "@/components/EmptyState";
import { listAuditEvents } from "@/lib/clawbot-db-state";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const events = await listAuditEvents(200);
  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Audit</h1>
        <p className="mt-0.5 text-sm text-slate-400">Durable operator, worker, workflow, and security events from Postgres.</p>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="grid grid-cols-5 gap-4 px-5 py-3 border-b border-slate-800 text-xs font-medium text-slate-500 uppercase tracking-wide">
          <span>Time</span><span>Actor</span><span>Action</span><span>Target</span><span>Metadata</span>
        </div>
        <div className="divide-y divide-slate-800/60">
          {events.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="No audit events available" description="Audit events appear here when DATABASE_URL is configured and actions are recorded." />
          ) : events.map((event) => (
            <div key={event.id} className="grid grid-cols-5 gap-4 px-5 py-3 items-start hover:bg-slate-800/30 transition-colors">
              <span className="text-xs text-slate-500">{new Date(event.timestamp).toLocaleString()}</span>
              <span className="text-xs text-slate-400">{event.actorEmail || event.actorId || "system"}</span>
              <span className="text-xs font-medium text-slate-200">{event.action}</span>
              <span className="text-xs text-slate-400">{event.targetType}{event.targetId ? `:${event.targetId}` : ""}</span>
              <code className="line-clamp-3 whitespace-pre-wrap text-xs text-slate-500">{JSON.stringify(event.metadata)}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
