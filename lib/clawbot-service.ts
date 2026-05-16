import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import {
  mockAgents,
  mockApprovals,
  mockDashboardMetrics,
  mockDeliverables,
  mockLeads,
  mockLogs,
  mockProjects,
  mockRuns,
  mockServiceHealth,
  mockTasks,
} from "@/lib/mock-data";
import type {
  Approval,
  AgentDefinition,
  AgentJob,
  DashboardMetrics,
  Deliverable,
  Handoff,
  HealthStatus,
  ClientAccount,
  ClientContext,
  ClientFileRecord,
  ClientMemoryItem,
  ClientMemoryKind,
  ClientFileKind,
  ClientType,
  CrmAccount,
  CrmAccountStatus,
  CrmActivity,
  CrmActivityStatus,
  CrmActivityType,
  CrmContact,
  CrmContactStatus,
  CrmDeal,
  CrmDealStage,
  Lead,
  LogEntry,
  OperatorAgent,
  OutboundMessage,
  Project,
  Run,
  ServiceHealth,
  Task,
  WorkerHeartbeat,
  WorkflowId,
} from "@/lib/types";
import { callAzureOpenAIResponse } from "@/lib/azure-openai";
import { isDatabasePersistenceEnabled, loadDbState, persistDbState, recordAuditEvent } from "@/lib/clawbot-db-state";

export type DataSource = "api" | "demo" | "empty";

export interface WorkflowDefinition {
  id: WorkflowId;
  name: string;
  description: string;
  output: string;
}

export interface AppSettings {
  organizationName: string;
  defaultModel: string;
  timezone: string;
  notifications: {
    emailOnRunFailure: boolean;
    emailOnApprovalRequest: boolean;
    telegramEnabled: boolean;
    telegramChatId: string;
    discordEnabled: boolean;
    discordWebhookUrl: string;
    slackWebhookUrl: string;
  };
  api: {
    anthropicApiKeyMasked: string;
    webhookSecretMasked: string;
  };
}

export interface SettingsUpdate {
  organizationName?: string;
  defaultModel?: string;
  timezone?: string;
  notifications?: Partial<AppSettings["notifications"]>;
  api?: Partial<AppSettings["api"]>;
}

export interface AppState {
  settings: AppSettings;
  clients: ClientAccount[];
  clientContexts: ClientContext[];
  agentDefinitions: AgentDefinition[];
  agentJobs: AgentJob[];
  clientMemoryItems: ClientMemoryItem[];
  clientFiles: ClientFileRecord[];
  outboundMessages: OutboundMessage[];
  workerHeartbeats: WorkerHeartbeat[];
  crmAccounts: CrmAccount[];
  crmContacts: CrmContact[];
  crmDeals: CrmDeal[];
  crmActivities: CrmActivity[];
  agents: OperatorAgent[];
  projects: Project[];
  runs: Run[];
  tasks: Task[];
  approvals: Approval[];
  deliverables: Deliverable[];
  logs: LogEntry[];
  leads: Lead[];
  handoffs: Handoff[];
  serviceHealth: ServiceHealth[];
  workflows: WorkflowDefinition[];
  meta: {
    version: number;
    updatedAt: string;
  };
}

export interface LeadInput {
  companyName: string;
  contactName?: string;
  contactEmail?: string;
  source?: string;
  serviceInterest?: string;
  notes?: string;
  autoStartWorkflow?: boolean;
}

export interface WorkflowRunInput {
  workflowId: WorkflowId;
  leadId?: string;
  title?: string;
  notes?: string;
}

export interface ApprovalDecisionInput {
  decision: "approved" | "rejected";
  reviewedBy?: string;
}

export interface ClientInput {
  name: string;
  type?: ClientType;
  primaryContact?: string;
  contactEmail?: string;
  notes?: string;
  tags?: string[];
}

export interface AgentJobInput {
  agentId: string;
  clientId?: string;
  title: string;
  priority?: AgentJob["priority"];
  requestedBy?: string;
  input?: Record<string, unknown>;
}

export interface ClientMemoryInput {
  clientId: string;
  kind?: ClientMemoryKind;
  title: string;
  body: string;
  source?: string;
}

export interface ClientFileInput {
  clientId: string;
  kind?: ClientFileKind;
  name: string;
  url?: string;
  contentType?: string;
  sizeBytes?: number;
  notes?: string;
}

export interface OutboundDraftInput {
  leadId?: string;
  clientId?: string;
  agentJobId?: string;
  to?: string;
  subject?: string;
  body?: string;
}

export interface CrmAccountInput {
  clientId?: string;
  leadId?: string;
  name: string;
  website?: string;
  industry?: string;
  status?: CrmAccountStatus;
  owner?: string;
  notes?: string;
  tags?: string[];
}

export interface CrmContactInput {
  accountId?: string;
  leadId?: string;
  name: string;
  email?: string;
  phone?: string;
  title?: string;
  status?: CrmContactStatus;
  notes?: string;
}

export interface CrmDealInput {
  accountId: string;
  contactId?: string;
  leadId?: string;
  name: string;
  stage?: CrmDealStage;
  value?: number;
  currency?: string;
  probability?: number;
  expectedCloseDate?: string;
  owner?: string;
  notes?: string;
}

export interface CrmActivityInput {
  accountId?: string;
  contactId?: string;
  dealId?: string;
  leadId?: string;
  type?: CrmActivityType;
  status?: CrmActivityStatus;
  title: string;
  body?: string;
  occurredAt?: string;
  dueAt?: string;
  createdBy?: string;
  metadata?: Record<string, unknown>;
}

const STATE_FILE = path.join(process.cwd(), "data", "clawbot-state.json");
const DEFAULT_USER = "joel@clawbot.ai";
const DEFAULT_PUBLIC_URL = process.env.CLAWBOT_PUBLIC_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000";

const WORKFLOWS: WorkflowDefinition[] = [
  {
    id: "lead-intake",
    name: "Lead Intake → Discovery",
    description: "Routes a new lead through discovery packet generation and human approval.",
    output: "Discovery Packet",
  },
  {
    id: "discovery-proposal",
    name: "Discovery → Proposal",
    description: "Turns an approved discovery packet into a client-ready proposal.",
    output: "Sales Proposal Packet",
  },
  {
    id: "discovery-web-strategy",
    name: "Discovery → Web Strategy",
    description: "Turns an approved discovery packet into a web strategy brief.",
    output: "Web Strategy Brief",
  },
];

const DEFAULT_ORG_ID = "org-default";

const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    id: "agent-def-sdr",
    name: "SDR Agent",
    kind: "sdr",
    status: "enabled",
    description: "Finds, enriches, and drafts outbound sales motions for approved client contexts.",
    allowedTools: ["lead_enrichment", "email_draft", "crm_update", "web_research"],
    riskLevel: "high",
    requiresApprovalFor: ["send_email", "start_campaign", "crm_stage_change"],
    createdAt: "2026-05-16T00:00:00.000Z",
  },
  {
    id: "agent-def-recruiting",
    name: "Recruiting Ops Agent",
    kind: "recruiting",
    status: "enabled",
    description: "Sources candidates, drafts outreach, and tracks recruiting follow-up.",
    allowedTools: ["candidate_search", "email_draft", "ats_update", "web_research"],
    riskLevel: "high",
    requiresApprovalFor: ["send_candidate_outreach", "submit_candidate", "ats_stage_change"],
    createdAt: "2026-05-16T00:00:00.000Z",
  },
  {
    id: "agent-def-seo",
    name: "SEO Agent",
    kind: "seo",
    status: "enabled",
    description: "Plans technical SEO, content, keyword opportunities, and optimization tasks.",
    allowedTools: ["site_audit", "keyword_research", "content_brief", "analytics_read"],
    riskLevel: "medium",
    requiresApprovalFor: ["publish_content", "change_site_metadata"],
    createdAt: "2026-05-16T00:00:00.000Z",
  },
  {
    id: "agent-def-inbox",
    name: "Inbox Agent",
    kind: "inbox",
    status: "enabled",
    description: "Classifies email, drafts replies, and prepares operator-approved inbox actions.",
    allowedTools: ["email_read", "email_draft", "calendar_read"],
    riskLevel: "high",
    requiresApprovalFor: ["send_email", "archive_email", "delete_email"],
    createdAt: "2026-05-16T00:00:00.000Z",
  },
  {
    id: "agent-def-delivery",
    name: "Delivery PM Agent",
    kind: "delivery",
    status: "enabled",
    description: "Turns client work into tasks, tracks deliverables, and prepares launch checklists.",
    allowedTools: ["task_create", "project_update", "document_draft", "repo_read"],
    riskLevel: "medium",
    requiresApprovalFor: ["client_delivery", "scope_change"],
    createdAt: "2026-05-16T00:00:00.000Z",
  },
  {
    id: "agent-def-voice",
    name: "Voice Agent",
    kind: "voice",
    status: "disabled",
    description: "Future phone-call workflow runner for sales, recruiting, and follow-up calls.",
    allowedTools: ["call_prepare", "call_summary"],
    riskLevel: "high",
    requiresApprovalFor: ["place_call"],
    createdAt: "2026-05-16T00:00:00.000Z",
  },
];

let cachedState: AppState | null = null;
let loadPromise: Promise<AppState> | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function isTestMode() {
  return process.env.CLAWBOT_TEST_MODE === "true";
}

