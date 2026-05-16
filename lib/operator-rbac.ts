import "server-only";
import { randomBytes, scryptSync, timingSafeEqual, createHash, randomUUID } from "crypto";
import type { PoolClient } from "pg";
import { getPool, hasDatabaseUrl, withTransaction } from "@/lib/db";
import { OPERATOR_SESSION_COOKIE, createSessionCookieValue, getExpectedSessionTokenAsync, isOperatorAuthEnabled } from "@/lib/operator-auth";
import { recordAuditEvent } from "@/lib/clawbot-db-state";

export type OperatorRole = "admin" | "operator" | "reviewer" | "viewer";

export interface AuthenticatedOperator {
  id: string;
  email: string;
  name: string;
  roles: OperatorRole[];
  permissions: string[];
}

const SESSION_DAYS = Number(process.env.OPERATOR_SESSION_DAYS || 14);

function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const key = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${key}`;
}

function verifyPassword(password: string, stored: string | null) {
  if (!stored) return false;
  const [scheme, salt, key] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !key) return false;
  const candidate = Buffer.from(hashPassword(password, salt).split(":")[2], "hex");
  const expected = Buffer.from(key, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function cookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return "";
  const found = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : "";
}

async function ensureBootstrapOperator(client: PoolClient) {
  const count = await client.query("SELECT count(*)::int AS count FROM operators");
  if (count.rows[0]?.count > 0) return;

  const email = process.env.CLAWBOT_ADMIN_EMAIL || process.env.CLAWBOT_OPERATOR_EMAIL || "admin@clawbot.local";
  const name = process.env.CLAWBOT_ADMIN_NAME || "Clawbot Admin";
  const password = process.env.CLAWBOT_ADMIN_PASSWORD || process.env.CLAWBOT_OPERATOR_SECRET;
  if (!password && process.env.NODE_ENV === "production") {
    throw new Error("CLAWBOT_ADMIN_PASSWORD is required to bootstrap the first production operator");
  }
  const operatorId = "op-admin";
  await client.query(
    `INSERT INTO operators (id, email, name, password_hash)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (email) DO NOTHING`,
    [operatorId, email, name, password ? hashPassword(password) : null],
  );
  await client.query(
    `INSERT INTO operator_roles (operator_id, role_id)
     VALUES ($1, 'role-admin')
     ON CONFLICT DO NOTHING`,
    [operatorId],
  );
}

async function loadOperatorByEmail(client: PoolClient, email: string) {
  await ensureBootstrapOperator(client);
  const result = await client.query(
    `SELECT id, email, name, password_hash
     FROM operators
     WHERE lower(email) = lower($1) AND status = 'active'
     LIMIT 1`,
    [email],
  );
  return result.rows[0] as { id: string; email: string; name: string; password_hash: string | null } | undefined;
}

async function loadOperatorBySession(token: string): Promise<AuthenticatedOperator | null> {
  if (!hasDatabaseUrl()) return null;
  const tokenHash = hashToken(token);
  const result = await getPool().query(
    `SELECT o.id, o.email, o.name, array_agg(r.name) AS roles, array_agg(DISTINCT permission) AS permissions
     FROM operator_sessions s
     JOIN operators o ON o.id = s.operator_id
     JOIN operator_roles opr ON opr.operator_id = o.id
     JOIN roles r ON r.id = opr.role_id
     LEFT JOIN LATERAL unnest(r.permissions) AS permission ON true
     WHERE s.token_hash = $1
       AND s.revoked_at IS NULL
       AND s.expires_at > now()
       AND o.status = 'active'
     GROUP BY o.id, o.email, o.name
     LIMIT 1`,
    [tokenHash],
  );
  const row = result.rows[0];
  if (!row) return null;
  await getPool().query("UPDATE operator_sessions SET last_seen_at = now() WHERE token_hash = $1", [tokenHash]);
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    roles: row.roles,
    permissions: row.permissions,
  };
}

async function loadAuthenticatedOperatorById(client: PoolClient, operatorId: string): Promise<AuthenticatedOperator> {
  const result = await client.query(
    `SELECT o.id, o.email, o.name, array_agg(r.name) AS roles, array_agg(DISTINCT permission) AS permissions
     FROM operators o
     JOIN operator_roles opr ON opr.operator_id = o.id
     JOIN roles r ON r.id = opr.role_id
     LEFT JOIN LATERAL unnest(r.permissions) AS permission ON true
     WHERE o.id = $1
     GROUP BY o.id, o.email, o.name`,
    [operatorId],
  );
  const row = result.rows[0];
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    roles: row.roles,
    permissions: row.permissions,
  };
}

export async function authenticateOperator(email: string | undefined, password: string) {
  if (!hasDatabaseUrl()) {
    const expected = await getExpectedSessionTokenAsync();
    return expected && expected === await createSessionCookieValue(password)
      ? { token: expected, operator: { id: "legacy", email: "legacy@clawbot.local", name: "Legacy Operator", roles: ["admin"] as OperatorRole[], permissions: ["*"] } }
      : null;
  }

  return withTransaction(async (client) => {
    const operator = await loadOperatorByEmail(client, email || process.env.CLAWBOT_ADMIN_EMAIL || "admin@clawbot.local");
    if (!operator || !verifyPassword(password, operator.password_hash)) return null;
    const token = randomBytes(32).toString("hex");
    const sessionId = `sess-${randomUUID().slice(0, 16)}`;
    await client.query(
      `INSERT INTO operator_sessions (id, operator_id, token_hash, expires_at)
       VALUES ($1,$2,$3, now() + ($4::text || ' days')::interval)`,
      [sessionId, operator.id, hashToken(token), SESSION_DAYS],
    );
    await recordAuditEvent({ actorId: operator.id, actorEmail: operator.email, action: "auth.login", targetType: "operator", targetId: operator.id });
    return {
      token,
      operator: await loadAuthenticatedOperatorById(client, operator.id),
    };
  });
}

export async function revokeSessionFromRequest(request: Request) {
  const token = cookieValue(request.headers.get("cookie"), OPERATOR_SESSION_COOKIE);
  if (!token || !hasDatabaseUrl()) return;
  const operator = await loadOperatorBySession(token);
  await getPool().query("UPDATE operator_sessions SET revoked_at = now() WHERE token_hash = $1", [hashToken(token)]);
  if (operator) {
    await recordAuditEvent({ actorId: operator.id, actorEmail: operator.email, action: "auth.logout", targetType: "operator", targetId: operator.id });
  }
}

export async function getOperatorFromRequest(request: Request): Promise<AuthenticatedOperator | null> {
  if (!isOperatorAuthEnabled() && !hasDatabaseUrl()) {
    return { id: "dev", email: "dev@clawbot.local", name: "Dev Operator", roles: ["admin"], permissions: ["*"] };
  }
  const token = cookieValue(request.headers.get("cookie"), OPERATOR_SESSION_COOKIE);
  if (!token) return null;
  if (hasDatabaseUrl()) return loadOperatorBySession(token);
  const expected = await getExpectedSessionTokenAsync();
  return token === expected ? { id: "legacy", email: "legacy@clawbot.local", name: "Legacy Operator", roles: ["admin"], permissions: ["*"] } : null;
}

export function hasPermission(operator: AuthenticatedOperator, permission: string) {
  return operator.permissions.includes("*") || operator.permissions.includes(permission);
}

export async function requirePermission(request: Request, permission: string) {
  const operator = await getOperatorFromRequest(request);
  if (!operator) return { ok: false as const, status: 401, error: "Unauthorized" };
  if (!hasPermission(operator, permission)) return { ok: false as const, status: 403, error: "Forbidden" };
  return { ok: true as const, operator };
}
