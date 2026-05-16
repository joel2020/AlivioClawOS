import { createCrmDeal, listCrmDeals } from "@/lib/clawbot-service";
import { requirePermission } from "@/lib/operator-rbac";
import { enforceRateLimit } from "@/lib/rate-limit";
import { badRequest, internalError, json, readJson } from "../../_utils";
import type { CrmDealStage } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json(await listCrmDeals());
  } catch (error) {
    return internalError(error);
  }
}

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(request, "mutation", "crm:deal:create");
    if (limited) return limited;
    const auth = await requirePermission(request, "crm:write");
    if (!auth.ok) return json({ error: auth.error }, { status: auth.status });
    const body = await readJson<Record<string, unknown>>(request);
    if (!body) return badRequest("Invalid JSON body");
    const deal = await createCrmDeal({
      accountId: typeof body.accountId === "string" ? body.accountId : "",
      contactId: typeof body.contactId === "string" && body.contactId ? body.contactId : undefined,
      leadId: typeof body.leadId === "string" && body.leadId ? body.leadId : undefined,
      name: typeof body.name === "string" ? body.name : "",
      stage: typeof body.stage === "string" ? body.stage as CrmDealStage : undefined,
      value: typeof body.value === "number" ? body.value : Number(body.value || 0),
      currency: typeof body.currency === "string" ? body.currency : undefined,
      probability: typeof body.probability === "number" ? body.probability : Number(body.probability || 10),
      expectedCloseDate: typeof body.expectedCloseDate === "string" && body.expectedCloseDate ? body.expectedCloseDate : undefined,
      owner: auth.operator.email,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    }, auth.operator.email);
    return json(deal, { status: 201 });
  } catch (error) {
    return internalError(error);
  }
}
