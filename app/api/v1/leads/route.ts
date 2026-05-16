import { createLead, listLeads } from "@/lib/clawbot-service";
import { requirePermission } from "@/lib/operator-rbac";
import { enforceRateLimit } from "@/lib/rate-limit";
import { badRequest, internalError, json, readJson } from "../_utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json(await listLeads());
  } catch (error) {
    return internalError(error);
  }
}

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(request, "mutation", "leads:create");
    if (limited) return limited;
    const auth = await requirePermission(request, "leads:create");
    if (!auth.ok) return json({ error: auth.error }, { status: auth.status });
    const body = await readJson<Record<string, unknown>>(request);
    if (!body) return badRequest("Invalid JSON body");
    const companyName = typeof body.companyName === "string" ? body.companyName.trim() : "";
    if (!companyName) return badRequest("companyName is required");

    const created = await createLead({
      companyName,
      contactName: typeof body.contactName === "string" ? body.contactName : undefined,
      contactEmail: typeof body.contactEmail === "string" ? body.contactEmail : undefined,
      source: typeof body.source === "string" ? body.source : "web",
      serviceInterest: typeof body.serviceInterest === "string" ? body.serviceInterest : "proposal_generation",
      notes: typeof body.notes === "string" ? body.notes : undefined,
      autoStartWorkflow: body.autoStartWorkflow !== false,
    });
    return json(created, { status: 201 });
  } catch (error) {
    return internalError(error);
  }
}
