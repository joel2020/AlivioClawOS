import fs from "fs/promises";
import path from "path";
import { persistDbState } from "../lib/clawbot-db-state";
import { closePool, hasDatabaseUrl } from "../lib/db";
import { hydrateAppState, type AppState } from "../lib/clawbot-service";

async function main() {
  const input = process.argv[2];
  if (!input) throw new Error("Usage: npm run backup:restore -- /path/to/clawbot-state.json");
  const file = path.resolve(input);
  const raw = await fs.readFile(file, "utf8");
  const state = hydrateAppState(JSON.parse(raw) as Partial<AppState>);

  if (hasDatabaseUrl()) {
    await persistDbState(state);
    console.log(`Restored ${file} into Postgres`);
    return;
  }

  const stateFile = path.join(process.cwd(), "data", "clawbot-state.json");
  await fs.mkdir(path.dirname(stateFile), { recursive: true });
  await fs.writeFile(stateFile, JSON.stringify(state, null, 2), { mode: 0o600 });
  console.log(`Restored ${file} into ${stateFile}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void closePool();
  });
