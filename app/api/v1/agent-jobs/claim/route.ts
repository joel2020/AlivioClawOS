import { claimNextAgentJob } from "@/lib/clawbot-service";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireWorkerAuth } from "@/lib/worker-auth";
import { internalError, json } from "../../_utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(request, "mutation", "agent_jobs:claim");
    if (limited) return limited;
    const auth = requireWorkerAuth(request);
    if (!auth.ok) return json({ error: auth.error }, { status: auth.status });
    const params = new URL(request.url).searchParams;
    const job = await claimNextAgentJob(auth.workerId, params.get("agentId") || undefined);
    return json({ job });
  } catch (error) {
    return internalError(error);
  }
}
