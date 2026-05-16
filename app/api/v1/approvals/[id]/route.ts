import { respondToApproval } from "@/lib/clawbot-service";
import { requirePermission } from "@/lib/operator-rbac";
import { enforceRateLimit } from "@/lib/rate-limit";
import { badRequest, internalError, json, readJson } from "../../_utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const limited = await enforceRateLimit(request, "mutation", "approvals:review");
    if (limited) return limited;
    const auth = await requirePermission(request, "approvals:review");
    if (!auth.ok) return json({ error: auth.error }, { status: auth.status });
    const { id } = await params;
    const body = await readJson<{ decision?: string; reviewedBy?: string }>(request);
    if (!body || (body.decision !== "approved" && body.decision !== "rejected")) {
      return badRequest("decision must be approved or rejected");
    }
    await respondToApproval(id, { decision: body.decision, reviewedBy: body.reviewedBy || auth.operator.email });
    return json({ ok: true });
  } catch (error) {
    return internalError(error);
  }
}
