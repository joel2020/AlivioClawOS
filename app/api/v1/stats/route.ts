import { deriveStats, getState } from "@/lib/clawbot-service";
import { internalError, json } from "../_utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await getState();
    return json(deriveStats(state));
  } catch (error) {
    return internalError(error);
  }
}