function clone<T>(value: T): T {
  return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function now() {
  return new Date().toISOString();
}

function writeAuditEvent(input: Parameters<typeof recordAuditEvent>[0]) {
  void recordAuditEvent(input).catch((error) => {
    console.error("Failed to write audit event", error);
  });
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function id(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

function statusToHealth(status: string): HealthStatus {
  if (status === "healthy") return "healthy";
  if (status === "down") return "down";
  return "degraded";
}

function normalizeSettingString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function initialSettings(): AppSettings {
  return {
    organizationName: "Clawbot Inc.",
    defaultModel: "claude-sonnet-4-6",
    timezone: "UTC",
    notifications: {
      emailOnRunFailure: true,
      emailOnApprovalRequest: true,
      telegramEnabled: false,
      telegramChatId: "",
      discordEnabled: false,
      discordWebhookUrl: "",
      slackWebhookUrl: "",
    },
    api: {
      anthropicApiKeyMasked: "sk-ant-••••••••",
      webhookSecretMasked: "••••••••",
    },
  };
}

export function seedAppState(): AppState {
  return {
    settings: initialSettings(),
    clients: [
      {
        id: "client-openclaw",
        organizationId: DEFAULT_ORG_ID,
        name: "OpenClaw / Clawbot",
        type: "internal",
        status: "active",
        primaryContact: "Joel",
        contactEmail: "joel@clawbot.ai",
        notes: "Internal command center and agent operating system.",
        tags: ["internal", "platform"],
        createdAt: now(),
        updatedAt: now(),
      },
    ],
    clientContexts: [
      {
        id: "ctx-client-openclaw",
        clientId: "client-openclaw",
        summary: "Internal company OS for recruiting, AI/web services, delivery, sales, SEO, inbox, and future voice workflows.",
        memory: {
          isolationPolicy: "Every agent job must be scoped by clientId before using client memory, files, or tasks.",
          approvalPolicy: "High-risk outbound, inbox, CRM, publishing, and voice actions require operator approval.",
        },
        updatedAt: now(),
      },
    ],
    agentDefinitions: clone(AGENT_DEFINITIONS),
    agentJobs: [],
    clientMemoryItems: [],
    clientFiles: [],
    outboundMessages: [],
    workerHeartbeats: [],
    crmAccounts: [],
    crmContacts: [],
    crmDeals: [],
    crmActivities: [],
    agents: clone(mockAgents),
    projects: clone(mockProjects),
    runs: clone(mockRuns),
    tasks: clone(mockTasks),
    approvals: clone(mockApprovals),
    deliverables: clone(mockDeliverables),
    logs: clone(mockLogs),
    leads: clone(mockLeads),
    handoffs: [],
    serviceHealth: clone(mockServiceHealth),
    workflows: clone(WORKFLOWS),
    meta: {
      version: 1,
      updatedAt: now(),
    },
  };
}

export function hydrateAppState(raw: Partial<AppState> | null | undefined): AppState {
  const seed = seedAppState();
  if (!raw) return seed;
  return {
    settings: {
      ...seed.settings,
      ...(raw.settings || {}),
      notifications: {
        ...seed.settings.notifications,
        ...(raw.settings?.notifications || {}),
      },
      api: {
        ...seed.settings.api,
        ...(raw.settings?.api || {}),
      },
    },
    clients: Array.isArray(raw.clients) ? raw.clients : seed.clients,
    clientContexts: Array.isArray(raw.clientContexts) ? raw.clientContexts : seed.clientContexts,
    agentDefinitions: Array.isArray(raw.agentDefinitions) ? raw.agentDefinitions : seed.agentDefinitions,
    agentJobs: Array.isArray(raw.agentJobs) ? raw.agentJobs : seed.agentJobs,
    clientMemoryItems: Array.isArray(raw.clientMemoryItems) ? raw.clientMemoryItems : seed.clientMemoryItems,
    clientFiles: Array.isArray(raw.clientFiles) ? raw.clientFiles : seed.clientFiles,
    outboundMessages: Array.isArray(raw.outboundMessages) ? raw.outboundMessages : seed.outboundMessages,
    workerHeartbeats: Array.isArray(raw.workerHeartbeats) ? raw.workerHeartbeats : seed.workerHeartbeats,
    crmAccounts: Array.isArray(raw.crmAccounts) ? raw.crmAccounts : seed.crmAccounts,
    crmContacts: Array.isArray(raw.crmContacts) ? raw.crmContacts : seed.crmContacts,
    crmDeals: Array.isArray(raw.crmDeals) ? raw.crmDeals : seed.crmDeals,
    crmActivities: Array.isArray(raw.crmActivities) ? raw.crmActivities : seed.crmActivities,
    agents: Array.isArray(raw.agents) ? raw.agents : seed.agents,
    projects: Array.isArray(raw.projects) ? raw.projects : seed.projects,
    runs: Array.isArray(raw.runs) ? raw.runs : seed.runs,
    tasks: Array.isArray(raw.tasks) ? raw.tasks : seed.tasks,
    approvals: Array.isArray(raw.approvals) ? raw.approvals : seed.approvals,
    deliverables: Array.isArray(raw.deliverables) ? raw.deliverables : seed.deliverables,
    logs: Array.isArray(raw.logs) ? raw.logs : seed.logs,
    leads: Array.isArray(raw.leads) ? raw.leads : seed.leads,
    handoffs: Array.isArray(raw.handoffs) ? raw.handoffs : seed.handoffs,
    serviceHealth: Array.isArray(raw.serviceHealth) ? raw.serviceHealth : seed.serviceHealth,
    workflows: Array.isArray(raw.workflows) ? raw.workflows : seed.workflows,
    meta: {
      version: typeof raw.meta?.version === "number" ? raw.meta.version : seed.meta.version,
      updatedAt: normalizeSettingString(raw.meta?.updatedAt, seed.meta.updatedAt),
    },
  };
}

type NotificationChannel = "telegram" | "discord" | "slack";

interface NotificationEvent {
  title: string;
  body: string;
  channel?: NotificationChannel | NotificationChannel[];
  runId?: string;
  leadId?: string;
  approvalId?: string;
}

async function sendTelegramMessage(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return false;
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });
  return response.ok;
}

async function sendDiscordWebhook(webhookUrl: string, content: string) {
  if (!webhookUrl) return false;
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  return response.ok;
}

async function sendSlackWebhook(webhookUrl: string, text: string) {
  if (!webhookUrl) return false;
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return response.ok;
}

function formatNotificationMessage(event: NotificationEvent) {
  const suffix = [
    event.runId ? `Run: ${event.runId}` : null,
    event.leadId ? `Lead: ${event.leadId}` : null,
    event.approvalId ? `Approval: ${event.approvalId}` : null,
  ].filter(Boolean).join(" · ");
  const lines = [
    event.title,
    event.body,
    suffix ? `\n${suffix}` : "",
    `Open dashboard: ${DEFAULT_PUBLIC_URL}`,
    `Commands: /runs /approvals /leads`,
  ].filter(Boolean);
  return lines.join("\n");
}

async function dispatchNotifications(state: AppState, events: NotificationEvent[]) {
  if (!events.length) return;
  const channels = state.settings.notifications;
  const jobs: Promise<unknown>[] = [];

  for (const event of events) {
    const content = formatNotificationMessage(event);
    const target = Array.isArray(event.channel) ? event.channel : event.channel ? [event.channel] : ["telegram", "discord", "slack"];

    if (target.includes("telegram") && channels.telegramEnabled && channels.telegramChatId) {
      jobs.push(sendTelegramMessage(channels.telegramChatId, content));
    }
    if (target.includes("discord") && channels.discordEnabled && channels.discordWebhookUrl) {
      jobs.push(sendDiscordWebhook(channels.discordWebhookUrl, content.replace(/\*/g, "")));
    }
    if (target.includes("slack") && channels.slackWebhookUrl) {
      jobs.push(sendSlackWebhook(channels.slackWebhookUrl, content.replace(/\*/g, "")));
    }
  }

  await Promise.allSettled(jobs);
}

async function ensureStateFile() {
  await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
}

async function persistState(state: AppState) {
  await ensureStateFile();
  const next = { ...state, meta: { ...state.meta, updatedAt: now() } };
  const tmp = `${STATE_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(next, null, 2));
  await fs.rename(tmp, STATE_FILE);
  cachedState = next;
}

export async function getState(): Promise<AppState> {
  if (cachedState && !isDatabasePersistenceEnabled()) return cachedState;
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        if (isTestMode()) return seedAppState();
        if (isDatabasePersistenceEnabled()) {
          const dbState = await loadDbState();
          if (dbState) return hydrateAppState(dbState);
          const seed = seedAppState();
          await persistDbState(seed);
          return seed;
        }
        const raw = await fs.readFile(STATE_FILE, "utf8");
        return hydrateAppState(JSON.parse(raw) as Partial<AppState>);
      } catch {
        if (isDatabasePersistenceEnabled()) throw new Error("Failed to load database-backed Clawbot state");
        const seed = seedAppState();
        await persistState(seed);
        return seed;
      } finally {
        loadPromise = null;
      }
    })();
  }
  cachedState = await loadPromise;
  return cachedState;
}

async function updateState<T>(mutator: (state: AppState) => { state: AppState; result: T; notifications?: NotificationEvent[] } | Promise<{ state: AppState; result: T; notifications?: NotificationEvent[] }>) {
  const current = clone(await getState());
  const next = await mutator(current);
  writeQueue = writeQueue.then(async () => {
    if (isTestMode()) {
      cachedState = next.state;
      return;
    }
    const persisted = await persistDbState(next.state);
    if (!persisted) await persistState(next.state);
  });
  await writeQueue;
  await dispatchNotifications(next.state, next.notifications || []);
  return next.result;
}

export function resetAppStateForTests(state: Partial<AppState> | null = null) {
  if (!isTestMode()) {
    throw new Error("resetAppStateForTests is only available when CLAWBOT_TEST_MODE=true");
  }
  cachedState = hydrateAppState(state);
  loadPromise = null;
  writeQueue = Promise.resolve();
}

function workflowById(id: WorkflowId) {
  return WORKFLOWS.find((workflow) => workflow.id === id) ?? WORKFLOWS[0];
}

function getLeadInterestWorkflow(serviceInterest?: string): WorkflowId | undefined {
  if (serviceInterest === "proposal_generation") return "discovery-proposal";
  if (serviceInterest === "strategy_brief") return "discovery-web-strategy";
  return undefined;
}

function buildAgentRoster(workflowId: WorkflowId, state: AppState) {
  const supervisor = state.agents.find((agent) => agent.role === "supervisor") ?? state.agents[0];
  const specialists = state.agents.filter((agent) => agent.role === "specialist");
  const intake = specialists.find((agent) => agent.name.includes("Intake")) ?? specialists[0] ?? supervisor;
  const proposal = specialists.find((agent) => agent.name.includes("Proposal")) ?? specialists[1] ?? intake;
  const strategy = specialists.find((agent) => agent.name.includes("Strategy")) ?? specialists[2] ?? proposal;
  const defaultRoster = [
    { id: supervisor.id, name: supervisor.name, type: "planner" as const, model: supervisor.modelAlias || "claude-sonnet-4-6" },
    { id: intake.id, name: intake.name, type: "worker" as const, model: intake.modelAlias || "claude-sonnet-4-6" },
    { id: proposal.id, name: proposal.name, type: "worker" as const, model: proposal.modelAlias || "claude-sonnet-4-6" },
    { id: strategy.id, name: strategy.name, type: "reviewer" as const, model: strategy.modelAlias || "claude-sonnet-4-6" },
  ];

  if (workflowId === "discovery-proposal") {
    return [
      { id: supervisor.id, name: supervisor.name, type: "planner" as const, model: supervisor.modelAlias || "claude-sonnet-4-6" },
      { id: proposal.id, name: proposal.name, type: "worker" as const, model: proposal.modelAlias || "claude-sonnet-4-6" },
      { id: strategy.id, name: strategy.name, type: "reviewer" as const, model: strategy.modelAlias || "claude-sonnet-4-6" },
    ];
  }

  if (workflowId === "discovery-web-strategy") {
    return [
      { id: supervisor.id, name: supervisor.name, type: "planner" as const, model: supervisor.modelAlias || "claude-sonnet-4-6" },
      { id: strategy.id, name: strategy.name, type: "worker" as const, model: strategy.modelAlias || "claude-sonnet-4-6" },
      { id: proposal.id, name: proposal.name, type: "reviewer" as const, model: proposal.modelAlias || "claude-sonnet-4-6" },
    ];
  }

  return defaultRoster;
}

function createLeadRecord(input: LeadInput): Lead {
  return {
    id: id("lead"),
    companyName: input.companyName.trim(),
    source: input.source?.trim() || "web",
    contactName: input.contactName?.trim(),
    contactEmail: input.contactEmail?.trim(),
    serviceInterest: input.serviceInterest || "proposal_generation",
    status: "new",
    createdAt: now(),
    updatedAt: now(),
    notes: input.notes?.trim(),
  };
}

function createSummaryForWorkflow(lead: Lead, workflowId: WorkflowId) {
  if (workflowId === "lead-intake") {
    return `Discovery packet for ${lead.companyName} with assumptions, deliverables, open questions, and risks.`;
  }
  if (workflowId === "discovery-proposal") {
    return `Proposal packet for ${lead.companyName} with pricing, scope, timeline, and next steps.`;
  }
  return `Web strategy brief for ${lead.companyName} with sitemap, UX guidance, stack, and timeline.`;
}

async function generateDiscoveryPacket(lead: Lead, agentRoster: ReturnType<typeof buildAgentRoster>) {
  const response = await callAzureOpenAIResponse({
    instructions: [
      "You are Clawbot's discovery specialist.",
      "Write a concise but actionable discovery packet in markdown.",
      "Include these sections: Summary, Business Context, Goals, Constraints, Open Questions, Risks, Recommended Next Step.",
      "Keep it specific to the lead and client-ready.",
    ].join("\n"),
    prompt: [
      `Company: ${lead.companyName}`,
      lead.contactName ? `Contact: ${lead.contactName}` : null,
      lead.contactEmail ? `Email: ${lead.contactEmail}` : null,
      lead.source ? `Source: ${lead.source}` : null,
      lead.serviceInterest ? `Service interest: ${lead.serviceInterest}` : null,
      lead.notes ? `Notes: ${lead.notes}` : null,
      `Preferred operator model: ${agentRoster[0]?.model || "unknown"}`,
    ].filter(Boolean).join("\n"),
    maxOutputTokens: 1200,
  });

  if (response) {
    return {
      content: response.text,
      responseId: response.responseId,
      generatedBy: "azure-openai" as const,
    };
  }

  return {
    content: `# Discovery Packet\n\n## Summary\nDiscovery packet for ${lead.companyName}.\n\n## Business Context\nInbound lead captured through Clawbot.\n\n## Goals\n- Confirm scope\n- Validate timeline\n- Clarify budget\n\n## Constraints\n- Awaiting human review\n\n## Open Questions\n- What outcomes matter most?\n- What timeline is expected?\n- Who is the final decision maker?\n\n## Risks\n- Missing requirements\n- Scope drift\n\n## Recommended Next Step\nProceed to operator review.`,
    responseId: undefined,
    generatedBy: "fallback" as const,
  };
}

