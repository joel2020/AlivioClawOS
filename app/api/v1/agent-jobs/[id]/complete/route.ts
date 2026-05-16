import { completeAgentJob } from "@/lib/clawbot-service";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireWorkerAuth } from "@/lib/worker-auth";
import { badRequest, internalError, json, readJson } from "../../../_utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const limited = await enforceRateLimit(request, "mutation", "agent_jobs:complete");
    if (limited) return limited;
    const auth = requireWorkerAuth(request);
    if (!auth.ok) return json({ error: auth.error }, { status: auth.status });
    const body = await readJson<{ output?: Record<string, unknown> }>(request);
    if (!body) return badRequest("Invalid JSON body");
    const { id } = await params;
    const job = await completeAgentJob(id, body.output || {}, auth.workerId);
    return json(job);
  } catch (error) {
    return internalError(error);
  }
}
