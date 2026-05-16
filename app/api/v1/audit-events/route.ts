import { listAuditEvents } from "@/lib/clawbot-db-state";
import { requirePermission } from "@/lib/operator-rbac";
import { internalError, json } from "../_utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requirePermission(request, "audit:read");
    if (!auth.ok) return json({ error: auth.error }, { status: auth.status });
    const limit = Number(new URL(request.url).searchParams.get("limit") || 100);
    return json(await listAuditEvents(Math.min(Math.max(limit, 1), 500)));
  } catch (error) {
    return internalError(error);
  }
}
