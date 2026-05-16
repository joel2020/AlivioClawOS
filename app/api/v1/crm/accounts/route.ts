import { createCrmAccount, listCrmAccounts } from "@/lib/clawbot-service";
import { requirePermission } from "@/lib/operator-rbac";
import { enforceRateLimit } from "@/lib/rate-limit";
import { badRequest, internalError, json, readJson } from "../../_utils";
import type { CrmAccountStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json(await listCrmAccounts());
  } catch (error) {
    return internalError(error);
  }
}

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(request, "mutation", "crm:account:create");
    if (limited) return limited;
    const auth = await requirePermission(request, "crm:write");
    if (!auth.ok) return json({ error: auth.error }, { status: auth.status });
    const body = await readJson<Record<string, unknown>>(request);
    if (!body) return badRequest("Invalid JSON body");
    const account = await createCrmAccount({
      name: typeof body.name === "string" ? body.name : "",
      clientId: typeof body.clientId === "string" && body.clientId ? body.clientId : undefined,
      leadId: typeof body.leadId === "string" && body.leadId ? body.leadId : undefined,
      website: typeof body.website === "string" ? body.website : undefined,
      industry: typeof body.industry === "string" ? body.industry : undefined,
      status: typeof body.status === "string" ? body.status as CrmAccountStatus : undefined,
      owner: auth.operator.email,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      tags: Array.isArray(body.tags) ? body.tags.filter((tag): tag is string => typeof tag === "string") : undefined,
    }, auth.operator.email);
    return json(account, { status: 201 });
  } catch (error) {
    return internalError(error);
  }
}