async function createWorkflowRunArtifacts(state: AppState, lead: Lead, workflowId: WorkflowId) {
  const workflow = workflowById(workflowId);
  const runId = id("run");
  const approvalId = id("appr");
  const deliverableId = id("del");
  const startedAt = now();
  const agentRoster = buildAgentRoster(workflowId, state);
  const discoveryPacket = workflowId === "lead-intake" ? await generateDiscoveryPacket(lead, agentRoster) : null;
  const baseName =
    workflowId === "lead-intake"
      ? `Lead Intake ${lead.companyName}`
      : workflowId === "discovery-proposal"
        ? `Proposal ${lead.companyName}`
        : `Strategy ${lead.companyName}`;

  const tasks: Task[] = workflowId === "lead-intake"
    ? [
        {
          id: id("task"),
          runId,
          name: "Validate inbound lead",
          description: "Check source data, contact fields, and service interest.",
          status: "done",
          assignedAgent: agentRoster[0].name,
          startedAt,
          completedAt: startedAt,
          durationMs: 12000,
          dependsOn: [],
          outputSummary: "Lead validated and normalized.",
        },
        {
          id: id("task"),
          runId,
          name: "Run discovery interview",
          description: "Collect goals, constraints, timeline, and open questions.",
          status: "done",
          assignedAgent: agentRoster[1].name,
          startedAt,
          completedAt: startedAt,
          durationMs: 28000,
          dependsOn: [],
          outputSummary: "Discovery notes captured.",
        },
        {
          id: id("task"),
          runId,
          name: "Draft discovery packet",
          description: "Produce a structured discovery packet for review.",
          status: "in_progress",
          assignedAgent: agentRoster[2].name,
          startedAt,
          dependsOn: [],
          outputSummary: workflowId === "lead-intake" ? "Azure OpenAI drafting discovery packet." : undefined,
        },
        {
          id: id("task"),
          runId,
          name: "Gate human approval",
          description: "Pause until an operator approves the discovery packet.",
          status: "blocked",
          assignedAgent: agentRoster[0].name,
          dependsOn: [],
          outputSummary: "Awaiting human approval.",
        },
      ]
    : [
        {
          id: id("task"),
          runId,
          name: "Ingest discovery packet",
          description: "Load the approved discovery packet and the lead brief.",
          status: "done",
          assignedAgent: agentRoster[0].name,
          startedAt,
          completedAt: startedAt,
          durationMs: 10000,
          dependsOn: [],
          outputSummary: "Discovery packet ingested.",
        },
        {
          id: id("task"),
          runId,
          name: workflowId === "discovery-proposal" ? "Draft proposal" : "Draft web strategy",
          description: workflowId === "discovery-proposal" ? "Generate scope, pricing, and timeline." : "Generate sitemap, UX recommendations, and stack guidance.",
          status: "in_progress",
          assignedAgent: agentRoster[1].name,
          startedAt,
          dependsOn: [],
        },
        {
          id: id("task"),
          runId,
          name: "Request operator approval",
          description: "Pause until the proposal or strategy brief is approved.",
          status: "blocked",
          assignedAgent: agentRoster[0].name,
          dependsOn: [],
          outputSummary: "Awaiting human approval.",
        },
      ];

  const approval: Approval = {
    id: approvalId,
    runId,
    runName: baseName,
    title: workflowId === "lead-intake" ? "Approve discovery packet" : workflowId === "discovery-proposal" ? "Approve proposal packet" : "Approve strategy brief",
    description: workflowId === "lead-intake"
      ? `Discovery packet for ${lead.companyName} is ready for operator review.`
      : workflowId === "discovery-proposal"
        ? `Proposal for ${lead.companyName} is ready for operator review.`
        : `Strategy brief for ${lead.companyName} is ready for operator review.`,
    status: "pending",
    workflowId,
    stepKey: "human-approval",
    requestedAt: startedAt,
    requestedBy: agentRoster[0].name,
    priority: "high",
  };

  const deliverable: Deliverable = {
    id: deliverableId,
    runId,
    runName: baseName,
    name: workflowId === "lead-intake"
      ? `discovery-packet-${slugify(lead.companyName)}.md`
      : workflowId === "discovery-proposal"
        ? `proposal-${slugify(lead.companyName)}.md`
        : `strategy-brief-${slugify(lead.companyName)}.md`,
    type: "summary",
    status: "draft",
    workflowId,
    createdAt: startedAt,
    sizeBytes: workflowId === "lead-intake" && discoveryPacket ? Buffer.byteLength(discoveryPacket.content, "utf8") : 4200,
    content: workflowId === "lead-intake" ? discoveryPacket?.content : undefined,
  };

  const run: Run = {
    id: runId,
    name: baseName,
    projectId: workflowId === "lead-intake" ? "proj-001" : workflowId === "discovery-proposal" ? "proj-002" : "proj-002",
    projectName: workflow.name,
    status: "running",
    workflowId,
    leadId: lead.id,
    startedAt,
    progress: workflowId === "lead-intake" ? 62 : 48,
    agentCount: agentRoster.length,
    taskCount: tasks.length,
    completedTasks: workflowId === "lead-intake" ? 2 : 1,
    triggeredBy: "api",
    modelAlias: agentRoster[0].model,
    summary: workflowId === "lead-intake" ? "Azure OpenAI-generated discovery packet ready for operator review." : createSummaryForWorkflow(lead, workflowId),
    agents: agentRoster,
    tags: [workflowId, lead.serviceInterest].filter(Boolean) as string[],
  };

  const logs: LogEntry[] = [
    {
      id: id("log"),
      runId,
      workflowId,
      agentName: agentRoster[0].name,
      level: "info",
      message: `Run started for ${lead.companyName}.`,
      timestamp: startedAt,
    },
    {
      id: id("log"),
      runId,
      workflowId,
      agentName: agentRoster[1].name,
      level: "info",
      message: workflowId === "lead-intake"
        ? "Discovery interview completed and packet draft assembled."
        : "Approved discovery packet ingested and follow-on artifact drafting started.",
      timestamp: startedAt,
    },
    {
      id: id("log"),
      runId,
      workflowId,
      agentName: agentRoster[0].name,
      level: "warn",
      message: approval.title + " created and awaiting review.",
      metadata: workflowId === "lead-intake" ? { azureOpenAIResponseId: discoveryPacket?.responseId, generatedBy: discoveryPacket?.generatedBy } : undefined,
      timestamp: startedAt,
    },
  ];

  const handoff: Handoff = {
    id: id("handoff"),
    leadId: lead.id,
    runId,
    fromWorkflowId: workflowId,
    toWorkflowId: getLeadInterestWorkflow(lead.serviceInterest),
    title: workflowId === "lead-intake"
      ? `Discovery handoff for ${lead.companyName}`
      : `${workflow.name} handoff for ${lead.companyName}`,
    status: "pending",
    createdAt: startedAt,
    summary: workflow.description,
  };

  if (workflowId === "lead-intake" && discoveryPacket) {
    logs.unshift({
      id: id("log"),
      runId,
      workflowId,
      agentName: agentRoster[2].name,
      level: "info",
      message: "Azure OpenAI generated discovery packet content.",
      metadata: { azureOpenAIResponseId: discoveryPacket.responseId, generatedBy: discoveryPacket.generatedBy },
      timestamp: startedAt,
    });
    tasks[2].outputSummary = "Discovery packet drafted by Azure OpenAI.";
    tasks[3].outputSummary = "Awaiting human approval of Azure OpenAI-generated packet.";
  }

  return { run, tasks, approval, deliverable, logs, handoff };
}

