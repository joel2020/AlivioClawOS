import { createCrmContact, listCrmContacts } from "@/lib/clawbot-service";
import { requirePermission } from "@/lib/operator-rbac";
import { enforceRateLimit } from "@/lib/rate-limit";
import { badRequest, internalError, json, readJson } from "../../_utils";
import type { CrmContactStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json(await listCrmContacts());
  } catch (error) {
    return internalError(error);
  }
}

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(request, "mutation", "crm:contact:create");
    if (limited) return limited;
    const auth = await requirePermission(request, "crm:write");
    if (!auth.ok) return json({ error: auth.error }, { status: auth.status });
    const body = await readJson<Record<string, unknown>>(request);
    if (!body) return badRequest("Invalid JSON body");
    const contact = await createCrmContact({
      accountId: typeof body.accountId === "string" && body.accountId ? body.accountId : undefined,
      leadId: typeof body.leadId === "string" && body.leadId ? body.leadId : undefined,
      name: typeof body.name === "string" ? body.name : "",
      email: typeof body.email === "string" ? body.email : undefined,
      phone: typeof body.phone === "string" ? body.phone : undefined,
      title: typeof body.title === "string" ? body.title : undefined,
      status: typeof body.status === "string" ? body.status as CrmContactStatus : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    }, auth.operator.email);
    return json(contact, { status: 201 });
  } catch (error) {
    return internalError(error);
  }
}
