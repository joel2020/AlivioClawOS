import fs from "fs/promises";
import path from "path";
import { getState } from "../lib/clawbot-service";
import { closePool, hasDatabaseUrl } from "../lib/db";

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function main() {
  const backupDir = path.resolve(process.argv[2] || "backups");
  await fs.mkdir(backupDir, { recursive: true });
  const state = await getState();
  const file = path.join(backupDir, `clawbot-state-${stamp()}.json`);
  await fs.writeFile(file, JSON.stringify(state, null, 2), { mode: 0o600 });
  console.log(`Wrote Clawbot ${hasDatabaseUrl() ? "Postgres snapshot" : "JSON state"} backup to ${file}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void closePool();
  });
