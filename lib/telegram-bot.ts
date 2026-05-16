import { callAzureOpenAIResponse } from "@/lib/azure-openai";
import {
  cancelRun,
  getCrmSnapshot,
  listAgentJobs,
  listApprovals,
  listLeads,
  listOutboundMessages,
  listRuns,
  listWorkerHeartbeats,
  respondToApproval,
  retryRun,
} from "@/lib/clawbot-service";
import { recordAuditEvent } from "@/lib/clawbot-db-state";

export type TelegramChat = {
  id: number;
  type?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
};

export type TelegramMessage = {
  message_id?: number;
  text?: string;
  chat?: TelegramChat;
  from?: { id?: number; username?: string; first_name?: string; last_name?: string };
};

export type TelegramUpdate = {
  update_id?: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
};

export async function sendTelegramReply(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });
}

function helpText() {
  return [
    "Clawbot commands:",
    "/help - show commands",
    "/runs - show recent runs",
    "/approvals - show pending approvals",
    "/leads - show recent leads",
    "/approve <approval-id> - approve an approval",
    "/reject <approval-id> - reject an approval",
    "/cancel <run-id> - cancel a run",
    "/retry <run-id> - retry a run",
    "",
    "You can also ask normal questions like:",
    "What needs attention today?",
    "Summarize the CRM pipeline.",
    "Draft a follow-up for the newest lead.",
  ].join("\n");
}

function recentList<T extends { id: string; name?: string; title?: string; status: string }>(items: T[], label: string) {
  const lines = items.slice(0, 5).map((item) => {
    const title = item.title || item.name || item.id;
    return `- ${title} [${item.id}] (${item.status})`;
  });
  return [label, ...lines].join("\n");
}

function leadList(items: Array<{ id: string; companyName: string; status: string }>) {
  const lines = items.slice(0, 5).map((item) => `- ${item.companyName} [${item.id}] (${item.status})`);
  return ["Recent leads:", ...lines].join("\n");
}

function csvSet(value: string | undefined) {
  return new Set((value || "").split(",").map((item) => item.trim()).filter(Boolean));
}

function dangerousCommand(command: string) {
  return command === "/approve" || command === "/reject" || command === "/cancel" || command === "/retry";
}

function telegramActor(message: TelegramMessage) {
  return message.from?.username || message.from?.first_name || String(message.from?.id || message.chat?.id || "telegram");
}

function telegramActionAllowed(message: TelegramMessage) {
  if (process.env.NODE_ENV !== "production") return true;
  const allowedUsers = csvSet(process.env.TELEGRAM_ALLOWED_USER_IDS);
  const allowedChats = csvSet(process.env.TELEGRAM_ALLOWED_CHAT_IDS);
  const userId = message.from?.id ? String(message.from.id) : "";
  const chatId = message.chat?.id ? String(message.chat.id) : "";
  return Boolean((userId && allowedUsers.has(userId)) || (chatId && allowedChats.has(chatId)));
}

function telegramAssistantAllowed(message: TelegramMessage) {
  if (process.env.NODE_ENV !== "production") return true;
  const allowedUsers = csvSet(process.env.TELEGRAM_ALLOWED_USER_IDS);
  const allowedChats = csvSet(process.env.TELEGRAM_ALLOWED_CHAT_IDS);
  if (allowedUsers.size === 0 && allowedChats.size === 0) return true;
  return telegramActionAllowed(message);
}

async function auditTelegramDenied(command: string, message: TelegramMessage) {
  await recordAuditEvent({
    actorEmail: telegramActor(message),
    action: "telegram.denied",
    targetType: "telegram_command",
    targetId: command,
    metadata: {
      fromId: message.from?.id,
      chatId: message.chat?.id,
    },
  }).catch((error) => {
    console.error("Failed to audit Telegram denial", error);
  });
}

function compactJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

