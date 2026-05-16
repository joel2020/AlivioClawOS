import "server-only";
import { Pool, type PoolClient } from "pg";

let pool: Pool | null = null;

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getPool() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for database-backed Clawbot persistence");
  }
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true" },
      max: Number(process.env.DATABASE_POOL_MAX || 10),
    });
  }
  return pool;
}

export function setPoolForTests(testPool: Pool | null) {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("setPoolForTests is only available in test mode");
  }
  pool = testPool;
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool() {
  if (!pool) return;
  await pool.end();
  pool = null;
}