async function finalizeWorkflowRun(state: AppState, approval: Approval, decision: "approved" | "rejected", reviewedBy: string) {
  const notifications: NotificationEvent[] = [];
  const runIndex = state.runs.findIndex((run) => run.id === approval.runId);
  if (runIndex === -1) return notifications;
  const run = state.runs[runIndex];
  const lead = run.leadId ? state.leads.find((item) => item.id === run.leadId) : undefined;
  const nowIso = now();
  const relatedTasks = state.tasks.filter((task) => task.runId === run.id);
  const relatedDeliverable = state.deliverables.find((deliverable) => deliverable.runId === run.id);
  const relatedHandoff = state.handoffs.find((handoff) => handoff.runId === run.id);

  if (decision === "rejected") {
    state.runs[runIndex] = {
      ...run,
      status: "failed",
      progress: 100,
      completedAt: nowIso,
      durationMs: Math.max(Date.now() - new Date(run.startedAt).getTime(), 1),
    };
    relatedTasks.forEach((task) => {
      task.status = task.status === "blocked" ? "cancelled" : task.status;
    });
    if (relatedDeliverable) {
      relatedDeliverable.status = "failed";
    }
    if (relatedHandoff) {
      relatedHandoff.status = "blocked";
      relatedHandoff.completedAt = nowIso;
    }
    if (lead) {
      lead.status = "disqualified";
      lead.updatedAt = nowIso;
    }
    state.logs.unshift({
      id: id("log"),
      runId: run.id,
      workflowId: run.workflowId,
      agentName: approval.requestedBy,
      level: "error",
      message: `${approval.title} rejected by ${reviewedBy}.`,
      timestamp: nowIso,
    });
    notifications.push({
      title: "Run failed",
      body: `${approval.title} was rejected by ${reviewedBy}.`,
      runId: run.id,
      approvalId: approval.id,
      leadId: lead?.id,
    });
    return notifications;
  }

  state.runs[runIndex] = {
    ...run,
    status: "completed",
    progress: 100,
    completedAt: nowIso,
    durationMs: Math.max(Date.now() - new Date(run.startedAt).getTime(), 1),
    completedTasks: run.taskCount,
  };
  relatedTasks.forEach((task) => {
    task.status = "done";
    if (!task.completedAt) task.completedAt = nowIso;
    if (!task.durationMs) task.durationMs = Math.max(Date.now() - new Date(task.startedAt || run.startedAt).getTime(), 1000);
  });
  if (relatedDeliverable) {
    relatedDeliverable.status = "delivered";
  }
  if (relatedHandoff) {
    relatedHandoff.status = "completed";
    relatedHandoff.completedAt = nowIso;
  }
  if (lead) {
    lead.status = "qualified";
    lead.updatedAt = nowIso;
  }

  state.logs.unshift({
    id: id("log"),
    runId: run.id,
    workflowId: run.workflowId,
    agentName: reviewedBy,
    level: "info",
    message: `${approval.title} approved by ${reviewedBy}.`,
    timestamp: nowIso,
  });
  notifications.push({
    title: "Approval granted",
    body: `${approval.title} was approved by ${reviewedBy}.`,
    runId: run.id,
    approvalId: approval.id,
    leadId: lead?.id,
  });

  const nextWorkflowId = lead ? getLeadInterestWorkflow(lead.serviceInterest) : undefined;
  if (run.workflowId === "lead-intake" && lead && nextWorkflowId) {
    const nextArtifacts = await createWorkflowRunArtifacts(state, lead, nextWorkflowId);
    nextArtifacts.handoff.status = "completed";
    nextArtifacts.handoff.completedAt = nowIso;
    state.runs.unshift(nextArtifacts.run);
    state.tasks.unshift(...nextArtifacts.tasks);
    state.approvals.unshift(nextArtifacts.approval);
    state.deliverables.unshift(nextArtifacts.deliverable);
    state.logs.unshift(...nextArtifacts.logs);
    state.handoffs.unshift(nextArtifacts.handoff);
    notifications.push(
      {
        title: "Next workflow started",
        body: `${nextArtifacts.run.name} has started for ${lead.companyName}.`,
        runId: nextArtifacts.run.id,
        leadId: lead.id,
      },
      {
        title: "Approval requested",
        body: `${nextArtifacts.approval.title} is waiting on human review.`,
        runId: nextArtifacts.run.id,
        approvalId: nextArtifacts.approval.id,
      },
    );
  }

  return notifications;
}

export function deriveStats(state: AppState) {
  const activeRuns = state.runs.filter((run) => run.status === "running" || run.status === "pending").length;
  const pendingApprovals = state.approvals.filter((approval) => approval.status === "pending").length;
  const todayIso = new Date().toISOString().slice(0, 10);
  const completedToday = state.runs.filter((run) => run.completedAt?.startsWith(todayIso) && run.status === "completed").length;
  const failedToday = state.runs.filter((run) => run.completedAt?.startsWith(todayIso) && run.status === "failed").length;
  const completedRuns = state.runs.filter((run) => run.status === "completed");
  const avgRunDurationMs = completedRuns.length
    ? Math.round(completedRuns.reduce((sum, run) => sum + (run.durationMs || 0), 0) / completedRuns.length)
    : mockDashboardMetrics.avgRunDurationMs;
  const successRate = state.runs.length
    ? Math.round((completedRuns.length / state.runs.length) * 100)
    : mockDashboardMetrics.successRate;
  const services = Object.fromEntries(
    state.serviceHealth.map((service) => [
      service.name.toLowerCase().replace(/\s+/g, "_"),
      service.status === "healthy" ? "ok" : service.status,
    ]),
  );

  return {
    ...mockDashboardMetrics,
    active_runs: activeRuns,
    pending_approvals: pendingApprovals,
    total_leads: state.leads.length,
    total_handoffs: state.handoffs.length,
    agents_online: state.agents.filter((agent) => agent.status !== "offline").length,
    services,
    completedToday,
    failedToday,
    successRate,
    avgRunDurationMs,
  } satisfies DashboardMetrics & {
    active_runs: number;
    pending_approvals: number;
    total_leads: number;
    total_handoffs: number;
    agents_online: number;
    services: Record<string, string>;
  };
}

export async function getSnapshot() {
  const state = await getState();
  return {
    stats: deriveStats(state),
    runs: clone(state.runs),
    approvals: clone(state.approvals),
    leads: clone(state.leads),
    source: "api" as const,
  };
}

export async function listRuns() {
  return clone((await getState()).runs);
}

export async function getRunById(idValue: string) {
  const state = await getState();
  return state.runs.find((run) => run.id === idValue) || null;
}

export async function listTasks(runId?: string) {
  const state = await getState();
  return clone(runId ? state.tasks.filter((task) => task.runId === runId) : state.tasks);
}

export async function listApprovals() {
  return clone((await getState()).approvals);
}

