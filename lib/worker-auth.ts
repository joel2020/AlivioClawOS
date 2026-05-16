import "server-only";

export function requireWorkerAuth(request: Request) {
  const expected = process.env.CLAWBOT_WORKER_API_KEY?.trim();
  if (!expected && process.env.NODE_ENV === "production") {
    return { ok: false as const, status: 503, error: "Worker API key is not configured" };
  }
  if (!expected) return { ok: true as const, workerId: "dev-worker" };
  const provided = request.headers.get("x-clawbot-worker-key") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (provided !== expected) {
    return { ok: false as const, status: 401, error: "Invalid worker API key" };
  }
  return { ok: true as const, workerId: request.headers.get("x-clawbot-worker-id") || "worker" };
}
