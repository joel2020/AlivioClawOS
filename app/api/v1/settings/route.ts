import { getSettings, updateSettings } from "@/lib/clawbot-service";
import type { AppSettings } from "@/lib/clawbot-service";
import { requirePermission } from "@/lib/operator-rbac";
import { enforceRateLimit } from "@/lib/rate-limit";
import { badRequest, internalError, json, readJson } from "../_utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json(await getSettings());
  } catch (error) {
    return internalError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const limited = await enforceRateLimit(request, "mutation", "settings:update");
    if (limited) return limited;
    const auth = await requirePermission(request, "settings:write");
    if (!auth.ok) return json({ error: auth.error }, { status: auth.status });
    const body = await readJson<Record<string, unknown>>(request);
    if (!body) return badRequest("Invalid JSON body");
    const next = await updateSettings({
      organizationName: typeof body.organizationName === "string" ? body.organizationName : undefined,
      defaultModel: typeof body.defaultModel === "string" ? body.defaultModel : undefined,
      timezone: typeof body.timezone === "string" ? body.timezone : undefined,
      notifications: typeof body.notifications === "object" && body.notifications !== null ? (body.notifications as Partial<AppSettings["notifications"]>) : undefined,
      api: typeof body.api === "object" && body.api !== null ? (body.api as Partial<AppSettings["api"]>) : undefined,
    });
    return json(next);
  } catch (error) {
    return internalError(error);
  }
}
