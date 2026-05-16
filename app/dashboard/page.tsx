import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { MetricCard } from "@/components/MetricCard";
import { Activity, AlertTriangle, Bot, CheckCircle, Users, Sparkles, ShieldAlert, Handshake, DollarSign } from "lucide-react";
import { getDashboardSnapshot, getDataSourceLabel } from "@/lib/clawbot-data";
import { getCrmSnapshot } from "@/lib/clawbot-service";

export default async function DashboardPage() {
  const [snapshot, crm] = await Promise.all([getDashboardSnapshot(), getCrmSnapshot()]);
  const { stats: st, runs, approvals, source } = snapshot;
  const recentRuns = runs.slice(0, 6);
  const pendingApprovals = approvals.filter((a) => a.status === "pending").slice(0, 5);
  const services = st.services || {};
  const serviceValues = Object.values(services);
  const allOk = serviceValues.length > 0 && serviceValues.every((v) => v === "ok" || v === "healthy");
  const openPipeline = crm.deals.filter((deal) => !["won", "lost"].includes(deal.stage)).reduce((sum, deal) => sum + deal.value, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-indigo-400">Clawbot</p>
          <h1 className="text-2xl font-semibold text-slate-100 mt-1">Operator Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Alivio AI Business OS control spine for runs, approvals, lead intake, and workflow orchestration.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-400">
            Data: {getDataSourceLabel(source)}
          </span>
          <Link href="/ops" className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-300 hover:bg-indigo-500/15">
            Open Ops
          </Link>
        </div>
      </div>

      <div className={`flex flex-col gap-2 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center ${
        allOk ? "border-emerald-800 bg-emerald-950/35 text-emerald-300" : "border-amber-800 bg-amber-950/35 text-amber-300"
      }`}>
        {allOk ? <CheckCircle className="h-4 w-4 shrink-0" /> : <ShieldAlert className="h-4 w-4 shrink-0" />}
        <span>{allOk ? "Connected services are healthy." : "One or more services need attention."}</span>
        <span className="sm:ml-auto text-xs text-slate-500">{serviceValues.length ? `${serviceValues.length} services checked` : "No live service health returned"}</span>
      </div>

      {!serviceValues.length && source !== "api" && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-400">
          Live API data is not available right now. Showing an explicit empty state rather than fabricated production data.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Active Runs" value={st.active_runs} icon={Activity} accent="blue" />
        <MetricCard title="Pending Approvals" value={st.pending_approvals} icon={AlertTriangle} accent="amber" />
        <MetricCard title="Total Leads" value={st.total_leads} icon={Users} accent="default" />
        <MetricCard title="Agents Online" value={st.agents_online} icon={Bot} accent="green" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="CRM Accounts" value={crm.accounts.length} icon={Handshake} accent="blue" />
        <MetricCard title="CRM Contacts" value={crm.contacts.length} icon={Users} accent="default" />
        <MetricCard title="Open Deals" value={crm.deals.filter((deal) => !["won", "lost"].includes(deal.stage)).length} icon={DollarSign} accent="green" />
        <MetricCard title="Open Pipeline" value={`$${openPipeline.toLocaleString()}`} icon={DollarSign} accent="amber" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Completed today</p>
          <p className="mt-1 text-2xl font-semibold text-slate-100">{st.completedToday ?? 0}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Success rate</p>
          <p className="mt-1 text-2xl font-semibold text-slate-100">{st.successRate ?? 0}%</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Average run duration</p>
          <p className="mt-1 text-2xl font-semibold text-slate-100">
            {st.avgRunDurationMs ? `${Math.round(st.avgRunDurationMs / 60000)}m` : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Spend today</p>
          <p className="mt-1 text-2xl font-semibold text-slate-100">${(st.costToday ?? 0).toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Recent Runs</h2>
              <p className="text-xs text-slate-500 mt-0.5">Latest orchestration activity across the system</p>
            </div>
            <Link href="/runs" className="text-xs text-indigo-400 hover:text-indigo-300">View all →</Link>
          </div>
          {recentRuns.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No live runs yet"
              description="Once the control API starts emitting runs, they will appear here automatically."
            />
          ) : (
            <div className="divide-y divide-slate-800/60">
              {recentRuns.map((run) => (
                <div key={run.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-200 truncate">{run.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {run.projectName || "Unassigned project"} · {run.triggeredBy} ·{" "}
                      {run.startedAt ? new Date(run.startedAt).toLocaleString() : "Unknown start"}
                    </p>
                  </div>
                  <StatusBadge status={run.status} dot />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Pending Approvals</h2>
              <p className="text-xs text-slate-500 mt-0.5">Human-in-the-loop gates</p>
            </div>
            <Link href="/approvals" className="text-xs text-indigo-400 hover:text-indigo-300">View all →</Link>
          </div>
          {pendingApprovals.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="No pending approvals"
              description="The approval queue is clear."
            />
          ) : (
            <div className="divide-y divide-slate-800/60">
              {pendingApprovals.map((a) => (
                <div key={a.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200">{a.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{a.description}</p>
                      <p className="text-xs text-indigo-400 mt-1">{a.requestedBy}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">CRM Pipeline</h2>
            <p className="text-xs text-slate-500 mt-0.5">Latest accounts, contacts, deals, and activity</p>
          </div>
          <Link href="/crm" className="text-xs text-indigo-400 hover:text-indigo-300">Open CRM →</Link>
        </div>
        <div className="grid grid-cols-1 divide-y divide-slate-800 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          <div className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Recent Accounts</p>
            <div className="mt-3 space-y-3">
              {crm.accounts.slice(0, 4).map((account) => (
                <div key={account.id}>
                  <p className="text-sm font-medium text-slate-200">{account.name}</p>
                  <p className="text-xs text-slate-500">{account.status} · {account.owner}</p>
                </div>
              ))}
              {crm.accounts.length === 0 && <p className="text-xs text-slate-500">No CRM accounts yet.</p>}
            </div>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Open Deals</p>
            <div className="mt-3 space-y-3">
              {crm.deals.filter((deal) => !["won", "lost"].includes(deal.stage)).slice(0, 4).map((deal) => (
                <div key={deal.id}>
                  <p className="text-sm font-medium text-slate-200">{deal.name}</p>
                  <p className="text-xs text-slate-500">${deal.value.toLocaleString()} · {deal.stage}</p>
                </div>
              ))}
              {crm.deals.length === 0 && <p className="text-xs text-slate-500">No deals yet.</p>}
            </div>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Recent Activity</p>
            <div className="mt-3 space-y-3">
              {crm.activities.slice(0, 4).map((activity) => (
                <div key={activity.id}>
                  <p className="text-sm font-medium text-slate-200">{activity.title}</p>
                  <p className="text-xs text-slate-500">{activity.type.replace(/_/g, " ")} · {new Date(activity.occurredAt).toLocaleDateString()}</p>
                </div>
              ))}
              {crm.activities.length === 0 && <p className="text-xs text-slate-500">No CRM activity yet.</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">MVP Workflows</h2>
            <p className="text-xs text-slate-500 mt-0.5">The three core operating paths for Alivio</p>
          </div>
          <Link href="/workflows" className="text-xs text-indigo-400 hover:text-indigo-300">View all →</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
          {[
            { name: "Lead Intake → Discovery", from: "Intake Discovery Claw", to: "Discovery Packet", leads: st.total_leads },
            { name: "Discovery → Proposal", from: "Sales Proposal Claw", to: "Proposal Packet", leads: "-" },
            { name: "Discovery → Web Strategy", from: "Web Design Strategy Claw", to: "Strategy Brief", leads: "-" },
          ].map((wf) => (
            <div key={wf.name} className="px-5 py-4">
              <p className="text-sm font-semibold text-slate-100">{wf.name}</p>
              <p className="text-xs text-slate-500 mt-1">{wf.from} → {wf.to}</p>
              {typeof wf.leads === "number" && <p className="text-xs text-indigo-400 mt-2">{wf.leads} leads in pipeline</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
