import type {
  Run, Task, Project, Approval, Deliverable, Lead, OperatorAgent,
  LogEntry, ServiceHealth, DashboardMetrics,
} from "./types";

export const mockProjects: Project[] = [
  { id: "proj-001", name: "Contract Review Pipeline", description: "Multi-agent system for reviewing and summarizing legal contracts.", status: "active", runCount: 42, lastRunAt: "2026-04-22T20:15:00Z", createdAt: "2026-01-10T09:00:00Z", tags: ["legal","nlp","production"] },
  { id: "proj-002", name: "Market Intelligence", description: "Automated competitive analysis and market signal aggregation.", status: "active", runCount: 18, lastRunAt: "2026-04-22T18:45:00Z", createdAt: "2026-02-05T11:00:00Z", tags: ["research","web","production"] },
  { id: "proj-003", name: "Code Review Bot", description: "Automated PR review and quality scoring for engineering teams.", status: "active", runCount: 87, lastRunAt: "2026-04-22T21:30:00Z", createdAt: "2026-01-20T08:00:00Z", tags: ["engineering","github","production"] },
  { id: "proj-004", name: "Customer Support Triage", description: "Classifies and routes incoming support tickets to the right team.", status: "paused", runCount: 12, lastRunAt: "2026-04-18T14:00:00Z", createdAt: "2026-03-01T10:00:00Z", tags: ["support","classification"] },
  { id: "proj-005", name: "Financial Report Generator", description: "Generates structured financial summaries from raw data exports.", status: "archived", runCount: 5, lastRunAt: "2026-03-30T09:00:00Z", createdAt: "2026-02-15T12:00:00Z", tags: ["finance","reporting"] },
];

export const mockAgents: OperatorAgent[] = [
  {
    id: "agent-supervisor",
    name: "Supervisor Claw",
    role: "supervisor",
    status: "online",
    description: "Routes leads, gates approvals, and maintains execution quality.",
    modelAlias: "claude-opus-4-6",
    capabilities: ["orchestration", "approval_gates"],
  },
  {
    id: "agent-intake",
    name: "Intake Discovery Claw",
    role: "specialist",
    status: "online",
    description: "Transforms inbound leads into structured discovery packets.",
    modelAlias: "claude-sonnet-4-6",
    capabilities: ["lead_intake"],
  },
  {
    id: "agent-proposal",
    name: "Sales Proposal Claw",
    role: "specialist",
    status: "busy",
    description: "Drafts proposals, pricing summaries, and scope recommendations.",
    modelAlias: "claude-sonnet-4-6",
    capabilities: ["proposal_generation"],
  },
  {
    id: "agent-strategy",
    name: "Web Design Strategy Claw",
    role: "specialist",
    status: "online",
    description: "Creates website strategy briefs, sitemap outlines, and UX direction.",
    modelAlias: "claude-sonnet-4-6",
    capabilities: ["strategy_brief"],
  },
];

