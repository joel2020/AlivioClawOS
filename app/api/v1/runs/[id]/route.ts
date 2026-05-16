import { getRunById } from "@/lib/clawbot-service";
import { internalError, json, notFound } from "../../_utils";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const run = await getRunById(id);
    if (!run) return notFound("Run not found");
    return json(run);
  } catch (error) {
    return internalError(error);
  }
}