export async function listProjects() {
  return clone((await getState()).projects);
}

export async function listLogs(runId?: string) {
  const state = await getState();
  return clone(runId ? state.logs.filter((log) => log.runId === runId) : state.logs);
}

export async function listDeliverables() {
  return clone((await getState()).deliverables);
}

export async function listLeads() {
  return clone((await getState()).leads);
}

export async function listAgents() {
  return clone((await getState()).agents);
}

export async function listClients() {
  return clone((await getState()).clients);
}

export async function getClientContext(clientId: string) {
  const state = await getState();
  return clone(state.clientContexts.find((context) => context.clientId === clientId) || null);
}

export async function getClientWorkspace(clientId: string) {
  const state = await getState();
  const client = state.clients.find((item) => item.id === clientId);
  if (!client) return null;
  const accountIds = new Set(state.crmAccounts.filter((account) => account.clientId === client.id).map((account) => account.id));
  const leadIds = new Set(state.crmAccounts.filter((account) => account.clientId === client.id && account.leadId).map((account) => account.leadId!));
  const contactIds = new Set(state.crmContacts.filter((contact) => contact.accountId && accountIds.has(contact.accountId)).map((contact) => contact.id));
  const dealIds = new Set(state.crmDeals.filter((deal) => accountIds.has(deal.accountId)).map((deal) => deal.id));
  for (const deal of state.crmDeals.filter((item) => accountIds.has(item.accountId))) {
    if (deal.leadId) leadIds.add(deal.leadId);
  }

  const runs = state.runs.filter((run) => run.leadId && leadIds.has(run.leadId));
  const runIds = new Set(runs.map((run) => run.id));
  const approvalIds = new Set(state.outboundMessages.filter((message) => message.clientId === client.id && message.approvalId).map((message) => message.approvalId!));

  return clone({
    client,
    context: state.clientContexts.find((context) => context.clientId === client.id) || null,
    memory: state.clientMemoryItems.filter((item) => item.clientId === client.id),
    files: state.clientFiles.filter((item) => item.clientId === client.id),
    agentJobs: state.agentJobs.filter((job) => job.clientId === client.id),
    outboundMessages: state.outboundMessages.filter((message) => message.clientId === client.id),
    crm: {
      accounts: state.crmAccounts.filter((account) => account.clientId === client.id),
      contacts: state.crmContacts.filter((contact) => (contact.accountId && accountIds.has(contact.accountId)) || (contact.leadId && leadIds.has(contact.leadId))),
      deals: state.crmDeals.filter((deal) => accountIds.has(deal.accountId)),
      activities: state.crmActivities.filter((activity) =>
        (activity.accountId && accountIds.has(activity.accountId)) ||
        (activity.contactId && contactIds.has(activity.contactId)) ||
        (activity.dealId && dealIds.has(activity.dealId)) ||
        (activity.leadId && leadIds.has(activity.leadId)),
      ),
    },
    leads: state.leads.filter((lead) => leadIds.has(lead.id)),
    runs,
    tasks: state.tasks.filter((task) => runIds.has(task.runId)),
    approvals: state.approvals.filter((approval) => runIds.has(approval.runId) || approvalIds.has(approval.id)),
    deliverables: state.deliverables.filter((deliverable) => runIds.has(deliverable.runId)),
    logs: state.logs.filter((log) => runIds.has(log.runId) || log.runId === client.id),
  });
}

export async function listAgentDefinitions() {
  return clone((await getState()).agentDefinitions);
}

export async function listAgentJobs() {
  return clone((await getState()).agentJobs);
}

export async function listClientMemory(clientId?: string) {
  const state = await getState();
  return clone(clientId ? state.clientMemoryItems.filter((item) => item.clientId === clientId) : state.clientMemoryItems);
}

export async function listClientFiles(clientId?: string) {
  const state = await getState();
  return clone(clientId ? state.clientFiles.filter((item) => item.clientId === clientId) : state.clientFiles);
}

export async function listOutboundMessages() {
  return clone((await getState()).outboundMessages);
}

export async function listWorkerHeartbeats() {
  return clone((await getState()).workerHeartbeats);
}

export async function getCrmSnapshot() {
  const state = await getState();
  return {
    accounts: clone(state.crmAccounts),
    contacts: clone(state.crmContacts),
    deals: clone(state.crmDeals),
    activities: clone(state.crmActivities),
  };
}

export async function listCrmAccounts() {
  return clone((await getState()).crmAccounts);
}

export async function listCrmContacts() {
  return clone((await getState()).crmContacts);
}

export async function listCrmDeals() {
  return clone((await getState()).crmDeals);
}

export async function listCrmActivities() {
  return clone((await getState()).crmActivities);
}

export async function listHandoffs() {
  return clone((await getState()).handoffs);
}

export async function listServiceHealth() {
  return clone((await getState()).serviceHealth);
}

export async function listWorkflows() {
  return clone((await getState()).workflows);
}

export async function getSettings() {
  return clone((await getState()).settings);
}

export async function updateSettings(partial: SettingsUpdate) {
  return updateState((state) => {
    state.settings = {
      ...state.settings,
      ...partial,
      notifications: {
        ...state.settings.notifications,
        ...(partial.notifications || {}),
      },
      api: {
        ...state.settings.api,
        ...(partial.api || {}),
      },
    };
    writeAuditEvent({
      actorEmail: DEFAULT_USER,
      action: "settings.updated",
      targetType: "settings",
      targetId: "default",
      metadata: partial as Record<string, unknown>,
    });
    return { state, result: clone(state.settings), notifications: [] };
  });
}

