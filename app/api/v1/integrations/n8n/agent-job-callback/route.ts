import { completeAgentJob, failAgentJob } from "@/lib/clawbot-service";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireWorkerAuth } from "@/lib/worker-auth";
import { badRequest, internalError, json, readJson } from "../../../_utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(request, "webhook", "n8n:agent-job-callback");
    if (limited) return limited;
    const auth = requireWorkerAuth(request);
    if (!auth.ok) return json({ error: auth.error }, { status: auth.status });
    const body = await readJson<{ jobId?: string; status?: string; output?: Record<string, unknown>; error?: string }>(request);
    if (!body?.jobId) return badRequest("jobId is required");
    if (body.status === "failed") {
      return json(await failAgentJob(body.jobId, body.error || "n8n workflow failed", auth.workerId));
    }
    return json(await completeAgentJob(body.jobId, body.output || {}, auth.workerId));
  } catch (error) {
    return internalError(error);
  }
}
