import { listHandoffs } from "@/lib/clawbot-service";
import { internalError, json } from "../_utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json(await listHandoffs());
  } catch (error) {
    return internalError(error);
  }
}