export async function createClient(input: ClientInput) {
  return updateState((state) => {
    if (!input.name?.trim()) {
      throw new Error("name is required");
    }
    const timestamp = now();
    const client: ClientAccount = {
      id: id("client"),
      organizationId: DEFAULT_ORG_ID,
      name: input.name.trim(),
      type: input.type || "other",
      status: "active",
      primaryContact: input.primaryContact?.trim() || undefined,
      contactEmail: input.contactEmail?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      tags: input.tags || [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const context: ClientContext = {
      id: id("ctx"),
      clientId: client.id,
      summary: input.notes?.trim() || `Operational context for ${client.name}.`,
      memory: {
        clientType: client.type,
        isolationPolicy: "Only use memory, files, and tasks scoped to this client.",
      },
      updatedAt: timestamp,
    };
    state.clients.unshift(client);
    state.clientContexts.unshift(context);
    const crmAccount: CrmAccount = {
      id: id("crm-acct"),
      clientId: client.id,
      name: client.name,
      status: "active",
      owner: DEFAULT_USER,
      notes: client.notes,
      tags: client.tags,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.crmAccounts.unshift(crmAccount);
    if (client.primaryContact || client.contactEmail) {
      state.crmContacts.unshift({
        id: id("crm-contact"),
        accountId: crmAccount.id,
        name: client.primaryContact || client.contactEmail || "Primary contact",
        email: client.contactEmail,
        status: "active",
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
    state.crmActivities.unshift({
      id: id("crm-act"),
      accountId: crmAccount.id,
      type: "note",
      status: "completed",
      title: "Client account created",
      body: client.notes,
      occurredAt: timestamp,
      createdBy: DEFAULT_USER,
      metadata: { clientId: client.id },
    });
    state.logs.unshift({
      id: id("log"),
      runId: client.id,
      agentName: "Client Registry",
      level: "info",
      message: `Client created: ${client.name}.`,
      timestamp,
      metadata: { clientId: client.id, type: client.type },
    });
    writeAuditEvent({
      actorEmail: DEFAULT_USER,
      action: "client.created",
      targetType: "client",
      targetId: client.id,
      metadata: { name: client.name, type: client.type },
    });
    writeAuditEvent({
      actorEmail: DEFAULT_USER,
      action: "crm.account.created",
      targetType: "crm_account",
      targetId: crmAccount.id,
      metadata: { clientId: client.id, name: crmAccount.name },
    });
    return { state, result: clone({ client, context }) };
  });
}

export async function createAgentJob(input: AgentJobInput) {
  return updateState((state) => {
    if (!input.agentId?.trim()) throw new Error("agentId is required");
    if (!input.title?.trim()) throw new Error("title is required");
    const agentDefinition = state.agentDefinitions.find((agent) => agent.id === input.agentId);
    if (!agentDefinition) throw new Error("Agent definition not found");
    if (agentDefinition.status !== "enabled") throw new Error("Agent definition is disabled");
    const client = input.clientId ? state.clients.find((item) => item.id === input.clientId) : undefined;
    if (input.clientId && !client) throw new Error("Client not found");

    const timestamp = now();
    const job: AgentJob = {
      id: id("job"),
      agentId: agentDefinition.id,
      clientId: client?.id,
      title: input.title.trim(),
      status: agentDefinition.riskLevel === "high" ? "blocked" : "queued",
      priority: input.priority || "medium",
      requestedBy: input.requestedBy?.trim() || DEFAULT_USER,
      createdAt: timestamp,
      updatedAt: timestamp,
      input: {
        ...(input.input || {}),
        clientContextRequired: Boolean(client),
        approvalRequiredFor: agentDefinition.requiresApprovalFor,
      },
    };
    state.agentJobs.unshift(job);
    state.logs.unshift({
      id: id("log"),
      runId: job.id,
      agentName: agentDefinition.name,
      level: job.status === "blocked" ? "warn" : "info",
      message: job.status === "blocked"
        ? `Agent job created and blocked for approval: ${job.title}.`
        : `Agent job queued: ${job.title}.`,
      timestamp,
      metadata: { agentId: job.agentId, clientId: job.clientId, status: job.status },
    });
    writeAuditEvent({
      actorEmail: job.requestedBy,
      action: "agent_job.created",
      targetType: "agent_job",
      targetId: job.id,
      metadata: { agentId: job.agentId, clientId: job.clientId, status: job.status },
    });
    return { state, result: clone(job) };
  });
}

export async function claimNextAgentJob(workerId: string, agentId?: string) {
  return updateState((state) => {
    const timestamp = now();
    const job = state.agentJobs.find((item) => {
      if (item.status !== "queued") return false;
      if (agentId && item.agentId !== agentId) return false;
      return true;
    });
    if (!job) return { state, result: null };
    job.status = "running";
    job.lockedBy = workerId;
    job.lockedAt = timestamp;
    job.updatedAt = timestamp;
    state.logs.unshift({
      id: id("log"),
      runId: job.id,
      agentName: "Agent Worker",
      level: "info",
      message: `Agent job claimed by ${workerId}.`,
      timestamp,
      metadata: { jobId: job.id, workerId, agentId: job.agentId },
    });
    writeAuditEvent({
      actorEmail: workerId,
      action: "agent_job.claimed",
      targetType: "agent_job",
      targetId: job.id,
      metadata: { workerId, agentId: job.agentId, clientId: job.clientId },
    });
    return { state, result: clone(job) };
  });
}

export async function completeAgentJob(jobId: string, output: Record<string, unknown>, workerId?: string) {
  return updateState((state) => {
    const job = state.agentJobs.find((item) => item.id === jobId);
    if (!job) throw new Error("Agent job not found");
    const timestamp = now();
    job.status = "completed";
    job.output = output;
    job.completedAt = timestamp;
    job.updatedAt = timestamp;
    job.error = undefined;
    state.logs.unshift({
      id: id("log"),
      runId: job.id,
      agentName: "Agent Worker",
      level: "info",
      message: `Agent job completed: ${job.title}.`,
      timestamp,
      metadata: { jobId: job.id, workerId, output },
    });
    writeAuditEvent({
      actorEmail: workerId || job.lockedBy || DEFAULT_USER,
      action: "agent_job.completed",
      targetType: "agent_job",
      targetId: job.id,
      metadata: { workerId, clientId: job.clientId },
    });
    return { state, result: clone(job) };
  });
}

export async function failAgentJob(jobId: string, errorMessage: string, workerId?: string) {
  return updateState((state) => {
    const job = state.agentJobs.find((item) => item.id === jobId);
    if (!job) throw new Error("Agent job not found");
    const timestamp = now();
    job.status = "failed";
    job.error = errorMessage;
    job.updatedAt = timestamp;
    state.logs.unshift({
      id: id("log"),
      runId: job.id,
      agentName: "Agent Worker",
      level: "error",
      message: `Agent job failed: ${job.title}.`,
      timestamp,
      metadata: { jobId: job.id, workerId, error: errorMessage },
    });
    writeAuditEvent({
      actorEmail: workerId || job.lockedBy || DEFAULT_USER,
      action: "agent_job.failed",
      targetType: "agent_job",
      targetId: job.id,
      metadata: { workerId, clientId: job.clientId, error: errorMessage },
    });
    return { state, result: clone(job) };
  });
}

export async function addClientMemory(input: ClientMemoryInput) {
  return updateState((state) => {
    const client = state.clients.find((item) => item.id === input.clientId);
    if (!client) throw new Error("Client not found");
    if (!input.title?.trim()) throw new Error("title is required");
    if (!input.body?.trim()) throw new Error("body is required");
    const timestamp = now();
    const memory: ClientMemoryItem = {
      id: id("mem"),
      clientId: client.id,
      kind: input.kind || "note",
      title: input.title.trim(),
      body: input.body.trim(),
      source: input.source?.trim() || "operator",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.clientMemoryItems.unshift(memory);
    const context = state.clientContexts.find((item) => item.clientId === client.id);
    if (context) {
      context.updatedAt = timestamp;
      context.memory = {
        ...context.memory,
        lastMemoryTitle: memory.title,
        lastMemoryKind: memory.kind,
      };
    }
    writeAuditEvent({
      actorEmail: DEFAULT_USER,
      action: "client_memory.created",
      targetType: "client",
      targetId: client.id,
      metadata: { memoryId: memory.id, kind: memory.kind, title: memory.title },
    });
    return { state, result: clone(memory) };
  });
}

export async function addClientFile(input: ClientFileInput) {
  return updateState((state) => {
    const client = state.clients.find((item) => item.id === input.clientId);
    if (!client) throw new Error("Client not found");
    if (!input.name?.trim()) throw new Error("name is required");
    const timestamp = now();
    const file: ClientFileRecord = {
      id: id("file"),
      clientId: client.id,
      kind: input.kind || "other",
      name: input.name.trim(),
      url: input.url?.trim() || undefined,
      contentType: input.contentType?.trim() || undefined,
      sizeBytes: input.sizeBytes,
      notes: input.notes?.trim() || undefined,
      createdAt: timestamp,
    };
    state.clientFiles.unshift(file);
    writeAuditEvent({
      actorEmail: DEFAULT_USER,
      action: "client_file.created",
      targetType: "client",
      targetId: client.id,
      metadata: { fileId: file.id, kind: file.kind, name: file.name },
    });
    return { state, result: clone(file) };
  });
}

function appendCrmActivity(state: AppState, input: CrmActivityInput, actor = DEFAULT_USER) {
  const timestamp = now();
  const activity: CrmActivity = {
    id: id("crm-act"),
    accountId: input.accountId,
    contactId: input.contactId,
    dealId: input.dealId,
    leadId: input.leadId,
    type: input.type || "note",
    status: input.status || "completed",
    title: input.title.trim(),
    body: input.body?.trim() || undefined,
    occurredAt: input.occurredAt || timestamp,
    dueAt: input.dueAt,
    createdBy: input.createdBy?.trim() || actor,
    metadata: input.metadata || {},
  };
  state.crmActivities.unshift(activity);
  return activity;
}

export async function createCrmAccount(input: CrmAccountInput, actor = DEFAULT_USER) {
  return updateState((state) => {
    if (!input.name?.trim()) throw new Error("name is required");
    if (input.clientId && !state.clients.some((client) => client.id === input.clientId)) throw new Error("Client not found");
    if (input.leadId && !state.leads.some((lead) => lead.id === input.leadId)) throw new Error("Lead not found");
    const timestamp = now();
    const account: CrmAccount = {
      id: id("crm-acct"),
      clientId: input.clientId,
      leadId: input.leadId,
      name: input.name.trim(),
      website: input.website?.trim() || undefined,
      industry: input.industry?.trim() || undefined,
      status: input.status || "prospect",
      owner: input.owner?.trim() || actor || DEFAULT_USER,
      notes: input.notes?.trim() || undefined,
      tags: input.tags || [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.crmAccounts.unshift(account);
    appendCrmActivity(state, {
      accountId: account.id,
      leadId: account.leadId,
      type: "note",
      title: "CRM account created",
      body: account.notes,
      metadata: { clientId: account.clientId, status: account.status },
    }, actor);
    writeAuditEvent({
      actorEmail: actor,
      action: "crm.account.created",
      targetType: "crm_account",
      targetId: account.id,
      metadata: { clientId: account.clientId, leadId: account.leadId, name: account.name },
    });
    return { state, result: clone(account) };
  });
}

export async function createCrmContact(input: CrmContactInput, actor = DEFAULT_USER) {
  return updateState((state) => {
    if (!input.name?.trim()) throw new Error("name is required");
    if (input.accountId && !state.crmAccounts.some((account) => account.id === input.accountId)) throw new Error("CRM account not found");
    if (input.leadId && !state.leads.some((lead) => lead.id === input.leadId)) throw new Error("Lead not found");
    const timestamp = now();
    const contact: CrmContact = {
      id: id("crm-contact"),
      accountId: input.accountId,
      leadId: input.leadId,
      name: input.name.trim(),
      email: input.email?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      title: input.title?.trim() || undefined,
      status: input.status || "new",
      notes: input.notes?.trim() || undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.crmContacts.unshift(contact);
    appendCrmActivity(state, {
      accountId: contact.accountId,
      contactId: contact.id,
      leadId: contact.leadId,
      type: "note",
      title: "CRM contact created",
      body: contact.notes || contact.email,
      metadata: { email: contact.email, status: contact.status },
    }, actor);
    writeAuditEvent({
      actorEmail: actor,
      action: "crm.contact.created",
      targetType: "crm_contact",
      targetId: contact.id,
      metadata: { accountId: contact.accountId, leadId: contact.leadId, email: contact.email },
    });
    return { state, result: clone(contact) };
  });
}

export async function createCrmDeal(input: CrmDealInput, actor = DEFAULT_USER) {
  return updateState((state) => {
    if (!input.name?.trim()) throw new Error("name is required");
    const account = state.crmAccounts.find((item) => item.id === input.accountId);
    if (!account) throw new Error("CRM account not found");
    if (input.contactId && !state.crmContacts.some((contact) => contact.id === input.contactId)) throw new Error("CRM contact not found");
    if (input.leadId && !state.leads.some((lead) => lead.id === input.leadId)) throw new Error("Lead not found");
    const timestamp = now();
    const deal: CrmDeal = {
      id: id("crm-deal"),
      accountId: account.id,
      contactId: input.contactId,
      leadId: input.leadId,
      name: input.name.trim(),
      stage: input.stage || "new",
      value: Number.isFinite(input.value) ? Math.max(Number(input.value), 0) : 0,
      currency: input.currency?.trim() || "USD",
      probability: Number.isFinite(input.probability) ? Math.min(Math.max(Number(input.probability), 0), 100) : 10,
      expectedCloseDate: input.expectedCloseDate,
      owner: input.owner?.trim() || actor || DEFAULT_USER,
      notes: input.notes?.trim() || undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.crmDeals.unshift(deal);
    appendCrmActivity(state, {
      accountId: deal.accountId,
      contactId: deal.contactId,
      dealId: deal.id,
      leadId: deal.leadId,
      type: "status_change",
      title: `Deal created in ${deal.stage}`,
      body: deal.notes,
      metadata: { value: deal.value, currency: deal.currency, probability: deal.probability },
    }, actor);
    writeAuditEvent({
      actorEmail: actor,
      action: "crm.deal.created",
      targetType: "crm_deal",
      targetId: deal.id,
      metadata: { accountId: deal.accountId, leadId: deal.leadId, stage: deal.stage, value: deal.value },
    });
    return { state, result: clone(deal) };
  });
}

export async function createCrmActivity(input: CrmActivityInput, actor = DEFAULT_USER) {
  return updateState((state) => {
    if (!input.title?.trim()) throw new Error("title is required");
    if (input.accountId && !state.crmAccounts.some((account) => account.id === input.accountId)) throw new Error("CRM account not found");
    if (input.contactId && !state.crmContacts.some((contact) => contact.id === input.contactId)) throw new Error("CRM contact not found");
    if (input.dealId && !state.crmDeals.some((deal) => deal.id === input.dealId)) throw new Error("CRM deal not found");
    if (input.leadId && !state.leads.some((lead) => lead.id === input.leadId)) throw new Error("Lead not found");
    const activity = appendCrmActivity(state, input, actor);
    writeAuditEvent({
      actorEmail: actor,
      action: "crm.activity.created",
      targetType: "crm_activity",
      targetId: activity.id,
      metadata: { accountId: activity.accountId, contactId: activity.contactId, dealId: activity.dealId, leadId: activity.leadId, type: activity.type },
    });
    return { state, result: clone(activity) };
  });
}

export async function draftOutboundMessage(input: OutboundDraftInput, requestedBy = DEFAULT_USER) {
  return updateState((state) => {
    const recipient = input.to?.trim();
    const subject = input.subject?.trim();
    const body = input.body?.trim();
    if (!recipient) throw new Error("to is required");
    if (!subject) throw new Error("subject is required");
    if (!body) throw new Error("body is required");

    const client = input.clientId ? state.clients.find((item) => item.id === input.clientId) : undefined;
    if (input.clientId && !client) throw new Error("Client not found");
    const lead = input.leadId ? state.leads.find((item) => item.id === input.leadId) : undefined;
    if (input.leadId && !lead) throw new Error("Lead not found");
    const job = input.agentJobId ? state.agentJobs.find((item) => item.id === input.agentJobId) : undefined;
    if (input.agentJobId && !job) throw new Error("Agent job not found");

    const timestamp = now();
    const messageId = id("out");
    const approvalId = id("appr");
    const message: OutboundMessage = {
      id: messageId,
      clientId: client?.id,
      leadId: lead?.id,
      agentJobId: job?.id,
      approvalId,
      channel: "email",
      to: recipient,
      subject,
      body,
      status: "pending_approval",
      createdAt: timestamp,
      updatedAt: timestamp,
      metadata: {
        source: job ? "agent_job" : "operator",
        approvalRequired: true,
      },
    };
    const approval: Approval = {
      id: approvalId,
      runId: messageId,
      runName: `Outbound email: ${subject}`,
      title: "Approve outbound email",
      description: `Approve email to ${recipient}: ${subject}`,
      status: "pending",
      stepKey: "outbound-email-approval",
      requestedAt: timestamp,
      requestedBy: requestedBy || DEFAULT_USER,
      priority: "high",
    };

    state.outboundMessages.unshift(message);
    state.approvals.unshift(approval);
    state.logs.unshift({
      id: id("log"),
      runId: message.id,
      agentName: "Outbound Gateway",
      level: "warn",
      message: `Outbound email drafted for approval: ${subject}.`,
      timestamp,
      metadata: { outboundMessageId: message.id, approvalId, clientId: client?.id, leadId: lead?.id, agentJobId: job?.id },
    });
    writeAuditEvent({
      actorEmail: requestedBy || DEFAULT_USER,
      action: "outbound.drafted",
      targetType: "outbound_message",
      targetId: message.id,
      metadata: { approvalId, clientId: client?.id, leadId: lead?.id, agentJobId: job?.id, to: recipient },
    });
    return {
      state,
      result: clone({ message, approval }),
      notifications: [{
        title: "Outbound approval requested",
        body: `Email to ${recipient} is waiting for approval.`,
        approvalId,
        leadId: lead?.id,
      }],
    };
  });
}

export async function sendApprovedOutboundMessage(messageId: string, actor = DEFAULT_USER) {
  return updateState(async (state) => {
    const message = state.outboundMessages.find((item) => item.id === messageId);
    if (!message) throw new Error("Outbound message not found");
    if (message.status === "sent") return { state, result: clone(message) };
    if (message.status !== "approved") throw new Error("Outbound message must be approved before sending");

    const timestamp = now();
    const webhookUrl = process.env.OUTBOUND_SEND_WEBHOOK_URL || process.env.N8N_OUTBOUND_SEND_WEBHOOK_URL;
    const payload = {
      id: message.id,
      channel: message.channel,
      to: message.to,
      subject: message.subject,
      body: message.body,
      clientId: message.clientId,
      leadId: message.leadId,
      agentJobId: message.agentJobId,
    };

    if (webhookUrl) {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.CLAWBOT_WORKER_API_KEY ? { "x-clawbot-worker-key": process.env.CLAWBOT_WORKER_API_KEY } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        message.status = "send_failed";
        message.error = `Outbound webhook failed with ${response.status}`;
        message.updatedAt = timestamp;
      } else {
        const responsePayload = await response.json().catch(() => ({}));
        message.status = "sent";
        message.sentAt = timestamp;
        message.updatedAt = timestamp;
        message.error = undefined;
        message.metadata = { ...message.metadata, sendMode: "webhook", webhookResponse: responsePayload };
      }
    } else if (process.env.NODE_ENV === "production") {
      message.status = "send_failed";
      message.error = "OUTBOUND_SEND_WEBHOOK_URL or N8N_OUTBOUND_SEND_WEBHOOK_URL is required to send outbound email in production";
      message.updatedAt = timestamp;
    } else {
      message.status = "sent";
      message.sentAt = timestamp;
      message.updatedAt = timestamp;
      message.metadata = { ...message.metadata, sendMode: "dry_run" };
    }

    state.logs.unshift({
      id: id("log"),
      runId: message.id,
      agentName: "Outbound Gateway",
      level: message.status === "sent" ? "info" : "error",
      message: message.status === "sent" ? `Outbound email sent to ${message.to}.` : `Outbound email send failed for ${message.to}.`,
      timestamp,
      metadata: { outboundMessageId: message.id, status: message.status, error: message.error },
    });
    writeAuditEvent({
      actorEmail: actor || DEFAULT_USER,
      action: message.status === "sent" ? "outbound.sent" : "outbound.send_failed",
      targetType: "outbound_message",
      targetId: message.id,
      metadata: { to: message.to, status: message.status, error: message.error },
    });

    return { state, result: clone(message) };
  });
}

export async function recordWorkerHeartbeat(workerId: string, status: WorkerHeartbeat["status"] = "online", currentJobId?: string, metadata: Record<string, unknown> = {}) {
  return updateState((state) => {
    if (!workerId?.trim()) throw new Error("workerId is required");
    const timestamp = now();
    const existing = state.workerHeartbeats.find((item) => item.workerId === workerId);
    if (existing) {
      existing.status = status;
      existing.lastSeenAt = timestamp;
      existing.currentJobId = currentJobId;
      existing.metadata = metadata;
      return { state, result: clone(existing) };
    }
    const heartbeat: WorkerHeartbeat = {
      id: id("wrk"),
      workerId,
      status,
      lastSeenAt: timestamp,
      currentJobId,
      metadata,
    };
    state.workerHeartbeats.unshift(heartbeat);
    return { state, result: clone(heartbeat) };
  });
}

export async function createLead(input: LeadInput) {
  return updateState(async (state) => {
    if (!input.companyName?.trim()) {
      throw new Error("companyName is required");
    }

    const lead = createLeadRecord(input);
    state.leads.unshift(lead);
    const timestamp = now();
    const existingAccount = state.crmAccounts.find((account) => account.leadId === lead.id || account.name.toLowerCase() === lead.companyName.toLowerCase());
    const crmAccount = existingAccount || {
      id: id("crm-acct"),
      leadId: lead.id,
      name: lead.companyName,
      status: "prospect" as const,
      owner: DEFAULT_USER,
      notes: lead.notes,
      tags: [lead.source, lead.serviceInterest].filter(Boolean),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    if (!existingAccount) state.crmAccounts.unshift(crmAccount);
    const crmContact = lead.contactName || lead.contactEmail
      ? {
          id: id("crm-contact"),
          accountId: crmAccount.id,
          leadId: lead.id,
          name: lead.contactName || lead.contactEmail || "Lead contact",
          email: lead.contactEmail,
          status: "new" as const,
          createdAt: timestamp,
          updatedAt: timestamp,
        }
      : null;
    if (crmContact && !state.crmContacts.some((contact) => contact.email && crmContact.email && contact.email.toLowerCase() === crmContact.email.toLowerCase())) {
      state.crmContacts.unshift(crmContact);
    }
    const crmDeal: CrmDeal = {
      id: id("crm-deal"),
      accountId: crmAccount.id,
      contactId: crmContact?.id,
      leadId: lead.id,
      name: `${lead.companyName} opportunity`,
      stage: "new",
      value: 0,
      currency: "USD",
      probability: 10,
      owner: DEFAULT_USER,
      notes: lead.notes,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    state.crmDeals.unshift(crmDeal);
    appendCrmActivity(state, {
      accountId: crmAccount.id,
      contactId: crmContact?.id,
      dealId: crmDeal.id,
      leadId: lead.id,
      type: "status_change",
      title: "Lead captured in CRM",
      body: lead.notes,
      metadata: { source: lead.source, serviceInterest: lead.serviceInterest },
    });
    state.logs.unshift({
      id: id("log"),
      runId: lead.id,
      agentName: "Webhook Gateway",
      level: "info",
      message: `Lead received for ${lead.companyName}.`,
      timestamp,
      metadata: { source: lead.source, contactEmail: lead.contactEmail },
    });
    writeAuditEvent({
      actorEmail: DEFAULT_USER,
      action: "lead.created",
      targetType: "lead",
      targetId: lead.id,
      metadata: { companyName: lead.companyName, source: lead.source, autoStartWorkflow: input.autoStartWorkflow !== false },
    });
    writeAuditEvent({
      actorEmail: DEFAULT_USER,
      action: "crm.lead.synced",
      targetType: "crm_account",
      targetId: crmAccount.id,
      metadata: { leadId: lead.id, contactId: crmContact?.id, dealId: crmDeal.id },
    });

    const notifications: NotificationEvent[] = [
      {
        title: "Lead received",
        body: `Lead received for ${lead.companyName}.`,
        leadId: lead.id,
        channel: ["telegram", "discord", "slack"],
      },
    ];

    if (input.autoStartWorkflow !== false) {
      const artifacts = await createWorkflowRunArtifacts(state, lead, "lead-intake");
      lead.status = "contacted";
      lead.updatedAt = now();
      state.runs.unshift(artifacts.run);
      state.tasks.unshift(...artifacts.tasks);
      state.approvals.unshift(artifacts.approval);
      state.deliverables.unshift(artifacts.deliverable);
      state.logs.unshift(...artifacts.logs);
      state.handoffs.unshift(artifacts.handoff);
      notifications.push(
        {
          title: "Workflow started",
          body: `Lead intake started for ${lead.companyName}.`,
          runId: artifacts.run.id,
          leadId: lead.id,
        },
        {
          title: "Approval requested",
          body: `${artifacts.approval.title} is waiting on human review.`,
          runId: artifacts.run.id,
          approvalId: artifacts.approval.id,
        },
      );
      writeAuditEvent({
        actorEmail: DEFAULT_USER,
        action: "workflow.started",
        targetType: "run",
        targetId: artifacts.run.id,
        metadata: { leadId: lead.id, workflowId: artifacts.run.workflowId },
      });
    }

    const run = state.runs.find((item) => item.leadId === lead.id) ?? null;
    return { state, result: { lead: clone(lead), run: run ? clone(run) : null }, notifications };
  });
}

export async function createRun(input: WorkflowRunInput) {
  return updateState(async (state) => {
    const workflow = workflowById(input.workflowId);
    const lead = input.leadId ? state.leads.find((item) => item.id === input.leadId) : undefined;
    if (!lead) {
      throw new Error("leadId is required to create a workflow run");
    }
    const artifacts = await createWorkflowRunArtifacts(state, lead, input.workflowId);
    if (input.title) artifacts.run.name = input.title;
    if (input.notes) artifacts.run.summary = input.notes;
    state.runs.unshift(artifacts.run);
    state.tasks.unshift(...artifacts.tasks);
    state.approvals.unshift(artifacts.approval);
    state.deliverables.unshift(artifacts.deliverable);
    state.logs.unshift(...artifacts.logs);
    state.handoffs.unshift(artifacts.handoff);
    lead.status = "contacted";
    lead.updatedAt = now();
    const notifications: NotificationEvent[] = [];
    state.logs.unshift({
      id: id("log"),
      runId: artifacts.run.id,
      workflowId: artifacts.run.workflowId,
      agentName: "Supervisor Claw",
      level: "info",
      message: `Workflow ${workflow.name} started for ${lead.companyName}.`,
      timestamp: now(),
    });
    notifications.push(
      {
        title: "Workflow started",
        body: `Workflow ${workflow.name} started for ${lead.companyName}.`,
        runId: artifacts.run.id,
        leadId: lead.id,
      },
      {
        title: "Approval requested",
        body: `${artifacts.approval.title} is waiting on human review.`,
        runId: artifacts.run.id,
        approvalId: artifacts.approval.id,
      },
    );
    writeAuditEvent({
      actorEmail: DEFAULT_USER,
      action: "workflow.started",
      targetType: "run",
      targetId: artifacts.run.id,
      metadata: { leadId: lead.id, workflowId: artifacts.run.workflowId },
    });
    return { state, result: { lead: clone(lead), run: clone(artifacts.run) }, notifications };
  });
}

export async function respondToApproval(approvalId: string, input: ApprovalDecisionInput) {
  return updateState(async (state) => {
    const approval = state.approvals.find((item) => item.id === approvalId);
    if (!approval) throw new Error("Approval not found");
    if (approval.status !== "pending") throw new Error("Approval already resolved");
    const timestamp = now();
    approval.status = input.decision;
    approval.resolvedAt = timestamp;
    approval.resolvedBy = input.reviewedBy?.trim() || DEFAULT_USER;

    const outboundMessage = state.outboundMessages.find((item) => item.approvalId === approval.id);
    if (outboundMessage) {
      outboundMessage.status = input.decision === "approved" ? "approved" : "rejected";
      outboundMessage.updatedAt = timestamp;
      outboundMessage.approvedAt = input.decision === "approved" ? timestamp : outboundMessage.approvedAt;
      state.logs.unshift({
        id: id("log"),
        runId: outboundMessage.id,
        agentName: approval.resolvedBy || DEFAULT_USER,
        level: input.decision === "approved" ? "info" : "warn",
        message: `Outbound email ${input.decision} by ${approval.resolvedBy || DEFAULT_USER}.`,
        timestamp,
        metadata: { outboundMessageId: outboundMessage.id, approvalId: approval.id, to: outboundMessage.to },
      });
      writeAuditEvent({
        actorEmail: approval.resolvedBy || DEFAULT_USER,
        action: `approval.${input.decision}`,
        targetType: "approval",
        targetId: approval.id,
        metadata: { outboundMessageId: outboundMessage.id, title: approval.title },
      });
      writeAuditEvent({
        actorEmail: approval.resolvedBy || DEFAULT_USER,
        action: `outbound.${input.decision}`,
        targetType: "outbound_message",
        targetId: outboundMessage.id,
        metadata: { approvalId: approval.id, to: outboundMessage.to },
      });
      return {
        state,
        result: true,
        notifications: [{
          title: input.decision === "approved" ? "Outbound approved" : "Outbound rejected",
          body: `Email to ${outboundMessage.to} was ${input.decision}.`,
          approvalId: approval.id,
          leadId: outboundMessage.leadId,
        }],
      };
    }

    if (!state.runs.some((run) => run.id === approval.runId)) throw new Error("Run not found");
    const notifications = await finalizeWorkflowRun(state, approval, input.decision, approval.resolvedBy || DEFAULT_USER);
    writeAuditEvent({
      actorEmail: approval.resolvedBy || DEFAULT_USER,
      action: `approval.${input.decision}`,
      targetType: "approval",
      targetId: approval.id,
      metadata: { runId: approval.runId, title: approval.title },
    });
    notifications.push({
      title: input.decision === "approved" ? "Approval granted" : "Approval rejected",
      body: `${approval.title} was ${input.decision} by ${approval.resolvedBy || DEFAULT_USER}.`,
      runId: approval.runId,
      approvalId: approval.id,
    });
    return { state, result: true, notifications };
  });
}

export async function cancelRun(runId: string) {
  return updateState((state) => {
    const run = state.runs.find((item) => item.id === runId);
    if (!run) throw new Error("Run not found");
    run.status = "paused";
    run.progress = Math.min(run.progress, 100);
    run.completedAt = now();
    const pendingApprovals = state.approvals.filter((approval) => approval.runId === runId && approval.status === "pending");
    pendingApprovals.forEach((approval) => {
      approval.status = "rejected";
      approval.resolvedAt = now();
      approval.resolvedBy = DEFAULT_USER;
    });
    state.logs.unshift({
      id: id("log"),
      runId,
      agentName: "Supervisor Claw",
      level: "warn",
      message: `Run cancelled by operator.`,
      timestamp: now(),
    });
    writeAuditEvent({
      actorEmail: DEFAULT_USER,
      action: "run.cancelled",
      targetType: "run",
      targetId: runId,
      metadata: { pendingApprovalsRejected: pendingApprovals.map((approval) => approval.id) },
    });
    return {
      state,
      result: true,
      notifications: [{
        title: "Run cancelled",
        body: `Run ${run.id} was cancelled by an operator.`,
        runId,
      }],
    };
  });
}

export async function retryRun(runId: string) {
  return updateState((state) => {
    const run = state.runs.find((item) => item.id === runId);
    if (!run) throw new Error("Run not found");
    run.status = "running";
    run.progress = 20;
    run.completedAt = undefined;
    run.durationMs = undefined;
    state.logs.unshift({
      id: id("log"),
      runId,
      agentName: "Supervisor Claw",
      level: "info",
      message: `Run retried by operator.`,
      timestamp: now(),
    });
    writeAuditEvent({
      actorEmail: DEFAULT_USER,
      action: "run.retried",
      targetType: "run",
      targetId: runId,
    });
    return {
      state,
      result: true,
      notifications: [{
        title: "Run retried",
        body: `Run ${run.id} was retried by an operator.`,
        runId,
      }],
    };
  });
}

export function toServiceHealthPayload(state: AppState = seedAppState()) {
  return state.serviceHealth.map((service) => ({
    name: service.name,
    status: statusToHealth(service.status),
    latencyMs: service.latencyMs,
    uptime: service.uptime,
    lastChecked: service.lastChecked,
    description: service.description,
  }));
}
