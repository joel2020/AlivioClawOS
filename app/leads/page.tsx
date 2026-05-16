import { StatusBadge } from "@/components/StatusBadge";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { getDataSourceLabel, getLeads } from "@/lib/clawbot-data";
import { LeadIntakeForm } from "@/components/LeadIntakeForm";

export default async function LeadsPage() {
  const { leads, source } = await getLeads();
  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Leads</h1>
          <p className="text-sm text-slate-400 mt-0.5">{leads.length} total leads in system · {getDataSourceLabel(source)}</p>
        </div>
      </div>
      <LeadIntakeForm />
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="grid grid-cols-4 gap-4 px-5 py-3 border-b border-slate-800 text-xs font-medium text-slate-500 uppercase tracking-wide">
          <span>Company</span><span>Contact</span><span>Service</span><span>Status</span>
        </div>
        <div className="divide-y divide-slate-800/60">
          {leads.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No leads yet"
              description="Lead intake will populate here from the API or automation webhooks."
            />
          ) : leads.map((lead) => (
            <div key={lead.id} className="grid grid-cols-4 gap-4 px-5 py-3 items-center hover:bg-slate-800/30 transition-colors">
              <div>
                <p className="text-sm font-medium text-slate-200">{lead.companyName}</p>
                <p className="text-xs text-slate-500">{lead.source}</p>
              </div>
              <div>
                <p className="text-sm text-slate-300">{lead.contactName || "—"}</p>
                <p className="text-xs text-slate-500">{lead.contactEmail || ""}</p>
              </div>
              <span className="text-xs text-slate-400 capitalize">{lead.serviceInterest.replace(/_/g, " ")}</span>
              <StatusBadge status={lead.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
