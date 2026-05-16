import "server-only";
import { NextResponse } from "next/server";
import { createClient, type RedisClientType } from "redis";
import { recordAuditEvent } from "@/lib/clawbot-db-state";

type BucketName = "auth" | "webhook" | "mutation";

interface BucketConfig {
  limit: number;
  windowMs: number;
}

interface BucketState {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, BucketState>();
let redisClient: RedisClientType | null = null;
let redisFailed = false;

const CONFIG: Record<BucketName, BucketConfig> = {
  auth: {
    limit: Number(process.env.RATE_LIMIT_AUTH_ATTEMPTS || 8),
    windowMs: Number(process.env.RATE_LIMIT_AUTH_WINDOW_MS || 15 * 60 * 1000),
  },
  webhook: {
    limit: Number(process.env.RATE_LIMIT_WEBHOOK_ACTIONS || 60),
    windowMs: Number(process.env.RATE_LIMIT_WEBHOOK_WINDOW_MS || 60 * 1000),
  },
  mutation: {
    limit: Number(process.env.RATE_LIMIT_MUTATIONS || 30),
    windowMs: Number(process.env.RATE_LIMIT_MUTATION_WINDOW_MS || 60 * 1000),
  },
};

function forwardedIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

function keyFor(request: Request, bucket: BucketName, scope?: string) {
  return [bucket, scope || "default", forwardedIp(request)].join(":");
}

function limitedResponse(message: string, retryAfterSeconds: number) {
  return NextResponse.json(
    { error: message, retryAfterSeconds },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}

async function getRedisClient() {
  if (!process.env.REDIS_URL || redisFailed || process.env.NODE_ENV === "test") return null;
  if (!redisClient) {
    redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on("error", (error) => {
      redisFailed = true;
      console.warn("Redis rate limiter unavailable; falling back to in-memory limits", error);
    });
    await redisClient.connect().catch((error) => {
      redisFailed = true;
      console.warn("Redis rate limiter connection failed; falling back to in-memory limits", error);
      redisClient = null;
    });
  }
  return redisClient?.isOpen ? redisClient : null;
}

async function incrementRedisBucket(key: string, config: BucketConfig) {
  const client = await getRedisClient();
  if (!client) return null;
  const count = await client.incr(key);
  if (count === 1) {
    await client.pExpire(key, config.windowMs);
  }
  const ttl = await client.pTTL(key);
  return { count, resetAt: Date.now() + Math.max(ttl, 0) };
}

export function resetRateLimitsForTests() {
  buckets.clear();
}

export async function enforceRateLimit(request: Request, bucket: BucketName, scope?: string) {
  const config = CONFIG[bucket];
  const key = keyFor(request, bucket, scope);
  const now = Date.now();
  const redisState = await incrementRedisBucket(key, config);
  const state = redisState || (() => {
    const current = buckets.get(key);
    const next = !current || current.resetAt <= now ? { count: 0, resetAt: now + config.windowMs } : current;
    next.count += 1;
    buckets.set(key, next);
    return next;
  })();

  if (state.count <= config.limit) {
    return null;
  }

  const retryAfterSeconds = Math.max(1, Math.ceil((state.resetAt - now) / 1000));
  const message = `Too many ${bucket} requests. Try again in ${retryAfterSeconds} seconds.`;
  console.warn("Rate limit exceeded", { bucket, scope, key, retryAfterSeconds });
  await recordAuditEvent({
    action: "rate_limit.exceeded",
    targetType: bucket,
    targetId: scope || null,
    metadata: {
      ip: forwardedIp(request),
      retryAfterSeconds,
    },
  }).catch((error) => {
    console.error("Failed to audit rate limit violation", error);
  });
  return limitedResponse(message, retryAfterSeconds);
}
