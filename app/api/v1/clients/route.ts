import { createClient, listClients } from "@/lib/clawbot-service";
import { requirePermission } from "@/lib/operator-rbac";
import { enforceRateLimit } from "@/lib/rate-limit";
import { badRequest, internalError, json, readJson } from "../_utils";
import type { ClientType } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json(await listClients());
  } catch (error) {
    return internalError(error);
  }
}

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(request, "mutation", "clients:create");
    if (limited) return limited;
    const auth = await requirePermission(request, "clients:write");
    if (!auth.ok) return json({ error: auth.error }, { status: auth.status });
    const body = await readJson<Record<string, unknown>>(request);
    if (!body) return badRequest("Invalid JSON body");
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return badRequest("name is required");
    const created = await createClient({
      name,
      type: typeof body.type === "string" ? (body.type as ClientType) : undefined,
      primaryContact: typeof body.primaryContact === "string" ? body.primaryContact : undefined,
      contactEmail: typeof body.contactEmail === "string" ? body.contactEmail : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      tags: Array.isArray(body.tags) ? body.tags.filter((tag): tag is string => typeof tag === "string") : undefined,
    });
    return json(created, { status: 201 });
  } catch (error) {
    return internalError(error);
  }
}
