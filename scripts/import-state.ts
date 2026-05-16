import fs from "fs/promises";
import path from "path";
import { persistDbState } from "../lib/clawbot-db-state";
import { closePool } from "../lib/db";
import { hydrateAppState, seedAppState, type AppState } from "../lib/clawbot-service";

async function readInputState(filePath: string) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return hydrateAppState(JSON.parse(raw) as Partial<AppState>);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.warn(`No state file at ${filePath}; importing seeded application state instead.`);
      return seedAppState();
    }
    throw error;
  }
}

async function main() {
  const fileArg = process.argv[2];
  const stateFile = fileArg ? path.resolve(fileArg) : path.join(process.cwd(), "data", "clawbot-state.json");
  const state = await readInputState(stateFile);
  const persisted = await persistDbState(state);
  if (!persisted) {
    throw new Error("DATABASE_URL is required to import state into Postgres");
  }
  console.log(`Imported Clawbot state into Postgres from ${stateFile}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void closePool();
  });
