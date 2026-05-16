import { draftOutboundMessage, listOutboundMessages } from "@/lib/clawbot-service";
import { requirePermission } from "@/lib/operator-rbac";
import { enforceRateLimit } from "@/lib/rate-limit";
import { badRequest, internalError, json, readJson } from "../_utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json(await listOutboundMessages());
  } catch (error) {
    return internalError(error);
  }
}

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(request, "mutation", "outbound:draft");
    if (limited) return limited;
    const auth = await requirePermission(request, "outbound:write");
    if (!auth.ok) return json({ error: auth.error }, { status: auth.status });
    const body = await readJson<Record<string, unknown>>(request);
    if (!body) return badRequest("Invalid JSON body");

    const result = await draftOutboundMessage({
      clientId: typeof body.clientId === "string" && body.clientId ? body.clientId : undefined,
      leadId: typeof body.leadId === "string" && body.leadId ? body.leadId : undefined,
      agentJobId: typeof body.agentJobId === "string" && body.agentJobId ? body.agentJobId : undefined,
      to: typeof body.to === "string" ? body.to : undefined,
      subject: typeof body.subject === "string" ? body.subject : undefined,
      body: typeof body.body === "string" ? body.body : undefined,
    }, auth.operator.email);
    return json(result, { status: 201 });
  } catch (error) {
    return internalError(error);
  }
}
