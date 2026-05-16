import { addClientFile, listClientFiles } from "@/lib/clawbot-service";
import { requirePermission } from "@/lib/operator-rbac";
import { enforceRateLimit } from "@/lib/rate-limit";
import { badRequest, internalError, json, readJson } from "../_utils";
import type { ClientFileKind } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const clientId = new URL(request.url).searchParams.get("clientId") || undefined;
    return json(await listClientFiles(clientId));
  } catch (error) {
    return internalError(error);
  }
}

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(request, "mutation", "client_files:create");
    if (limited) return limited;
    const auth = await requirePermission(request, "client_memory:write");
    if (!auth.ok) return json({ error: auth.error }, { status: auth.status });
    const body = await readJson<Record<string, unknown>>(request);
    if (!body) return badRequest("Invalid JSON body");
    const clientId = typeof body.clientId === "string" ? body.clientId : "";
    const name = typeof body.name === "string" ? body.name : "";
    if (!clientId) return badRequest("clientId is required");
    if (!name) return badRequest("name is required");
    return json(await addClientFile({
      clientId,
      name,
      kind: typeof body.kind === "string" ? body.kind as ClientFileKind : undefined,
      url: typeof body.url === "string" ? body.url : undefined,
      contentType: typeof body.contentType === "string" ? body.contentType : undefined,
      sizeBytes: typeof body.sizeBytes === "number" ? body.sizeBytes : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    }), { status: 201 });
  } catch (error) {
    return internalError(error);
  }
}
