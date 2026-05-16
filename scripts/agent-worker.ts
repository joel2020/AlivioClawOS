import { claimNextAgentJob, completeAgentJob, failAgentJob, recordWorkerHeartbeat } from "../lib/clawbot-service";
import { closePool } from "../lib/db";

const WORKER_ID = process.env.CLAWBOT_WORKER_ID || `worker-${process.pid}`;
const POLL_MS = Number(process.env.CLAWBOT_WORKER_POLL_MS || 5000);
const ONCE = process.argv.includes("--once");

async function dispatchToWebhook(job: Awaited<ReturnType<typeof claimNextAgentJob>>) {
  const webhookUrl = process.env.AGENT_JOB_WEBHOOK_URL || process.env.N8N_AGENT_JOB_WEBHOOK_URL || process.env.AGENT_ZERO_WEBHOOK_URL;
  if (!job) return;

  if (!webhookUrl) {
    await completeAgentJob(job.id, {
      mode: "dry_run",
      message: "No AGENT_JOB_WEBHOOK_URL, N8N_AGENT_JOB_WEBHOOK_URL, or AGENT_ZERO_WEBHOOK_URL configured.",
    }, WORKER_ID);
    return;
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.CLAWBOT_WORKER_API_KEY ? { "x-clawbot-worker-key": process.env.CLAWBOT_WORKER_API_KEY } : {}),
      "x-clawbot-worker-id": WORKER_ID,
    },
    body: JSON.stringify({ job }),
  });

  if (!response.ok) {
    throw new Error(`Webhook dispatch failed with ${response.status}`);
  }

  const payload = await response.json().catch(() => ({}));
  if (payload?.async === true) {
    return;
  }
  await completeAgentJob(job.id, {
    mode: "webhook",
    response: payload,
  }, WORKER_ID);
}

async function tick() {
  await recordWorkerHeartbeat(WORKER_ID, "online", undefined, { mode: ONCE ? "once" : "poll" });
  const job = await claimNextAgentJob(WORKER_ID, process.env.CLAWBOT_WORKER_AGENT_ID || undefined);
  if (!job) {
    console.log("No queued agent job");
    return;
  }
  console.log(`Claimed ${job.id}: ${job.title}`);
  await recordWorkerHeartbeat(WORKER_ID, "online", job.id, { mode: ONCE ? "once" : "poll" });
  try {
    await dispatchToWebhook(job);
    await recordWorkerHeartbeat(WORKER_ID, "online", undefined, { lastJobId: job.id });
  } catch (error) {
    await failAgentJob(job.id, error instanceof Error ? error.message : "Unknown worker error", WORKER_ID);
    await recordWorkerHeartbeat(WORKER_ID, "degraded", undefined, { lastJobId: job.id, error: error instanceof Error ? error.message : "Unknown worker error" });
  }
}

async function main() {
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
