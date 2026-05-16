import { addClientMemory, listClientMemory } from "@/lib/clawbot-service";
import { requirePermission } from "@/lib/operator-rbac";
import { enforceRateLimit } from "@/lib/rate-limit";
import { badRequest, internalError, json, readJson } from "../_utils";
import type { ClientMemoryKind } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const clientId = new URL(request.url).searchParams.get("clientId") || undefined;
    return json(await listClientMemory(clientId));
  } catch (error) {
    return internalError(error);
  }
}

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(request, "mutation", "client_memory:create");
    if (limited) return limited;
    const auth = await requirePermission(request, "client_memory:write");
    if (!auth.ok) return json({ error: auth.error }, { status: auth.status });
    const body = await readJson<Record<string, unknown>>(request);
    if (!body) return badRequest("Invalid JSON body");
    const clientId = typeof body.clientId === "string" ? body.clientId : "";
    const title = typeof body.title === "string" ? body.title : "";
    const text = typeof body.body === "string" ? body.body : "";
    if (!clientId) return badRequest("clientId is required");
    if (!title) return badRequest("title is required");
    if (!text) return badRequest("body is required");
    return json(await addClientMemory({
      clientId,
      title,
      body: text,
      kind: typeof body.kind === "string" ? body.kind as ClientMemoryKind : undefined,
      source: auth.operator.email,
    }), { status: 201 });
  } catch (error) {
    return internalError(error);
  }
}
