import { getAzureOpenAIConfig } from "@/lib/azure-openai";
import { getState, listWorkerHeartbeats } from "@/lib/clawbot-service";
import { isDatabasePersistenceEnabled } from "@/lib/clawbot-db-state";
import { internalError, json } from "../_utils";

export const dynamic = "force-dynamic";

function isRecent(iso?: string, maxAgeMs = 120_000) {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() <= maxAgeMs;
}

export async function GET() {
  try {
    const [state, workers] = await Promise.all([getState(), listWorkerHeartbeats()]);
    const telegramConfigured = Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim());
    const azureConfigured = Boolean(getAzureOpenAIConfig());
    const onlineWorkers = workers.filter((worker) => worker.status === "online" && isRecent(worker.lastSeenAt));
    const status = telegramConfigured && azureConfigured ? "ok" : "degraded";

    return json({
      ok: status === "ok",
      status,
      timestamp: new Date().toISOString(),
      persistence: isDatabasePersistenceEnabled() ? "postgres" : "json",
      integrations: {
        telegram: telegramConfigured ? "configured" : "missing",
        azureOpenAI: azureConfigured ? "configured" : "missing",
        redis: process.env.REDIS_URL ? "configured" : "not_configured",
        n8n: process.env.N8N_BASE_URL || process.env.N8N_AGENT_JOB_WEBHOOK_URL ? "configured" : "not_configured",
      },
      counts: {
        clients: state.clients.length,
        leads: state.leads.length,
        crmAccounts: state.crmAccounts.length,
        crmDeals: state.crmDeals.length,
        runs: state.runs.length,
        pendingApprovals: state.approvals.filter((approval) => approval.status === "pending").length,
        agentJobs: state.agentJobs.length,
        outboundMessages: state.outboundMessages.length,
      },
      workers: {
        total: workers.length,
        online: onlineWorkers.length,
        staleOrOffline: workers.length - onlineWorkers.length,
      },
    });
  } catch (error) {
    return internalError(error);
  }
}
