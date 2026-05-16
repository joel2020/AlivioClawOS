import fs from "fs";
import { handleTelegramUpdate, type TelegramUpdate } from "../lib/telegram-bot";
import { closePool } from "../lib/db";

const ONCE = process.argv.includes("--once");
const POLL_MS = Number(process.env.TELEGRAM_POLL_MS || 1000);
const OFFSET_FILE = process.env.TELEGRAM_OFFSET_FILE || ".telegram-offset";

function loadDotenvLocal() {
  if (!fs.existsSync(".env.local")) return;
  const text = fs.readFileSync(".env.local", "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    const key = line.slice(0, index);
    const value = line.slice(index + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

function readOffset() {
  try {
    return Number(fs.readFileSync(OFFSET_FILE, "utf8").trim()) || 0;
  } catch {
    return 0;
  }
}

function writeOffset(offset: number) {
  fs.writeFileSync(OFFSET_FILE, String(offset));
}

async function getUpdates(offset: number) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is required");
  const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      offset: offset || undefined,
      timeout: ONCE ? 0 : 25,
      allowed_updates: ["message", "edited_message"],
    }),
  });
  const payload = await response.json().catch(() => null) as { ok?: boolean; result?: TelegramUpdate[]; description?: string } | null;
  if (!response.ok || !payload?.ok) throw new Error(payload?.description || `Telegram getUpdates failed with ${response.status}`);
  return payload.result || [];
}

async function tick() {
  let offset = readOffset();
  const updates = await getUpdates(offset);
  for (const update of updates) {
    await handleTelegramUpdate(update);
    if (typeof update.update_id === "number") {
      offset = update.update_id + 1;
      writeOffset(offset);
    }
  }
  if (updates.length) {
    console.log(`Processed ${updates.length} Telegram update(s).`);
  } else if (ONCE) {
    console.log("No Telegram updates.");
  }
}

async function main() {
  loadDotenvLocal();
  if (ONCE) {
    await tick();
    return;
  }
  for (;;) {
    await tick();
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    if (ONCE) void closePool();
  });
