import { Mail } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { OutboundDraftForm } from "@/components/OutboundDraftForm";
import { StatusBadge } from "@/components/StatusBadge";
import { listAgentJobs, listClients, listLeads, listOutboundMessages } from "@/lib/clawbot-service";

export const dynamic = "force-dynamic";

export default async function OutboundPage() {
  const [messages, clients, leads, jobs] = await Promise.all([
    listOutboundMessages(),
    listClients(),
    listLeads(),
    listAgentJobs(),
  ]);
  const clientById = new Map(clients.map((client) => [client.id, client]));
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Outbound</h1>
        <p className="mt-0.5 text-sm text-slate-400">Approval-gated outbound email drafts for SDR, recruiting, and inbox workflows.</p>
      </div>
      <OutboundDraftForm clients={clients} leads={leads} jobs={jobs} />
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="grid grid-cols-6 gap-4 px-5 py-3 border-b border-slate-800 text-xs font-medium text-slate-500 uppercase tracking-wide">
          <span className="col-span-2">Message</span><span>Recipient</span><span>Context</span><span>Status</span><span>Updated</span>
        </div>
        <div className="divide-y divide-slate-800/60">
          {messages.length === 0 ? (
            <EmptyState icon={Mail} title="No outbound drafts" description="Draft an outbound email to create an approval request before anything can be sent." />
          ) : messages.map((message) => (
            <div key={message.id} className="grid grid-cols-6 gap-4 px-5 py-3 items-center hover:bg-slate-800/30 transition-colors">
              <div className="col-span-2">
                <p className="text-sm font-medium text-slate-200">{message.subject}</p>
                <p className="text-xs text-slate-500">{message.id}</p>
              </div>
              <span className="text-xs text-slate-400">{message.to}</span>
              <span className="text-xs text-slate-400">
                {message.clientId ? clientById.get(message.clientId)?.name || message.clientId : message.leadId ? leadById.get(message.leadId)?.companyName || message.leadId : "-"}
              </span>
              <StatusBadge status={message.status} />
              <span className="text-xs text-slate-500">{new Date(message.updatedAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
