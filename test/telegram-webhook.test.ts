import { describe, expect, it, beforeEach, vi } from "vitest";
import { POST as telegramPost } from "@/app/api/v1/integrations/telegram/webhook/route";
import { createLead, getState, resetAppStateForTests } from "@/lib/clawbot-service";

function telegramRequest(text: string, headers: Record<string, string> = {}, fromId = 42) {
  return new Request("http://localhost/api/v1/integrations/telegram/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify({
      update_id: 1,
      message: {
        text,
        chat: { id: 100 },
        from: { id: fromId, username: "ops" },
      },
    }),
  });
}

describe("Telegram webhook", () => {
  beforeEach(() => {
    resetAppStateForTests();
  });

  it("rejects production requests when webhook secret is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "");

    const response = await telegramPost(telegramRequest("/help"));
    expect(response.status).toBe(503);
  });

  it("rejects invalid Telegram webhook secrets", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "expected");

    const response = await telegramPost(telegramRequest("/help", { "x-telegram-bot-api-secret-token": "wrong" }));
    expect(response.status).toBe(401);
  });

  it("accepts valid secret for safe commands", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "expected");

    const response = await telegramPost(telegramRequest("/help", { "x-telegram-bot-api-secret-token": "expected" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("routes free text to the AI assistant path", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "expected");
    vi.stubEnv("TELEGRAM_ALLOWED_USER_IDS", "42");

    const response = await telegramPost(telegramRequest("What needs attention today?", { "x-telegram-bot-api-secret-token": "expected" }, 42));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("blocks dangerous commands from unapproved Telegram users in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "expected");
    vi.stubEnv("TELEGRAM_ALLOWED_USER_IDS", "99");

    const response = await telegramPost(telegramRequest("/cancel run-8821", { "x-telegram-bot-api-secret-token": "expected" }, 42));
    expect(response.status).toBe(403);
  });

  it("executes allowed approval commands", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "expected");
    vi.stubEnv("TELEGRAM_ALLOWED_USER_IDS", "42");
    const created = await createLead({ companyName: "Telegram Co" });
    const stateBefore = await getState();
    const approval = stateBefore.approvals.find((item) => item.runId === created.run?.id);

    const response = await telegramPost(telegramRequest(`/approve ${approval!.id}`, { "x-telegram-bot-api-secret-token": "expected" }, 42));
    expect(response.status).toBe(200);
    const state = await getState();
    expect(state.approvals.find((item) => item.id === approval!.id)?.status).toBe("approved");
  });
});
