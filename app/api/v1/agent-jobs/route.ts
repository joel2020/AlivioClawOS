import { createAgentJob, listAgentDefinitions, listAgentJobs } from "@/lib/clawbot-service";
import { requirePermission } from "@/lib/operator-rbac";
import { enforceRateLimit } from "@/lib/rate-limit";
import { badRequest, internalError, json, readJson } from "../_utils";
import type { AgentJobPriority } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json({
      agents: await listAgentDefinitions(),
      jobs: await listAgentJobs(),
    });
  } catch (error) {
    return internalError(error);
  }
}

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(request, "mutation", "agent_jobs:create");
    if (limited) return limited;
    const auth = await requirePermission(request, "agent_jobs:write");
    if (!auth.ok) return json({ error: auth.error }, { status: auth.status });
    const body = await readJson<Record<string, unknown>>(request);
    if (!body) return badRequest("Invalid JSON body");
    const agentId = typeof body.agentId === "string" ? body.agentId.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!agentId) return badRequest("agentId is required");
    if (!title) return badRequest("title is required");
    const job = await createAgentJob({
      agentId,
      title,
      clientId: typeof body.clientId === "string" && body.clientId ? body.clientId : undefined,
      priority: typeof body.priority === "string" ? (body.priority as AgentJobPriority) : undefined,
      requestedBy: auth.operator.email,
      input: typeof body.input === "object" && body.input !== null ? body.input as Record<string, unknown> : undefined,
    });
    return json(job, { status: 201 });
  } catch (error) {
    return internalError(error);
  }
}
