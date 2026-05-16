import { getSnapshot, listAgentJobs, listOutboundMessages, listWorkerHeartbeats } from "../lib/clawbot-service";
import { closePool } from "../lib/db";

async function sendTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_DIGEST_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.log(text);
    return;
  }
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  if (!response.ok) throw new Error(`Telegram digest failed with ${response.status}`);
}

async function main() {
  const [snapshot, jobs, outbound, workers] = await Promise.all([
    getSnapshot(),
    listAgentJobs(),
    listOutboundMessages(),
    listWorkerHeartbeats(),
  ]);
  const pendingApprovals = snapshot.approvals.filter((approval) => approval.status === "pending").length;
  const activeRuns = snapshot.runs.filter((run) => run.status === "running" || run.status === "pending").length;
  const queuedJobs = jobs.filter((job) => job.status === "queued").length;
  const blockedJobs = jobs.filter((job) => job.status === "blocked").length;
  const outboundWaiting = outbound.filter((message) => message.status === "pending_approval").length;
  const onlineWorkers = workers.filter((worker) => worker.status === "online").length;

  await sendTelegram([
    "Clawbot daily digest",
    `Active runs: ${activeRuns}`,
    `Pending approvals: ${pendingApprovals}`,
    `Queued agent jobs: ${queuedJobs}`,
    `Blocked agent jobs: ${blockedJobs}`,
    `Outbound awaiting approval: ${outboundWaiting}`,
    `Workers online: ${onlineWorkers}/${workers.length}`,
    `Dashboard: ${process.env.CLAWBOT_PUBLIC_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000"}`,
  ].join("\n"));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void closePool();
  });