export const mockRuns: Run[] = [
  { id: "run-8821", name: "Contract Review #88", projectId: "proj-001", projectName: "Contract Review Pipeline", status: "running", startedAt: "2026-04-22T21:45:00Z", progress: 63, agentCount: 4, taskCount: 12, completedTasks: 7, cost: 0.42, triggeredBy: "webhook", tags: ["urgent"], agents: [{ id: "a1", name: "Planner", type: "planner", model: "claude-opus-4-6" },{ id: "a2", name: "Reader", type: "worker", model: "claude-sonnet-4-6" },{ id: "a3", name: "Summarizer", type: "worker", model: "claude-sonnet-4-6" },{ id: "a4", name: "Reviewer", type: "reviewer", model: "claude-opus-4-6" }] },
  { id: "run-8820", name: "Market Scan  April W3", projectId: "proj-002", projectName: "Market Intelligence", status: "completed", startedAt: "2026-04-22T18:00:00Z", completedAt: "2026-04-22T18:47:00Z", durationMs: 2820000, progress: 100, agentCount: 6, taskCount: 24, completedTasks: 24, cost: 1.87, triggeredBy: "schedule", tags: ["weekly"], agents: [{ id: "a5", name: "Orchestrator", type: "orchestrator", model: "claude-opus-4-6" },{ id: "a6", name: "Scraper-1", type: "worker", model: "claude-haiku-4-5-20251001" },{ id: "a7", name: "Scraper-2", type: "worker", model: "claude-haiku-4-5-20251001" },{ id: "a8", name: "Analyst", type: "worker", model: "claude-sonnet-4-6" },{ id: "a9", name: "Fact-Checker", type: "reviewer", model: "claude-sonnet-4-6" },{ id: "a10", name: "Writer", type: "worker", model: "claude-sonnet-4-6" }] },
  { id: "run-8819", name: "PR Review  feat/auth-v2", projectId: "proj-003", projectName: "Code Review Bot", status: "completed", startedAt: "2026-04-22T21:10:00Z", completedAt: "2026-04-22T21:23:00Z", durationMs: 780000, progress: 100, agentCount: 3, taskCount: 8, completedTasks: 8, cost: 0.31, triggeredBy: "github_webhook", tags: ["pr","security"], agents: [{ id: "a11", name: "CodeReader", type: "worker", model: "claude-sonnet-4-6" },{ id: "a12", name: "SecurityAuditor", type: "reviewer", model: "claude-opus-4-6" },{ id: "a13", name: "Summarizer", type: "worker", model: "claude-haiku-4-5-20251001" }] },
  { id: "run-8818", name: "Contract Review #87", projectId: "proj-001", projectName: "Contract Review Pipeline", status: "failed", startedAt: "2026-04-22T20:00:00Z", completedAt: "2026-04-22T20:08:00Z", durationMs: 480000, progress: 33, agentCount: 4, taskCount: 12, completedTasks: 4, cost: 0.18, triggeredBy: "webhook", tags: ["urgent"], agents: [{ id: "a1", name: "Planner", type: "planner", model: "claude-opus-4-6" },{ id: "a2", name: "Reader", type: "worker", model: "claude-sonnet-4-6" }] },
  { id: "run-8817", name: "PR Review  fix/rate-limit", projectId: "proj-003", projectName: "Code Review Bot", status: "completed", startedAt: "2026-04-22T19:55:00Z", completedAt: "2026-04-22T20:04:00Z", durationMs: 540000, progress: 100, agentCount: 3, taskCount: 6, completedTasks: 6, cost: 0.22, triggeredBy: "github_webhook", tags: ["pr"], agents: [] },
  { id: "run-8816", name: "Market Scan  April W2", projectId: "proj-002", projectName: "Market Intelligence", status: "completed", startedAt: "2026-04-15T18:00:00Z", completedAt: "2026-04-15T18:52:00Z", durationMs: 3120000, progress: 100, agentCount: 6, taskCount: 24, completedTasks: 24, cost: 1.94, triggeredBy: "schedule", tags: ["weekly"], agents: [] },
  { id: "run-8815", name: "Support Triage  Batch 14", projectId: "proj-004", projectName: "Customer Support Triage", status: "pending", startedAt: "2026-04-22T22:00:00Z", progress: 0, agentCount: 2, taskCount: 50, completedTasks: 0, triggeredBy: "manual", tags: [], agents: [] },
];

export const mockTasks: Task[] = [
  { id: "task-001", runId: "run-8821", name: "Parse contract PDF", description: "Extract raw text and structure from uploaded PDF document.", status: "done", assignedAgent: "Reader", startedAt: "2026-04-22T21:45:10Z", completedAt: "2026-04-22T21:46:30Z", durationMs: 80000, dependsOn: [], outputSummary: "Extracted 42 pages, 18,432 tokens." },
  { id: "task-002", runId: "run-8821", name: "Identify parties and dates", description: "Extract key parties, effective dates, and jurisdiction.", status: "done", assignedAgent: "Reader", startedAt: "2026-04-22T21:46:35Z", completedAt: "2026-04-22T21:47:15Z", durationMs: 40000, dependsOn: ["task-001"], outputSummary: "2 parties, effective 2026-05-01, jurisdiction: Delaware." },
  { id: "task-003", runId: "run-8821", name: "Extract liability clauses", description: "Identify and summarize all limitation-of-liability sections.", status: "done", assignedAgent: "Summarizer", startedAt: "2026-04-22T21:47:20Z", completedAt: "2026-04-22T21:48:45Z", durationMs: 85000, dependsOn: ["task-001"], outputSummary: "Found 3 liability clauses, cap at $500K." },
  { id: "task-004", runId: "run-8821", name: "Flag non-standard terms", description: "Compare against standard template, flag deviations.", status: "in_progress", assignedAgent: "Reviewer", startedAt: "2026-04-22T21:48:50Z", dependsOn: ["task-002","task-003"] },
  { id: "task-005", runId: "run-8821", name: "Generate executive summary", description: "Write a 1-page summary for legal team review.", status: "todo", assignedAgent: "Summarizer", dependsOn: ["task-004"] },
  { id: "task-006", runId: "run-8821", name: "Risk scoring", description: "Score contract risk on 1-10 scale with justification.", status: "todo", assignedAgent: "Reviewer", dependsOn: ["task-004"] },
  { id: "task-007", runId: "run-8821", name: "Approval request  non-standard indemnity", description: "Request human approval for unusual indemnification clause.", status: "blocked", assignedAgent: "Planner", dependsOn: ["task-004"] },
];