async function buildAssistantContext() {
  const [runs, approvals, leads, crm, jobs, outbound, workers] = await Promise.all([
    listRuns(),
    listApprovals(),
    listLeads(),
    getCrmSnapshot(),
    listAgentJobs(),
    listOutboundMessages(),
    listWorkerHeartbeats(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    runs: runs.slice(0, 8).map((run) => ({
      id: run.id,
      name: run.name,
      status: run.status,
      workflowId: run.workflowId,
      leadId: run.leadId,
      progress: run.progress,
      startedAt: run.startedAt,
      summary: run.summary,
    })),
    pendingApprovals: approvals.filter((approval) => approval.status === "pending").slice(0, 8).map((approval) => ({
      id: approval.id,
      title: approval.title,
      description: approval.description,
      runId: approval.runId,
      priority: approval.priority,
      requestedBy: approval.requestedBy,
      requestedAt: approval.requestedAt,
    })),
    leads: leads.slice(0, 8).map((lead) => ({
      id: lead.id,
      companyName: lead.companyName,
      contactName: lead.contactName,
      contactEmail: lead.contactEmail,
      source: lead.source,
      serviceInterest: lead.serviceInterest,
      status: lead.status,
      notes: lead.notes,
    })),
    crm: {
      accounts: crm.accounts.slice(0, 8).map((account) => ({
        id: account.id,
        name: account.name,
        status: account.status,
        owner: account.owner,
        tags: account.tags,
        notes: account.notes,
      })),
      contacts: crm.contacts.slice(0, 8).map((contact) => ({
        id: contact.id,
        accountId: contact.accountId,
        name: contact.name,
        email: contact.email,
        title: contact.title,
        status: contact.status,
      })),
      deals: crm.deals.slice(0, 8).map((deal) => ({
        id: deal.id,
        accountId: deal.accountId,
        name: deal.name,
        stage: deal.stage,
        value: deal.value,
        currency: deal.currency,
        probability: deal.probability,
        expectedCloseDate: deal.expectedCloseDate,
      })),
      activities: crm.activities.slice(0, 8).map((activity) => ({
        id: activity.id,
        accountId: activity.accountId,
        dealId: activity.dealId,
        type: activity.type,
        title: activity.title,
        occurredAt: activity.occurredAt,
      })),
    },
    agentJobs: jobs.slice(0, 8).map((job) => ({
      id: job.id,
      agentId: job.agentId,
      clientId: job.clientId,
      title: job.title,
      status: job.status,
      priority: job.priority,
      error: job.error,
    })),
    outboundMessages: outbound.slice(0, 8).map((message) => ({
      id: message.id,
      clientId: message.clientId,
      leadId: message.leadId,
      to: message.to,
      subject: message.subject,
      status: message.status,
      approvalId: message.approvalId,
    })),
    workers: workers.slice(0, 8).map((worker) => ({
      workerId: worker.workerId,
      status: worker.status,
      currentJobId: worker.currentJobId,
      lastSeenAt: worker.lastSeenAt,
    })),
  };
}

function fallbackAssistantReply(question: string) {
  return [
    "I can inspect Clawbot state, but Azure OpenAI is not available right now.",
    "",
    `Your question: ${question}`,
    "",
    "Try these commands while model access is unavailable:",
    "/runs",
    "/approvals",
    "/leads",
  ].join("\n");
}

async function answerAssistantMessage(message: TelegramMessage, text: string) {
  const chatId = message.chat?.id;
  if (!chatId) return;

  if (!telegramAssistantAllowed(message)) {
    await auditTelegramDenied("telegram.ai", message);
    await sendTelegramReply(chatId, "This Telegram account is not allowed to use the operator assistant.");
    return;
  }

  const context = await buildAssistantContext();
  const response = await callAzureOpenAIResponse({
    instructions: [
      "You are the Alivio/Clawbot operator assistant.",
      "Answer using only the supplied Clawbot operating context.",
      "You may summarize runs, approvals, leads, CRM, outbound drafts, agent jobs, and worker health.",
      "You must not claim to perform mutations from free-form chat.",
      "Never approve, reject, cancel, retry, send email, delete, archive, or update business state from free-form chat.",
      "For risky actions, tell the operator the explicit slash command to run, such as /approve <approval-id>.",
      "Keep Telegram replies concise, practical, and formatted in plain text.",
    ].join("\n"),
    prompt: [
      `Operator: ${telegramActor(message)}`,
      `Question: ${text}`,
      "Clawbot context:",
      compactJson(context),
    ].join("\n\n"),
    maxOutputTokens: 700,
  });

  await recordAuditEvent({
    actorEmail: telegramActor(message),
    action: "telegram.ai_asked",
    targetType: "telegram_chat",
    targetId: String(chatId),
    metadata: {
      fromId: message.from?.id,
      chatId,
      responseId: response?.responseId,
      azureOpenAI: Boolean(response),
    },
  }).catch((error) => {
    console.error("Failed to audit Telegram AI interaction", error);
  });

  await sendTelegramReply(chatId, response?.text || fallbackAssistantReply(text));
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  const message = update.message || update.edited_message;
  const text = message?.text?.trim();
  const chatId = message?.chat?.id;

  if (!message || !text || !chatId) {
    return { ok: true, handled: false };
  }

  const [command, ...rest] = text.split(/\s+/);
  const arg = rest.join(" ").trim();
  const normalizedCommand = command.toLowerCase();

  if (!normalizedCommand.startsWith("/")) {
    await answerAssistantMessage(message, text);
    return { ok: true, handled: true };
  }

  if (dangerousCommand(normalizedCommand) && !telegramActionAllowed(message)) {
    await auditTelegramDenied(normalizedCommand, message);
    await sendTelegramReply(chatId, "This Telegram account is not allowed to perform operator actions.");
    return { ok: false, handled: true, status: 403, error: "Forbidden" };
  }

  switch (normalizedCommand) {
    case "/start":
    case "/help":
      await sendTelegramReply(chatId, helpText());
      break;
    case "/runs": {
      const runs = await listRuns();
      await sendTelegramReply(chatId, recentList(runs, "Recent runs:"));
      break;
    }
    case "/approvals": {
      const approvals = (await listApprovals()).filter((approval) => approval.status === "pending");
      await sendTelegramReply(chatId, recentList(approvals, "Pending approvals:"));
      break;
    }
    case "/leads": {
      const leads = await listLeads();
      await sendTelegramReply(chatId, leadList(leads));
      break;
    }
    case "/approve":
    case "/reject": {
      if (!arg) {
        await sendTelegramReply(chatId, `Usage: ${command} <approval-id>`);
        break;
      }
      await respondToApproval(arg, { decision: normalizedCommand === "/approve" ? "approved" : "rejected", reviewedBy: telegramActor(message) });
      await sendTelegramReply(chatId, `${normalizedCommand === "/approve" ? "Approved" : "Rejected"} ${arg}.`);
      break;
    }
    case "/cancel": {
      if (!arg) {
        await sendTelegramReply(chatId, "Usage: /cancel <run-id>");
        break;
      }
      await cancelRun(arg);
      await sendTelegramReply(chatId, `Cancelled ${arg}.`);
      break;
    }
    case "/retry": {
      if (!arg) {
        await sendTelegramReply(chatId, "Usage: /retry <run-id>");
        break;
      }
      await retryRun(arg);
      await sendTelegramReply(chatId, `Retried ${arg}.`);
      break;
    }
    default:
      await sendTelegramReply(chatId, "Unknown command. Send /help for options.");
      break;
  }

  return { ok: true, handled: true };
}
