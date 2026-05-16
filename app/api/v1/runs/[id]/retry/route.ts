import { retryRun } from "@/lib/clawbot-service";
import { internalError, json } from "../../../_utils";
import { requirePermission } from "@/lib/operator-rbac";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const limited = await enforceRateLimit(request, "mutation", "runs:retry");
    if (limited) return limited;
    const auth = await requirePermission(request, "runs:write");
    if (!auth.ok) return json({ error: auth.error }, { status: auth.status });
    const { id } = await params;
    await retryRun(id);
    return json({ ok: true });
  } catch (error) {
    return internalError(error);
  }
}