export const mockApprovals: Approval[] = [
  { id: "appr-001", runId: "run-8821", runName: "Contract Review #88", title: "Non-standard indemnification clause", description: "Section 12.3 contains an unusually broad indemnification clause that exceeds standard scope. Requesting legal sign-off before proceeding.", status: "pending", requestedAt: "2026-04-22T21:52:00Z", requestedBy: "Reviewer Agent", priority: "high" },
  { id: "appr-002", runId: "run-8820", runName: "Market Scan  April W3", title: "Publish report to Confluence", description: "Market intelligence report ready for publication. Requires approval before sharing with stakeholders.", status: "pending", requestedAt: "2026-04-22T18:48:00Z", requestedBy: "Writer Agent", priority: "medium" },
  { id: "appr-003", runId: "run-8819", runName: "PR Review  feat/auth-v2", title: "Security issue: JWT secret in config", description: "Found a hardcoded JWT secret in config/auth.ts. This must be addressed before the PR is approved.", status: "approved", requestedAt: "2026-04-22T21:15:00Z", resolvedAt: "2026-04-22T21:20:00Z", requestedBy: "SecurityAuditor Agent", resolvedBy: "joel@clawbot.ai", priority: "critical" },
  { id: "appr-004", runId: "run-8817", runName: "PR Review  fix/rate-limit", title: "Approve auto-merge for rate limit fix", description: "Minor fix with no breaking changes. Safe to auto-merge.", status: "approved", requestedAt: "2026-04-22T20:01:00Z", resolvedAt: "2026-04-22T20:03:00Z", requestedBy: "CodeReader Agent", resolvedBy: "joel@clawbot.ai", priority: "low" },
  { id: "appr-005", runId: "run-8818", runName: "Contract Review #87", title: "Unreadable PDF  abort run?", description: "The uploaded PDF appears to be scanned without OCR. Unable to extract text. Should the run be retried with OCR preprocessing?", status: "rejected", requestedAt: "2026-04-22T20:05:00Z", resolvedAt: "2026-04-22T20:07:00Z", requestedBy: "Reader Agent", resolvedBy: "system", priority: "high" },
];

export const mockDeliverables: Deliverable[] = [
  { id: "del-001", runId: "run-8820", runName: "Market Scan  April W3", name: "market-intelligence-apr-w3.pdf", type: "report", status: "ready", createdAt: "2026-04-22T18:47:00Z", sizeBytes: 1248000, url: "/deliverables/del-001" },
  { id: "del-002", runId: "run-8820", runName: "Market Scan  April W3", name: "competitor-signals.json", type: "data", status: "delivered", createdAt: "2026-04-22T18:47:30Z", sizeBytes: 84200, url: "/deliverables/del-002" },
  { id: "del-003", runId: "run-8819", runName: "PR Review  feat/auth-v2", name: "code-review-report.md", type: "report", status: "delivered", createdAt: "2026-04-22T21:23:00Z", sizeBytes: 12400, url: "/deliverables/del-003" },
  { id: "del-004", runId: "run-8821", runName: "Contract Review #88", name: "contract-summary.md", type: "summary", status: "draft", createdAt: "2026-04-22T21:51:00Z", sizeBytes: 4200 },
  { id: "del-005", runId: "run-8817", runName: "PR Review  fix/rate-limit", name: "review-fix-rate-limit.md", type: "report", status: "delivered", createdAt: "2026-04-22T20:04:00Z", sizeBytes: 6800, url: "/deliverables/del-005" },
];

