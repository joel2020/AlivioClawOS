import "server-only";
import { randomUUID } from "crypto";
import type { PoolClient } from "pg";
import { getPool, hasDatabaseUrl, withTransaction } from "@/lib/db";
import type { AppState } from "@/lib/clawbot-service";

function asDate(value?: string) {
  return value ? new Date(value) : null;
}

function asMeta(value: unknown) {
  return value && typeof value === "object" ? value : {};
}

function auditId() {
  return `audit-${randomUUID().slice(0, 12)}`;
}

export function isDatabasePersistenceEnabled() {
  return hasDatabaseUrl();
}

export async function loadDbState(): Promise<Partial<AppState> | null> {
  if (!isDatabasePersistenceEnabled()) return null;
  const result = await getPool().query("SELECT state FROM app_state WHERE id = 'default'");
  return result.rows[0]?.state ?? null;
}

async function replaceStateTables(client: PoolClient, state: AppState) {
  await client.query("DELETE FROM notification_events");
  await client.query("DELETE FROM crm_activities");
  await client.query("DELETE FROM crm_deals");
  await client.query("DELETE FROM crm_contacts");
  await client.query("DELETE FROM crm_accounts");
  await client.query("DELETE FROM worker_heartbeats");
  await client.query("DELETE FROM outbound_messages");
  await client.query("DELETE FROM client_files");
  await client.query("DELETE FROM client_memory_items");
  await client.query("DELETE FROM agent_jobs");
  await client.query("DELETE FROM client_contexts");
  await client.query("DELETE FROM clients");
  await client.query("DELETE FROM agent_definitions");
  await client.query("DELETE FROM service_health");
  await client.query("DELETE FROM settings");
  await client.query("DELETE FROM logs");
  await client.query("DELETE FROM handoffs");
  await client.query("DELETE FROM deliverables");
  await client.query("DELETE FROM approvals");
  await client.query("DELETE FROM tasks");
  await client.query("DELETE FROM runs");
  await client.query("DELETE FROM projects");
  await client.query("DELETE FROM leads");
  await client.query("DELETE FROM workflows");
  await client.query("DELETE FROM agents");

  await client.query(
    "INSERT INTO settings (id, value, updated_at) VALUES ('default', $1, now()) ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value, updated_at = now()",
    [state.settings],
  );

  for (const clientAccount of state.clients) {
    await client.query(
      `INSERT INTO clients (id, organization_id, name, type, status, primary_contact, contact_email, notes, tags, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [clientAccount.id, clientAccount.organizationId, clientAccount.name, clientAccount.type, clientAccount.status, clientAccount.primaryContact ?? null, clientAccount.contactEmail ?? null, clientAccount.notes ?? null, clientAccount.tags, asDate(clientAccount.createdAt), asDate(clientAccount.updatedAt)],
    );
  }

  for (const context of state.clientContexts) {
    await client.query(
      `INSERT INTO client_contexts (id, client_id, summary, memory, updated_at)
       VALUES ($1,$2,$3,$4,$5)`,
      [context.id, context.clientId, context.summary, JSON.stringify(context.memory), asDate(context.updatedAt)],
    );
  }

  for (const memory of state.clientMemoryItems) {
    await client.query(
      `INSERT INTO client_memory_items (id, client_id, kind, title, body, source, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [memory.id, memory.clientId, memory.kind, memory.title, memory.body, memory.source, asDate(memory.createdAt), asDate(memory.updatedAt)],
    );
  }

  for (const file of state.clientFiles) {
    await client.query(
      `INSERT INTO client_files (id, client_id, kind, name, url, content_type, size_bytes, notes, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [file.id, file.clientId, file.kind, file.name, file.url ?? null, file.contentType ?? null, file.sizeBytes ?? null, file.notes ?? null, asDate(file.createdAt)],
    );
  }

  for (const agentDefinition of state.agentDefinitions) {
    await client.query(
      `INSERT INTO agent_definitions (id, name, kind, status, description, allowed_tools, risk_level, requires_approval_for, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [agentDefinition.id, agentDefinition.name, agentDefinition.kind, agentDefinition.status, agentDefinition.description, agentDefinition.allowedTools, agentDefinition.riskLevel, agentDefinition.requiresApprovalFor, asDate(agentDefinition.createdAt)],
    );
  }

  for (const agent of state.agents) {
    await client.query(
      `INSERT INTO agents (id, name, role, status, description, model_alias, capabilities)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [agent.id, agent.name, agent.role, agent.status, agent.description, agent.modelAlias, agent.capabilities],
    );
  }

  for (const workflow of state.workflows) {
    await client.query(
      "INSERT INTO workflows (id, name, description, output) VALUES ($1,$2,$3,$4)",
      [workflow.id, workflow.name, workflow.description, workflow.output],
    );
  }

  for (const lead of state.leads) {
    await client.query(
      `INSERT INTO leads (id, company_name, source, contact_name, contact_email, service_interest, status, notes, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [lead.id, lead.companyName, lead.source, lead.contactName ?? null, lead.contactEmail ?? null, lead.serviceInterest, lead.status, lead.notes ?? null, asDate(lead.createdAt), asDate(lead.updatedAt)],
    );
  }

  for (const project of state.projects) {
    await client.query(
      `INSERT INTO projects (id, name, description, status, run_count, last_run_at, created_at, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [project.id, project.name, project.description, project.status, project.runCount, asDate(project.lastRunAt), asDate(project.createdAt), project.tags],
    );
  }

  for (const run of state.runs) {
    await client.query(
      `INSERT INTO runs (id, name, project_id, project_name, status, workflow_id, lead_id, started_at, completed_at, duration_ms, progress,
        agent_count, task_count, completed_tasks, cost, triggered_by, model_alias, summary, agents, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
      [run.id, run.name, run.projectId || null, run.projectName, run.status, run.workflowId ?? null, run.leadId ?? null, asDate(run.startedAt), asDate(run.completedAt), run.durationMs ?? null, run.progress, run.agentCount, run.taskCount, run.completedTasks, run.cost ?? null, run.triggeredBy, run.modelAlias ?? run.model_alias ?? null, run.summary ?? null, JSON.stringify(run.agents), run.tags],
    );
  }

  for (const task of state.tasks) {
    await client.query(
      `INSERT INTO tasks (id, run_id, name, description, status, assigned_agent, started_at, completed_at, duration_ms, depends_on, output_summary)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [task.id, task.runId, task.name, task.description, task.status, task.assignedAgent, asDate(task.startedAt), asDate(task.completedAt), task.durationMs ?? null, task.dependsOn, task.outputSummary ?? null],
    );
  }

  for (const approval of state.approvals) {
    await client.query(
      `INSERT INTO approvals (id, run_id, run_name, title, description, status, workflow_id, step_key, requested_at, resolved_at, requested_by, resolved_by, priority)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [approval.id, approval.runId, approval.runName, approval.title, approval.description, approval.status, approval.workflowId ?? null, approval.stepKey ?? null, asDate(approval.requestedAt), asDate(approval.resolvedAt), approval.requestedBy, approval.resolvedBy ?? null, approval.priority],
    );
  }

  for (const deliverable of state.deliverables) {
    await client.query(
      `INSERT INTO deliverables (id, run_id, run_name, name, type, status, workflow_id, created_at, size_bytes, url, content)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [deliverable.id, deliverable.runId, deliverable.runName, deliverable.name, deliverable.type, deliverable.status, deliverable.workflowId ?? null, asDate(deliverable.createdAt), deliverable.sizeBytes ?? null, deliverable.url ?? null, deliverable.content ?? null],
    );
  }

  for (const handoff of state.handoffs) {
    await client.query(
      `INSERT INTO handoffs (id, lead_id, run_id, from_workflow_id, to_workflow_id, title, status, created_at, completed_at, summary)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [handoff.id, handoff.leadId ?? null, handoff.runId, handoff.fromWorkflowId, handoff.toWorkflowId ?? null, handoff.title, handoff.status, asDate(handoff.createdAt), asDate(handoff.completedAt), handoff.summary],
    );
  }

  for (const log of state.logs) {
    await client.query(
      `INSERT INTO logs (id, run_id, agent_name, level, message, workflow_id, timestamp, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [log.id, log.runId, log.agentName, log.level, log.message, log.workflowId ?? null, asDate(log.timestamp), log.metadata ? JSON.stringify(log.metadata) : null],
    );
  }

  for (const service of state.serviceHealth) {
    await client.query(
      `INSERT INTO service_health (name, status, latency_ms, uptime, last_checked, description)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [service.name, service.status, service.latencyMs, service.uptime, asDate(service.lastChecked), service.description],
    );
  }

  for (const job of state.agentJobs) {
    await client.query(
      `INSERT INTO agent_jobs (id, agent_id, client_id, run_id, title, status, priority, requested_by, created_at, updated_at, input, output, locked_by, locked_at, completed_at, error)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (id) DO NOTHING`,
      [job.id, job.agentId, job.clientId ?? null, job.runId ?? null, job.title, job.status, job.priority, job.requestedBy, asDate(job.createdAt), asDate(job.updatedAt), JSON.stringify(job.input), job.output ? JSON.stringify(job.output) : null, job.lockedBy ?? null, asDate(job.lockedAt), asDate(job.completedAt), job.error ?? null],
    );
  }

  for (const message of state.outboundMessages) {
    await client.query(
      `INSERT INTO outbound_messages (id, client_id, lead_id, agent_job_id, approval_id, channel, recipient, subject, body, status, created_at, updated_at, approved_at, sent_at, error, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (id) DO NOTHING`,
      [
        message.id,
        message.clientId ?? null,
        message.leadId ?? null,
        message.agentJobId ?? null,
        message.approvalId ?? null,
        message.channel,
        message.to,
        message.subject,
        message.body,
        message.status,
        asDate(message.createdAt),
        asDate(message.updatedAt),
        asDate(message.approvedAt),
        asDate(message.sentAt),
        message.error ?? null,
        JSON.stringify(message.metadata || {}),
      ],
    );
  }

  for (const heartbeat of state.workerHeartbeats) {
    await client.query(
      `INSERT INTO worker_heartbeats (id, worker_id, status, last_seen_at, current_job_id, metadata)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (worker_id) DO UPDATE SET status = EXCLUDED.status, last_seen_at = EXCLUDED.last_seen_at, current_job_id = EXCLUDED.current_job_id, metadata = EXCLUDED.metadata`,
      [
        heartbeat.id,
        heartbeat.workerId,
        heartbeat.status,
        asDate(heartbeat.lastSeenAt),
        heartbeat.currentJobId ?? null,
        JSON.stringify(heartbeat.metadata || {}),
      ],
    );
  }

  for (const account of state.crmAccounts) {
    await client.query(
      `INSERT INTO crm_accounts (id, client_id, lead_id, name, website, industry, status, owner, notes, tags, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO NOTHING`,
      [account.id, account.clientId ?? null, account.leadId ?? null, account.name, account.website ?? null, account.industry ?? null, account.status, account.owner, account.notes ?? null, account.tags, asDate(account.createdAt), asDate(account.updatedAt)],
    );
  }

  for (const contact of state.crmContacts) {
    await client.query(
      `INSERT INTO crm_contacts (id, account_id, lead_id, name, email, phone, title, status, notes, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO NOTHING`,
      [contact.id, contact.accountId ?? null, contact.leadId ?? null, contact.name, contact.email ?? null, contact.phone ?? null, contact.title ?? null, contact.status, contact.notes ?? null, asDate(contact.createdAt), asDate(contact.updatedAt)],
    );
  }

  for (const deal of state.crmDeals) {
    await client.query(
      `INSERT INTO crm_deals (id, account_id, contact_id, lead_id, name, stage, value, currency, probability, expected_close_date, owner, notes, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (id) DO NOTHING`,
      [deal.id, deal.accountId, deal.contactId ?? null, deal.leadId ?? null, deal.name, deal.stage, deal.value, deal.currency, deal.probability, deal.expectedCloseDate ?? null, deal.owner, deal.notes ?? null, asDate(deal.createdAt), asDate(deal.updatedAt)],
    );
  }

  for (const activity of state.crmActivities) {
    await client.query(
      `INSERT INTO crm_activities (id, account_id, contact_id, deal_id, lead_id, type, status, title, body, occurred_at, due_at, created_by, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO NOTHING`,
      [activity.id, activity.accountId ?? null, activity.contactId ?? null, activity.dealId ?? null, activity.leadId ?? null, activity.type, activity.status, activity.title, activity.body ?? null, asDate(activity.occurredAt), asDate(activity.dueAt), activity.createdBy, JSON.stringify(activity.metadata || {})],
    );
  }
}

export async function persistDbState(state: AppState) {
  if (!isDatabasePersistenceEnabled()) return false;
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO app_state (id, state, version, updated_at)
       VALUES ('default', $1, $2, now())
       ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, version = EXCLUDED.version, updated_at = now()`,
      [state, state.meta.version],
    );
    await replaceStateTables(client, state);
  });
  return true;
}

export async function recordAuditEvent(input: {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  if (!isDatabasePersistenceEnabled()) return;
  await getPool().query(
    `INSERT INTO audit_events (id, actor_id, actor_email, action, target_type, target_id, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [auditId(), input.actorId ?? null, input.actorEmail ?? null, input.action, input.targetType, input.targetId ?? null, JSON.stringify(asMeta(input.metadata))],
  );
}

export async function listAuditEvents(limit = 100): Promise<import("@/lib/types").AuditEvent[]> {
  if (!isDatabasePersistenceEnabled()) return [];
  const result = await getPool().query(
    `SELECT id, actor_id, actor_email, action, target_type, target_id, timestamp, metadata
     FROM audit_events
     ORDER BY timestamp DESC
     LIMIT $1`,
    [limit],
  );
  return result.rows.map((row) => ({
    id: row.id,
    actorId: row.actor_id ?? undefined,
    actorEmail: row.actor_email ?? undefined,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id ?? undefined,
    timestamp: row.timestamp instanceof Date ? row.timestamp.toISOString() : String(row.timestamp),
    metadata: row.metadata || {},
  }));
}
