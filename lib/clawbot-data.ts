import {
  mockApprovals,
  mockDashboardMetrics,
  mockDeliverables,
  mockAgents,
  mockLeads,
  mockLogs,
  mockProjects,
  mockRuns,
  mockServiceHealth,
  mockTasks,
} from "@/lib/mock-data";
import type {
  Approval,
  DashboardMetrics,
  Deliverable,
  Lead,
  LogEntry,
  Handoff,
  Project,
  Run,
  OperatorAgent,
  ServiceHealth,
  Task,
} from "@/lib/types";
import type { AppSettings, WorkflowDefinition } from "@/lib/clawbot-service";
import { cookies } from "next/headers";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3000/api/v1";
const DEMO_MODE = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_CLAWBOT_DEMO_MODE !== "false";
const REQUEST_TIMEOUT_MS = 6000;

export type DataSource = "api" | "demo" | "empty";

export interface DashboardSnapshot {
  stats: DashboardMetrics & {
    active_runs: number;
    pending_approvals: number;
    total_leads: number;
    total_handoffs: number;
    agents_online: number;
    services: Record<string, string>;
  };
  runs: Run[];
  approvals: Approval[];
  leads: Lead[];
  source: DataSource;
}

type ListResponse<T> = T[] | { data?: T[]; items?: T[]; results?: T[] };
type RawRecord = Record<string, unknown> & {
  id?: unknown;
  agent_id?: unknown;
  run_id?: unknown;
  task_id?: unknown;
  approval_id?: unknown;
  deliverable_id?: unknown;
  project_id?: unknown;
  lead_id?: unknown;
  log_id?: unknown;
};

function buildUrl(path: string) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

function toArray<T>(payload: ListResponse<T> | null): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.results)) return payload.results;
  if (typeof payload === "object" && Array.isArray((payload as Record<string, unknown> & { services?: T[] }).services)) {
    return (payload as Record<string, unknown> & { services?: T[] }).services ?? [];
  }
  return [];
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeAgent(raw: RawRecord) {
  return {
    id: asString(raw?.id ?? raw?.agent_id, "agent"),
    name: asString(raw?.name ?? raw?.agent_name, "Agent"),
    type: ((raw?.type ?? raw?.role ?? "worker") as Run["agents"][number]["type"]),
    model: asString(raw?.model ?? raw?.model_alias, "unknown"),
  };
}

function normalizeRun(raw: RawRecord): Run {
  return {
    id: asString(raw?.id ?? raw?.run_id, "run"),
    name: asString(raw?.name ?? raw?.run_name, "Untitled Run"),
    projectId: asString(raw?.projectId ?? raw?.project_id, ""),
    projectName: asString(raw?.projectName ?? raw?.project_name, ""),
    status: (raw?.status ?? raw?.result_status ?? "pending") as Run["status"],
    startedAt: asString(raw?.startedAt ?? raw?.started_at, new Date().toISOString()),
    completedAt: asOptionalString(raw?.completedAt ?? raw?.completed_at),
    durationMs: asOptionalNumber(raw?.durationMs ?? raw?.duration_ms),
    progress: asNumber(raw?.progress, 0),
    agentCount: asNumber(raw?.agentCount ?? raw?.agent_count, 0),
    taskCount: asNumber(raw?.taskCount ?? raw?.task_count, 0),
    completedTasks: asNumber(raw?.completedTasks ?? raw?.completed_tasks, 0),
    cost: typeof raw?.cost === "number" ? raw.cost : undefined,
    triggeredBy: asString(raw?.triggeredBy ?? raw?.triggered_by, "manual"),
    modelAlias: asOptionalString(raw?.modelAlias ?? raw?.model_alias),
    model_alias: asOptionalString(raw?.model_alias ?? raw?.modelAlias),
    agents: Array.isArray(raw?.agents) ? raw.agents.map(normalizeAgent) : [],
    tags: asStringArray(raw?.tags),
  };
}

function normalizeTask(raw: RawRecord): Task {
  return {
    id: asString(raw?.id ?? raw?.task_id, "task"),
    runId: asString(raw?.runId ?? raw?.run_id, ""),
    name: asString(raw?.name, "Untitled Task"),
    description: asString(raw?.description, ""),
    status: (raw?.status ?? "todo") as Task["status"],
    assignedAgent: asString(raw?.assignedAgent ?? raw?.assigned_agent, "Agent"),
    startedAt: asOptionalString(raw?.startedAt ?? raw?.started_at),
    completedAt: asOptionalString(raw?.completedAt ?? raw?.completed_at),
    durationMs: asOptionalNumber(raw?.durationMs ?? raw?.duration_ms),
    dependsOn: asStringArray(raw?.dependsOn ?? raw?.depends_on),
    outputSummary: asOptionalString(raw?.outputSummary ?? raw?.output_summary),
  };
}

