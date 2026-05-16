import { sendApprovedOutboundMessage } from "@/lib/clawbot-service";
import { requirePermission } from "@/lib/operator-rbac";
import { enforceRateLimit } from "@/lib/rate-limit";
import { internalError, json } from "../../../_utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const limited = await enforceRateLimit(request, "mutation", "outbound:send");
    if (limited) return limited;
    const auth = await requirePermission(request, "outbound:write");
    if (!auth.ok) return json({ error: auth.error }, { status: auth.status });
    const { id } = await params;
    return json(await sendApprovedOutboundMessage(id, auth.operator.email));
  } catch (error) {
    return internalError(error);
  }
}
