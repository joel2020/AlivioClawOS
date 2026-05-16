import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { Bot, Shield, Zap, type LucideIcon } from "lucide-react";
import { getAgents, getDataSourceLabel } from "@/lib/clawbot-data";

const ROLE_ICONS: Record<string, LucideIcon> = { supervisor: Shield, specialist: Bot };
const CAPABILITY_COLORS: Record<string, string> = {
  orchestration: "bg-purple-900/40 text-purple-400",
  approval_gates: "bg-amber-900/40 text-amber-400",
  lead_intake: "bg-blue-900/40 text-blue-400",
  proposal_generation: "bg-green-900/40 text-green-400",
  strategy_brief: "bg-indigo-900/40 text-indigo-400",
};

export default async function AgentsPage() {
  const { agents, source } = await getAgents();
  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Agents</h1>
        <p className="text-sm text-slate-400 mt-0.5">The 4 MVP Clawbot agents — 1 supervisor, 3 specialists · {getDataSourceLabel(source)}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {agents.length === 0 ? (
          <div className="sm:col-span-2 rounded-xl border border-slate-800 bg-slate-900">
            <EmptyState
              icon={Zap}
              title="No agent registry available"
              description="Agent metadata will appear here once the backend exposes the operator registry."
            />
          </div>
        ) : agents.map((agent) => {
          const Icon = ROLE_ICONS[agent.role] || Bot;
          return (
            <div key={agent.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-indigo-950/60 border border-indigo-800/50 p-2">
                    <Icon className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{agent.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{agent.role}</p>
                  </div>
                </div>
                <StatusBadge status={agent.status} />
              </div>
              <p className="text-xs text-slate-400">{agent.description}</p>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <span className="text-xs font-mono text-indigo-300">{agent.modelAlias}</span>
                <div className="flex gap-1 flex-wrap justify-end">
                  {(agent.capabilities || []).slice(0, 3).map((cap: string) => (
                    <span key={cap} className={`text-xs px-2 py-0.5 rounded-full ${CAPABILITY_COLORS[cap] || "bg-slate-800 text-slate-400"}`}>{cap.replace(/_/g, " ")}</span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