function normalizeApproval(raw: RawRecord): Approval {
  return {
    id: asString(raw?.id ?? raw?.approval_id, "approval"),
    runId: asString(raw?.runId ?? raw?.run_id, ""),
    runName: asString(raw?.runName ?? raw?.run_name, ""),
    title: asString(raw?.title, "Approval Request"),
    description: asString(raw?.description, ""),
    status: (raw?.status ?? "pending") as Approval["status"],
    requestedAt: asString(raw?.requestedAt ?? raw?.requested_at, new Date().toISOString()),
    resolvedAt: asOptionalString(raw?.resolvedAt ?? raw?.resolved_at),
    requestedBy: asString(raw?.requestedBy ?? raw?.requested_by, "Unknown"),
    resolvedBy: asOptionalString(raw?.resolvedBy ?? raw?.resolved_by),
    priority: (raw?.priority ?? "medium") as Approval["priority"],
  };
}

function normalizeDeliverable(raw: RawRecord): Deliverable {
  return {
    id: asString(raw?.id ?? raw?.deliverable_id, "deliverable"),
    runId: asString(raw?.runId ?? raw?.run_id, ""),
    runName: asString(raw?.runName ?? raw?.run_name, ""),
    name: asString(raw?.name, "artifact"),
    type: ((raw?.type ?? "file") as Deliverable["type"]),
    status: (raw?.status ?? "draft") as Deliverable["status"],
    createdAt: asString(raw?.createdAt ?? raw?.created_at, new Date().toISOString()),
    sizeBytes: asOptionalNumber(raw?.sizeBytes),
    url: asOptionalString(raw?.url),
  };
}

function normalizeLog(raw: RawRecord): LogEntry {
  return {
    id: asString(raw?.id ?? raw?.log_id, "log"),
    runId: asString(raw?.runId ?? raw?.run_id, ""),
    agentName: asString(raw?.agentName ?? raw?.agent_name, "Agent"),
    level: (raw?.level ?? "info") as LogEntry["level"],
    message: asString(raw?.message, ""),
    timestamp: asString(raw?.timestamp ?? raw?.created_at, new Date().toISOString()),
    metadata: raw?.metadata as LogEntry["metadata"],
  };
}

function normalizeProject(raw: RawRecord): Project {
  return {
    id: asString(raw?.id ?? raw?.project_id, "project"),
    name: asString(raw?.name, "Project"),
    description: asString(raw?.description, ""),
    status: (raw?.status ?? "active") as Project["status"],
    runCount: asNumber(raw?.runCount ?? raw?.run_count, 0),
    lastRunAt: asOptionalString(raw?.lastRunAt ?? raw?.last_run_at),
    createdAt: asString(raw?.createdAt ?? raw?.created_at, new Date().toISOString()),
    tags: asStringArray(raw?.tags),
  };
}

function normalizeLead(raw: RawRecord): Lead {
  return {
    id: asString(raw?.id ?? raw?.lead_id, "lead"),
    companyName: asString(raw?.companyName ?? raw?.company_name, "Unknown Company"),
    source: asString(raw?.source, "manual"),
    contactName: asOptionalString(raw?.contactName ?? raw?.contact_name),
    contactEmail: asOptionalString(raw?.contactEmail ?? raw?.contact_email),
    serviceInterest: asString(raw?.serviceInterest ?? raw?.service_interest, ""),
    status: (raw?.status ?? "new") as Lead["status"],
    createdAt: asOptionalString(raw?.createdAt ?? raw?.created_at),
    updatedAt: asOptionalString(raw?.updatedAt ?? raw?.updated_at),
    notes: asOptionalString(raw?.notes),
  };
}

function normalizeHandoff(raw: RawRecord): Handoff {
  return {
    id: asString(raw?.id, "handoff"),
    leadId: asOptionalString(raw?.leadId ?? raw?.lead_id),
    runId: asString(raw?.runId ?? raw?.run_id, ""),
    fromWorkflowId: asString(raw?.fromWorkflowId ?? raw?.from_workflow_id, "lead-intake") as Handoff["fromWorkflowId"],
    toWorkflowId: asOptionalString(raw?.toWorkflowId ?? raw?.to_workflow_id) as Handoff["toWorkflowId"],
    title: asString(raw?.title, "Handoff"),
    status: (raw?.status ?? "pending") as Handoff["status"],
    createdAt: asString(raw?.createdAt ?? raw?.created_at, new Date().toISOString()),
    completedAt: asOptionalString(raw?.completedAt ?? raw?.completed_at),
    summary: asString(raw?.summary, ""),
  };
}

