import { createCrmActivity, listCrmActivities } from "@/lib/clawbot-service";
import { requirePermission } from "@/lib/operator-rbac";
import { enforceRateLimit } from "@/lib/rate-limit";
import { badRequest, internalError, json, readJson } from "../../_utils";
import type { CrmActivityStatus, CrmActivityType } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json(await listCrmActivities());
  } catch (error) {
    return internalError(error);
  }
}

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(request, "mutation", "crm:activity:create");
    if (limited) return limited;
    const auth = await requirePermission(request, "crm:write");
    if (!auth.ok) return json({ error: auth.error }, { status: auth.status });
    const body = await readJson<Record<string, unknown>>(request);
    if (!body) return badRequest("Invalid JSON body");
    const activity = await createCrmActivity({
      accountId: typeof body.accountId === "string" && body.accountId ? body.accountId : undefined,
      contactId: typeof body.contactId === "string" && body.contactId ? body.contactId : undefined,
      dealId: typeof body.dealId === "string" && body.dealId ? body.dealId : undefined,
      leadId: typeof body.leadId === "string" && body.leadId ? body.leadId : undefined,
      type: typeof body.type === "string" ? body.type as CrmActivityType : undefined,
      status: typeof body.status === "string" ? body.status as CrmActivityStatus : undefined,
      title: typeof body.title === "string" ? body.title : "",
      body: typeof body.body === "string" ? body.body : undefined,
      dueAt: typeof body.dueAt === "string" && body.dueAt ? body.dueAt : undefined,
      createdBy: auth.operator.email,
      metadata: typeof body.metadata === "object" && body.metadata !== null ? body.metadata as Record<string, unknown> : undefined,
    }, auth.operator.email);
    return json(activity, { status: 201 });
  } catch (error) {
    return internalError(error);
  }
}
