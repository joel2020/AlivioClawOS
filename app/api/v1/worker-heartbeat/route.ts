import { listWorkerHeartbeats, recordWorkerHeartbeat } from "@/lib/clawbot-service";
import { requirePermission } from "@/lib/operator-rbac";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireWorkerAuth } from "@/lib/worker-auth";
import { badRequest, internalError, json, readJson } from "../_utils";
import type { WorkerHeartbeat } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requirePermission(request, "logs:read");
    if (!auth.ok) return json({ error: auth.error }, { status: auth.status });
    return json(await listWorkerHeartbeats());
  } catch (error) {
    return internalError(error);
  }
}

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(request, "webhook", "worker:heartbeat");
    if (limited) return limited;
    const auth = requireWorkerAuth(request);
    if (!auth.ok) return json({ error: auth.error }, { status: auth.status });
    const body = await readJson<Record<string, unknown>>(request);
    const status = body?.status === "degraded" || body?.status === "offline" ? body.status : "online";
    const currentJobId = typeof body?.currentJobId === "string" && body.currentJobId ? body.currentJobId : undefined;
    const metadata = typeof body?.metadata === "object" && body.metadata !== null ? body.metadata as Record<string, unknown> : {};
    if (status && !["online", "degraded", "offline"].includes(status)) return badRequest("Invalid worker status");
    return json(await recordWorkerHeartbeat(auth.workerId, status as WorkerHeartbeat["status"], currentJobId, metadata));
  } catch (error) {
    return internalError(error);
  }
}