function normalizeWorkflow(raw: RawRecord): WorkflowDefinition {
  return {
    id: asString(raw?.id, "lead-intake") as WorkflowDefinition["id"],
    name: asString(raw?.name, "Workflow"),
    description: asString(raw?.description, ""),
    output: asString(raw?.output, ""),
  };
}

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const cookieHeader = cookies().toString();
    const response = await fetch(buildUrl(path), {
      cache: "no-store",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function resolveFallback<T>(apiValue: T[] | null | undefined, demoValue: T[], emptyValue: T[] = []) {
  if (apiValue && apiValue.length > 0) return { value: apiValue, source: "api" as const };
  if (DEMO_MODE) return { value: demoValue, source: "demo" as const };
  return { value: emptyValue, source: "empty" as const };
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const [statsRaw, runsRaw, approvalsRaw, leadsRaw] = await Promise.all([
    fetchJson<DashboardMetrics & Record<string, unknown>>("/stats"),
    fetchJson<ListResponse<RawRecord>>("/runs"),
    fetchJson<ListResponse<RawRecord>>("/approvals"),
    fetchJson<ListResponse<RawRecord>>("/leads"),
  ]);

  const runsFallback = mockRuns;
  const approvalsFallback = mockApprovals;
  const leadsFallback = mockLeads;

  const runs = resolveFallback(toArray(runsRaw).map(normalizeRun), runsFallback).value;
  const approvals = resolveFallback(toArray(approvalsRaw).map(normalizeApproval), approvalsFallback).value;
  const leads = resolveFallback(toArray(leadsRaw).map(normalizeLead), leadsFallback).value;
  const source = [runsRaw, approvalsRaw, leadsRaw, statsRaw].every(Boolean) ? "api" : DEMO_MODE ? "demo" : "empty";

  return {
    source,
    stats: {
      ...mockDashboardMetrics,
      active_runs: asNumber(statsRaw?.active_runs ?? statsRaw?.activeRuns, mockDashboardMetrics.activeRuns),
      pending_approvals: asNumber(statsRaw?.pending_approvals ?? statsRaw?.pendingApprovals, mockDashboardMetrics.pendingApprovals),
      total_leads: asNumber(statsRaw?.total_leads ?? statsRaw?.totalLeads, leads.length),
      total_handoffs: asNumber(statsRaw?.total_handoffs ?? statsRaw?.totalHandoffs, 0),
      agents_online: asNumber(statsRaw?.agents_online ?? statsRaw?.agentsOnline, mockDashboardMetrics.totalAgents),
      services: (statsRaw?.services as Record<string, string> | undefined) ?? (DEMO_MODE ? Object.fromEntries(mockServiceHealth.map((svc) => [svc.name.toLowerCase().replace(/\s+/g, "_"), svc.status === "healthy" ? "ok" : svc.status])) : {}),
      completedToday: asNumber(statsRaw?.completedToday ?? statsRaw?.completed_today, mockDashboardMetrics.completedToday),
      failedToday: asNumber(statsRaw?.failedToday ?? statsRaw?.failed_today, mockDashboardMetrics.failedToday),
      successRate: asNumber(statsRaw?.successRate ?? statsRaw?.success_rate, mockDashboardMetrics.successRate),
      avgRunDurationMs: asNumber(statsRaw?.avgRunDurationMs ?? statsRaw?.avg_run_duration_ms, mockDashboardMetrics.avgRunDurationMs),
      costToday: asNumber(statsRaw?.costToday ?? statsRaw?.cost_today, mockDashboardMetrics.costToday),
    },
    runs,
    approvals,
    leads,
  };
}

export async function getRuns() {
  const apiRuns = toArray(await fetchJson<ListResponse<RawRecord>>("/runs"));
  const runs = apiRuns.length > 0 ? apiRuns.map(normalizeRun) : DEMO_MODE ? mockRuns : [];
  return { runs, source: apiRuns.length > 0 ? ("api" as const) : DEMO_MODE ? ("demo" as const) : ("empty" as const) };
}

export async function getRunById(id: string) {
  const { runs, source } = await getRuns();
  return { run: runs.find((item) => item.id === id) ?? null, source };
}

export async function getTasks(runId?: string) {
  const apiTasks = toArray(await fetchJson<ListResponse<RawRecord>>("/tasks"));
  const tasks = apiTasks.length > 0 ? apiTasks.map(normalizeTask) : DEMO_MODE ? mockTasks : [];
  return {
    tasks: runId ? tasks.filter((task) => task.runId === runId) : tasks,
    source: apiTasks.length > 0 ? ("api" as const) : DEMO_MODE ? ("demo" as const) : ("empty" as const),
  };
}

export async function getApprovals() {
  const apiApprovals = toArray(await fetchJson<ListResponse<RawRecord>>("/approvals"));
  const approvals = apiApprovals.length > 0 ? apiApprovals.map(normalizeApproval) : DEMO_MODE ? mockApprovals : [];
  return { approvals, source: apiApprovals.length > 0 ? ("api" as const) : DEMO_MODE ? ("demo" as const) : ("empty" as const) };
}

export async function getProjects() {
  const apiProjects = toArray(await fetchJson<ListResponse<RawRecord>>("/projects"));
  const projects = apiProjects.length > 0 ? apiProjects.map(normalizeProject) : DEMO_MODE ? mockProjects : [];
  return { projects, source: apiProjects.length > 0 ? ("api" as const) : DEMO_MODE ? ("demo" as const) : ("empty" as const) };
}

export async function getLogs(runId?: string) {
  const apiLogs = toArray(await fetchJson<ListResponse<RawRecord>>("/logs"));
  const logs = apiLogs.length > 0 ? apiLogs.map(normalizeLog) : DEMO_MODE ? mockLogs : [];
  return {
    logs: runId ? logs.filter((log) => log.runId === runId) : logs,
    source: apiLogs.length > 0 ? ("api" as const) : DEMO_MODE ? ("demo" as const) : ("empty" as const),
  };
}

export async function getDeliverables() {
  const apiDeliverables = toArray(await fetchJson<ListResponse<RawRecord>>("/deliverables"));
  const deliverables = apiDeliverables.length > 0 ? apiDeliverables.map(normalizeDeliverable) : DEMO_MODE ? mockDeliverables : [];
  return { deliverables, source: apiDeliverables.length > 0 ? ("api" as const) : DEMO_MODE ? ("demo" as const) : ("empty" as const) };
}

export async function getLeads() {
  const apiLeads = toArray(await fetchJson<ListResponse<RawRecord>>("/leads"));
  const leads = apiLeads.length > 0 ? apiLeads.map(normalizeLead) : DEMO_MODE ? mockLeads : [];
  return { leads, source: apiLeads.length > 0 ? ("api" as const) : DEMO_MODE ? ("demo" as const) : ("empty" as const) };
}

function normalizeOperatorAgent(raw: RawRecord): OperatorAgent {
  return {
    id: asString(raw?.id ?? raw?.agent_id, "agent"),
    name: asString(raw?.name, "Agent"),
    role: ((raw?.role as OperatorAgent["role"]) ?? "specialist") as OperatorAgent["role"],
    status: ((raw?.status as OperatorAgent["status"]) ?? "offline") as OperatorAgent["status"],
    description: asString(raw?.description, ""),
    modelAlias: asString(raw?.modelAlias ?? raw?.model_alias, "unknown"),
    capabilities: asStringArray(raw?.capabilities),
  };
}

export async function getAgents() {
  const apiAgents = toArray(await fetchJson<ListResponse<RawRecord>>("/agents"));
  const agents = apiAgents.length > 0 ? apiAgents.map(normalizeOperatorAgent) : DEMO_MODE ? mockAgents : [];
  return { agents, source: apiAgents.length > 0 ? ("api" as const) : DEMO_MODE ? ("demo" as const) : ("empty" as const) };
}

export async function getHandoffs() {
  const apiHandoffs = toArray(await fetchJson<ListResponse<RawRecord>>("/handoffs"));
  const handoffs = apiHandoffs.length > 0 ? apiHandoffs.map(normalizeHandoff) : [];
  return { handoffs, source: apiHandoffs.length > 0 ? ("api" as const) : ("empty" as const) };
}

export async function getSettings() {
  const settings = await fetchJson<AppSettings>("/settings");
  return { settings, source: settings ? ("api" as const) : ("empty" as const) };
}

export async function getWorkflows() {
  const workflows = toArray(await fetchJson<ListResponse<RawRecord>>("/workflows")).map(normalizeWorkflow);
  return { workflows, source: workflows.length > 0 ? ("api" as const) : ("empty" as const) };
}

export async function getServiceHealth() {
  const snapshot = await fetchJson<ListResponse<RawRecord>>("/health/services");
  const services = toArray(snapshot);
  return {
    services: services.length > 0 ? services.map((service: RawRecord) => ({
      name: asString(service?.name, "Service"),
      status: (service?.status ?? "degraded") as ServiceHealth["status"],
      latencyMs: asNumber(service?.latencyMs ?? service?.latency_ms, 0),
      uptime: asNumber(service?.uptime, 0),
      lastChecked: asString(service?.lastChecked ?? service?.last_checked, new Date().toISOString()),
      description: asString(service?.description, ""),
    })) : DEMO_MODE ? mockServiceHealth : [],
  };
}

export function getDataSourceLabel(source: DataSource) {
  if (source === "api") return "Live API";
  if (source === "demo") return "Demo mode";
  return "No data";
}
