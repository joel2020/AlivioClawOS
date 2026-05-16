import fs from "fs/promises";
import path from "path";
import { hydrateAppState, seedAppState, type AppState } from "../lib/clawbot-service";
import { persistDbState } from "../lib/clawbot-db-state";
import { closePool, getPool } from "../lib/db";

async function runMigrations() {
  const migrationsDir = path.join(process.cwd(), "db", "migrations");
  const files = (await fs.readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  for (const file of files) {
    const applied = await pool.query("SELECT 1 FROM schema_migrations WHERE id = $1", [file]);
    if (applied.rowCount) {
      console.log(`skip ${file}`);
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`applied ${file}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

async function readInputState(filePath: string) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return hydrateAppState(JSON.parse(raw) as Partial<AppState>);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.warn(`No state file at ${filePath}; bootstrapping seeded application state instead.`);
      return seedAppState();
    }
    throw error;
  }
}

async function isBootstrapped() {
  const pool = getPool();
  const result = await pool.query("SELECT count(*)::int AS count FROM app_state");
  return Number(result.rows[0]?.count || 0) > 0;
}

async function main() {
  await runMigrations();

  if (await isBootstrapped()) {
    console.log("Postgres already contains Clawbot state; skipping import.");
    return;
  }

  const fileArg = process.argv[2];
  const stateFile = fileArg ? path.resolve(fileArg) : path.join(process.cwd(), "data", "clawbot-state.json");
  const state = await readInputState(stateFile);
  const persisted = await persistDbState(state);
  if (!persisted) throw new Error("DATABASE_URL is required to bootstrap Postgres");
  console.log(`Bootstrapped Postgres from ${stateFile}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void closePool();
  });
