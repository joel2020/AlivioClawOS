import { createLead, createRun, listRuns } from "@/lib/clawbot-service";
import { requirePermission } from "@/lib/operator-rbac";
import { badRequest, internalError, json, readJson } from "../_utils";
import type { WorkflowId } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json(await listRuns());
  } catch (error) {
    return internalError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requirePermission(request, "runs:write");
    if (!auth.ok) return json({ error: auth.error }, { status: auth.status });
    const body = await readJson<Record<string, unknown>>(request);
    if (!body) return badRequest("Invalid JSON body");

    if (typeof body.workflowId !== "string" || !body.workflowId) {
      return badRequest("workflowId is required");
    }

    const workflowId = body.workflowId as WorkflowId;

    if (typeof body.leadId === "string" && body.leadId) {
      const created = await createRun({
        workflowId,
        leadId: body.leadId,
        title: typeof body.title === "string" ? body.title : undefined,
        notes: typeof body.notes === "string" ? body.notes : undefined,
      });
      return json(created, { status: 201 });
    }

    const companyName = typeof body.companyName === "string" ? body.companyName.trim() : "";
    if (!companyName) return badRequest("companyName is required when leadId is not provided");

    const createdLead = await createLead({
      companyName,
      contactName: typeof body.contactName === "string" ? body.contactName : undefined,
      contactEmail: typeof body.contactEmail === "string" ? body.contactEmail : undefined,
      source: typeof body.source === "string" ? body.source : "web",
      serviceInterest: typeof body.serviceInterest === "string" ? body.serviceInterest : "proposal_generation",
      notes: typeof body.notes === "string" ? body.notes : undefined,
      autoStartWorkflow: false,
    });
    const createdRun = await createRun({
      workflowId,
      leadId: createdLead.lead.id,
      title: typeof body.title === "string" ? body.title : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    });
    return json({ lead: createdLead.lead, run: createdRun.run }, { status: 201 });
  } catch (error) {
    return internalError(error);
  }
}
