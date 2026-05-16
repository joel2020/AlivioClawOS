export type RunStatus = "running" | "completed" | "failed" | "pending" | "paused";
export type TaskStatus = "todo" | "in_progress" | "done" | "blocked" | "cancelled";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type HealthStatus = "healthy" | "degraded" | "down";
export type DeliverableStatus = "draft" | "ready" | "delivered" | "failed";
export type WorkflowId = "lead-intake" | "discovery-proposal" | "discovery-web-strategy";
export type ClientType = "recruiting" | "web_ai_services" | "internal" | "other";
export type ClientStatus = "active" | "paused" | "archived";
export type AgentDefinitionStatus = "enabled" | "disabled";
export type AgentRiskLevel = "low" | "medium" | "high";
export type AgentJobStatus = "queued" | "running" | "blocked" | "completed" | "failed";
export type AgentJobPriority = "low" | "medium" | "high" | "critical";
export type ClientMemoryKind = "note" | "fact" | "preference" | "credential_hint" | "decision";
export type ClientFileKind = "document" | "brief" | "deliverable" | "asset" | "other";
export type OutboundMessageStatus = "draft" | "pending_approval" | "approved" | "rejected" | "sent" | "send_failed";
export type CrmAccountStatus = "prospect" | "active" | "customer" | "paused" | "archived";
export type CrmContactStatus = "new" | "active" | "unresponsive" | "do_not_contact" | "archived";
export type CrmDealStage = "new" | "discovery" | "proposal" | "negotiation" | "won" | "lost";
export type CrmActivityType = "note" | "email" | "call" | "meeting" | "task" | "status_change";
export type CrmActivityStatus = "open" | "completed" | "cancelled";

export type LeadStatus = "new" | "contacted" | "qualified" | "won" | "disqualified";

export interface Agent {
  id: string;
  name: string;
  type: "orchestrator" | "worker" | "reviewer" | "planner";
  model: string;
}

export interface OperatorAgent {
  id: string;
  name: string;
  role: "supervisor" | "specialist";
  status: "online" | "busy" | "offline";
  description: string;
  modelAlias: string;
  capabilities: string[];
}

export interface Lead {
  id: string;
  companyName: string;
  source: string;
  contactName?: string;
  contactEmail?: string;
  serviceInterest: string;
  status: LeadStatus;
  createdAt?: string;
  updatedAt?: string;
  notes?: string;
}

export interface Run {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
  status: RunStatus;
  workflowId?: WorkflowId;
  leadId?: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  progress: number;
  agentCount: number;
  taskCount: number;
  completedTasks: number;
  cost?: number;
  triggeredBy: string;
  modelAlias?: string;
  model_alias?: string;
  summary?: string;
  agents: Agent[];
  tags: string[];
}

export interface Task {
  id: string;
  runId: string;
  name: string;
  description: string;
  status: TaskStatus;
  assignedAgent: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  dependsOn: string[];
  outputSummary?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: "active" | "paused" | "archived";
  runCount: number;
  lastRunAt?: string;
  createdAt: string;
  tags: string[];
}

export interface Approval {
  id: string;
  runId: string;
  runName: string;
  title: string;
  description: string;
  status: ApprovalStatus;
  workflowId?: WorkflowId;
  stepKey?: string;
  requestedAt: string;
  resolvedAt?: string;
  requestedBy: string;
  resolvedBy?: string;
  priority: "low" | "medium" | "high" | "critical";
}

export interface Deliverable {
  id: string;
  runId: string;
  runName: string;
  name: string;
  type: "file" | "report" | "code" | "data" | "summary";
  status: DeliverableStatus;
  workflowId?: WorkflowId;
  createdAt: string;
  sizeBytes?: number;
  url?: string;
  content?: string;
}

export interface LogEntry {
  id: string;
  runId: string;
  agentName: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  workflowId?: WorkflowId;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ServiceHealth {
  name: string;
  status: HealthStatus;
  latencyMs: number;
  uptime: number;
  lastChecked: string;
  description: string;
}

export interface DashboardMetrics {
  activeRuns: number;
  completedToday: number;
  failedToday: number;
  pendingApprovals: number;
  totalAgents: number;
  avgRunDurationMs: number;
  costToday: number;
  successRate: number;
}

export interface Handoff {
  id: string;
  leadId?: string;
  runId: string;
  fromWorkflowId: WorkflowId;
  toWorkflowId?: WorkflowId;
  title: string;
  status: "pending" | "completed" | "blocked";
  createdAt: string;
  completedAt?: string;
  summary: string;
}

export interface ClientAccount {
  id: string;
  organizationId: string;
  name: string;
  type: ClientType;
  status: ClientStatus;
  primaryContact?: string;
  contactEmail?: string;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ClientContext {
  id: string;
  clientId: string;
  summary: string;
  memory: Record<string, unknown>;
  updatedAt: string;
}

export interface AgentDefinition {
  id: string;
  name: string;
  kind: "sdr" | "recruiting" | "seo" | "inbox" | "delivery" | "voice" | "research" | "reviewer";
  status: AgentDefinitionStatus;
  description: string;
  allowedTools: string[];
  riskLevel: AgentRiskLevel;
  requiresApprovalFor: string[];
  createdAt: string;
}

export interface AgentJob {
  id: string;
  agentId: string;
  clientId?: string;
  runId?: string;
  title: string;
  status: AgentJobStatus;
  priority: AgentJobPriority;
  requestedBy: string;
  createdAt: string;
  updatedAt: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  lockedBy?: string;
  lockedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface ClientMemoryItem {
  id: string;
  clientId: string;
  kind: ClientMemoryKind;
  title: string;
  body: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientFileRecord {
  id: string;
  clientId: string;
  kind: ClientFileKind;
  name: string;
  url?: string;
  contentType?: string;
  sizeBytes?: number;
  notes?: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  actorId?: string;
  actorEmail?: string;
  action: string;
  targetType: string;
  targetId?: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface OutboundMessage {
  id: string;
  clientId?: string;
  leadId?: string;
  agentJobId?: string;
  approvalId?: string;
  channel: "email";
  to: string;
  subject: string;
  body: string;
  status: OutboundMessageStatus;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  sentAt?: string;
  error?: string;
  metadata: Record<string, unknown>;
}

export interface WorkerHeartbeat {
  id: string;
  workerId: string;
  status: "online" | "degraded" | "offline";
  lastSeenAt: string;
  currentJobId?: string;
  metadata: Record<string, unknown>;
}

export interface CrmAccount {
  id: string;
  clientId?: string;
  leadId?: string;
  name: string;
  website?: string;
  industry?: string;
  status: CrmAccountStatus;
  owner: string;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CrmContact {
  id: string;
  accountId?: string;
  leadId?: string;
  name: string;
  email?: string;
  phone?: string;
  title?: string;
  status: CrmContactStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrmDeal {
  id: string;
  accountId: string;
  contactId?: string;
  leadId?: string;
  name: string;
  stage: CrmDealStage;
  value: number;
  currency: string;
  probability: number;
  expectedCloseDate?: string;
  owner: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrmActivity {
  id: string;
  accountId?: string;
  contactId?: string;
  dealId?: string;
  leadId?: string;
  type: CrmActivityType;
  status: CrmActivityStatus;
  title: string;
  body?: string;
  occurredAt: string;
  dueAt?: string;
  createdBy: string;
  metadata: Record<string, unknown>;
}
