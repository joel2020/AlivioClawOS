import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, Bot, CheckSquare, Contact, DollarSign, FileText, Mail, MemoryStick, Play } from "lucide-react";
import { ClientFileForm } from "@/components/ClientFileForm";
import { ClientMemoryForm } from "@/components/ClientMemoryForm";
import { EmptyState } from "@/components/EmptyState";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { getClientWorkspace } from "@/lib/clawbot-service";

export const dynamic = "force-dynamic";

function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspace = await getClientWorkspace(id);
  if (!workspace) notFound();

  const clients = [workspace.client];
  const openPipeline = workspace.crm.deals.filter((deal) => !["won", "lost"].includes(deal.stage)).reduce((sum, deal) => sum + deal.value, 0);
  const pendingApprovals = workspace.approvals.filter((approval) => approval.status === "pending");
  const activeJobs = workspace.agentJobs.filter((job) => job.status === "queued" || job.status === "running" || job.status === "blocked");

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/clients" className="text-xs text-indigo-400 hover:text-indigo-300">Clients</Link>
          <h1 className="mt-1 text-xl font-semibold text-slate-100">{workspace.client.name}</h1>
          <p className="mt-0.5 max-w-3xl text-sm text-slate-400">{workspace.context?.summary || workspace.client.notes || "No client summary yet."}</p>
        </div>
        <StatusBadge status={workspace.client.status} />
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
        <MetricCard title="Memory" value={workspace.memory.length} icon={MemoryStick} />
        <MetricCard title="Files" value={workspace.files.length} icon={FileText} />
        <MetricCard title="Deals" value={workspace.crm.deals.length} icon={DollarSign} accent="green" />
        <MetricCard title="Pipeline" value={money(openPipeline)} icon={DollarSign} accent="amber" />
        <MetricCard title="Jobs" value={activeJobs.length} icon={Bot} accent="blue" />
        <MetricCard title="Approvals" value={pendingApprovals.length} icon={CheckSquare} accent="amber" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ClientMemoryForm clients={clients} />
        <ClientFileForm clients={clients} defaultClientId={workspace.client.id} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="grid grid-cols-4 gap-4 px-5 py-3 border-b border-slate-800 text-xs font-medium text-slate-500 uppercase tracking-wide">
            <span>Deal</span><span>Stage</span><span>Value</span><span>Probability</span>
          </div>
          <div className="divide-y divide-slate-800/60">
            {workspace.crm.deals.length === 0 ? <EmptyState icon={DollarSign} title="No deals" description="CRM deals for this client will appear here." /> : workspace.crm.deals.map((deal) => (
              <div key={deal.id} className="grid grid-cols-4 gap-4 px-5 py-3 items-center">
                <div>
                  <p className="text-sm font-medium text-slate-200">{deal.name}</p>
                  <p className="text-xs text-slate-500">{deal.id}</p>
                </div>
                <StatusBadge status={deal.stage} />
                <span className="text-xs text-slate-300">{money(deal.value, deal.currency)}</span>
                <span className="text-xs text-slate-400">{deal.probability}%</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="grid grid-cols-4 gap-4 px-5 py-3 border-b border-slate-800 text-xs font-medium text-slate-500 uppercase tracking-wide">
            <span>Contact</span><span>Email</span><span>Title</span><span>Status</span>
          </div>
          <div className="divide-y divide-slate-800/60">
            {workspace.crm.contacts.length === 0 ? <EmptyState icon={Contact} title="No contacts" description="CRM contacts for this client will appear here." /> : workspace.crm.contacts.map((contact) => (
              <div key={contact.id} className="grid grid-cols-4 gap-4 px-5 py-3 items-center">
                <span className="text-sm font-medium text-slate-200">{contact.name}</span>
                <span className="truncate text-xs text-slate-400">{contact.email || "-"}</span>
                <span className="text-xs text-slate-400">{contact.title || "-"}</span>
                <StatusBadge status={contact.status} />
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="grid grid-cols-4 gap-4 px-5 py-3 border-b border-slate-800 text-xs font-medium text-slate-500 uppercase tracking-wide">
            <span>Agent Job</span><span>Priority</span><span>Status</span><span>Updated</span>
          </div>
          <div className="divide-y divide-slate-800/60">
            {workspace.agentJobs.length === 0 ? <EmptyState icon={Bot} title="No agent jobs" description="Scoped client jobs will appear here." /> : workspace.agentJobs.map((job) => (
              <div key={job.id} className="grid grid-cols-4 gap-4 px-5 py-3 items-center">
                <div>
                  <p className="text-sm font-medium text-slate-200">{job.title}</p>
                  <p className="text-xs text-slate-500">{job.id}</p>
                </div>
                <span className="text-xs text-slate-400 capitalize">{job.priority}</span>
                <StatusBadge status={job.status} />
                <span className="text-xs text-slate-500">{new Date(job.updatedAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="grid grid-cols-4 gap-4 px-5 py-3 border-b border-slate-800 text-xs font-medium text-slate-500 uppercase tracking-wide">
            <span>Outbound</span><span>Recipient</span><span>Status</span><span>Approval</span>
          </div>
          <div className="divide-y divide-slate-800/60">
            {workspace.outboundMessages.length === 0 ? <EmptyState icon={Mail} title="No outbound messages" description="Approval-gated outbound for this client will appear here." /> : workspace.outboundMessages.map((message) => (
              <div key={message.id} className="grid grid-cols-4 gap-4 px-5 py-3 items-center">
                <div>
                  <p className="text-sm font-medium text-slate-200">{message.subject}</p>
                  <p className="text-xs text-slate-500">{message.id}</p>
                </div>
                <span className="truncate text-xs text-slate-400">{message.to}</span>
                <StatusBadge status={message.status} />
                <span className="text-xs text-slate-500">{message.approvalId || "-"}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="grid grid-cols-4 gap-4 px-5 py-3 border-b border-slate-800 text-xs font-medium text-slate-500 uppercase tracking-wide">
            <span>Run</span><span>Workflow</span><span>Status</span><span>Started</span>
          </div>
          <div className="divide-y divide-slate-800/60">
            {workspace.runs.length === 0 ? <EmptyState icon={Play} title="No runs" description="Runs tied to this client’s leads will appear here." /> : workspace.runs.map((run) => (
              <div key={run.id} className="grid grid-cols-4 gap-4 px-5 py-3 items-center">
                <Link href={`/runs/${run.id}`} className="text-sm font-medium text-slate-200 hover:text-indigo-300">{run.name}</Link>
                <span className="text-xs text-slate-400">{run.workflowId || "-"}</span>
                <StatusBadge status={run.status} />
                <span className="text-xs text-slate-500">{new Date(run.startedAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="grid grid-cols-4 gap-4 px-5 py-3 border-b border-slate-800 text-xs font-medium text-slate-500 uppercase tracking-wide">
            <span>Activity</span><span>Type</span><span>Status</span><span>When</span>
          </div>
          <div className="divide-y divide-slate-800/60">
            {workspace.crm.activities.length === 0 ? <EmptyState icon={Activity} title="No activity" description="CRM activity for this client will appear here." /> : workspace.crm.activities.slice(0, 20).map((activity) => (
              <div key={activity.id} className="grid grid-cols-4 gap-4 px-5 py-3 items-center">
                <div>
                  <p className="text-sm font-medium text-slate-200">{activity.title}</p>
                  <p className="line-clamp-1 text-xs text-slate-500">{activity.body || activity.id}</p>
                </div>
                <span className="text-xs text-slate-400 capitalize">{activity.type.replace(/_/g, " ")}</span>
                <StatusBadge status={activity.status} />
                <span className="text-xs text-slate-500">{new Date(activity.occurredAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="text-sm font-semibold text-slate-100">Memory</h2>
          <div className="mt-3 space-y-3">
            {workspace.memory.length === 0 ? <p className="text-xs text-slate-500">No memory yet.</p> : workspace.memory.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <p className="text-xs font-medium text-slate-200">{item.title}</p>
                <p className="mt-1 text-xs text-slate-500">{item.kind} · {item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="text-sm font-semibold text-slate-100">Files</h2>
          <div className="mt-3 space-y-3">
            {workspace.files.length === 0 ? <p className="text-xs text-slate-500">No files registered yet.</p> : workspace.files.map((file) => (
              <div key={file.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <p className="text-xs font-medium text-slate-200">{file.name}</p>
                <p className="mt-1 text-xs text-slate-500">{file.kind}{file.url ? ` · ${file.url}` : ""}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
