import { AgentJobForm } from "@/components/AgentJobForm";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { listAgentDefinitions, listAgentJobs, listClients } from "@/lib/clawbot-service";
import { ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AgentJobsPage() {
  const [agents, jobs, clients] = await Promise.all([
    listAgentDefinitions(),
    listAgentJobs(),
    listClients(),
  ]);
  const agentById = new Map(agents.map((agent) => [agent.id, agent]));
  const clientById = new Map(clients.map((client) => [client.id, client]));

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Agent Jobs</h1>
        <p className="mt-0.5 text-sm text-slate-400">Work queue for specialized company OS agents. This is the handoff point for workers, n8n, Agent Zero, and future services.</p>
      </div>
      <AgentJobForm agents={agents} clients={clients} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {agents.map((agent) => (
          <div key={agent.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-100">{agent.name}</p>
                <p className="mt-1 text-xs text-slate-400">{agent.description}</p>
              </div>
              <StatusBadge status={agent.status} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {agent.allowedTools.slice(0, 5).map((tool) => (
                <span key={tool} className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">{tool.replace(/_/g, " ")}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="grid grid-cols-5 gap-4 px-5 py-3 border-b border-slate-800 text-xs font-medium text-slate-500 uppercase tracking-wide">
          <span>Job</span><span>Agent</span><span>Client</span><span>Priority</span><span>Status</span>
        </div>
        <div className="divide-y divide-slate-800/60">
          {jobs.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No agent jobs yet" description="Create a job to queue scoped work for an agent." />
          ) : jobs.map((job) => (
            <div key={job.id} className="grid grid-cols-5 gap-4 px-5 py-3 items-center hover:bg-slate-800/30 transition-colors">
              <div>
                <p className="text-sm font-medium text-slate-200">{job.title}</p>
                <p className="text-xs text-slate-500">{job.id}</p>
              </div>
              <span className="text-xs text-slate-400">{agentById.get(job.agentId)?.name || job.agentId}</span>
              <span className="text-xs text-slate-400">{job.clientId ? clientById.get(job.clientId)?.name || job.clientId : "-"}</span>
              <span className="text-xs text-slate-400 capitalize">{job.priority}</span>
              <StatusBadge status={job.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
