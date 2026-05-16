import { ExternalLink, CheckCircle, AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { getDashboardSnapshot, getDataSourceLabel, getServiceHealth } from "@/lib/clawbot-data";
import { listWorkerHeartbeats } from "@/lib/clawbot-service";

const SERVICES = [
  { name: "Control API", key: "control_api", url: "https://api.aliviosearch.cloud/docs", desc: "FastAPI orchestration spine" },
  { name: "n8n Workflows", key: "n8n", url: "https://n8n.aliviosearch.cloud", desc: "External automation and integrations" },
  { name: "Telegram", key: "telegram", url: "https://telegram.org", desc: "Primary operator command channel" },
  { name: "Discord", key: "discord", url: "https://discord.com", desc: "Mirrored operational notifications" },
  { name: "Grafana", key: "grafana", url: "https://grafana.aliviosearch.cloud", desc: "Observability dashboards" },
  { name: "LiteLLM", key: "litellm", url: process.env.LITELLM_URL || "https://litellm.aliviosearch.cloud", desc: "Model gateway to Azure OpenAI" },
];

export default async function OpsPage() {
  const [snapshot, health, workers] = await Promise.all([getDashboardSnapshot(), getServiceHealth(), listWorkerHeartbeats()]);
  const services = snapshot.stats.services || {};
  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Operations</h1>
        <p className="text-sm text-slate-400 mt-0.5">Service links, health status, and infrastructure overview · {getDataSourceLabel(snapshot.source)}</p>
      </div>

      {/* Service Health Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SERVICES.map((svc) => {
          const ok = services[svc.key] === "ok" || services[svc.key] === "healthy";
          return (
            <a key={svc.name} href={svc.url} target="_blank" rel="noopener noreferrer"
               className="rounded-xl border border-slate-800 bg-slate-900 p-5 flex items-start justify-between hover:border-slate-700 transition-colors group">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-100">{svc.name}</p>
                  <ExternalLink className="h-3 w-3 text-slate-600 group-hover:text-slate-400" />
                </div>
                <p className="text-xs text-slate-500 mt-1">{svc.desc}</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                {ok
                  ? <><CheckCircle className="h-3.5 w-3.5 text-emerald-400" /><span className="text-emerald-400">ok</span></>
                  : <><AlertTriangle className="h-3.5 w-3.5 text-amber-400" /><span className="text-amber-400">check</span></>}
              </div>
            </a>
          );
        })}
      </div>

      {health.services.length === 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900">
          <EmptyState
            title="No service health payload"
            description="The runtime did not return a live service-health payload, so the operator UI is falling back to configuration-level status."
          />
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="grid grid-cols-4 gap-4 px-5 py-3 border-b border-slate-800 text-xs font-medium text-slate-500 uppercase tracking-wide">
          <span>Worker</span><span>Status</span><span>Current Job</span><span>Last Seen</span>
        </div>
        <div className="divide-y divide-slate-800/60">
          {workers.length === 0 ? (
            <EmptyState title="No worker heartbeats" description="The worker runtime has not reported a heartbeat yet." />
          ) : workers.map((worker) => (
            <div key={worker.id} className="grid grid-cols-4 gap-4 px-5 py-3 items-center hover:bg-slate-800/30 transition-colors">
              <span className="text-sm font-medium text-slate-200">{worker.workerId}</span>
              <StatusBadge status={worker.status} dot />
              <span className="text-xs text-slate-400">{worker.currentJobId || "-"}</span>
              <span className="text-xs text-slate-500">{new Date(worker.lastSeenAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stack Overview */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-sm font-semibold text-slate-100 mb-4">Stack Architecture</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { layer: "Ingress", tech: "Caddy", note: "Reverse proxy + TLS" },
            { layer: "Orchestration", tech: "FastAPI", note: "Control spine + REST API" },
            { layer: "Agent Runtime", tech: "OpenClaw", note: "Worker execution layer" },
            { layer: "Model Gateway", tech: "LiteLLM", note: "Azure OpenAI routing" },
            { layer: "State", tech: "PostgreSQL", note: "Canonical data store" },
            { layer: "Queue", tech: "Redis", note: "Async task broker" },
            { layer: "Integrations", tech: "n8n + Telegram + Discord", note: "Outbound notifications and command handling" },
            { layer: "Observability", tech: "Grafana + Loki", note: "Logs + metrics" },
            { layer: "Dashboard", tech: "Next.js", note: "Operator UI (this app)" },
          ].map((item) => (
            <div key={item.layer} className="rounded-lg bg-slate-800/50 border border-slate-800 px-3 py-2.5">
              <p className="text-xs font-medium text-slate-400">{item.layer}</p>
              <p className="text-sm font-semibold text-slate-100 mt-0.5">{item.tech}</p>
              <p className="text-xs text-slate-500 mt-0.5">{item.note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