export const mockLeads: Lead[] = [
  {
    id: "lead-001",
    companyName: "Hudson Valley Mechanical",
    source: "webhook",
    contactName: "Avery Chen",
    contactEmail: "avery@hudsonvalleymech.com",
    serviceInterest: "lead_intake",
    status: "qualified",
    createdAt: "2026-04-22T17:20:00Z",
    updatedAt: "2026-04-22T18:05:00Z",
    notes: "Asked for a discovery packet and proposal timeline.",
  },
  {
    id: "lead-002",
    companyName: "North Ridge Properties",
    source: "manual",
    contactName: "Sam Patel",
    contactEmail: "sam@nrp.example",
    serviceInterest: "proposal_generation",
    status: "contacted",
    createdAt: "2026-04-21T13:10:00Z",
    updatedAt: "2026-04-22T09:15:00Z",
    notes: "Waiting on budget confirmation.",
  },
  {
    id: "lead-003",
    companyName: "Summit HVAC Group",
    source: "n8n",
    contactName: "Jordan Miles",
    contactEmail: "jordan@summithvacgroup.com",
    serviceInterest: "strategy_brief",
    status: "new",
    createdAt: "2026-04-22T20:45:00Z",
    updatedAt: "2026-04-22T20:45:00Z",
    notes: "Inbound from website form.",
  },
];

export const mockLogs: LogEntry[] = [
  { id: "log-001", runId: "run-8821", agentName: "Planner", level: "info", message: "Run started. Decomposing into 12 subtasks.", timestamp: "2026-04-22T21:45:00Z" },
  { id: "log-002", runId: "run-8821", agentName: "Reader", level: "info", message: "PDF parsing started. File size: 2.1MB.", timestamp: "2026-04-22T21:45:10Z" },
  { id: "log-003", runId: "run-8821", agentName: "Reader", level: "info", message: "Extracted 42 pages, 18,432 tokens.", timestamp: "2026-04-22T21:46:30Z" },
  { id: "log-004", runId: "run-8821", agentName: "Summarizer", level: "info", message: "Liability clause extraction complete. Found 3 clauses.", timestamp: "2026-04-22T21:48:45Z" },
  { id: "log-005", runId: "run-8821", agentName: "Reviewer", level: "warn", message: "Non-standard indemnification clause detected in section 12.3. Flagging for approval.", timestamp: "2026-04-22T21:51:55Z" },
  { id: "log-006", runId: "run-8821", agentName: "Planner", level: "info", message: "Approval request created: appr-001.", timestamp: "2026-04-22T21:52:00Z" },
  { id: "log-007", runId: "run-8818", agentName: "Reader", level: "error", message: "Failed to extract text from PDF. Document may be a scanned image without OCR.", timestamp: "2026-04-22T20:05:00Z" },
  { id: "log-008", runId: "run-8818", agentName: "Planner", level: "error", message: "Run aborted after unrecoverable PDF parse failure.", timestamp: "2026-04-22T20:08:00Z" },
];

export const mockServiceHealth: ServiceHealth[] = [
  { name: "Orchestration Engine", status: "healthy", latencyMs: 42, uptime: 99.97, lastChecked: "2026-04-22T22:00:00Z", description: "Core multi-agent coordination layer" },
  { name: "Claude API", status: "healthy", latencyMs: 310, uptime: 99.91, lastChecked: "2026-04-22T22:00:00Z", description: "Anthropic model inference endpoint" },
  { name: "Task Queue", status: "healthy", latencyMs: 8, uptime: 100, lastChecked: "2026-04-22T22:00:00Z", description: "Redis-backed async task broker" },
  { name: "File Storage", status: "degraded", latencyMs: 1840, uptime: 98.4, lastChecked: "2026-04-22T22:00:00Z", description: "S3-compatible object store for deliverables" },
  { name: "Webhook Gateway", status: "healthy", latencyMs: 55, uptime: 99.88, lastChecked: "2026-04-22T22:00:00Z", description: "Inbound trigger and event routing" },
  { name: "Approval Service", status: "healthy", latencyMs: 28, uptime: 99.95, lastChecked: "2026-04-22T22:00:00Z", description: "Human-in-the-loop approval workflows" },
];

export const mockDashboardMetrics: DashboardMetrics = {
  activeRuns: 1, completedToday: 4, failedToday: 1, pendingApprovals: 2,
  totalAgents: 13, avgRunDurationMs: 1485000, costToday: 2.94, successRate: 80,
};
