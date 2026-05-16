import { enforceRateLimit } from "@/lib/rate-limit";
import { handleTelegramUpdate, type TelegramUpdate } from "@/lib/telegram-bot";
import { internalError, json, readJson } from "../../../_utils";

export const dynamic = "force-dynamic";

function validateTelegramSecret(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!secret && process.env.NODE_ENV === "production") {
    return json({ error: "Telegram webhook secret is not configured" }, { status: 503 });
  }
  if (!secret) return null;
  const provided = request.headers.get("x-telegram-bot-api-secret-token");
  if (provided !== secret) {
    return json({ error: "Invalid Telegram secret" }, { status: 401 });
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(request, "webhook", "telegram");
    if (limited) return limited;
    const invalidSecret = validateTelegramSecret(request);
    if (invalidSecret) return invalidSecret;

    const body = await readJson<TelegramUpdate>(request);
    const result = body ? await handleTelegramUpdate(body) : { ok: true };
    if ("status" in result && result.status) return json({ ok: result.ok, error: result.error }, { status: result.status });
    return json({ ok: result.ok });
  } catch (error) {
    return internalError(error);
  }
}
