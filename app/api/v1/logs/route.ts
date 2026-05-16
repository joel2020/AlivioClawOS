import { listLogs } from "@/lib/clawbot-service";
import { internalError, json } from "../_utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const runId = new URL(request.url).searchParams.get("runId") || undefined;
    return json(await listLogs(runId));
  } catch (error) {
    return internalError(error);
  }
}
